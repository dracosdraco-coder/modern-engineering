'use strict';
/*
 * MEC Studio — online backend (one Vercel Function behind /api/*).
 *
 * The studio at /studio signs in with a password, then reads and writes the site through
 * GitHub: Publish makes one commit, and Vercel redeploys the site from it.
 *
 * Environment variables (Vercel → Project → Settings → Environment Variables):
 *   STUDIO_PASSWORD   the password for /studio                           (required)
 *   GITHUB_TOKEN      fine-grained token, "Contents: Read and write"      (required)
 *   GITHUB_REPO       owner/name   (default: dracosdraco-coder/modern-engineering)
 *   GITHUB_BRANCH     branch Vercel deploys from (default: master)
 *   KV_REST_API_URL / KV_REST_API_TOKEN   Upstash Redis, added by the Vercel integration (stats)
 */
const crypto = require('crypto');
const R = require('../studio/lib/render.js');

const REPO = process.env.GITHUB_REPO || 'dracosdraco-coder/modern-engineering';
const BRANCH = process.env.GITHUB_BRANCH || 'master';
const GH_API = process.env.GITHUB_API || 'https://api.github.com';
const KV_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '';
const KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';
const CONTENT = 'content/site.json';
const COOKIE = 'mec_studio';
const SESSION_DAYS = 30;
const IMAGE_EXT = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif', '.svg'];
const VIDEO_EXT = ['.mp4', '.webm', '.mov'];
const MEDIA_RE = /^public\/(images|videos)\/([a-z0-9][\w.-]*\/)*[\w.-]+\.(jpe?g|png|webp|gif|avif|svg|mp4|webm|mov)$/i;
const MIME = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif', '.avif': 'image/avif', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime' };
const EVENTS = new Set(['view', 'contact', 'estimate', 'inspection', 'call', 'email']);
const TZ = 'America/New_York';

class HttpError extends Error { constructor(status, message, extra) { super(message); this.status = status; this.extra = extra; } }
const configured = () => !!(process.env.STUDIO_PASSWORD && process.env.GITHUB_TOKEN);
const extOf = p => (/\.[a-z0-9]+$/i.exec(p) || [''])[0].toLowerCase();

// ── sessions ───────────────────────────────────────────────────────────────
const key = () => crypto.createHash('sha256').update(process.env.STUDIO_PASSWORD + '|' + process.env.GITHUB_TOKEN).digest();
const sign = exp => crypto.createHmac('sha256', key()).update(String(exp)).digest('base64url');
const same = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };
function authed(req) {
  if (!configured()) return false;
  const m = new RegExp('(?:^|;\\s*)' + COOKIE + '=(\\d+)\\.([\\w-]+)').exec(req.headers.cookie || '');
  return !!m && Number(m[1]) > Date.now() && same(m[2], sign(m[1]));
}
const cookie = (value, maxAge) => `${COOKIE}=${value}; Path=/api; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;

// ── Upstash Redis over REST (stats + sign-in throttling) ───────────────────
async function kv(commands) {
  if (!KV_URL || !KV_TOKEN) return null;
  const res = await fetch(KV_URL.replace(/\/$/, '') + '/pipeline', { method: 'POST', headers: { Authorization: 'Bearer ' + KV_TOKEN, 'Content-Type': 'application/json' }, body: JSON.stringify(commands) });
  if (!res.ok) throw new Error('Stats store answered ' + res.status);
  return (await res.json()).map(r => r.result);
}
const day = d => new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
const clientIp = req => String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';

// ── GitHub ─────────────────────────────────────────────────────────────────
async function gh(path, opt = {}) {
  const res = await fetch(`${GH_API}/repos/${REPO}/${path}`, {
    method: opt.method || 'GET',
    headers: Object.assign({ Authorization: 'Bearer ' + process.env.GITHUB_TOKEN, Accept: opt.raw ? 'application/vnd.github.raw+json' : 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'mec-studio' },
      opt.body ? { 'Content-Type': 'application/json' } : {}),
    body: opt.body ? JSON.stringify(opt.body) : undefined
  });
  if (opt.allow404 && res.status === 404) return null;
  if (!res.ok) {
    const text = await res.text();
    if (res.status === 401 || res.status === 403) throw new HttpError(502, 'GitHub refused the studio’s access token. It may have expired or be missing “Contents: Read and write” for this repository.', { detail: text.slice(0, 300) });
    throw new HttpError(res.status === 409 || res.status === 422 ? 409 : 502, `GitHub answered ${res.status} for ${path.split('?')[0]}.`, { detail: text.slice(0, 300) });
  }
  return opt.raw ? (opt.buffer ? Buffer.from(await res.arrayBuffer()) : res.text()) : res.json();
}
const blobSha = text => crypto.createHash('sha1').update(`blob ${Buffer.byteLength(text)}\0`).update(text).digest('hex');
async function head() {
  const ref = await gh(`git/ref/heads/${BRANCH}`);
  const commit = await gh(`git/commits/${ref.object.sha}`);
  const tree = await gh(`git/trees/${commit.tree.sha}?recursive=1`);
  return { sha: ref.object.sha, tree: commit.tree.sha, files: new Map(tree.tree.filter(t => t.type === 'blob').map(t => [t.path, t])) };
}
const rawAt = (path, sha) => gh(`contents/${path.split('/').map(encodeURIComponent).join('/')}?ref=${sha}`, { raw: true });

function mediaList(files) {
  const out = [];
  for (const [path, t] of files) {
    if (!MEDIA_RE.test(path)) continue;
    const ext = extOf(path);
    out.push({ path, name: path.split('/').pop(), folder: path.split('/').slice(0, -1).join('/'), kind: VIDEO_EXT.includes(ext) ? 'video' : 'image', size: t.size || 0, mtime: 0 });
  }
  return out.sort((a, b) => (a.folder === b.folder ? a.name.localeCompare(b.name) : b.folder.localeCompare(a.folder)));
}

// ── handlers ───────────────────────────────────────────────────────────────
async function login(req, res, body) {
  if (!configured()) throw new HttpError(503, 'The studio is not set up yet: add STUDIO_PASSWORD and GITHUB_TOKEN in Vercel, then redeploy.');
  const ip = clientIp(req), k = 'studio:login:' + ip;
  let tries = 0;
  try { const r = await kv([['GET', k]]); tries = r ? Number(r[0]) || 0 : 0; } catch (e) { /* throttle is best-effort */ }
  if (tries >= 8) throw new HttpError(429, 'Too many wrong passwords. Try again in 15 minutes.');
  await new Promise(r => setTimeout(r, 400)); // slows guessing even without the stats store
  if (!same(crypto.createHash('sha256').update(String(body.password || '')).digest('hex'), crypto.createHash('sha256').update(process.env.STUDIO_PASSWORD).digest('hex'))) {
    try { await kv([['INCR', k], ['EXPIRE', k, 900]]); } catch (e) { /* ignore */ }
    throw new HttpError(401, 'That password is not right.');
  }
  try { await kv([['DEL', k]]); } catch (e) { /* ignore */ }
  const exp = Date.now() + SESSION_DAYS * 864e5;
  res.setHeader('Set-Cookie', cookie(`${exp}.${sign(exp)}`, SESSION_DAYS * 86400));
  return { ok: true };
}

async function getContent(res) {
  const f = await gh(`contents/${CONTENT}?ref=${BRANCH}`);
  res.setHeader('X-Studio-Rev', f.sha);
  return JSON.parse(Buffer.from(f.content, 'base64').toString('utf8'));
}

async function upload(req, body, q) {
  if (!Buffer.isBuffer(body) || !body.length) throw new HttpError(400, 'That file was empty.');
  const raw = String(q.name || '');
  const ext = extOf(raw);
  const kind = IMAGE_EXT.includes(ext) ? 'image' : VIDEO_EXT.includes(ext) ? 'video' : null;
  if (!kind) throw new HttpError(415, 'Only photos (jpg, png, webp, gif, avif, svg) and videos (mp4, webm, mov) can be added.');
  const base = raw.slice(0, raw.length - ext.length).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'file';
  const folder = kind === 'image' ? 'public/images/projects' : 'public/videos';
  const taken = new Set([...(await head()).files.keys(), ...String(q.avoid || '').split(',').filter(Boolean)]);
  let name = base + ext, n = 2;
  while (taken.has(`${folder}/${name}`)) name = `${base}-${n++}${ext}`;
  // stored in GitHub now, attached to the site by the next Publish (so adding ten photos is still one deploy)
  const blob = await gh('git/blobs', { method: 'POST', body: { content: body.toString('base64'), encoding: 'base64' } });
  return { path: `${folder}/${name}`, name, folder, kind, size: body.length, mtime: Date.now(), sha: blob.sha, pending: true };
}

async function publish(req, body) {
  const c = body.content;
  const errors = R.validate(c);
  if (errors.length) throw new HttpError(422, errors.join('\n'), { validation: errors });
  const uploads = Array.isArray(body.uploads) ? body.uploads : [];
  const deletes = Array.isArray(body.deletes) ? body.deletes : [];
  const h = await head();

  const current = h.files.get(CONTENT);
  const rev = req.headers['x-studio-rev'];
  if (current && rev && current.sha !== rev) throw new HttpError(409, 'The site was changed somewhere else since you opened the studio. Reload the page to get the latest version, then make your changes again.');

  const json = JSON.stringify(c, null, 2) + '\n';
  const templates = Object.fromEntries(await Promise.all(R.CORE.map(async p => [p.file, await rawAt(p.file, h.sha)])));
  const out = Object.assign({ [CONTENT]: json }, R.renderAll(c, templates));

  // which root pages did the studio generate earlier? (so removed pages get deleted, and nothing hand-made is overwritten)
  const rootHtml = [...h.files.keys()].filter(p => /^[^/]+\.html$/.test(p) && !R.CORE.some(k => k.file === p));
  const existing = Object.fromEntries(await Promise.all(rootHtml.map(async p => [p, await rawAt(p, h.sha)])));
  for (const p of c.pages) {
    const f = p.slug + '.html';
    if (existing[f] && !existing[f].includes(R.GENERATED_MARK)) throw new HttpError(422, `"${f}" already exists and was not created by the studio — choose a different web address.`);
  }

  const tree = [], changed = [];
  for (const [path, data] of Object.entries(out)) {
    const cur = h.files.get(path);
    if (cur && cur.sha === blobSha(data)) continue;
    tree.push({ path, mode: '100644', type: 'blob', content: data }); changed.push(path);
  }
  for (const [path, data] of Object.entries(existing)) {
    if (!(path in out) && data.includes(R.GENERATED_MARK)) { tree.push({ path, mode: '100644', type: 'blob', sha: null }); changed.push(path + ' (removed)'); }
  }
  for (const u of uploads) {
    if (!u || !MEDIA_RE.test(String(u.path)) || !/^[0-9a-f]{40}$/.test(String(u.sha)) || h.files.has(u.path)) throw new HttpError(422, 'One of the new files could not be attached. Add it again and retry.');
    tree.push({ path: u.path, mode: '100644', type: 'blob', sha: u.sha }); changed.push(u.path);
  }
  for (const d of deletes) {
    if (!MEDIA_RE.test(String(d)) || !h.files.has(d)) continue;
    if (json.includes(JSON.stringify(d))) throw new HttpError(409, `${d.split('/').pop()} is still used on the site. Remove it from the pages first.`);
    tree.push({ path: d, mode: '100644', type: 'blob', sha: null }); changed.push(d + ' (removed)');
  }
  if (!tree.length) return { ok: true, changed: [], rev: current ? current.sha : blobSha(json) };

  const message = String(body.message || '').trim().slice(0, 200) || 'Update site content via MEC Studio';
  const newTree = await gh('git/trees', { method: 'POST', body: { base_tree: h.tree, tree } });
  const commit = await gh('git/commits', { method: 'POST', body: { message, tree: newTree.sha, parents: [h.sha] } });
  try { await gh(`git/refs/heads/${BRANCH}`, { method: 'PATCH', body: { sha: commit.sha, force: false } }); }
  catch (e) { throw new HttpError(409, 'Someone else published at the same moment. Reload the page and try again.', e.extra); }
  if (process.env.VERCEL_DEPLOY_HOOK) { try { await fetch(process.env.VERCEL_DEPLOY_HOOK, { method: 'POST' }); } catch (e) { /* git integration normally deploys */ } }
  return { ok: true, changed, commit: commit.sha, rev: blobSha(json) };
}

async function status() {
  const list = await gh(`commits?sha=${BRANCH}&per_page=1`);
  const c = list[0];
  return { hosted: true, git: true, changes: [], ahead: 0, last: c ? { subject: c.commit.message.split('\n')[0], at: c.commit.committer.date } : null };
}

async function file(res, q) {
  const path = String(q.path || '');
  if (!MEDIA_RE.test(path) || path.includes('..')) throw new HttpError(404, 'File not found.');
  const buf = await gh(`contents/${path.split('/').map(encodeURIComponent).join('/')}?ref=${BRANCH}`, { raw: true, buffer: true });
  res.setHeader('Content-Type', MIME[extOf(path)] || 'application/octet-stream');
  res.setHeader('Cache-Control', 'private, max-age=300');
  res.statusCode = 200; res.end(buf);
  return undefined;
}

// Public: called by the site's pages. Counts only — no cookies, no personal data kept.
async function track(req, body) {
  let d = body;
  if (Buffer.isBuffer(d)) d = d.toString('utf8');
  if (typeof d === 'string') { try { d = JSON.parse(d); } catch (e) { d = {}; } }
  const e = String((d && d.e) || ''), p = String((d && d.p) || '/').slice(0, 80);
  const ua = String(req.headers['user-agent'] || '');
  if (!EVENTS.has(e) || !/^\/[\w./-]*$/.test(p) || !ua || /bot|crawl|spider|slurp|preview|monitor|headless|lighthouse|curl|wget|python|node-fetch/i.test(ua)) return { ok: true };
  const today = day(new Date()), k = 'stats:' + today, ttl = 400 * 86400;
  const page = p === '/' || p === '/index.html' ? '/' : p;
  const cmds = [['HINCRBY', k, e === 'view' ? 'views' : e, 1], ['EXPIRE', k, ttl]];
  if (e === 'view') {
    // visitors: a one-way daily fingerprint in a HyperLogLog — cannot be turned back into an address
    const who = crypto.createHash('sha256').update(today + '|' + clientIp(req) + '|' + ua).digest('hex').slice(0, 24);
    cmds.push(['HINCRBY', k, 'page:' + page, 1], ['PFADD', 'visitors:' + today, who], ['EXPIRE', 'visitors:' + today, ttl]);
  }
  try { await kv(cmds); } catch (err) { /* never break the page over stats */ }
  return { ok: true };
}

async function stats(q) {
  if (!KV_URL || !KV_TOKEN) return { connected: false, days: [] };
  const n = Math.min(365, Math.max(1, parseInt(q.days, 10) || 30));
  const dates = [];
  for (let i = n - 1; i >= 0; i--) dates.push(day(new Date(Date.now() - i * 864e5)));
  const r = await kv([...dates.map(d => ['HGETALL', 'stats:' + d]), ...dates.map(d => ['PFCOUNT', 'visitors:' + d])]);
  const days = dates.map((date, i) => {
    const raw = r[i] || [], o = {};
    if (Array.isArray(raw)) for (let j = 0; j < raw.length; j += 2) o[raw[j]] = Number(raw[j + 1]) || 0; else Object.assign(o, raw);
    const pages = {};
    for (const [f, v] of Object.entries(o)) if (f.startsWith('page:')) pages[f.slice(5)] = Number(v) || 0;
    const g = f => Number(o[f]) || 0;
    return { date, views: g('views'), visitors: Number(r[dates.length + i]) || 0, contact: g('contact'), estimate: g('estimate'), inspection: g('inspection'), call: g('call'), email: g('email'), pages };
  });
  return { connected: true, timezone: TZ, days };
}

// ── router ─────────────────────────────────────────────────────────────────
async function readBody(req) {
  if (req.body !== undefined && req.body !== null) return req.body; // parsed by Vercel
  const chunks = [];
  for await (const ch of req) chunks.push(ch);
  return Buffer.concat(chunks);
}
const asJson = b => (Buffer.isBuffer(b) ? JSON.parse(b.toString('utf8') || '{}') : typeof b === 'string' ? JSON.parse(b || '{}') : b || {});

module.exports = async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const q = Object.fromEntries(url.searchParams);
  const route = req.method + ' /' + String(q.__route !== undefined ? q.__route : url.pathname.replace(/^\/api\/?/, '')).replace(/^studio(\.js)?\/?/, '').replace(/\/$/, '');
  const send = (status, data) => { res.statusCode = status; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.setHeader('Cache-Control', 'no-store'); res.end(JSON.stringify(data)); };
  try {
    if (route === 'POST /t') return send(200, await track(req, await readBody(req)));
    if (route === 'GET /session') return send(200, { mode: 'hosted', configured: configured(), authed: authed(req), stats: !!(KV_URL && KV_TOKEN) });
    if (req.method !== 'GET' && req.headers['x-studio'] !== '1') throw new HttpError(403, 'Forbidden');
    if (route === 'POST /login') return send(200, await login(req, res, asJson(await readBody(req))));
    if (route === 'POST /logout') { res.setHeader('Set-Cookie', cookie('', 0)); return send(200, { ok: true }); }
    if (!authed(req)) throw new HttpError(401, 'Please sign in again.');

    let out;
    if (route === 'GET /content') out = await getContent(res);
    else if (route === 'PUT /content') out = await publish(req, asJson(await readBody(req)));
    else if (route === 'GET /media') out = { files: mediaList((await head()).files) };
    else if (route === 'POST /media') out = await upload(req, await readBody(req), q);
    else if (route === 'GET /status') out = await status();
    else if (route === 'GET /stats') out = await stats(q);
    else if (route === 'GET /file') out = await file(res, q);
    else throw new HttpError(404, 'Unknown request.');
    if (out !== undefined) send(200, out);
  } catch (e) {
    if (res.headersSent) return res.end();
    send(e.status || 500, Object.assign({ error: e.status ? e.message : 'Something went wrong on the server.' }, e.extra, e.status ? {} : { detail: String(e.message).slice(0, 300) }));
  }
};
