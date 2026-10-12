'use strict';
/*
 * MEC Studio — build (on this computer).
 * Reads content/site.json and rewrites the generated regions of the site's pages.
 * Run directly to rebuild without opening the studio:  node studio/lib/build.js
 */
const fs = require('fs');
const path = require('path');
const { CORE, RESERVED, GENERATED_MARK, validate, applyMarkers, renderPage, renderAll } = require('./render');

const ROOT = path.resolve(__dirname, '..', '..');
const CONTENT_FILE = path.join(ROOT, 'content', 'site.json');

const readContent = () => JSON.parse(fs.readFileSync(CONTENT_FILE, 'utf8'));
const readTemplates = () => Object.fromEntries(CORE.map(p => [p.file, fs.readFileSync(path.join(ROOT, p.file), 'utf8')]));

// Render one page (core or custom) to a string without touching the disk.
function renderFile(file, c) {
  const core = CORE.find(p => p.file === file);
  return renderPage(file, c, core ? fs.readFileSync(path.join(ROOT, file), 'utf8') : null);
}

function writeIfChanged(file, data, changed) {
  const abs = path.join(ROOT, file);
  const prev = fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : null;
  if (prev !== data) { fs.writeFileSync(abs, data); changed.push(file); }
}

// Write content + every generated file. Returns the list of files that changed.
function buildAll(c) {
  const errors = validate(c);
  if (errors.length) { const e = new Error(errors.join('\n')); e.validation = errors; throw e; }
  // render everything first so a failure leaves the disk untouched
  for (const p of c.pages) {
    const abs = path.join(ROOT, p.slug + '.html');
    if (fs.existsSync(abs) && !fs.readFileSync(abs, 'utf8').includes(GENERATED_MARK)) {
      throw new Error(`"${p.slug}.html" already exists and was not created by the studio — choose a different web address.`);
    }
  }
  const out = renderAll(c, readTemplates());

  const changed = [];
  fs.mkdirSync(path.dirname(CONTENT_FILE), { recursive: true });
  writeIfChanged(path.relative(ROOT, CONTENT_FILE), JSON.stringify(c, null, 2) + '\n', changed);
  for (const [file, data] of Object.entries(out)) writeIfChanged(file, data, changed);

  // remove custom pages that no longer exist in content (only files the studio generated)
  for (const f of fs.readdirSync(ROOT)) {
    if (!f.endsWith('.html') || f in out) continue;
    const abs = path.join(ROOT, f);
    if (fs.readFileSync(abs, 'utf8').includes(GENERATED_MARK)) { fs.unlinkSync(abs); changed.push(f + ' (removed)'); }
  }
  return changed;
}

module.exports = { ROOT, CONTENT_FILE, CORE, RESERVED, readContent, validate, applyMarkers, renderFile, buildAll };

if (require.main === module) {
  const changed = buildAll(readContent());
  console.log(changed.length ? 'Rebuilt:\n  ' + changed.join('\n  ') : 'Everything is already up to date.');
}
