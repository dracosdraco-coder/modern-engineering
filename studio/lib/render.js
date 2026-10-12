'use strict';
/*
 * MEC Studio — renderers.
 *
 * Every function in `blocks` turns content/site.json into the HTML (or JS) that sits
 * between a pair of markers in the site's pages:
 *
 *     <!-- studio:KEY --> … <!-- /studio:KEY -->      (HTML)
 *     /* studio:KEY *\/ … /* /studio:KEY *\/            (inside <script>)
 *
 * To change WORDS, PHOTOS or DATA: use the studio (or edit content/site.json).
 * To change MARKUP of a generated section: edit the matching function here.
 * Page-specific CSS and scripts live in the .html files, outside the markers.
 */

// ── helpers ────────────────────────────────────────────────────────────────
const esc = s => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const br = s => esc(String(s == null ? '' : s).trim()).replace(/\r?\n/g, '<br>');
const LINK_STYLE = 'color:var(--green);border-bottom:1px solid var(--border2)';
// escaped text + **bold** + [label](href)
const rich = s => br(s)
  .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, `<a href="$2" style="${LINK_STYLE}">$1</a>`);
const paras = s => String(s == null ? '' : s).split(/\r?\n\s*\r?\n/).map(p => p.trim()).filter(Boolean);
const D = i => 'd' + Math.min(i + 1, 8);
const num = i => String(i + 1).padStart(2, '0');
const list = a => (Array.isArray(a) ? a : []);
const lines = s => (Array.isArray(s) ? s : String(s || '').split(/\r?\n/)).map(x => String(x).trim()).filter(Boolean);
const json = o => JSON.stringify(o).replace(/</g, '\\u003c');

function tel(phone) {
  const d = String(phone || '').replace(/\D/g, '');
  return d.length === 10 ? '+1' + d : '+' + d;
}
// hrefs may use {email}, {tel} and {projex} so they follow Site settings
function href(h, c) {
  return esc(String(h || '#')
    .replace(/\{email\}/g, c.site.email)
    .replace(/\{tel\}/g, tel(c.site.phone))
    .replace(/\{projex\}/g, c.site.projexUrl));
}
const ext = h => (/^(https?:|\{projex\})/i.test(String(h || '')) ? ' target="_blank" rel="noopener"' : '');
const isVideo = src => /\.(mp4|webm|mov)$/i.test(String(src || ''));
const caption = it => [it.tag, it.title].map(x => String(x || '').trim()).filter(Boolean).join(' · ');

function beforeAfterInner(b) {
  return `<img class="ba-img" src="${esc(b.image)}" alt="${esc(b.alt)}">
    <div class="ba-overlay"></div>
    <div class="ba-labels">
      <div class="ba-label"><div class="ba-label-tag">${esc(b.beforeLabel)}</div><div class="ba-label-val">${esc(b.beforeValue)}</div></div>
      <div class="ba-divider"></div>
      <div class="ba-label"><div class="ba-label-tag after">${esc(b.afterLabel)}</div><div class="ba-label-val">${esc(b.afterValue)}</div></div>
    </div>`;
}

function pageHero(h, style) {
  return `<div class="page-hero rv"${style ? ` style="${style}"` : ''}>
  ${String(h.eyebrow || '').trim() ? `<p class="mono" style="margin-bottom:14px">${esc(h.eyebrow)}</p>` : ''}
  <h1 class="head head-lg">${br(h.heading)}</h1>
  ${String(h.text || '').trim() ? `<p class="body-t" style="margin-top:18px;max-width:${h.maxWidth || 520}px">${rich(h.text)}</p>` : ''}
</div>`;
}

// Anonymous counting for the studio's Stats: page views, form sends, phone/email taps.
// No cookies, nothing personal stored. Skipped inside the studio preview and on localhost.
const TRACK_JS = `(function(){var h=location.hostname;if(self!==top||!/^https?:/.test(location.protocol)||h==='localhost'||h==='127.0.0.1')return;
function t(e){try{var d=JSON.stringify({e:e,p:location.pathname});if(!(navigator.sendBeacon&&navigator.sendBeacon('/api/t',d)))fetch('/api/t',{method:'POST',body:d,keepalive:true});}catch(x){}}
window.mecTrack=t;t('view');
document.addEventListener('click',function(ev){var a=ev.target.closest&&ev.target.closest('a[href]');if(!a)return;var u=a.getAttribute('href');if(u.indexOf('tel:')===0)t('call');else if(u.indexOf('mailto:')===0)t('email');});})();`;

// ── blocks ─────────────────────────────────────────────────────────────────
const blocks = {};

blocks.head = (c, ctx) => {
  const s = ctx.seo || {};
  const url = ctx.file === 'index.html' ? c.site.url : `${c.site.url}/${ctx.file}`;
  const img = s.image ? `\n<meta property="og:image" content="${esc(/^https?:/.test(s.image) ? s.image : c.site.url + '/' + s.image)}">` : '';
  const tag = c.site.googleTagId ? `
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${esc(c.site.googleTagId)}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', '${esc(c.site.googleTagId)}');
</script>` : '';
  const site = {
    phone: c.site.phone, tel: tel(c.site.phone), email: c.site.email,
    serviceArea: c.site.serviceArea, formEndpoint: c.site.formEndpoint
  };
  return `<title>${esc(s.title)}</title>
<meta name="description" content="${esc(s.description)}">
<link rel="canonical" href="${esc(url)}">
<meta property="og:title" content="${esc(s.ogTitle || s.title)}">
<meta property="og:description" content="${esc(s.ogDescription || s.description)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:type" content="website">${img}${tag}
<script>window.MEC_SITE=${json(site)};</script>
<script>${TRACK_JS}</script>`;
};

blocks.nav = (c, ctx) => {
  const items = list(c.nav.items);
  const active = it => String(it.href || '').split('#')[0] === ctx.file;
  const cls = a => (a.filter(Boolean).length ? ` class="${a.filter(Boolean).join(' ')}"` : '');
  const mobile = items.map(it => it.cta
    ? `  <a href="${href(it.href, c)}" class="mcta">${esc(it.label)} &rarr;</a>`
    : `  <a href="${href(it.href, c)}"${cls([active(it) && 'active'])}>${esc(it.label)}</a>`).join('\n');
  const desk = items.map(it =>
    `    <li><a href="${href(it.href, c)}"${cls([it.cta && 'ncta', active(it) && 'active'])}>${esc(it.label)}</a></li>`).join('\n');
  return `<!-- MOBILE MENU -->
<div class="mmenu" id="mm">
${mobile}
</div>

<nav id="nav">
  <a href="index.html" class="nav-logo">
    <div class="nav-logo-name">${esc(c.site.logoName)}</div>
    <div class="nav-logo-sub">${esc(c.site.logoSub)}</div>
  </a>
  <ul class="nav-ul">
${desk}
  </ul>
  <div class="nav-right">
    <button class="theme-btn" id="themeBtn" aria-label="Toggle theme">&#9790; Dark</button>
    <button class="hbtn" id="hb" aria-label="Menu"><span></span><span></span><span></span></button>
  </div>
</nav>`;
};

blocks.footer = c => {
  const f = c.footer;
  const cols = list(f.columns).map(col => `    <div class="fc"><h4>${esc(col.title)}</h4><ul>
${list(col.links).map(l => `      <li><a href="${href(l.href, c)}"${ext(l.href)}>${esc(l.label)}</a></li>`).join('\n')}
    </ul></div>`).join('\n');
  return `<footer>
  <div class="fg">
    <div>
      <div class="fb-n">${esc(f.brandName)}</div>
      <div class="fb-s">${esc(f.brandSub)}</div>
      <p class="fb-d">${rich(f.description)}</p>
      <a href="${href('{projex}', c)}" target="_blank" rel="noopener" class="fpx">${esc(f.projexLabel)}</a>
    </div>
${cols}
  </div>
  <div class="fbot">
    <p>${esc(f.bottomLeft)}</p>
    <p>${esc(f.bottomRight)}</p>
  </div>
</footer>`;
};

blocks.legal = (c, ctx) => {
  const text = (c[ctx.key] && c[ctx.key].legal) || '';
  if (!String(text).trim()) return '';
  return `<div class="legal-strip">
  <p><strong style="color:#3a5a3a">Legal Disclosure:</strong> ${rich(text)}</p>
</div>`;
};

// ── HOME ───────────────────────────────────────────────────────────────────
blocks['home.jsonld'] = c => {
  const b = Object.assign({}, c.schema.business, {
    '@id': c.site.url + '/#business',
    name: c.site.legalName,
    url: c.site.url,
    telephone: tel(c.site.phone),
    email: c.site.email,
    sameAs: [c.site.projexUrl]
  });
  return `<script type="application/ld+json">
${JSON.stringify(b, null, 2).replace(/</g, '\\u003c')}
</script>`;
};

blocks['home.lwPhotos'] = c =>
  `const lwPhotos=${json(list(c.home.latest.photos).map(p => ({ src: p.src, alt: p.alt || '' })))};`;

blocks['home.main'] = c => {
  const h = c.home;
  const cards = list(h.latest.photos).slice(0, 6).map(p =>
    `      <div class="lw-card"><img class="lw-img active" src="${esc(p.src)}" alt="${esc(p.alt)}"><img class="lw-img" alt=""></div>`).join('\n');
  const ctas = list(h.ctaCards).map(k => `      <a href="${href(k.href, c)}" class="hcta-card">
        <div class="hcta-lbl">${esc(k.label)}</div>
        <div class="hcta-t">${esc(k.title)}</div>
        <div class="hcta-arrow">${esc(k.arrow)} &rarr;</div>
      </a>`).join('\n');
  const stats = list(h.stats).map((s, i) =>
    `  <div class="st rv ${D(i)}"><div class="stn">${esc(s.value)}</div><div class="stl">${esc(s.label)}</div></div>`).join('\n');
  const a = h.about;
  const aboutBody = paras(a.body).map((p, i) =>
    `    <p class="body-t"${i ? ' style="margin-top:12px"' : ''}>${rich(p)}</p>`).join('\n');
  const founders = list(a.founders).map((f, i) =>
    `      <div class="fch rv ${D(i)}"><div class="fch-n">${esc(f.name)}</div><div class="fch-r">${esc(f.role)}</div></div>`).join('\n');
  const sv = h.services;
  const svc = list(sv.items).map((s, i) =>
    `    <div class="spc rv ${D(i)}"><div class="spc-n">${num(i)}</div><h3 class="spc-t">${esc(s.title)}</h3><p class="spc-d">${rich(s.desc)}</p></div>`).join('\n');
  const b = h.beforeAfter;
  const ba = b && b.show ? `
<!-- BEFORE / AFTER -->
<section id="ba">
  <div class="ba-head rv">
    <div><p class="mono" style="margin-bottom:12px">${esc(b.eyebrow)}</p><h2 class="head head-lg">${br(b.heading)}</h2></div>
    <p class="body-t" style="max-width:300px;text-align:right">${rich(b.text)}</p>
  </div>
  <div class="ba-img-wrap rv">
    ${beforeAfterInner(b)}
  </div>
</section>
` : '';
  const p = h.process;
  const steps = list(p.steps).map((s, i) => `    <div class="proc-step${i === 0 ? ' active' : ''} rv ${D(i)}">
      <div class="proc-num">${num(i)}</div>
      <h3 class="proc-title">${esc(s.title)}</h3>
      <p class="proc-desc">${rich(s.desc)}</p>
    </div>`).join('\n');
  const m = h.compare;
  const li = a2 => lines(a2).map(x => `          <li>${rich(x)}</li>`).join('\n');
  const t = h.cta;
  const btns = list(t.buttons).map((x, i) =>
    `      <a href="${href(x.href, c)}" class="btn ${x.style === 'outline' || (!x.style && i) ? 'btn-outline' : 'btn-green'}">${esc(x.label)}</a>`).join('\n');

  return `<!-- HOME HERO — desktop: gallery, then headline, then buttons. Mobile: headline, gallery, buttons (reordered via CSS order) -->
<div class="home-hero">
  <!-- LATEST PROJECTS -->
  <section id="latest-work">
    <div class="lw-head rv">
      <h2 class="head head-md">${esc(h.latest.heading)}</h2>
      <a href="${href(h.latest.linkHref, c)}" class="lw-link">${esc(h.latest.linkLabel)} &rarr;</a>
    </div>
    <div class="lw-strip rv-scale">
${cards}
    </div>
  </section>

  <!-- HEADLINE -->
  <div class="hero-copy">
    <div class="hb">
      <p class="mono">${esc(h.hero.eyebrow)}</p>
      <h1 class="head head-xl hh1">${esc(h.hero.titleLine1)}<em>${esc(h.hero.titleLine2)}</em></h1>
      <p class="body-t hsub">${rich(h.hero.sub)}</p>
    </div>
  </div>

  <!-- CTA BUTTONS -->
  <div class="hero-actions">
    <div class="hb">
    <div class="hcta-row">
${ctas}
    </div>
    </div>
  </div>
</div>

<!-- STATS BAR -->
<div class="sbar">
${stats}
</div>

<!-- ABOUT -->
<section id="about">
  <div class="av rv-l">
    <img class="av-main" src="${esc(a.mainImage)}" alt="${esc(a.mainAlt)}">
    <img class="av-sub" src="${esc(a.subImage)}" alt="${esc(a.subAlt)}">
    <div class="av-badge">${esc(a.badge)}</div>
  </div>
  <div class="ac rv-r">
    <p class="mono">${esc(a.eyebrow)}</p>
    <h2 class="head head-lg" style="margin-top:14px">${br(a.heading)}</h2>
${aboutBody}
    <div class="fc2">
${founders}
    </div>
  </div>
</section>

<!-- SERVICES PREVIEW -->
<div id="svc-prev">
  <div class="sp-head rv">
    <div><p class="mono" style="margin-bottom:12px">${esc(sv.eyebrow)}</p><h2 class="head head-lg">${br(sv.heading)}</h2></div>
    <p class="body-t" style="max-width:320px;text-align:right">${rich(sv.intro)}</p>
  </div>
  <div class="sp-grid">
${svc}
  </div>
  <div class="sp-cta rv"><a href="${href(sv.ctaHref, c)}" class="btn btn-green">${esc(sv.ctaLabel)}</a></div>
</div>
${ba}
<!-- HOW IT WORKS -->
<section id="process">
  <div class="proc-head rv">
    <p class="mono">${esc(p.eyebrow)}</p>
    <h2 class="head head-lg" style="margin-top:14px">${br(p.heading)}</h2>
    <p class="body-t" style="margin-top:16px">${rich(p.intro)}</p>
  </div>
  <div class="proc-grid">
${steps}
  </div>
</section>

<!-- OLD WAY vs MEC WAY -->
<section id="compare">
  <div class="cmp-inner">
    <div class="cmp-head rv">
      <p class="mono">${esc(m.eyebrow)}</p>
      <h2 class="head head-lg" style="margin-top:14px;color:#fff">${br(m.heading)}</h2>
    </div>
    <div class="cmp-grid">
      <div class="cmp-col before rv-l">
        <div class="cmp-tag before-tag">${esc(m.withoutTag)}</div>
        <ul class="cmp-list">
${li(m.withoutItems)}
        </ul>
      </div>
      <div class="cmp-col after rv-r">
        <div class="cmp-tag after-tag">${esc(m.withTag)}</div>
        <ul class="cmp-list">
${li(m.withItems)}
        </ul>
      </div>
    </div>
  </div>
</section>

<!-- CTA BAND -->
<section id="cta-band">
  <div class="cta-band-inner rv">
    <p class="mono">${esc(t.eyebrow)}</p>
    <h2 class="head head-lg" style="margin-top:14px">${br(t.heading)}</h2>
    <p class="body-t" style="margin-top:16px">${rich(t.text)}</p>
    <div class="cta-btns" style="margin-top:36px">
${btns}
    </div>
  </div>
</section>
`;
};

// ── PROJECTS ───────────────────────────────────────────────────────────────
blocks['projects.hero'] = c => pageHero(c.projects.hero);

function galleryItems(items) {
  let videos = 0, images = 0;
  return list(items).filter(it => it && it.src && !it.hidden).map(it => {
    const cap = caption(it);
    const size = ['big', 'wide', 'tall'].includes(it.size) ? ` gw-${it.size}` : '';
    const media = isVideo(it.src)
      ? `<video autoplay muted loop playsinline preload="${videos++ < 2 ? 'auto' : 'metadata'}"><source src="${esc(it.src)}" type="video/mp4"></video>`
      : `<img src="${esc(it.src)}" alt="${esc(it.alt)}" loading="${images++ === 0 ? 'eager' : 'lazy'}">`;
    return `    <div class="gw-item${size}" data-cap="${esc(cap)}">
      ${media}
      <div class="gw-ov"></div><div class="gw-lbl">${esc(cap)}</div>
    </div>`;
  }).join('\n');
}

blocks['projects.main'] = c => {
  const p = c.projects;
  const b = p.beforeAfter;
  const ba = b && b.show ? `
  <!-- Before / After -->
  <div class="ba-wrap rv">
    <div class="ba-head">
      <div><p class="mono" style="margin-bottom:12px">${esc(b.eyebrow)}</p><h2 class="head head-md">${br(b.heading)}</h2></div>
      <p class="body-t" style="max-width:280px;text-align:right">${rich(b.text)}</p>
    </div>
    <div class="ba-img-wrap">
      ${beforeAfterInner(b)}
    </div>
  </div>
` : '';
  const scope = list(p.scope).map((s, i) => `    <div class="scope-card rv ${D(i)}">
      <div class="scope-title">${esc(s.title)}</div>
      <p class="scope-body">${rich(s.body)}</p>
    </div>`).join('\n');
  return `<section class="sec">
  <!-- Gallery wall — photos and video woven into one mosaic -->
  <div class="gallery-wall rv-scale">
${galleryItems(p.gallery)}
  </div>
${ba}
  <!-- Scope stats -->
  <div class="scope-grid rv">
${scope}
  </div>

</section>
`;
};

blocks['projects.partners'] = c => {
  const p = c.projects.partners;
  const items = list(p.items).map((it, i) =>
    `        <div class="pit"><span class="pin">${num(i)}</span><div><div class="pit-t">${esc(it.title)}</div><div class="pit-d">${rich(it.desc)}</div></div></div>`).join('\n');
  const cards = list(p.cards).map((k, i) => `      <div class="pxc"${i ? ' style="margin-top:4px"' : ''}>
        ${k.big ? `<div class="pxn">${esc(k.title)}</div>` : `<p class="mono" style="margin-bottom:12px">${esc(k.title)}</p>`}
        <p class="pxb">${rich(k.body)}</p>
        <a href="${href(k.linkHref, c)}"${ext(k.linkHref)} class="pxl">${esc(k.linkLabel)} &rarr;</a>
      </div>`).join('\n');
  const reach = list(c.projects.reach).map((r, i) => `    <div class="rc rv ${D(i)}">
      <div class="rc-title">${esc(r.title)}</div>
      <p class="rc-body">${rich(r.body)}</p>
    </div>`).join('\n');
  return `<!-- PARTNERS (merged from former /partners.html) -->
<section class="sec" id="partners" style="padding-top:0">
  <div class="page-hero rv" style="padding:0 0 56px;max-width:none">
    <p class="mono" style="margin-bottom:14px">${esc(p.eyebrow)}</p>
    <h1 class="head head-lg">${br(p.heading)}</h1>
    <p class="body-t" style="margin-top:18px;max-width:560px">${rich(p.text)}</p>
  </div>
  <div class="partners-layout">
    <div class="rv-l">
      <h2 class="head head-md">${br(p.listHeading)}</h2>
      <div class="plist" style="margin-top:32px">
${items}
      </div>
    </div>
    <div class="rv-r">
${cards}
    </div>
  </div>

  <div class="reach-grid rv">
${reach}
  </div>
</section>
`;
};

// ── ESTIMATOR ──────────────────────────────────────────────────────────────
blocks['estimator.printHeader'] = c => `<!-- print-only header -->
<div class="print-header">
  <h2>${esc(c.site.name)}</h2>
  <p>Project Estimate &mdash; ${esc(c.site.phone)} &mdash; ${esc(c.site.email)} &mdash; ${esc(c.site.serviceArea)}</p>
</div>
`;

blocks['estimator.hero'] = c => pageHero(Object.assign({ maxWidth: 600 }, c.estimator.hero), 'padding-bottom:0');

blocks['estimator.services'] = c => {
  const s = c.estimator.services;
  const cards = list(s.items).map((it, i) => `    <div class="svc-card rv ${D(i)}">
      <div class="svc-num">${num(i)}</div>
      <h2 class="svc-title">${esc(it.title)}</h2>
      <p class="svc-desc">${rich(it.desc)}</p>
      <div class="svc-tags">${lines(it.tags).map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>
    </div>`).join('\n\n');
  return `<!-- SERVICES (merged from former /services.html) -->
<section class="sec" id="services" style="padding-top:0">
  <div class="page-hero rv" style="padding:0 0 0;max-width:none">
    <p class="mono" style="margin-bottom:14px">${esc(s.eyebrow)}</p>
    <h1 class="head head-lg">${br(s.heading)}</h1>
    <p class="body-t" style="margin-top:20px;max-width:600px">${rich(s.text)}</p>
  </div>
  <div class="svc-full-grid">

${cards}

  </div>
  <div style="text-align:center;padding:56px 0 0" class="rv">
    <a href="#trade-roofing" class="btn btn-green" onclick="document.querySelector('.cfg-trade-bar').scrollIntoView({behavior:'smooth'})">${esc(s.estimateLabel)}</a>
    &nbsp;&nbsp;
    <a href="${href(s.quoteHref, c)}" class="btn btn-outline">${esc(s.quoteLabel)}</a>
  </div>
</section>
`;
};

blocks['estimator.rates'] = c => `const MEC_RATES=${json(c.estimator.rates)};`;

// ── CONTACT ────────────────────────────────────────────────────────────────
blocks['contact.hero'] = c => pageHero(c.contact.hero);

blocks['contact.main'] = c => {
  const k = c.contact, f = k.form, s = c.site;
  const opts = a => {
    const o = lines(a).map(x => `<option>${esc(x)}</option>`);
    const rows = [];
    for (let i = 0; i < o.length; i += 2) rows.push('              ' + o.slice(i, i + 2).join(''));
    return rows.join('\n');
  };
  return `<section class="sec">
  <div class="contact-layout">
    <div class="rv-l">
      <h2 class="head head-md">${br(k.directHeading)}</h2>
      <div class="cl-contacts">
        <div class="cc"><div class="cc-l">Phone</div><a href="tel:${esc(tel(s.phone))}" class="cc-v">${esc(s.phone)}</a></div>
        <div class="cc"><div class="cc-l">Email</div><a href="mailto:${esc(s.email)}" class="cc-v">${esc(s.email)}</a></div>
        <div class="cc"><div class="cc-l">Response Time</div><span class="cc-v">${esc(s.responseTime)}</span></div>
        <div class="cc"><div class="cc-l">Service Area</div><span class="cc-v">${esc(s.serviceArea)}</span></div>
        <div class="cc"><div class="cc-l">Hours</div><span class="cc-v">${esc(s.hours)}</span></div>
      </div>
      <div style="margin-top:36px">
        <p class="body-t">${rich(k.blurb)}</p>
      </div>
    </div>
    <div class="cf rv-r">
      <div class="cf-title">${esc(f.title)}</div>
      <div id="est-attached" style="display:none;background:var(--green-dim);border:1px solid rgba(22,163,74,.25);padding:12px 16px;margin-bottom:20px;">
        <div style="font-family:'DM Mono',monospace;font-size:8px;letter-spacing:.22em;text-transform:uppercase;color:var(--green);margin-bottom:4px">Estimate Attached</div>
        <div id="est-attached-text" style="font-size:12px;color:var(--muted);line-height:1.6"></div>
      </div>
      <form id="iform" novalidate>
        <div class="f2c">
          <div class="fg2"><label class="fl" for="fn">Name *</label><input class="fi" type="text" id="fn" name="name" placeholder="Full name" required></div>
          <div class="fg2"><label class="fl" for="fp">Phone *</label><input class="fi" type="tel" id="fp" name="phone" placeholder="${esc(s.phone)}" required></div>
        </div>
        <div class="fg2"><label class="fl" for="fe">Email *</label><input class="fi" type="email" id="fe" name="email" placeholder="your@email.com" required></div>
        <div class="f2c">
          <div class="fg2"><label class="fl" for="fsv">Service</label>
            <select class="fs" id="fsv" name="service">
              <option value="">Select service</option>
${opts(f.services)}
            </select>
          </div>
          <div class="fg2"><label class="fl" for="fco">County</label>
            <select class="fs" id="fco" name="county">
              <option value="">Select county</option>
${opts(f.counties)}
            </select>
          </div>
        </div>
        <div class="fg2"><label class="fl" for="fc2">Company / Property</label><input class="fi" type="text" id="fc2" name="company" placeholder="Company or property name"></div>
        <div class="fg2"><label class="fl" for="fm">Project Description *</label><textarea class="fta" id="fm" name="message" placeholder="${esc(f.messagePlaceholder)}" required></textarea></div>
        <button type="submit" class="fsub">${esc(f.submitLabel)}</button>
        <p class="fnote">${rich(f.note1)}</p>
        <p class="fnote" style="margin-top:8px">${rich(f.note2)}</p>
        <div class="fsucc" id="fsucc"><p>${esc(f.successTitle)}</p><small>${esc(f.successText)}</small></div>
      </form>
    </div>
  </div>
</section>`;
};

// ── CUSTOM PAGES (built entirely from content.pages) ───────────────────────
const CUSTOM_CSS = `
.cp-body{display:flex;flex-direction:column;gap:clamp(48px,6vw,88px)}
.cp-text{max-width:760px}
.cp-text .body-t{margin-top:18px}
.cp-text .body-t+.body-t{margin-top:12px}
.cp-img img{width:100%;height:auto;border:1px solid var(--border)}
.cp-cap{font-family:'DM Mono',monospace;font-size:9px;letter-spacing:.2em;text-transform:uppercase;color:var(--muted);margin-top:12px}
.cp-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
.cp-grid>div{position:relative;height:260px;overflow:hidden;background:var(--card)}
.cp-grid img,.cp-grid video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.cp-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:var(--border)}
.cp-card{background:var(--bg2);padding:40px 32px}
.cp-card-t{font-family:'Archivo Black',sans-serif;font-size:18px;color:var(--white);margin-bottom:12px;letter-spacing:.01em}
.cp-card-b{font-size:13px;color:var(--muted);line-height:1.75;font-weight:300}
.cp-cta{background:var(--bg2);border:1px solid var(--border);padding:clamp(40px,6vw,72px) 32px;text-align:center}
.cp-cta .body-t{max-width:560px;margin:16px auto 32px}
@media(max-width:1100px){.cp-grid{grid-template-columns:repeat(2,1fr)}.cp-cards{grid-template-columns:1fr 1fr}}
@media(max-width:768px){.cp-grid>div{height:180px}.cp-cards{grid-template-columns:1fr}.btn{width:100%;text-align:center}}
`;

const CUSTOM_JS = `
const nav=document.getElementById('nav');
window.addEventListener('scroll',()=>nav.classList.toggle('sc',scrollY>50),{passive:true});
const hb=document.getElementById('hb'),mm=document.getElementById('mm');
let mo=false;
function tm(s){mo=s;hb.classList.toggle('o',mo);if(mo){mm.style.display='flex';document.body.style.overflow='hidden';requestAnimationFrame(()=>mm.classList.add('o'));}else{mm.classList.remove('o');document.body.style.overflow='';setTimeout(()=>{if(!mo)mm.style.display='none'},400);}}
hb.addEventListener('click',()=>tm(!mo));
mm.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>tm(false)));
const tb=document.getElementById('themeBtn');
function setTheme(t){document.documentElement.setAttribute('data-theme',t);localStorage.setItem('theme',t);tb.innerHTML=t==='dark'?'&#9788; Light':'&#9790; Dark';}
setTheme(localStorage.getItem('theme')||'light');
tb.addEventListener('click',()=>setTheme(document.documentElement.getAttribute('data-theme')==='dark'?'light':'dark'));
const ro=new IntersectionObserver(e=>{e.forEach((x,i)=>{if(x.isIntersecting){setTimeout(()=>x.target.classList.add('on'),i*55);ro.unobserve(x.target);}});},{threshold:.07,rootMargin:'0px 0px -40px 0px'});
document.querySelectorAll('.rv,.rv-l,.rv-r,.rv-scale').forEach(el=>ro.observe(el));
document.querySelectorAll('video').forEach(v=>{v.muted=true;const p=v.play();if(p)p.catch(()=>{});});
`;

function customBlock(b, c) {
  switch (b.type) {
    case 'text':
      return `  <div class="cp-text rv">
    ${b.heading ? `<h2 class="head head-md">${br(b.heading)}</h2>` : ''}
${paras(b.body).map(p => `    <p class="body-t">${rich(p)}</p>`).join('\n')}
  </div>`;
    case 'image':
      if (!b.src) return '';
      return `  <div class="cp-img rv">
    <img src="${esc(b.src)}" alt="${esc(b.alt)}" loading="lazy">
    ${b.caption ? `<div class="cp-cap">${esc(b.caption)}</div>` : ''}
  </div>`;
    case 'gallery':
      return `  <div class="cp-grid rv">
${list(b.items).filter(x => x && x.src).map(x => `    <div>${isVideo(x.src)
        ? `<video autoplay muted loop playsinline preload="metadata"><source src="${esc(x.src)}" type="video/mp4"></video>`
        : `<img src="${esc(x.src)}" alt="${esc(x.alt)}" loading="lazy">`}</div>`).join('\n')}
  </div>`;
    case 'cards':
      return `  <div class="cp-cards rv">
${list(b.items).map(x => `    <div class="cp-card"><div class="cp-card-t">${esc(x.title)}</div><p class="cp-card-b">${rich(x.body)}</p></div>`).join('\n')}
  </div>`;
    case 'cta':
      return `  <div class="cp-cta rv">
    <h2 class="head head-md">${br(b.heading)}</h2>
    <p class="body-t">${rich(b.text)}</p>
    <a href="${href(b.buttonHref, c)}" class="btn btn-green">${esc(b.buttonLabel)}</a>
  </div>`;
    default:
      return '';
  }
}

const GENERATED_MARK = '<!-- studio:generated-page — built by MEC Studio from content/site.json; edit it there -->';

function renderCustomPage(c, page) {
  const file = page.slug + '.html';
  const ctx = {
    file, key: null,
    seo: { title: page.seoTitle || `${page.title} | ${c.site.name}`, description: page.description, image: page.image }
  };
  const body = list(page.blocks).map(b => customBlock(b, c)).filter(Boolean).join('\n\n');
  return `<!DOCTYPE html>
${GENERATED_MARK}
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
${blocks.head(c, ctx)}
<link rel="stylesheet" href="shared.css">
<style>${CUSTOM_CSS}</style>
</head>
<body>
${blocks.nav(c, ctx)}

${pageHero(Object.assign({ maxWidth: 600 }, page.hero || {}, { heading: (page.hero && page.hero.heading) || page.title }))}

<section class="sec cp-body" style="padding-top:0">
${body}
</section>

${page.legal ? `<div class="legal-strip">\n  <p>${rich(page.legal)}</p>\n</div>\n\n` : ''}${blocks.footer(c, ctx)}
<script>${CUSTOM_JS}</script>
</body>
</html>
`;
}

function renderSitemap(c) {
  const urls = [
    ['', '1.0'], ['estimator.html', '0.9'], ['projects.html', '0.9'], ['contact.html', '0.8'],
    ...list(c.pages).filter(p => !p.hidden).map(p => [p.slug + '.html', '0.7'])
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(([u, pr]) => `  <url>
    <loc>${esc(c.site.url)}/${u}</loc>
    <changefreq>monthly</changefreq>
    <priority>${pr}</priority>
  </url>`).join('\n')}
</urlset>
`;
}

// ── assembling pages (pure: no disk, so it also runs in the browser and on the server) ──
const CORE = [
  { file: 'index.html', key: 'home' },
  { file: 'estimator.html', key: 'estimator' },
  { file: 'projects.html', key: 'projects' },
  { file: 'contact.html', key: 'contact' }
];
const RESERVED = new Set(['index', 'estimator', 'projects', 'contact', 'studio', 'public', 'content', 'services', 'partners', 'api']);

function validate(c) {
  const errors = [];
  for (const k of ['site', 'nav', 'footer', 'home', 'projects', 'estimator', 'contact', 'schema']) {
    if (!c || typeof c[k] !== 'object' || c[k] === null) errors.push(`Missing section "${k}"`);
  }
  if (errors.length) return errors;
  if (!Array.isArray(c.pages)) c.pages = [];
  const seen = new Set();
  c.pages.forEach((p, i) => {
    const slug = String(p.slug || '');
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) errors.push(`Page ${i + 1}: web address "${slug}" can only use lowercase letters, numbers and dashes`);
    else if (RESERVED.has(slug)) errors.push(`Page ${i + 1}: "${slug}" is reserved — pick another web address`);
    else if (seen.has(slug)) errors.push(`Two pages share the web address "${slug}"`);
    seen.add(slug);
    if (!String(p.title || '').trim()) errors.push(`Page ${i + 1} needs a title`);
  });
  if (!/^https?:\/\/[^/]+$/.test(String(c.site.url || ''))) errors.push('Site address must look like https://example.com (no trailing slash)');
  return errors;
}

// Fill every marker pair in `src` from content.
function applyMarkers(src, c, ctx) {
  const fill = (m, open, key, close) => {
    const fn = blocks[key];
    if (!fn) throw new Error(`${ctx.file}: no renderer for marker "${key}"`);
    const out = String(fn(c, ctx)).trim();
    return open + '\n' + out + (out ? '\n' : '') + close;
  };
  return src
    .replace(/(<!-- studio:([\w.]+) -->)[\s\S]*?(<!-- \/studio:\2 -->)/g, fill)
    .replace(/(\/\* studio:([\w.]+) \*\/)[\s\S]*?(\/\* \/studio:\2 \*\/)/g, fill);
}

// One page as a string. `template` is the current HTML of a core page (ignored for custom pages).
function renderPage(file, c, template) {
  const core = CORE.find(p => p.file === file);
  if (core) return applyMarkers(String(template), c, { file, key: core.key, seo: c[core.key].seo });
  const page = (c.pages || []).find(p => p.slug + '.html' === file);
  return page ? renderCustomPage(c, page) : null;
}

// Every generated file: { 'index.html': '…', 'careers.html': '…', 'sitemap.xml': '…' }
function renderAll(c, templates) {
  const out = {};
  for (const p of CORE) out[p.file] = renderPage(p.file, c, templates[p.file]);
  for (const p of c.pages || []) out[p.slug + '.html'] = renderCustomPage(c, p);
  out['sitemap.xml'] = renderSitemap(c);
  return out;
}

// Added to pages shown inside the studio: no entrance animations, scroll position survives
// reloads, and (when the preview is drawn in the browser) links stay inside the preview.
function previewInject(file) {
  return `<style>
.rv,.rv-l,.rv-r,.rv-scale{opacity:1!important;transform:none!important;transition:none!important}
.hb .mono,.hh1,.hsub,.hcta-row{animation:none!important;opacity:1!important}
html{scroll-behavior:auto!important}
</style>
<script>
(function(){
  var inline=location.protocol==='about:',k='studio-scroll:'+${JSON.stringify(String(file))};
  function restore(){var y=0;try{y=+sessionStorage.getItem(k)||0;}catch(e){}if(y)window.scrollTo(0,y);}
  function go(sel){var el=null;try{el=document.querySelector(sel);}catch(e){}if(el)window.scrollTo({top:el.getBoundingClientRect().top+window.scrollY-70,behavior:'smooth'});}
  document.addEventListener('DOMContentLoaded',function(){restore();if(parent!==window)parent.postMessage({studioReady:true},self.origin);});
  window.addEventListener('load',restore);
  window.addEventListener('scroll',function(){try{sessionStorage.setItem(k,String(window.scrollY));}catch(e){}},{passive:true});
  window.addEventListener('message',function(e){if(e.origin===self.origin&&e.data&&e.data.studioScrollTo)go(e.data.studioScrollTo);});
  if(inline)document.addEventListener('click',function(ev){
    var a=ev.target.closest&&ev.target.closest('a[href]');if(!a)return;var u=a.getAttribute('href')||'';
    if(u.charAt(0)==='#'){ev.preventDefault();if(u.length>1)go(u);return;}
    var m=/^\\/?([a-z0-9-]+\\.html)?(#.*)?$/i.exec(u);
    if(m&&(m[1]||u==='/')){ev.preventDefault();parent.postMessage({studioNav:m[1]||'index.html'},self.origin);}
    else if(!a.target){a.target='_blank';a.rel='noopener';}
  },true);
})();
</script>`;
}

module.exports = { blocks, renderCustomPage, renderSitemap, GENERATED_MARK, tel, CORE, RESERVED, validate, applyMarkers, renderPage, renderAll, previewInject };
