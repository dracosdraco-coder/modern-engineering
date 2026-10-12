#!/usr/bin/env node
'use strict';
/*
 * MEC Studio — local content studio for mecgroup.live.
 *
 *   npm run studio          (or: node studio/server.js, or double-click studio.command)
 *
 * Runs only on this computer (127.0.0.1). It edits content/site.json, regenerates the
 * site's pages, manages files in public/, and publishes with git commit + push.
 * No dependencies — plain Node.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const build = require('./lib/build');
const { previewInject } = require('./lib/render');

const ROOT = build.ROOT;
const UI = path.join(__dirname, 'ui');
const PORT = Number(process.env.PORT) || 4319;
const HOST = '127.0.0.1';
const TRASH = path.join(ROOT, '.studio-trash');
const MEDIA_DIRS = ['public/images', 'public/videos'];
const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif', '.svg']);
const VIDEO_EXT = new Set(['.mp4', '.webm', '.mov']);
const MAX_UPLOAD = 95 * 1024 * 1024; // GitHub rejects files over 100 MB
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.xml': 'application/xml; charset=utf-8', '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp',
  '.gif': 'image/gif', '.avif': 'image/avif', '.ico': 'image/x-icon', '.mp4': 'video/mp4', '.webm': 'video/webm',
  '.mov': 'video/quicktime', '.woff2': 'font/woff2'
};

let draft = null; // unsaved content pushed by the studio for live preview

// ── small helpers ──────────────────────────────────────────────────────────
const send = (res, status, body, headers = {}) => {
  const data = typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body);
  res.writeHead(status, Object.assign({
    'Content-Type': typeof body === 'string' || Buffer.isBuffer(body) ? 'text/plain; charset=utf-8' : MIME['.json'],
    'Cache-Control': 'no-store'
  }, headers));
  res.end(data);
};
const fail = (res, status, message, extra) => send(res, status, Object.assign({ error: message }, extra));

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = []; let size = 0;
    req.on('data', c => {
      size += c.length;
      if (size > limit) { reject(Object.assign(new Error('That file is too large.'), { status: 413 })); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

// Resolve a site-relative path and refuse anything outside `base`.
function inside(base, rel) {
  const abs = path.resolve(base, '.' + path.sep + rel);
  return abs === base || abs.startsWith(base + path.sep) ? abs : null;
}

function git(args, timeout = 30000) {
  return new Promise(resolve => {
    execFile('git', args, { cwd: ROOT, timeout, maxBuffer: 8 * 1024 * 1024 }, (err, stdout, stderr) => {
      resolve({ ok: !err, out: String(stdout || '').trimEnd(), err: String(stderr || '').trim(), code: err ? err.code : 0 });
    });
  });
}

// ── media ──────────────────────────────────────────────────────────────────
function listMedia() {
  const out = [];
  const walk = rel => {
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) return;
    for (const e of fs.readdirSync(abs, { withFileTypes: true })) {
      if (e.name.startsWith('.')) continue;
      const r = rel + '/' + e.name;
      if (e.isDirectory()) { walk(r); continue; }
      const ext = path.extname(e.name).toLowerCase();
      const kind = IMAGE_EXT.has(ext) ? 'image' : VIDEO_EXT.has(ext) ? 'video' : null;
      if (!kind) continue;
      const st = fs.statSync(path.join(ROOT, r));
      out.push({ path: r, name: e.name, folder: rel, kind, size: st.size, mtime: st.mtimeMs });
    }
  };
  MEDIA_DIRS.forEach(walk);
  return out.sort((a, b) => b.mtime - a.mtime);
}

function safeName(name) {
  const ext = path.extname(name).toLowerCase();
  const base = path.basename(name, path.extname(name)).toLowerCase()
    .normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'file';
  return { base, ext };
}

async function upload(req, res, q) {
  const { base, ext } = safeName(q.get('name') || '');
  const kind = IMAGE_EXT.has(ext) ? 'image' : VIDEO_EXT.has(ext) ? 'video' : null;
  if (!kind) return fail(res, 415, 'Only photos (jpg, png, webp, gif, avif, svg) and videos (mp4, webm, mov) can be added.');
  const data = await readBody(req, MAX_UPLOAD);
  if (!data.length) return fail(res, 400, 'That file was empty.');
  const folder = kind === 'image' ? 'public/images/projects' : 'public/videos';
  fs.mkdirSync(path.join(ROOT, folder), { recursive: true });
  let name = base + ext, n = 2;
  while (fs.existsSync(path.join(ROOT, folder, name))) name = `${base}-${n++}${ext}`;
  fs.writeFileSync(path.join(ROOT, folder, name), data);
  send(res, 200, { path: folder + '/' + name, name, folder, kind, size: data.length, mtime: Date.now() });
}

function removeMedia(res, rel) {
  const abs = MEDIA_DIRS.map(d => inside(path.join(ROOT, d), path.relative(d, rel))).find(Boolean);
  if (!abs || !fs.existsSync(abs) || !fs.statSync(abs).isFile()) return fail(res, 404, 'File not found.');
  const used = [JSON.stringify(build.readContent()), draft ? JSON.stringify(draft) : ''].some(s => s.includes(JSON.stringify(rel)));
  if (used) return fail(res, 409, 'This file is still used on the site. Remove it from the pages first.');
  // moved, not erased: recover it from .studio-trash/ if needed
  const dest = path.join(TRASH, `${Date.now()}-${path.basename(abs)}`);
  fs.mkdirSync(TRASH, { recursive: true });
  fs.renameSync(abs, dest);
  send(res, 200, { ok: true, trashed: path.relative(ROOT, dest) });
}

// ── git status / publish ───────────────────────────────────────────────────
const publishPaths = () => ['content', 'public', 'sitemap.xml', ...fs.readdirSync(ROOT).filter(f => f.endsWith('.html'))];

async function status() {
  const inRepo = (await git(['rev-parse', '--is-inside-work-tree'])).ok;
  if (!inRepo) return { git: false, changes: [], ahead: 0 };
  const st = await git(['status', '--porcelain', '--', ...publishPaths()]);
  const changes = st.out.split('\n').filter(Boolean).map(l => ({ code: l.slice(0, 2).trim() || '?', file: l.slice(3).replace(/^"|"$/g, '') }));
  const ahead = await git(['rev-list', '--count', '@{u}..HEAD']);
  const branch = await git(['rev-parse', '--abbrev-ref', 'HEAD']);
  const last = await git(['log', '-1', '--format=%s|%cr']);
  const [subject, when] = last.out.split('|');
  return { git: true, changes, ahead: ahead.ok ? Number(ahead.out) || 0 : 0, hasUpstream: ahead.ok, branch: branch.out, last: { subject, when } };
}

async function publish(res, body) {
  const message = String(body.message || '').trim() || 'Update site content via MEC Studio';
  const add = await git(['add', '-A', '--', ...publishPaths()]);
  if (!add.ok) return fail(res, 500, 'Could not stage the changes.', { detail: add.err });
  const staged = await git(['diff', '--cached', '--name-only']);
  let committed = false;
  if (staged.out) {
    const commit = await git(['commit', '-m', message]);
    if (!commit.ok) return fail(res, 500, 'Could not save a version of the changes.', { detail: commit.err || commit.out });
    committed = true;
  }
  const push = await git(['push', 'origin', 'HEAD'], 10 * 60 * 1000);
  if (!push.ok) {
    return fail(res, 502, committed
      ? 'Your changes are saved as a version on this computer, but sending them to GitHub failed. Fix the problem below and press Publish again.'
      : 'Sending to GitHub failed.', { detail: push.err || push.out, committed });
  }
  send(res, 200, { ok: true, committed, files: staged.out ? staged.out.split('\n') : [], detail: push.err || push.out });
}

// ── static files (with Range, so video scrubs in Safari) ───────────────────
function serveFile(req, res, abs) {
  let st;
  try { st = fs.statSync(abs); } catch (e) { return send(res, 404, 'Not found'); }
  if (st.isDirectory()) return serveFile(req, res, path.join(abs, 'index.html'));
  const type = MIME[path.extname(abs).toLowerCase()] || 'application/octet-stream';
  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
  if (range && (range[1] || range[2])) {
    let start = range[1] ? Number(range[1]) : Math.max(0, st.size - Number(range[2]));
    let end = range[1] && range[2] ? Math.min(Number(range[2]), st.size - 1) : st.size - 1;
    if (start >= st.size || start > end) { res.writeHead(416, { 'Content-Range': `bytes */${st.size}` }); return res.end(); }
    res.writeHead(206, { 'Content-Type': type, 'Content-Range': `bytes ${start}-${end}/${st.size}`, 'Accept-Ranges': 'bytes', 'Content-Length': end - start + 1, 'Cache-Control': 'no-store' });
    return fs.createReadStream(abs, { start, end }).pipe(res);
  }
  res.writeHead(200, { 'Content-Type': type, 'Content-Length': st.size, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-store' });
  if (req.method === 'HEAD') return res.end();
  fs.createReadStream(abs).pipe(res);
}

// Site files are public anyway; keep the studio's own innards and dotfiles out of reach.
function siteFile(rel) {
  if (rel.split('/').some(seg => seg.startsWith('.')) || /^(studio|node_modules)(\/|$)/.test(rel)) return null;
  return inside(ROOT, rel);
}

function preview(req, res, rel) {
  rel = rel || 'index.html';
  if (rel.endsWith('.html')) {
    let html = null;
    try { html = build.renderFile(rel, draft || build.readContent()); }
    catch (e) { return send(res, 500, `<pre style="font:13px ui-monospace,monospace;padding:24px;white-space:pre-wrap">Preview error\n\n${String(e.message).replace(/</g, '&lt;')}</pre>`, { 'Content-Type': MIME['.html'] }); }
    if (html !== null) return send(res, 200, html.replace('</head>', () => previewInject(rel) + '</head>'), { 'Content-Type': MIME['.html'] });
  }
  const abs = siteFile(rel);
  return abs ? serveFile(req, res, abs) : send(res, 404, 'Not found');
}

// ── router ─────────────────────────────────────────────────────────────────
async function api(req, res, url) {
  const route = req.method + ' ' + url.pathname;
  const jsonBody = async () => JSON.parse((await readBody(req, 20 * 1024 * 1024)).toString('utf8') || '{}');

  if (route === 'GET /api/session') return send(res, 200, { mode: 'local', authed: true });
  if (route === 'GET /api/content') return send(res, 200, build.readContent());
  if (route === 'POST /api/draft') { draft = await jsonBody(); return send(res, 200, { ok: true }); }
  if (route === 'DELETE /api/draft') { draft = null; return send(res, 200, { ok: true }); }
  if (route === 'PUT /api/content') {
    const content = await jsonBody();
    try {
      const changed = build.buildAll(content);
      draft = null;
      return send(res, 200, { ok: true, changed, status: await status() });
    } catch (e) {
      return fail(res, e.validation ? 422 : 500, e.message, { validation: e.validation });
    }
  }
  if (route === 'GET /api/media') return send(res, 200, { files: listMedia() });
  if (route === 'POST /api/media') return upload(req, res, url.searchParams);
  if (route === 'DELETE /api/media') return removeMedia(res, String(url.searchParams.get('path') || ''));
  if (route === 'GET /api/status') return send(res, 200, await status());
  if (route === 'POST /api/publish') return publish(res, await jsonBody());
  return fail(res, 404, 'Unknown request.');
}

const server = http.createServer((req, res) => {
  Promise.resolve().then(async () => {
    // Local-only guard: reject requests that arrive under another hostname (DNS rebinding),
    // and require a custom header on anything that changes data (blocks cross-site forms/fetches).
    const host = String(req.headers.host || '').replace(/:\d+$/, '');
    if (host !== 'localhost' && host !== '127.0.0.1') return send(res, 403, 'Forbidden');
    const url = new URL(req.url, `http://${req.headers.host}`);
    let rel;
    try { rel = decodeURIComponent(url.pathname).replace(/^\/+/, ''); } catch (e) { return send(res, 400, 'Bad request'); }

    if (rel.startsWith('api/')) {
      if (req.method !== 'GET' && req.headers['x-studio'] !== '1') return send(res, 403, 'Forbidden');
      return api(req, res, url);
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Method not allowed');
    if (rel === '' ) { res.writeHead(302, { Location: '/studio/' }); return res.end(); }
    if (rel === 'studio') { res.writeHead(302, { Location: '/studio/' }); return res.end(); }
    if (rel === 'studio/render.js') return serveFile(req, res, path.join(__dirname, 'lib', 'render.js'));
    if (rel.startsWith('studio/')) {
      const abs = inside(UI, rel.slice('studio/'.length) || 'index.html');
      return abs ? serveFile(req, res, abs) : send(res, 404, 'Not found');
    }
    if (rel === '__preview' || rel.startsWith('__preview/')) return preview(req, res, rel.slice('__preview/'.length));
    const abs = siteFile(rel);
    return abs ? serveFile(req, res, abs) : send(res, 404, 'Not found');
  }).catch(e => {
    if (!res.headersSent) fail(res, e.status || 500, e.message || 'Something went wrong.');
    else res.end();
  });
});

server.on('error', e => {
  if (e.code === 'EADDRINUSE') {
    console.log(`\n  MEC Studio is already running → http://localhost:${PORT}/studio/\n`);
    openBrowser();
    process.exit(0);
  }
  throw e;
});

function openBrowser() {
  if (process.env.STUDIO_NO_OPEN) return;
  const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'explorer' : 'xdg-open';
  execFile(cmd, [`http://localhost:${PORT}/studio/`], () => {});
}

server.listen(PORT, HOST, () => {
  console.log(`\n  MEC Studio  →  http://localhost:${PORT}/studio/\n\n  Leave this window open while you edit. Press Ctrl+C to quit.\n`);
  openBrowser();
});
