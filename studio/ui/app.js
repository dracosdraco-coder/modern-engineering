/* MEC Studio — interface. Plain JavaScript, no build step. */
(function () {
  'use strict';
  const { docs, pageDoc, newPage } = window.SCHEMA;

  // ── tiny DOM helpers ─────────────────────────────────────────────────────
  const $ = (sel, el) => (el || document).querySelector(sel);
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (k === 'html') el.innerHTML = v; // only ever used with our own icon markup
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid);
    return el;
  }
  const ICONS = {
    home: '<path d="M4 11l8-7 8 7"/><path d="M6 10v9h12v-9"/>',
    briefcase: '<rect x="3" y="7" width="18" height="13" rx="2.5"/><path d="M9 7V5.5A1.5 1.5 0 0110.5 4h3A1.5 1.5 0 0115 5.5V7M3 13h18"/>',
    photos: '<rect x="3" y="5" width="18" height="14" rx="3"/><circle cx="8.5" cy="10" r="1.6"/><path d="M4 17l5-4.5 4 3.5 3-2.5 4 3.5"/>',
    image: '<rect x="3" y="5" width="18" height="14" rx="3"/><circle cx="8.5" cy="10" r="1.6"/><path d="M4 17l5-4.5 4 3.5 3-2.5 4 3.5"/>',
    calculator: '<rect x="5" y="3" width="14" height="18" rx="3"/><path d="M8.5 7.5h7M8.5 12h.01M12 12h.01M15.5 12h.01M8.5 16h.01M12 16h.01M15.5 16h.01"/>',
    dollar: '<circle cx="12" cy="12" r="9"/><path d="M14.8 9.2c-.5-.9-1.5-1.4-2.8-1.4-1.7 0-2.9.8-2.9 2.1 0 3 5.9 1.300 5.9 4.200 0 1.300-1.300 2.100-3 2.100-1.400 0-2.500-.6-3-1.600M12 6v12"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M4 8l8 5.5L20 8"/>',
    building: '<path d="M5 20V6.500A1.500 1.500 0 016.500 5h7A1.500 1.500 0 0115 6.500V20M15 10h2.500A1.500 1.500 0 0119 11.500V20M3 20h18M8.500 9h3M8.500 12.500h3M8.500 16h3"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h10"/>',
    footer: '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M3 15h18"/>',
    doc: '<path d="M7 3h7l4 4v12.500A1.500 1.500 0 0116.500 21h-9A1.500 1.500 0 016 19.500v-15A1.500 1.500 0 017.500 3z"/><path d="M14 3v4h4M9 12h6M9 16h4"/>',
    folder: '<path d="M3 7.500A2.500 2.500 0 015.500 5H9l2 2.500h7.500A2.500 2.500 0 0121 10v7a2.500 2.500 0 01-2.500 2.500h-13A2.500 2.500 0 013 17z"/>',
    sparkle: '<path d="M12 3l1.800 5.200L19 10l-5.200 1.800L12 17l-1.800-5.200L5 10l5.200-1.800zM18.500 15.500l.7 2 .2.1 2 .7-2 .7-.9 2.200-.7-2.200-2.200-.7 2.200-.7z"/>',
    search: '<circle cx="11" cy="11" r="6.500"/><path d="M16 16l4.500 4.500"/>',
    type: '<path d="M5 7V5h14v2M12 5v14M9 19h6"/>',
    cursor: '<rect x="3" y="7" width="18" height="10" rx="5"/><path d="M8 12h8"/>',
    chart: '<path d="M5 20V10M12 20V4M19 20v-7"/>',
    people: '<circle cx="9" cy="8.500" r="3.200"/><path d="M3 19.500c.4-3.200 2.900-5 6-5s5.600 1.800 6 5M16 5.600a3.200 3.200 0 010 5.800M18 14.800c1.700.7 2.800 2.300 3 4.700"/>',
    grid: '<rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><rect x="13" y="13" width="7" height="7" rx="2"/>',
    split: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M12 3v18"/>',
    steps: '<path d="M4 18h5v-5h5V8h6"/>',
    columns: '<rect x="3" y="4" width="8" height="16" rx="2.500"/><rect x="13" y="4" width="8" height="16" rx="2.500"/>',
    megaphone: '<path d="M4 10v4a1 1 0 001 1h2l6 4V5L7 9H5a1 1 0 00-1 1zM16.500 9a4 4 0 010 6M19 6.500a8 8 0 010 11"/>',
    shield: '<path d="M12 3l7 3v5.500c0 4.300-2.900 7.900-7 9.500-4.100-1.600-7-5.200-7-9.500V6z"/>',
    handshake: '<path d="M3 8l4-2 5 2 5-2 4 2v8l-4 2-5-3-5 3-4-2z"/><path d="M12 8v7"/>',
    sliders: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
    pin: '<path d="M12 21s7-6.200 7-11.500a7 7 0 10-14 0C5 14.800 12 21 12 21z"/><circle cx="12" cy="9.500" r="2.500"/>',
    tag: '<path d="M3 12.500V5.500A2.500 2.500 0 015.500 3h7l8.500 8.500-9.500 9.500z"/><circle cx="8" cy="8" r="1.500"/>',
    form: '<rect x="4" y="3" width="16" height="18" rx="3"/><path d="M8 8h8M8 12h8M8 16h4"/>',
    phone: '<path d="M6.500 3h3l1.500 4.500-2 1.500a12 12 0 006 6l1.500-2 4.500 1.500v3a2 2 0 01-2.200 2A17 17 0 014.500 5.200 2 2 0 016.500 3z"/>',
    plug: '<path d="M9 3v5M15 3v5M6 8h12v3a6 6 0 01-12 0zM12 17v4"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    trash: '<path d="M4 7h16M9 7V4.500h6V7M6.500 7l.8 12a1.500 1.500 0 001.500 1.500h6.400a1.500 1.500 0 001.500-1.500l.8-12M10 11v6M14 11v6"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2.500"/><path d="M16 8V6.500A2.500 2.500 0 0013.500 4h-7A2.500 2.500 0 004 6.500v7A2.500 2.500 0 006.500 16H8"/>',
    chevron: '<path d="M9 6l6 6-6 6"/>',
    grip: '<circle cx="9" cy="6" r="1.300" fill="currentColor" stroke="none"/><circle cx="15" cy="6" r="1.300" fill="currentColor" stroke="none"/><circle cx="9" cy="12" r="1.300" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r="1.300" fill="currentColor" stroke="none"/><circle cx="9" cy="18" r="1.300" fill="currentColor" stroke="none"/><circle cx="15" cy="18" r="1.300" fill="currentColor" stroke="none"/>',
    upload: '<path d="M12 16V4M7 9l5-5 5 5M4 16v2.500A1.500 1.500 0 005.500 20h13a1.500 1.500 0 001.500-1.500V16"/>',
    external: '<path d="M14 4h6v6M20 4l-9 9M18 13.500v4A2.500 2.500 0 0115.500 20h-9A2.500 2.500 0 014 17.500v-9A2.500 2.500 0 016.500 6h4"/>',
    desktop: '<rect x="3" y="4" width="18" height="12" rx="2.500"/><path d="M9 20h6M12 16v4"/>',
    tablet: '<rect x="5" y="3" width="14" height="18" rx="3"/><path d="M11 17.500h2"/>',
    mobile: '<rect x="7" y="3" width="10" height="18" rx="3"/><path d="M11 17.500h2"/>',
    check: '<path d="M5 12.500l4.500 4.500L19 7.500"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.600 5.600l1.400 1.400M17 17l1.400 1.400M5.600 18.400L7 17M17 7l1.400-1.400"/>',
    moon: '<path d="M20 14.500A8 8 0 019.500 4a8 8 0 1010.500 10.500z"/>',
    eye: '<path d="M2.500 12S6 5.500 12 5.500 21.500 12 21.500 12 18 18.500 12 18.500 2.500 12 2.500 12z"/><circle cx="12" cy="12" r="2.800"/>',
    play: '<path d="M8 5.500v13l11-6.500z" fill="currentColor"/>',
    back: '<path d="M15 6l-6 6 6 6"/>',
    undo: '<path d="M8 8H4V4M4 8a9 9 0 11-1 6"/>',
    cloud: '<path d="M7 18.500a4.500 4.500 0 01-.6-8.960A6 6 0 0118 8.500a5 5 0 01.500 9.980zM12 16v-5M9.500 13l2.500-2.500 2.500 2.500"/>'
  };
  const icon = (name, size) => h('span', { class: 'ic', html: `<svg viewBox="0 0 24 24" width="${size || 18}" height="${size || 18}" fill="none" stroke="currentColor" stroke-width="1.700" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ICONS.doc}</svg>` });

  const get = (o, p) => String(p).split('.').reduce((a, k) => (a == null ? a : a[k]), o);
  function set(o, p, v) {
    const ks = String(p).split('.'); const last = ks.pop();
    const t = ks.reduce((a, k) => (a[k] == null ? (a[k] = {}) : a[k]), o);
    t[last] = v;
  }
  const isVideo = p => /\.(mp4|webm|mov)$/i.test(String(p || ''));
  const fmtSize = b => (b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB');
  const store = { get(k, d) { try { return localStorage.getItem(k) || d; } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } } };

  // ── state ────────────────────────────────────────────────────────────────
  let content = null, savedJSON = '', media = [], gitStatus = null, route = '', busy = false;
  // Online (hosted) studio: saving happens through GitHub in one step, new files wait for the next Publish.
  let MODE = 'local', SESSION = {}, rev = '', RENDER = null, pendingUp = [], pendingDel = [];
  const blobs = {}, templates = {};
  const hosted = () => MODE === 'hosted';
  const mediaUrl = p => blobs[p] || '/' + String(p).split('/').map(encodeURIComponent).join('/');
  const openSections = new Map(); // remembers which cards are expanded per screen
  const dirty = () => JSON.stringify(content) !== savedJSON || pendingUp.length > 0 || pendingDel.length > 0;

  async function api(method, url, body, raw) {
    const opt = { method, headers: { 'X-Studio': '1' }, credentials: 'same-origin' };
    if (rev && method === 'PUT') opt.headers['X-Studio-Rev'] = rev;
    if (raw) { opt.body = body; opt.headers['Content-Type'] = 'application/octet-stream'; } else if (body !== undefined) { opt.body = JSON.stringify(body); opt.headers['Content-Type'] = 'application/json'; }
    const res = await fetch(url, opt);
    if (res.headers.get('X-Studio-Rev')) rev = res.headers.get('X-Studio-Rev');
    if (res.status === 401 && hosted() && !url.includes('/api/login')) { showLogin('Your session ended — sign in again. Unsaved edits on this screen are kept.'); }
    let data = null; try { data = await res.json(); } catch (e) { /* non-JSON */ }
    if (!res.ok) throw Object.assign(new Error((data && data.error) || `Request failed (${res.status})`), { data: data || {}, status: res.status });
    return data;
  }

  // ── toasts & modals ──────────────────────────────────────────────────────
  function toast(msg, kind) {
    const el = h('div', { class: 'toast ' + (kind || '') , role: 'status' }, icon(kind === 'error' ? 'x' : 'check', 16), h('span', {}, msg));
    $('#toasts').append(el);
    requestAnimationFrame(() => el.classList.add('in'));
    setTimeout(() => { el.classList.remove('in'); setTimeout(() => el.remove(), 300); }, kind === 'error' ? 7000 : 2600);
  }
  function modal({ title, body, footer, size, onClose }) {
    const close = () => { back.classList.remove('in'); document.removeEventListener('keydown', key); setTimeout(() => back.remove(), 200); if (onClose) onClose(); };
    const key = e => { if (e.key === 'Escape' && back === $('#modals').lastElementChild) close(); };
    const back = h('div', { class: 'modal-back', onmousedown: e => { if (e.target === back) close(); } },
      h('div', { class: 'modal ' + (size || ''), role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
        h('header', { class: 'modal-h' }, h('h2', {}, title), h('button', { class: 'icon-btn', 'aria-label': 'Close', onclick: close }, icon('x'))),
        h('div', { class: 'modal-b' }, body),
        footer ? h('footer', { class: 'modal-f' }, footer(close)) : null));
    $('#modals').append(back);
    document.addEventListener('keydown', key);
    requestAnimationFrame(() => back.classList.add('in'));
    return close;
  }
  function confirmBox(title, text, label, danger) {
    return new Promise(resolve => {
      let done = false;
      modal({ title, size: 'sm', body: h('p', { class: 'muted' }, text), onClose: () => { if (!done) resolve(false); },
        footer: close => [h('button', { class: 'btn', onclick: close }, 'Cancel'),
          h('button', { class: 'btn ' + (danger ? 'danger' : 'primary'), onclick: () => { done = true; close(); resolve(true); } }, label)] });
    });
  }

  // ── change tracking, live preview ────────────────────────────────────────
  let draftTimer = 0;
  function changed() {
    updateStatus();
    if (liveHead) liveHead();
    clearTimeout(draftTimer);
    draftTimer = setTimeout(async () => {
      if (!hosted()) { try { await api('POST', '/api/draft', content); } catch (e) { return; /* preview only */ } }
      // a page whose web address just changed lives at a new preview URL
      const cur = currentDoc(), file = cur ? val(cur[1].preview) : null;
      refreshPreview(file && file !== PV.file ? file : undefined);
      renderSide();
    }, 350);
  }

  const PV = { file: 'index.html', device: store.get('studio-device', 'desktop'), front: 0, token: 0, on: store.get('studio-preview', 'on') === 'on' };
  const WIDTHS = { desktop: 1280, tablet: 820, mobile: 390 };
  const frames = () => [...document.querySelectorAll('.pv-frame')];
  function fitPreview() {
    const stage = $('.pv-stage'); if (!stage) return;
    const vw = WIDTHS[PV.device], W = stage.clientWidth - 32, H = stage.clientHeight - 32;
    if (W <= 0 || H <= 0) return;
    const sc = Math.min(1, W / vw);
    const box = $('.pv-box');
    box.style.width = vw * sc + 'px'; box.style.height = H + 'px';
    frames().forEach(f => { f.style.width = vw + 'px'; f.style.height = H / sc + 'px'; f.style.transform = `scale(${sc})`; });
    $('.pv-zoom').textContent = Math.round(sc * 100) + '%';
  }
  function refreshPreview(file) {
    if (!PV.on || !$('.pv-stage')) return;
    const fs = frames(); const front = fs[PV.front], back = fs[1 - PV.front];
    let target = '/__preview/' + (file || PV.file);
    if (!file && !hosted()) { try { const p = front.contentWindow.location.pathname; if (p.startsWith('/__preview/')) target = p; } catch (e) { /* not loaded yet */ } }
    if (file) PV.file = file;
    const showPath = () => { try { $('.pv-path').textContent = hosted() ? '/' + PV.file.replace('index.html', '') : back.contentWindow.location.pathname.replace('/__preview/', '/').replace('/index.html', '/'); } catch (e) { /* ignore */ } };
    const token = ++PV.token;
    // swap as soon as the new page's HTML is in (it tells us), without waiting for every photo
    PV.swap = () => {
      if (token !== PV.token || !PV.swap) return;
      PV.swap = null;
      back.classList.add('front'); front.classList.remove('front'); PV.front = 1 - PV.front;
      showPath();
    };
    PV.pending = back;
    back.onload = () => { if (PV.swap) PV.swap(); };
    if (!hosted()) { back.src = target + '?v=' + Date.now(); return; }
    // online: the page is assembled right here in the browser from the unsaved content
    previewHtml(PV.file).then(html => { if (token === PV.token) back.srcdoc = html; })
      .catch(e => { if (token === PV.token) back.srcdoc = '<pre style="font:13px ui-monospace,monospace;padding:24px;white-space:pre-wrap">Preview error\n\n' + String(e.message).replace(/</g, '&lt;') + '</pre>'; });
  }
  async function previewHtml(file) {
    const core = RENDER.CORE.some(p => p.file === file);
    if (core && !templates[file]) { const r = await fetch('/' + file, { cache: 'no-store' }); if (!r.ok) throw new Error('Could not load ' + file); templates[file] = await r.text(); }
    let html = RENDER.renderPage(file, content, templates[file]);
    if (html == null) { PV.file = 'index.html'; return previewHtml('index.html'); }
    // the preview lives at /studio/, the pages at / — point every relative address at the site root
    html = html.replace(/<head>/i, m => m + '<base href="/">').replace('</head>', () => RENDER.previewInject(file) + '</head>')
      .replace(/(\s(?:src|href|poster)=")(?![a-z][a-z0-9+.-]*:|\/|#|\{|\$)/gi, '$1/');
    for (const u of pendingUp) if (blobs[u.path]) html = html.split(u.path).join(blobs[u.path]); // files not on the live site yet
    return html;
  }
  window.addEventListener('message', e => {
    if (e.origin !== location.origin || !e.data) return;
    if (e.data.studioNav && hosted()) { const f = frames()[PV.front]; if (f && e.source === f.contentWindow) refreshPreview(String(e.data.studioNav)); return; }
    if (!e.data.studioReady) return;
    if (PV.swap && PV.pending && e.source === PV.pending.contentWindow) PV.swap();
    else if (!hosted()) { try { const f = frames()[PV.front]; if (f && e.source === f.contentWindow) $('.pv-path').textContent = f.contentWindow.location.pathname.replace('/__preview/', '/').replace('/index.html', '/'); } catch (x) { /* ignore */ } }
  });
  function scrollPreview(selector) {
    if (!selector || !PV.on) return;
    const f = frames()[PV.front];
    try { if (f && f.contentWindow) f.contentWindow.postMessage({ studioScrollTo: selector }, location.origin); } catch (e) { /* ignore */ }
  }

  // ── status pill / save / publish ─────────────────────────────────────────
  function updateStatus() {
    const pill = $('#status'), d = dirty();
    const n = gitStatus ? gitStatus.changes.length : 0, ahead = gitStatus ? gitStatus.ahead : 0;
    let cls = 'ok', text = 'Live site is up to date';
    if (d) { cls = 'warn'; text = 'Unsaved changes'; }
    else if (n || ahead) { cls = 'info'; text = n ? `Saved · ${n} change${n === 1 ? '' : 's'} not published` : 'Saved · ready to publish'; }
    if (hosted()) { cls = d ? 'warn' : 'ok'; text = d ? 'Unpublished changes' : 'Live site is up to date'; }
    pill.className = 'pill ' + cls; pill.lastChild.textContent = text;
    $('#save').disabled = !d || busy;
    $('#discard').hidden = !d;
    $('#publish').disabled = busy || (hosted() ? !d : (!d && !n && !ahead));
    $('#save').hidden = hosted();
  }
  async function loadStatus() { try { gitStatus = await api('GET', '/api/status'); } catch (e) { gitStatus = null; } updateStatus(); if (route === 'overview') render(); }

  async function save(quiet) {
    if (!dirty()) return true;
    busy = true; updateStatus();
    try {
      const out = await api('PUT', '/api/content', content);
      savedJSON = JSON.stringify(content); gitStatus = out.status;
      if (!quiet) toast('Saved');
      refreshPreview();
      return true;
    } catch (e) {
      toast(e.message, 'error'); return false;
    } finally { busy = false; updateStatus(); renderSide(); }
  }
  async function discard() {
    if (!(await confirmBox('Discard unsaved changes?', 'Everything you changed since the last save will be undone.', 'Discard', true))) return;
    content = JSON.parse(savedJSON);
    try { await api('DELETE', '/api/draft'); } catch (e) { /* ignore */ }
    if (hosted()) { pendingUp = []; pendingDel = []; await loadMedia(); }
    render(); renderSide(); updateStatus(); refreshPreview();
  }
  const CODE = { M: 'Changed', A: 'New', D: 'Removed', R: 'Renamed', '??': 'New', '?': 'New' };
  // Online: one step — everything goes to GitHub as a single version and the site redeploys.
  function publishOnline() {
    const msg = h('input', { class: 'input', value: 'Update site content', 'aria-label': 'Version note' });
    const detail = h('pre', { class: 'detail', hidden: true });
    const bits = [];
    if (JSON.stringify(content) !== savedJSON) bits.push('your edits');
    if (pendingUp.length) bits.push(`${pendingUp.length} new file${pendingUp.length === 1 ? '' : 's'}`);
    if (pendingDel.length) bits.push(`${pendingDel.length} removed file${pendingDel.length === 1 ? '' : 's'}`);
    modal({
      title: 'Publish to the live site', size: 'md',
      body: [h('p', { class: 'muted' }, `This sends ${bits.join(', ')} to mecgroup.live. Visitors see the update about a minute later.`), h('label', { class: 'f-label' }, 'Note for this version'), msg, detail],
      footer: close => {
        const go = h('button', { class: 'btn primary', onclick: async () => {
          go.disabled = true; go.textContent = 'Publishing…'; detail.hidden = true; busy = true; updateStatus();
          try {
            const sent = JSON.stringify(content);
            const out = await api('PUT', '/api/content', { content, uploads: pendingUp.map(u => ({ path: u.path, sha: u.sha })), deletes: pendingDel, message: msg.value });
            savedJSON = sent; if (out.rev) rev = out.rev;
            pendingUp.forEach(u => { u.pending = false; }); pendingUp = []; pendingDel = [];
            close(); toast(out.changed.length ? 'Published — live in about a minute' : 'Nothing needed publishing');
          } catch (e) {
            detail.hidden = false; detail.textContent = e.message + (e.data && e.data.detail ? '\n\n' + e.data.detail : '');
            go.disabled = false; go.textContent = 'Try again';
          }
          busy = false; updateStatus(); loadStatus(); renderSide();
        } }, icon('cloud', 16), 'Publish');
        return [h('button', { class: 'btn', onclick: close }, 'Not now'), go];
      }
    });
  }
  async function publish() {
    if (hosted()) return publishOnline();
    if (dirty() && !(await save(true))) return;
    await loadStatus();
    if (!gitStatus || !gitStatus.git) return toast('This folder is not connected to GitHub, so there is nowhere to publish to.', 'error');
    const msg = h('input', { class: 'input', value: 'Update site content', 'aria-label': 'Version note' });
    const detail = h('pre', { class: 'detail', hidden: true });
    const list = gitStatus.changes.length
      ? h('ul', { class: 'changes' }, gitStatus.changes.map(c => h('li', {}, h('span', { class: 'chip ' + (c.code === 'D' ? 'red' : c.code === 'M' ? '' : 'green') }, CODE[c.code] || 'Changed'), h('span', { class: 'mono' }, c.file))))
      : h('p', { class: 'muted' }, `${gitStatus.ahead} saved version${gitStatus.ahead === 1 ? '' : 's'} waiting to be sent.`);
    modal({
      title: 'Publish to the live site', size: 'md',
      body: [h('p', { class: 'muted' }, 'These changes will be sent to GitHub. The live site at mecgroup.live updates a minute or two after, once your host picks them up.'),
        list, h('label', { class: 'f-label' }, 'Note for this version'), msg, detail],
      footer: close => {
        const go = h('button', { class: 'btn primary', onclick: async () => {
          go.disabled = true; go.textContent = 'Publishing…'; detail.hidden = true;
          try {
            await api('POST', '/api/publish', { message: msg.value });
            close(); toast('Published — the live site will update shortly');
          } catch (e) {
            detail.hidden = false; detail.textContent = e.message + (e.data.detail ? '\n\n' + e.data.detail : '');
            go.disabled = false; go.textContent = 'Try again';
          }
          loadStatus();
        } }, icon('cloud', 16), 'Publish');
        return [h('button', { class: 'btn', onclick: close }, 'Not now'), go];
      }
    });
  }

  // ── media: library, picker, upload ───────────────────────────────────────
  const usage = p => JSON.stringify(content).split(JSON.stringify(p)).length - 1;
  async function loadMedia() {
    try { media = (await api('GET', '/api/media')).files; } catch (e) { media = []; }
    if (hosted()) media = [...pendingUp, ...media.filter(f => !pendingDel.includes(f.path) && !pendingUp.some(u => u.path === f.path))];
  }

  function thumb(path, cls) {
    if (!path) return h('div', { class: 'thumb empty ' + (cls || '') }, icon('image', 20));
    const src = mediaUrl(path);
    // online, a file published moments ago may not be on the live site yet — fall back to GitHub's copy
    const late = hosted() && !blobs[path] ? e => { const el = e.target; if (!el.dataset.late) { el.dataset.late = '1'; el.src = '/api/file?path=' + encodeURIComponent(path); } } : null;
    return isVideo(path)
      ? h('div', { class: 'thumb ' + (cls || '') }, h('video', { src: src + (blobs[path] ? '' : '#t=0.1'), muted: true, preload: 'metadata', playsinline: true, onerror: late }), h('span', { class: 'thumb-play' }, icon('play', 12)))
      : h('div', { class: 'thumb ' + (cls || '') }, h('img', { src, loading: 'lazy', alt: '', onerror: late }));
  }

  // Large phone/camera photos are scaled to 2400px and saved as JPEG so pages stay fast.
  async function prepare(file) {
    if (!/^image\/(jpeg|png|webp|heic|heif)$/.test(file.type)) return { blob: file, name: file.name };
    let bmp;
    try { bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }); }
    catch (e) { if (/hei[cf]/.test(file.type)) throw new Error(`${file.name}: this browser cannot read HEIC photos — export it as JPG first.`); return { blob: file, name: file.name }; }
    const MAX = 2400, long = Math.max(bmp.width, bmp.height);
    const mustConvert = /hei[cf]/.test(file.type);
    if (!mustConvert && long <= MAX && (file.type !== 'image/jpeg' || file.size < 1.5 * 1048576)) return { blob: file, name: file.name };
    if (!mustConvert && file.type === 'image/png' && long <= MAX) return { blob: file, name: file.name };
    const k = Math.min(1, MAX / long), cv = document.createElement('canvas');
    cv.width = Math.round(bmp.width * k); cv.height = Math.round(bmp.height * k);
    cv.getContext('2d').drawImage(bmp, 0, 0, cv.width, cv.height);
    const blob = await new Promise(r => cv.toBlob(r, 'image/jpeg', 0.86));
    if (!blob || (!mustConvert && k === 1 && blob.size >= file.size)) return { blob: file, name: file.name };
    return { blob, name: file.name.replace(/\.[^.]+$/, '') + '.jpg' };
  }
  async function uploadFiles(fileList, onProgress) {
    const added = [], files = [...fileList];
    for (let i = 0; i < files.length; i++) {
      if (onProgress) onProgress(`Adding ${i + 1} of ${files.length}…`);
      try {
        const { blob, name } = await prepare(files[i]);
        if (hosted() && blob.size > 4 * 1048576) throw new Error(`${name} is ${fmtSize(blob.size)}. Online, files can be up to 4 MB — add larger videos from the studio on your computer.`);
        const f = await api('POST', '/api/media?name=' + encodeURIComponent(name) + (hosted() ? '&avoid=' + encodeURIComponent(pendingUp.map(u => u.path).join(',')) : ''), blob, true);
        if (hosted()) { blobs[f.path] = URL.createObjectURL(blob); pendingUp.push(f); }
        media.unshift(f); added.push(f);
      } catch (e) { toast(e.message, 'error'); }
    }
    if (onProgress) onProgress('');
    if (added.length) { toast(`Added ${added.length} file${added.length === 1 ? '' : 's'} to the library`); if (hosted()) updateStatus(); else loadStatus(); renderSide(); }
    return added;
  }

  // Shared grid used by the Media screen and the picker.
  function mediaBrowser({ kind, multi, onPick, manage }) {
    let q = '', filter = kind || 'all';
    const selected = new Set();
    const grid = h('div', { class: 'media-grid' });
    const note = h('span', { class: 'muted small' });
    const input = h('input', { type: 'file', multiple: true, hidden: true, accept: 'image/*,video/mp4,video/webm,video/quicktime',
      onchange: async () => { const added = await uploadFiles(input.files, t => { note.textContent = t; }); input.value = ''; if (multi) added.forEach(f => selected.add(f.path)); draw(); if (wrap.onchange) wrap.onchange(); } });
    const seg = h('div', { class: 'seg' }, [['all', 'All'], ['image', 'Photos'], ['video', 'Videos']].map(([v, l]) =>
      h('button', { class: v === filter ? 'on' : '', onclick: e => { filter = v; [...seg.children].forEach(b => b.classList.toggle('on', b === e.currentTarget)); draw(); } }, l)));
    const bar = h('div', { class: 'media-bar' },
      h('label', { class: 'search' }, icon('search', 16), h('input', { placeholder: 'Search files', 'aria-label': 'Search files', oninput: e => { q = e.target.value.toLowerCase(); draw(); } })),
      kind ? null : seg, note, h('span', { class: 'grow' }),
      h('button', { class: 'btn primary', onclick: () => input.click() }, icon('upload', 16), 'Add photos or videos'), input);
    function draw() {
      grid.innerHTML = '';
      const items = media.filter(f => (filter === 'all' || f.kind === filter) && (!q || f.path.toLowerCase().includes(q)));
      if (!items.length) grid.append(h('div', { class: 'empty-state' }, icon('photos', 28), h('p', {}, media.length ? 'Nothing matches that search.' : 'No files yet — add some photos or videos.')));
      items.forEach(f => {
        const used = usage(f.path);
        const card = h('button', { class: 'media-card' + (selected.has(f.path) ? ' sel' : ''), title: f.path, onclick: () => {
          if (multi) { selected.has(f.path) ? selected.delete(f.path) : selected.add(f.path); card.classList.toggle('sel'); if (wrap.onchange) wrap.onchange(); }
          else onPick(f);
        } }, thumb(f.path), h('span', { class: 'media-name' }, f.name),
          h('span', { class: 'media-meta' }, fmtSize(f.size), f.pending ? h('span', { class: 'chip' }, 'New') : manage ? h('span', { class: 'chip ' + (used ? 'green' : '') }, used ? `In use${used > 1 ? ' ×' + used : ''}` : 'Unused') : null),
          multi ? h('span', { class: 'media-check' }, icon('check', 14)) : null);
        grid.append(card);
      });
    }
    const wrap = h('div', { class: 'media-browser',
      ondragover: e => { e.preventDefault(); wrap.classList.add('drop'); }, ondragleave: e => { if (!wrap.contains(e.relatedTarget)) wrap.classList.remove('drop'); },
      ondrop: async e => { e.preventDefault(); wrap.classList.remove('drop'); if (!e.dataTransfer.files.length) return; const added = await uploadFiles(e.dataTransfer.files, t => { note.textContent = t; }); if (multi) added.forEach(f => selected.add(f.path)); draw(); if (wrap.onchange) wrap.onchange(); } },
      bar, grid, h('div', { class: 'drop-hint' }, icon('upload', 28), 'Drop to add to the library'));
    wrap.selected = () => media.filter(f => selected.has(f.path));
    wrap.redraw = draw;
    draw();
    return wrap;
  }
  function pickMedia({ kind, multi }) {
    return new Promise(resolve => {
      let result = null;
      const browser = mediaBrowser({ kind, multi, onPick: f => { result = f; close(); } });
      const add = h('button', { class: 'btn primary', disabled: true }, 'Add');
      browser.onchange = () => { const k = browser.selected().length; add.disabled = !k; add.textContent = k ? `Add ${k}` : 'Add'; };
      const close = modal({ title: multi ? 'Choose photos and videos' : 'Choose a file', size: 'xl', body: browser, onClose: () => resolve(result),
        footer: multi ? c => { add.onclick = () => { result = browser.selected(); c(); }; return [h('button', { class: 'btn', onclick: c }, 'Cancel'), add]; } : null });
    });
  }
  function mediaDetail(f, after) {
    const used = usage(f.path);
    const close = modal({
      title: f.name, size: 'md',
      body: [h('div', { class: 'detail-media' }, isVideo(f.path) ? h('video', { src: mediaUrl(f.path), controls: true, muted: true }) : h('img', { src: mediaUrl(f.path), alt: '' })),
        h('dl', { class: 'meta' }, h('dt', {}, 'Location'), h('dd', { class: 'mono' }, f.path), h('dt', {}, 'Size'), h('dd', {}, fmtSize(f.size)),
          h('dt', {}, 'On the site'), h('dd', {}, used ? `Used in ${used} place${used === 1 ? '' : 's'}` : 'Not used anywhere'))],
      footer: c => [
        h('button', { class: 'btn danger-ghost', disabled: !!used, title: used ? 'Remove it from the pages first' : '', onclick: async () => {
          if (hosted()) {
            if (!(await confirmBox('Remove this file?', f.pending ? 'It has not been published yet, so it is simply dropped.' : 'It is taken off the site the next time you publish.', 'Remove', true))) return;
            if (f.pending) pendingUp = pendingUp.filter(u => u.path !== f.path); else pendingDel.push(f.path);
            media = media.filter(m => m.path !== f.path); c(); after(); updateStatus(); renderSide(); return;
          }
          if (!(await confirmBox('Remove this file?', 'It moves to the .studio-trash folder inside the site folder, so it can be recovered.', 'Remove', true))) return;
          try { await api('DELETE', '/api/media?path=' + encodeURIComponent(f.path)); media = media.filter(m => m.path !== f.path); toast('Moved to .studio-trash'); c(); after(); loadStatus(); renderSide(); }
          catch (e) { toast(e.message, 'error'); }
        } }, icon('trash', 16), 'Remove'),
        h('span', { class: 'grow' }),
        h('button', { class: 'btn', onclick: () => { navigator.clipboard.writeText(f.path).then(() => toast('Location copied')); } }, icon('copy', 16), 'Copy location'),
        h('button', { class: 'btn primary', onclick: c }, 'Done')]
    });
    return close;
  }

  // ── fields ───────────────────────────────────────────────────────────────
  const grow = ta => { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 2 + 'px'; };
  const pageLinks = () => ['index.html', 'index.html#about', 'estimator.html', 'estimator.html#services', 'projects.html', 'projects.html#partners', 'contact.html',
    ...(content.pages || []).map(p => p.slug + '.html'), 'mailto:{email}', 'tel:{tel}', '{projex}'];

  function field(obj, f, onInput) {
    const val = () => get(obj, f.key);
    const put = v => { set(obj, f.key, v); if (onInput) onInput(); changed(); };
    const wrap = h('div', { class: 'f ' + (f.w === 'half' ? 'half' : '') + (f.type === 'bool' ? ' f-bool' : '') });
    const counter = f.max ? h('span', { class: 'count' }) : null;
    const tick = () => { if (counter) { const n = String(val() || '').length; counter.textContent = `${n}/${f.max}`; counter.classList.toggle('over', n > f.max); } };
    if (f.label && f.type !== 'bool') wrap.append(h('div', { class: 'f-label' }, h('span', {}, f.label), counter));
    let ctl;
    switch (f.type) {
      case 'text': case 'lines': {
        const v = f.type === 'lines' ? (Array.isArray(val()) ? val() : []).join('\n') : (val() == null ? '' : val());
        ctl = h('textarea', { class: 'input', rows: f.rows || 3, 'aria-label': f.label, oninput: e => { put(f.type === 'lines' ? e.target.value.split('\n').map(x => x.trim()).filter(Boolean) : e.target.value); grow(e.target); tick(); } });
        ctl.value = v; ctl.dataset.grow = '1';
        break;
      }
      case 'number': {
        const inp = h('input', { class: 'input', type: 'number', step: f.step || 'any', min: 0, 'aria-label': f.label, oninput: e => { const x = parseFloat(e.target.value); if (!isNaN(x)) put(x); } });
        inp.value = val() == null ? '' : val();
        ctl = h('div', { class: 'affix' }, f.unit === '$' ? h('span', { class: 'pre' }, '$') : null, inp, f.unit && f.unit !== '$' ? h('span', { class: 'post' }, f.unit) : null);
        break;
      }
      case 'range': {
        const cur = () => (Array.isArray(val()) ? val() : [0, 0]);
        const mk = i => { const inp = h('input', { class: 'input', type: 'number', step: 'any', min: 0, 'aria-label': `${f.label} ${i ? 'high' : 'low'}`, oninput: e => { const x = parseFloat(e.target.value); if (isNaN(x)) return; const a = cur().slice(); a[i] = x; put(a); } }); inp.value = cur()[i]; return h('div', { class: 'affix' }, h('span', { class: 'pre' }, '$'), inp); };
        ctl = h('div', { class: 'range' }, mk(0), h('span', { class: 'muted' }, 'to'), mk(1));
        break;
      }
      case 'bool': {
        const inp = h('input', { type: 'checkbox', role: 'switch', onchange: e => put(e.target.checked) }); inp.checked = !!val();
        ctl = h('label', { class: 'switch-row' }, h('span', {}, f.label), h('span', { class: 'switch' }, inp, h('i', {})));
        break;
      }
      case 'select': {
        ctl = h('select', { class: 'input', 'aria-label': f.label, onchange: e => put(e.target.value) }, f.options.map(([v, l]) => h('option', { value: v }, l)));
        ctl.value = val() == null ? f.options[0][0] : val();
        break;
      }
      case 'tags': {
        const box = h('div', { class: 'tags' });
        const arr = () => { let a = val(); if (!Array.isArray(a)) { a = []; set(obj, f.key, a); } return a; };
        const inp = h('input', { placeholder: 'Type and press Return', 'aria-label': f.label, onkeydown: e => {
          if ((e.key === 'Enter' || e.key === ',') && inp.value.trim()) { e.preventDefault(); arr().push(inp.value.trim()); inp.value = ''; put(arr()); draw(); inp.focus(); }
          else if (e.key === 'Backspace' && !inp.value && arr().length) { arr().pop(); put(arr()); draw(); inp.focus(); }
        }, onblur: () => { if (inp.value.trim()) { arr().push(inp.value.trim()); inp.value = ''; put(arr()); draw(); } } });
        const draw = () => { box.innerHTML = ''; arr().forEach((tg, i) => box.append(h('span', { class: 'tagchip' }, tg, h('button', { 'aria-label': 'Remove ' + tg, onclick: () => { arr().splice(i, 1); put(arr()); draw(); } }, icon('x', 11))))); box.append(inp); };
        draw(); ctl = box;
        break;
      }
      case 'media': {
        const box = h('div', { class: 'media-field' });
        const draw = () => {
          box.innerHTML = '';
          box.append(thumb(val(), 'lg'), h('div', { class: 'media-field-info' },
            h('span', { class: 'mono small' }, val() ? String(val()).split('/').pop() : 'Nothing chosen'),
            h('div', { class: 'row' },
              h('button', { class: 'btn sm', onclick: async () => { const f2 = await pickMedia({ kind: f.kind }); if (f2) { put(f2.path); draw(); } } }, val() ? 'Replace' : 'Choose'),
              val() ? h('button', { class: 'btn sm ghost', onclick: () => { put(''); draw(); } }, 'Clear') : null)));
        };
        draw(); ctl = box;
        break;
      }
      default: { // string, link
        const id = 'dl' + Math.random().toString(36).slice(2);
        const inp = h('input', { class: 'input', type: 'text', 'aria-label': f.label, placeholder: f.placeholder || '', list: f.type === 'link' || f.suggest ? id : null,
          oninput: e => { let v = e.target.value; if (f.slug) { v = v.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+/, ''); if (v !== e.target.value) e.target.value = v; } put(v); tick(); } });
        inp.value = val() == null ? '' : val();
        const dl = f.type === 'link' ? h('datalist', { id }, pageLinks().map(v => h('option', { value: v })))
          : f.suggest ? h('datalist', { id }, [...new Set(content.projects.gallery.map(g => g[f.suggest]).filter(Boolean))].sort().map(v => h('option', { value: v }))) : null;
        ctl = f.prefix || f.suffix ? h('div', { class: 'affix' }, f.prefix ? h('span', { class: 'pre' }, f.prefix) : null, inp, f.suffix ? h('span', { class: 'post' }, f.suffix) : null, dl) : h('div', {}, inp, dl);
      }
    }
    wrap.append(ctl);
    if (f.help) wrap.append(h('p', { class: 'help' }, f.help));
    tick();
    return wrap;
  }

  function fieldGrid(obj, fields, onInput) {
    return h('div', { class: 'fields' }, fields.map(f => (f.type === 'array' ? arrayField(obj, f, onInput) : field(obj, f, onInput))));
  }

  // ── repeatable lists (rows or photo grid), drag to reorder ───────────────
  function arrayField(obj, f, onInput) {
    const arr = () => { let a = get(obj, f.key); if (!Array.isArray(a)) { a = []; set(obj, f.key, a); } return a; };
    const wrap = h('div', { class: 'f arr-wrap' });
    if (f.label) wrap.append(h('div', { class: 'f-label' }, h('span', {}, f.label), h('span', { class: 'count' })));
    const tools = h('div', { class: 'arr-tools' });
    const listEl = h('div', { class: f.layout === 'grid' ? 'arr-grid' : 'arr-list' });
    let open = -1, dragFrom = -1, filterVal = '';
    const fieldsOf = it => (f.variants ? (f.variants[it.type] || { fields: [] }).fields : f.fields);
    const touch = () => { if (onInput) onInput(); changed(); };
    const move = (from, to) => { const a = arr(); if (from === to || from < 0) return; const [x] = a.splice(from, 1); a.splice(to > from ? to - 1 : to, 0, x); open = -1; touch(); draw(); };
    const dnd = (el, i, horizontal) => {
      el.addEventListener('dragover', e => { if (dragFrom < 0) return; e.preventDefault(); const r = el.getBoundingClientRect(); const after = horizontal ? e.clientX > r.left + r.width / 2 : e.clientY > r.top + r.height / 2; el.classList.toggle('drop-before', !after); el.classList.toggle('drop-after', after); });
      el.addEventListener('dragleave', () => el.classList.remove('drop-before', 'drop-after'));
      el.addEventListener('drop', e => { if (dragFrom < 0) return; e.preventDefault(); e.stopPropagation(); const after = el.classList.contains('drop-after'); el.classList.remove('drop-before', 'drop-after'); move(dragFrom, after ? i + 1 : i); dragFrom = -1; });
      el.addEventListener('dragend', () => { dragFrom = -1; listEl.querySelectorAll('.dragging').forEach(x => x.classList.remove('dragging')); });
    };
    const startDrag = (el, i) => e => { dragFrom = i; e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', String(i)); } catch (x) { /* ignore */ } requestAnimationFrame(() => el.classList.add('dragging')); };

    function editItem(it, i) { // grid items open in a sheet
      const title = h('span', {}, f.title(it));
      const prev = h('div', { class: 'sheet-preview' });
      const drawPrev = () => { prev.innerHTML = ''; const p = f.thumb(it); prev.append(p ? (isVideo(p) ? h('video', { src: mediaUrl(p), controls: true, muted: true, loop: true }) : h('img', { src: mediaUrl(p), alt: '' })) : h('div', { class: 'thumb empty' }, icon('image', 28))); };
      drawPrev();
      const body = h('div', { class: 'sheet' }, prev, fieldGrid(it, fieldsOf(it), () => { title.textContent = f.title(it); drawPrev(); if (onInput) onInput(); }));
      modal({ title: 'Edit item', size: 'lg', body, onClose: draw,
        footer: close => [
          h('button', { class: 'btn danger-ghost', onclick: () => { arr().splice(i, 1); touch(); close(); } }, icon('trash', 16), 'Remove from page'),
          h('span', { class: 'grow' }),
          h('button', { class: 'btn primary', onclick: close }, 'Done')] });
    }

    function draw() {
      const a = arr();
      const cnt = wrap.querySelector('.f-label .count'); if (cnt) cnt.textContent = a.length;
      listEl.innerHTML = ''; tools.innerHTML = '';
      if (f.filter) {
        const tags = [...new Set(a.map(x => x[f.filter]).filter(Boolean))].sort();
        if (filterVal && !tags.includes(filterVal)) filterVal = '';
        tools.append(h('div', { class: 'chips' }, h('button', { class: 'fchip' + (filterVal ? '' : ' on'), onclick: () => { filterVal = ''; draw(); } }, `All · ${a.length}`),
          tags.map(tg => h('button', { class: 'fchip' + (filterVal === tg ? ' on' : ''), onclick: () => { filterVal = tg; draw(); } }, `${tg} · ${a.filter(x => x[f.filter] === tg).length}`))));
      }
      a.forEach((it, i) => {
        if (filterVal && it[f.filter] !== filterVal) return;
        if (f.layout === 'grid') {
          const badge = f.badge ? f.badge(it) : '';
          const card = h('div', { class: 'g-card' + (f.dim && f.dim(it) ? ' dim' : ''), draggable: !filterVal, tabindex: 0, role: 'button', 'aria-label': 'Edit ' + f.title(it),
            onclick: () => editItem(it, i), onkeydown: e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); editItem(it, i); } } },
            thumb(f.thumb(it)), badge ? h('span', { class: 'g-badge' }, badge) : null, h('span', { class: 'g-cap' }, f.title(it)));
          card.addEventListener('dragstart', startDrag(card, i)); dnd(card, i, true);
          listEl.append(card);
          return;
        }
        const titleEl = h('span', { class: 'row-title' }), subEl = h('span', { class: 'row-sub' });
        const paint = () => { titleEl.textContent = (f.title && f.title(it)) || 'Untitled'; subEl.textContent = f.sub ? String(f.sub(it) || '') : ''; };
        paint();
        const handle = h('span', { class: 'grip', title: 'Drag to reorder', draggable: true }, icon('grip', 16));
        const row = h('div', { class: 'row-item' + (open === i ? ' open' : '') });
        handle.addEventListener('dragstart', startDrag(row, i));
        const th = f.thumb && f.thumb(it) ? thumb(f.thumb(it), 'sm') : null;
        const badge = f.badge && f.badge(it) ? h('span', { class: 'chip' }, f.badge(it)) : null;
        const head = h('div', { class: 'row-head' }, handle,
          h('button', { class: 'row-main', 'aria-expanded': open === i, onclick: () => { open = open === i ? -1 : i; draw(); } },
            h('span', { class: 'row-num' }, String(i + 1)), th, h('span', { class: 'row-text' }, titleEl, subEl), badge),
          h('button', { class: 'icon-btn', title: 'Duplicate', 'aria-label': 'Duplicate', onclick: () => { a.splice(i + 1, 0, JSON.parse(JSON.stringify(it))); open = i + 1; touch(); draw(); } }, icon('copy', 16)),
          h('button', { class: 'icon-btn', title: 'Remove', 'aria-label': 'Remove', onclick: () => { a.splice(i, 1); open = -1; touch(); draw(); } }, icon('trash', 16)),
          h('span', { class: 'row-chev' }, icon('chevron', 16)));
        row.append(head);
        if (open === i) row.append(h('div', { class: 'row-body' }, fieldGrid(it, fieldsOf(it), paint)));
        dnd(row, i, false);
        listEl.append(row);
      });
      if (!a.length) listEl.append(h('div', { class: 'empty-state sm' }, 'Nothing here yet.'));
      requestAnimationFrame(() => listEl.querySelectorAll('textarea[data-grow]').forEach(grow));
    }

    const addBtn = h('button', { class: 'btn add', onclick: async e => {
      if (f.fromMedia) {
        const picked = await pickMedia({ kind: f.kind, multi: true });
        if (picked && picked.length) { picked.forEach(p => arr().push(f.fromMedia(p))); touch(); draw(); }
      } else if (f.variants) {
        const menu = h('div', { class: 'menu' }, Object.entries(f.variants).map(([k, v]) => h('button', { onclick: () => { arr().push(v.make()); open = arr().length - 1; touch(); draw(); menu.remove(); } }, icon(v.icon, 16), v.label)));
        const off = ev => { if (!menu.contains(ev.target) && !addBtn.contains(ev.target)) { menu.remove(); document.removeEventListener('mousedown', off); } };
        addBtn.after(menu); setTimeout(() => document.addEventListener('mousedown', off));
      } else { arr().push(f.make()); open = arr().length - 1; touch(); draw(); }
    } }, icon('plus', 16), f.addLabel || (f.fromMedia ? 'Add from library' : 'Add'));
    wrap.append(tools, listEl, h('div', { class: 'arr-foot' }, addBtn, f.help ? h('p', { class: 'help' }, f.help) : null));
    draw();
    return wrap;
  }

  // ── screens ──────────────────────────────────────────────────────────────
  function sectionCard(docId, sec, idx) {
    const base = sec.path ? get(content, sec.path) : content;
    const key = docId + ':' + idx;
    if (!openSections.has(key)) openSections.set(key, !!sec.open || idx === 0);
    const body = h('div', { class: 'card-b' });
    const card = h('section', { class: 'card' + (sec.plain ? ' plain' : '') });
    const fill = () => { if (!body.firstChild && base) { body.append(fieldGrid(base, sec.fields)); requestAnimationFrame(() => body.querySelectorAll('textarea[data-grow]').forEach(grow)); } };
    const apply = () => { const on = openSections.get(key); card.classList.toggle('open', on); head.setAttribute('aria-expanded', on); if (on) fill(); };
    const head = h('button', { class: 'card-h', onclick: () => { openSections.set(key, !openSections.get(key)); apply(); if (openSections.get(key)) scrollPreview(sec.anchor); } },
      h('span', { class: 'card-ic' }, icon(sec.icon || 'doc', 17)), h('span', { class: 'card-t' }, h('strong', {}, sec.title), sec.desc ? h('small', {}, sec.desc) : null), h('span', { class: 'card-chev' }, icon('chevron', 16)));
    if (!sec.plain) card.append(head);
    card.append(body);
    card.addEventListener('focusin', e => { if (e.target !== head) scrollPreview(sec.anchor); });
    if (sec.plain) { card.classList.add('open'); fill(); } else apply();
    return card;
  }

  const val = (v) => (typeof v === 'function' ? v() : v);
  let liveHead = null; // keeps the screen title in step while a page is renamed
  function renderDoc(id, doc) {
    const main = $('#editor');
    const h1 = h('h1', {}, val(doc.title)), sub = h('p', {}, val(doc.sub) || '');
    liveHead = () => { h1.textContent = val(doc.title); sub.textContent = val(doc.sub) || ''; $('#crumb').textContent = val(doc.title); };
    main.append(h('div', { class: 'page-head' }, doc.back ? h('a', { class: 'back', href: '#/' + doc.back }, icon('back', 15), 'All pages') : null, h1, sub));
    doc.sections.forEach((sec, i) => main.append(sectionCard(id, sec, i)));
  }

  function renderOverview() {
    const main = $('#editor');
    const hour = new Date().getHours();
    const n = gitStatus ? gitStatus.changes.length + (gitStatus.ahead ? 1 : 0) : 0;
    const tile = (num, label, href, ic) => h('a', { class: 'tile', href }, h('span', { class: 'tile-ic' }, icon(ic, 18)), h('strong', {}, String(num)), h('span', {}, label));
    const jump = id => { const d = docs[id]; return h('a', { class: 'jump', href: '#/' + id }, h('span', { class: 'jump-ic' }, icon(d.icon, 20)), h('span', {}, h('strong', {}, d.title), h('small', {}, val(d.sub))), icon('chevron', 16)); };
    main.append(
      h('div', { class: 'hero' },
        h('p', { class: 'eyebrow' }, 'MEC Studio'),
        h('h1', {}, hour < 12 ? 'Good morning.' : hour < 18 ? 'Good afternoon.' : 'Good evening.'),
        h('p', {}, dirty() ? (hosted() ? 'You have changes that are not published yet.' : 'You have unsaved changes.') : n ? 'Your saved changes are ready to publish.' : 'Everything on the live site matches what you see here.')),
      h('div', { class: 'tiles' },
        tile(4 + content.pages.length, 'Pages', '#/pages', 'doc'),
        tile(content.projects.gallery.length, 'Gallery items', '#/gallery', 'photos'),
        tile(media.length, 'Files in library', '#/media', 'folder'),
        hosted() ? tile(content.projects.gallery.filter(g => /\.(mp4|webm|mov)$/i.test(g.src)).length, 'Videos on the wall', '#/gallery', 'play')
          : tile(gitStatus ? gitStatus.changes.length : '–', 'Unpublished changes', '#/overview', 'cloud')),
      hosted() ? statsPanel() : null,
      h('h2', { class: 'sec-title' }, 'Pages'), h('div', { class: 'jumps' }, ['home', 'estimator', 'projects', 'contact'].map(jump)),
      h('h2', { class: 'sec-title' }, 'Collections & site'), h('div', { class: 'jumps' }, ['gallery', 'pricing', 'settings', 'nav', 'footer'].map(jump)),
      h('h2', { class: 'sec-title' }, 'How it works'),
      h('ol', { class: 'how' },
        h('li', {}, h('strong', {}, 'Edit'), 'Change words, photos and prices. The preview on the right updates as you type.'),
        hosted() ? h('li', {}, h('strong', {}, 'Check'), 'Nothing is public while you work. Use the desktop, tablet and phone buttons to see every size.')
          : h('li', {}, h('strong', {}, 'Save'), 'Writes your changes into the site’s files on this computer. Nothing is public yet.'),
        h('li', {}, h('strong', {}, 'Publish'), hosted() ? 'Sends everything to the live site. Visitors see it about a minute later.' : 'Sends the saved changes to GitHub so the live site updates.')),
      gitStatus && gitStatus.last && gitStatus.last.subject ? h('p', { class: 'muted small foot' }, `Last published version: “${gitStatus.last.subject}” · ${gitStatus.last.when || ago(gitStatus.last.at)}`) : null);
  }

  const ago = iso => { const s = (Date.now() - new Date(iso).getTime()) / 1000; if (!(s >= 0)) return ''; const u = [[86400, 'day'], [3600, 'hour'], [60, 'minute']].find(x => s >= x[0]); if (!u) return 'just now'; const k = Math.floor(s / u[0]); return `${k} ${u[1]}${k === 1 ? '' : 's'} ago`; };
  const compact = v => (v >= 10000 ? (v / 1000).toFixed(v >= 100000 ? 0 : 1).replace(/\.0$/, '') + 'K' : v.toLocaleString());
  const niceMax = v => { if (v <= 4) return 4; const p = Math.pow(10, Math.floor(Math.log10(v))); return [1, 2, 4, 5, 10].map(m => m * p).find(m => m >= v); };
  const dayLabel = (d, long) => new Date(d + 'T12:00:00').toLocaleDateString(undefined, long ? { weekday: 'short', month: 'short', day: 'numeric' } : { month: 'short', day: 'numeric' });
  const PAGE_NAMES = { '/': 'Home', '/estimator.html': 'Estimate request', '/projects.html': 'Work portfolio', '/contact.html': 'Contact' };
  let statsDays = Number(store.get('studio-stats-days', '30')) || 30;

  // Site activity: headline numbers, one bar per day, top pages. Counts come from /api/stats.
  function statsPanel() {
    const body = h('div', { class: 'stats-body' }, h('p', { class: 'muted small' }, 'Loading activity…'));
    const seg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Time range' }, [7, 30, 90].map(d =>
      h('button', { class: d === statsDays ? 'on' : '', onclick: e => { statsDays = d; store.set('studio-stats-days', String(d)); [...seg.children].forEach(b => b.classList.toggle('on', b === e.currentTarget)); load(); } }, d + ' days')));
    const wrap = h('section', { class: 'stats' }, h('div', { class: 'stats-head' }, h('h2', { class: 'sec-title' }, 'Site activity'), seg), body);
    const sum = (rows, k) => rows.reduce((a, r) => a + (r[k] || 0), 0);
    async function load() {
      let data;
      try { data = await api('GET', '/api/stats?days=' + statsDays * 2); }
      catch (e) { body.innerHTML = ''; body.append(h('p', { class: 'muted small' }, 'Activity could not be loaded: ' + e.message)); return; }
      body.innerHTML = '';
      if (!data.connected) { body.append(h('div', { class: 'card stats-note' }, h('strong', {}, 'Activity is not connected yet'), h('p', { class: 'muted' }, 'Page views and form counts appear here once the stats store is added to the Vercel project.'))); return; }
      const cur = data.days.slice(-statsDays), prev = data.days.slice(0, -statsDays);
      const forms = r => (r.contact || 0) + (r.estimate || 0) + (r.inspection || 0);
      const total = (rows, f) => (typeof f === 'function' ? rows.reduce((a, r) => a + f(r), 0) : sum(rows, f));
      const tile = (label, f, hint) => {
        const v = total(cur, f), p = total(prev, f);
        const delta = p ? Math.round((v - p) / p * 100) : null;
        return h('div', { class: 'tile stat' }, h('span', { class: 'stat-label' }, label), h('strong', {}, compact(v)),
          h('span', { class: 'stat-delta' }, delta == null ? (hint || 'No earlier data to compare') : `${delta > 0 ? '▲' : delta < 0 ? '▼' : '•'} ${Math.abs(delta)}% vs previous ${statsDays} days`));
      };
      body.append(h('div', { class: 'tiles' }, tile('Page views', 'views'), tile('Visitors', 'visitors', 'Counted once per day'), tile('Form submissions', forms), tile('Contact enquiries', 'contact')),
        h('div', { class: 'mini-stats' }, [['Estimates sent', 'estimate'], ['Inspection bookings', 'inspection'], ['Phone taps', 'call'], ['Email taps', 'email']].map(([l, k]) =>
          h('div', {}, h('strong', {}, compact(sum(cur, k))), h('span', {}, l)))));

      // daily page views — one series, so the title names it and there is no legend
      const max = niceMax(Math.max(...cur.map(r => r.views), 1));
      const tip = h('div', { class: 'chart-tip', hidden: true });
      const cols = h('div', { class: 'chart-cols' }, cur.map(r => {
        const col = h('div', { class: 'chart-col', tabindex: 0, 'aria-label': `${dayLabel(r.date, true)}: ${r.views} page views, ${r.visitors} visitors, ${forms(r)} form submissions` },
          h('i', { style: `height:${r.views ? Math.max(2, r.views / max * 100) : 0}%` }));
        const show = () => { tip.hidden = false; tip.innerHTML = ''; tip.append(h('strong', {}, dayLabel(r.date, true)), h('span', {}, h('b', {}), `${r.views.toLocaleString()} page views`), h('span', {}, `${r.visitors.toLocaleString()} visitors`), h('span', {}, `${forms(r)} form submission${forms(r) === 1 ? '' : 's'}`));
          const box = cols.getBoundingClientRect(), c = col.getBoundingClientRect(); const x = c.left + c.width / 2 - box.left; tip.style.left = Math.min(Math.max(x, 80), box.width - 80) + 'px'; };
        col.addEventListener('mouseenter', show); col.addEventListener('focus', show);
        col.addEventListener('mouseleave', () => { tip.hidden = true; }); col.addEventListener('blur', () => { tip.hidden = true; });
        return col;
      }));
      const pick = [0, Math.floor((cur.length - 1) / 2), cur.length - 1];
      const chart = h('div', { class: 'card chart' },
        h('div', { class: 'chart-head' }, h('strong', {}, 'Page views per day'), h('span', { class: 'muted small' }, `${dayLabel(cur[0].date)} – ${dayLabel(cur[cur.length - 1].date)} · Eastern time`)),
        h('div', { class: 'chart-plot' },
          h('div', { class: 'chart-y', 'aria-hidden': 'true' }, [max, max / 2, 0].map(v => h('span', {}, compact(v)))),
          h('div', { class: 'chart-area' }, h('div', { class: 'chart-grid', 'aria-hidden': 'true' }, h('i', {}), h('i', {}), h('i', {})), cols, tip)),
        h('div', { class: 'chart-x', 'aria-hidden': 'true' }, pick.map(i => h('span', {}, dayLabel(cur[i].date)))),
        h('table', { class: 'sr-only' }, h('caption', {}, 'Page views, visitors and form submissions per day'),
          h('thead', {}, h('tr', {}, ['Day', 'Page views', 'Visitors', 'Form submissions'].map(x => h('th', { scope: 'col' }, x)))),
          h('tbody', {}, cur.map(r => h('tr', {}, h('th', { scope: 'row' }, r.date), h('td', {}, String(r.views)), h('td', {}, String(r.visitors)), h('td', {}, String(forms(r))))))));

      const pages = {}; cur.forEach(r => Object.entries(r.pages || {}).forEach(([p, v]) => { pages[p] = (pages[p] || 0) + v; }));
      const top = Object.entries(pages).sort((a, b) => b[1] - a[1]).slice(0, 6), topMax = top.length ? top[0][1] : 1;
      const list = h('div', { class: 'card toppages' }, h('div', { class: 'chart-head' }, h('strong', {}, 'Most viewed pages')),
        top.length ? top.map(([p, v]) => h('div', { class: 'tp-row' }, h('span', { class: 'tp-name' }, PAGE_NAMES[p] || p), h('span', { class: 'tp-bar' }, h('i', { style: `width:${Math.max(1, v / topMax * 100)}%` })), h('span', { class: 'tp-val' }, v.toLocaleString())))
          : h('p', { class: 'muted small' }, 'No page views recorded in this period yet.'));
      body.append(h('div', { class: 'stats-grid' }, chart, list),
        h('p', { class: 'muted small' }, 'Counted anonymously by the site itself, starting from the day this was switched on. No cookies; known bots are left out.'));
    }
    load();
    return wrap;
  }

  // Password screen for the online studio
  function showLogin(note) {
    if ($('#login')) return;
    const pw = h('input', { class: 'input', type: 'password', autocomplete: 'current-password', placeholder: 'Password', 'aria-label': 'Password' });
    const err = h('p', { class: 'login-err', role: 'alert' }, note || '');
    const btn = h('button', { class: 'btn primary', type: 'submit' }, 'Sign in');
    const form = h('form', { class: 'login-card', onsubmit: async e => {
      e.preventDefault(); btn.disabled = true; btn.textContent = 'Signing in…'; err.textContent = '';
      try { await api('POST', '/api/login', { password: pw.value }); if (content) { $('#login').remove(); toast('Signed in'); } else location.reload(); }
      catch (x) { err.textContent = x.message; btn.disabled = false; btn.textContent = 'Sign in'; pw.select(); }
    } },
      h('span', { class: 'brand-mark', html: '<svg viewBox="0 0 32 32" width="52" height="52" aria-hidden="true"><rect width="32" height="32" rx="8" fill="currentColor"/><path d="M8 22V10l8 7 8-7v12" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>' }),
      h('h1', {}, 'MEC Studio'), h('p', { class: 'muted' }, SESSION.configured === false ? 'The studio is not set up yet. Add STUDIO_PASSWORD and GITHUB_TOKEN to the Vercel project, then redeploy.' : 'Enter the studio password to edit mecgroup.live.'),
      SESSION.configured === false ? null : [pw, btn], err);
    document.body.append(h('div', { id: 'login' }, form));
    document.body.classList.add('ready');
    setTimeout(() => pw.focus(), 50);
  }

  function renderPages() {
    const main = $('#editor');
    const core = ['home', 'estimator', 'projects', 'contact'];
    main.append(h('div', { class: 'page-head' }, h('h1', {}, 'Pages'), h('p', {}, 'The four main pages, plus any extra pages you create.')),
      h('div', { class: 'card open plain' }, h('div', { class: 'card-b' }, h('div', { class: 'arr-list' },
        core.map(id => h('a', { class: 'row-item link', href: '#/' + id }, h('div', { class: 'row-head' }, h('span', { class: 'row-main' }, h('span', { class: 'card-ic' }, icon(docs[id].icon, 17)), h('span', { class: 'row-text' }, h('span', { class: 'row-title' }, docs[id].title), h('span', { class: 'row-sub' }, '/' + docs[id].preview.replace('index.html', '')))), h('span', { class: 'row-chev' }, icon('chevron', 16))))),
        content.pages.map((p, i) => h('div', { class: 'row-item' }, h('div', { class: 'row-head' },
          h('a', { class: 'row-main', href: '#/pages/' + i }, h('span', { class: 'card-ic' }, icon('doc', 17)), h('span', { class: 'row-text' }, h('span', { class: 'row-title' }, p.title || 'Untitled page'), h('span', { class: 'row-sub' }, `/${p.slug}.html`)), h('span', { class: 'chip' }, 'Custom')),
          h('button', { class: 'icon-btn', title: 'Delete page', 'aria-label': 'Delete page', onclick: async () => {
            if (!(await confirmBox(`Delete “${p.title}”?`, `The page /${p.slug}.html is removed from the site the next time you save. Remember to take it out of the Menu too.`, 'Delete page', true))) return;
            content.pages.splice(i, 1); changed(); render(); renderSide();
          } }, icon('trash', 16)),
          h('a', { class: 'row-chev', href: '#/pages/' + i }, icon('chevron', 16))))))),
        h('div', { class: 'arr-foot' }, h('button', { class: 'btn add', onclick: () => {
          const p = newPage(); let k = 2; while (content.pages.some(x => x.slug === p.slug)) p.slug = 'new-page-' + k++;
          content.pages.push(p); changed(); renderSide(); location.hash = '#/pages/' + (content.pages.length - 1);
        } }, icon('plus', 16), 'New page'))));
  }

  function renderMedia() {
    const main = $('#editor');
    const browser = mediaBrowser({ manage: true, onPick: f => mediaDetail(f, () => browser.redraw()) });
    main.append(h('div', { class: 'page-head' }, h('h1', {}, 'Media library'), h('p', {}, 'Every photo and video the site can use. Drag files in from Finder to add them — large photos are resized automatically.')), browser);
  }

  function currentDoc() {
    const m = /^pages\/(\d+)$/.exec(route);
    if (m && content.pages[+m[1]]) return ['page' + m[1], pageDoc(content.pages[+m[1]], +m[1])];
    return docs[route] ? [route, docs[route]] : null;
  }

  function render() {
    const main = $('#editor'); main.innerHTML = ''; main.scrollTop = 0; liveHead = null;
    const cur = currentDoc();
    const hasPreview = !!cur;
    document.body.classList.toggle('no-preview', !hasPreview || !PV.on);
    document.body.classList.toggle('wide', !hasPreview);
    $('#pv-toggle').hidden = !hasPreview;
    $('#pv-toggle').classList.toggle('on', PV.on);
    if (cur) { renderDoc(cur[0], cur[1]); const file = val(cur[1].preview); if (PV.on) { fitPreview(); (dirty() && !hosted() ? api('POST', '/api/draft', content).catch(() => {}) : Promise.resolve()).then(() => refreshPreview(file)); } else PV.file = file; }
    else if (route === 'pages') renderPages();
    else if (route === 'media') renderMedia();
    else renderOverview();
    $('#crumb').textContent = cur ? val(cur[1].title) : route === 'pages' ? 'Pages' : route === 'media' ? 'Media library' : 'Overview';
    document.querySelectorAll('.side a').forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#/' + route || (route.startsWith('pages/') && a.getAttribute('href') === '#/pages')));
  }

  function renderSide() {
    const nav = $('#side-nav'); nav.innerHTML = '';
    const item = (href, ic, label, count) => h('a', { href: '#/' + href }, icon(ic, 17), h('span', {}, label), count != null ? h('em', {}, String(count)) : null);
    const group = (label, items) => [h('div', { class: 'side-label' }, label), ...items];
    nav.append(item('overview', 'sparkle', 'Overview'),
      ...group('Pages', [...window.SCHEMA.order.map(id => item(id, docs[id].icon, docs[id].title)), item('pages', 'doc', 'All pages', content.pages.length || null)]),
      ...group('Collections', [item('gallery', 'photos', 'Gallery', content.projects.gallery.length), item('media', 'folder', 'Media library', media.length), item('pricing', 'dollar', 'Estimator pricing')]),
      ...group('Site', window.SCHEMA.site.map(id => item(id, docs[id].icon, docs[id].title))));
    document.querySelectorAll('.side a').forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#/' + route));
  }

  function onRoute() { route = (location.hash.replace(/^#\/?/, '') || 'overview'); render(); }

  function setTheme(t) { document.documentElement.dataset.theme = t; store.set('studio-theme', t); const b = $('#theme'); b.innerHTML = ''; b.append(icon(t === 'dark' ? 'sun' : 'moon', 17)); }

  // ── boot ─────────────────────────────────────────────────────────────────
  async function boot() {
    setTheme(store.get('studio-theme', matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
    try { SESSION = await api('GET', '/api/session'); MODE = SESSION.mode === 'hosted' ? 'hosted' : 'local'; } catch (e) { MODE = 'local'; }
    if (hosted()) {
      document.body.classList.add('hosted');
      if (!SESSION.authed) return showLogin();
      const m = { exports: {} }; new Function('module', 'exports', await (await fetch('render.js', { cache: 'no-store' })).text())(m, m.exports); RENDER = m.exports;
      $('.side-foot a').textContent = 'View live site';
      $('.side-foot').insertBefore(h('button', { class: 'linkish', onclick: async () => { if (dirty() && !(await confirmBox('Sign out?', 'Changes you have not published will be lost.', 'Sign out', true))) return; savedJSON = JSON.stringify(content); pendingUp = []; pendingDel = []; try { await api('POST', '/api/logout'); } catch (e) { /* ignore */ } location.reload(); } }, 'Sign out'), $('#theme'));
    }
    try { content = await api('GET', '/api/content'); }
    catch (e) { $('#editor').append(h('div', { class: 'empty-state' }, h('p', {}, 'Could not load the site content: ' + e.message))); return; }
    savedJSON = JSON.stringify(content);
    await loadMedia();
    $('#status').prepend(h('i', {}));
    $('#save').addEventListener('click', () => save());
    $('#discard').addEventListener('click', discard);
    $('#publish').addEventListener('click', publish);
    $('#theme').addEventListener('click', () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));
    $('#pv-toggle').addEventListener('click', () => { PV.on = !PV.on; store.set('studio-preview', PV.on ? 'on' : 'off'); render(); });
    $('#pv-open').addEventListener('click', () => { if (hosted()) return window.open('/' + PV.file, '_blank', 'noopener'); let p = '/__preview/' + PV.file; try { p = frames()[PV.front].contentWindow.location.pathname; } catch (e) { /* ignore */ } window.open(p, '_blank', 'noopener'); });
    document.querySelectorAll('.pv-devices button').forEach(b => {
      b.classList.toggle('on', b.dataset.device === PV.device);
      b.addEventListener('click', () => { PV.device = b.dataset.device; store.set('studio-device', PV.device); document.querySelectorAll('.pv-devices button').forEach(x => x.classList.toggle('on', x === b)); fitPreview(); });
    });
    new ResizeObserver(fitPreview).observe($('.pv-stage'));
    window.addEventListener('hashchange', onRoute);
    window.addEventListener('keydown', e => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save(); } });
    window.addEventListener('beforeunload', e => { if (dirty()) { e.preventDefault(); e.returnValue = ''; } });
    window.addEventListener('focus', loadStatus);
    renderSide(); onRoute(); updateStatus(); loadStatus();
    document.body.classList.add('ready');
  }
  boot();
})();
