/*
 * MEC Studio — what is editable, and how each field is shown.
 * Each doc has sections; each section edits the object at `path` in content/site.json.
 * Field types: string, text, number, bool, select, link, media, range, tags, lines, array.
 */
(function () {
  const s = (key, label, o) => Object.assign({ key, label, type: 'string' }, o);
  const t = (key, label, o) => Object.assign({ key, label, type: 'text' }, o);
  const n = (key, label, o) => Object.assign({ key, label, type: 'number', w: 'half' }, o);
  const r = (key, label, o) => Object.assign({ key, label, type: 'range', w: 'half' }, o);
  const link = (key, label, o) => Object.assign({ key, label, type: 'link' }, o);
  const media = (key, label, o) => Object.assign({ key, label, type: 'media' }, o);
  const bool = (key, label, o) => Object.assign({ key, label, type: 'bool' }, o);
  const arr = (key, label, o) => Object.assign({ key, label, type: 'array' }, o);
  const RICH = 'Tip: **bold** and [link text](page.html) work here.';
  const BREAKS = 'Press Return to start a new line.';

  const seo = (path, anchor) => ({
    title: 'Search & sharing', icon: 'search', path, anchor,
    desc: 'How this page appears on Google and when shared',
    fields: [
      s('title', 'Page title', { max: 60, help: 'The blue link on Google and the browser tab.' }),
      t('description', 'Search description', { max: 160, rows: 3 }),
      s('ogTitle', 'Title when shared', { w: 'half', help: 'Texts, LinkedIn, Facebook…' }),
      media('image', 'Share image', { w: 'half', kind: 'image' }),
      t('ogDescription', 'Description when shared', { rows: 2 })
    ]
  });
  const hero = (path, anchor) => ({
    title: 'Page header', icon: 'type', path, anchor: anchor || '.page-hero',
    fields: [s('eyebrow', 'Small label'), t('heading', 'Headline', { rows: 2, help: BREAKS }), t('text', 'Intro', { rows: 3, help: RICH })]
  });
  const beforeAfter = (path, anchor) => ({
    title: 'Before & after', icon: 'split', path, anchor,
    fields: [
      bool('show', 'Show this section'),
      s('eyebrow', 'Small label', { w: 'half' }), s('heading', 'Heading', { w: 'half' }),
      t('text', 'Description', { rows: 2 }),
      media('image', 'Photo', { kind: 'image', help: 'One image with before on the left and after on the right.' }),
      s('alt', 'Photo description', { help: 'Read aloud by screen readers and used by Google.' }),
      s('beforeLabel', 'Left label', { w: 'half' }), s('beforeValue', 'Left caption', { w: 'half' }),
      s('afterLabel', 'Right label', { w: 'half' }), s('afterValue', 'Right caption', { w: 'half' })
    ]
  });
  const legal = (path, anchor) => ({
    title: 'Legal disclosure', icon: 'shield', path, anchor: anchor || '.legal-strip',
    fields: [t('legal', 'Disclosure text', { rows: 4, help: 'Shown in the dark strip above the footer. Leave empty to hide it.' })]
  });
  const titleBody = (bodyKey, bodyLabel) => ({
    title: it => it.title, sub: it => it[bodyKey],
    make: () => ({ title: '', [bodyKey]: '' }),
    fields: [s('title', 'Title'), t(bodyKey, bodyLabel || 'Description', { rows: 3, help: RICH })]
  });
  const photo = { title: it => it.alt || it.src, thumb: it => it.src, fromMedia: f => ({ src: f.path, alt: '' }),
    fields: [media('src', 'File'), s('alt', 'Description', { help: 'Describe the photo in a few words — used by Google and screen readers.' })] };

  const docs = {};

  docs.home = {
    title: 'Home', icon: 'home', preview: 'index.html', group: 'Pages',
    sub: 'The front page of mecgroup.live',
    sections: [
      { title: 'Headline', icon: 'type', path: 'home.hero', anchor: '.hero-copy', fields: [
        s('eyebrow', 'Small label'),
        s('titleLine1', 'Headline — first line', { w: 'half' }), s('titleLine2', 'Headline — gold line', { w: 'half' }),
        t('sub', 'Sub-headline', { rows: 2 })
      ] },
      { title: 'Headline buttons', icon: 'cursor', path: 'home', anchor: '.hero-actions', fields: [
        arr('ctaCards', 'Buttons', { title: it => it.title, sub: it => it.label, make: () => ({ label: '', title: '', arrow: '', href: 'contact.html' }),
          fields: [s('label', 'Small label', { w: 'half' }), s('title', 'Button text', { w: 'half' }), s('arrow', 'Hint line', { w: 'half' }), link('href', 'Goes to', { w: 'half' })] })
      ] },
      { title: 'Latest projects strip', icon: 'photos', path: 'home.latest', anchor: '#latest-work', fields: [
        s('heading', 'Heading', { w: 'half' }), s('linkLabel', 'Link text', { w: 'half' }), link('linkHref', 'Link goes to'),
        arr('photos', 'Photos', Object.assign({ layout: 'grid', kind: 'image', help: 'The first six show when the page loads; the rest rotate in every few seconds.' }, photo))
      ] },
      { title: 'Stats bar', icon: 'chart', path: 'home', anchor: '.sbar', fields: [
        arr('stats', 'Stats', { title: it => it.value, sub: it => it.label, make: () => ({ value: '', label: '' }),
          fields: [s('value', 'Big number or word', { w: 'half' }), s('label', 'Label', { w: 'half' })] })
      ] },
      { title: 'About', icon: 'people', path: 'home.about', anchor: '#about', fields: [
        s('eyebrow', 'Small label', { w: 'half' }), s('badge', 'Photo badge', { w: 'half' }),
        t('heading', 'Heading', { rows: 3, help: BREAKS }),
        t('body', 'Text', { rows: 7, help: 'Leave an empty line between paragraphs. ' + RICH }),
        media('mainImage', 'Large photo', { w: 'half', kind: 'image' }), media('subImage', 'Small overlapping photo', { w: 'half', kind: 'image' }),
        s('mainAlt', 'Large photo description', { w: 'half' }), s('subAlt', 'Small photo description', { w: 'half' }),
        arr('founders', 'People', { title: it => it.name, sub: it => it.role, make: () => ({ name: '', role: '' }),
          fields: [s('name', 'Name', { w: 'half' }), s('role', 'Role', { w: 'half' })] })
      ] },
      { title: 'Services preview', icon: 'grid', path: 'home.services', anchor: '#svc-prev', fields: [
        s('eyebrow', 'Small label'), t('heading', 'Heading', { rows: 3, help: BREAKS }), t('intro', 'Intro', { rows: 2 }),
        arr('items', 'Services', titleBody('desc')),
        s('ctaLabel', 'Button text', { w: 'half' }), link('ctaHref', 'Button goes to', { w: 'half' })
      ] },
      beforeAfter('home.beforeAfter', '#ba'),
      { title: 'How we work', icon: 'steps', path: 'home.process', anchor: '#process', fields: [
        s('eyebrow', 'Small label'), t('heading', 'Heading', { rows: 2, help: BREAKS }), t('intro', 'Intro', { rows: 2 }),
        arr('steps', 'Steps', titleBody('desc'))
      ] },
      { title: 'Old way vs. the right way', icon: 'columns', path: 'home.compare', anchor: '#compare', fields: [
        s('eyebrow', 'Small label'), t('heading', 'Heading', { rows: 2, help: BREAKS }),
        s('withoutTag', 'Left column label', { w: 'half' }), s('withTag', 'Right column label', { w: 'half' }),
        { key: 'withoutItems', label: 'Left column points', type: 'lines', w: 'half', rows: 8, help: 'One per line.' },
        { key: 'withItems', label: 'Right column points', type: 'lines', w: 'half', rows: 8, help: 'One per line.' }
      ] },
      { title: 'Closing call to action', icon: 'megaphone', path: 'home.cta', anchor: '#cta-band', fields: [
        s('eyebrow', 'Small label'), t('heading', 'Heading', { rows: 2, help: BREAKS }), t('text', 'Text', { rows: 2 }),
        arr('buttons', 'Buttons', { title: it => it.label, sub: it => it.href, make: () => ({ label: '', href: 'contact.html', style: 'green' }),
          fields: [s('label', 'Button text', { w: 'half' }), link('href', 'Goes to', { w: 'half' }),
            { key: 'style', label: 'Look', type: 'select', options: [['green', 'Solid green'], ['outline', 'Outline']] }] })
      ] },
      legal('home'),
      seo('home.seo')
    ]
  };

  docs.projects = {
    title: 'Work portfolio', icon: 'briefcase', preview: 'projects.html', group: 'Pages',
    sub: 'projects.html — the gallery wall has its own screen under Gallery',
    sections: [
      hero('projects.hero'),
      beforeAfter('projects.beforeAfter', '.ba-wrap'),
      { title: 'What we do — three cards', icon: 'grid', path: 'projects', anchor: '.scope-grid', fields: [arr('scope', 'Cards', titleBody('body'))] },
      { title: 'For contractors', icon: 'handshake', path: 'projects.partners', anchor: '#partners', fields: [
        s('eyebrow', 'Small label'), t('heading', 'Headline', { rows: 2, help: BREAKS }), t('text', 'Intro', { rows: 3 }),
        t('listHeading', 'List heading', { rows: 3, help: BREAKS }),
        arr('items', 'What we bring', titleBody('desc')),
        arr('cards', 'Side cards', { title: it => it.title, sub: it => it.body, make: () => ({ title: '', big: false, body: '', linkLabel: '', linkHref: 'contact.html' }),
          fields: [s('title', 'Title'), bool('big', 'Large green title'), t('body', 'Text', { rows: 3 }), s('linkLabel', 'Link text', { w: 'half' }), link('linkHref', 'Link goes to', { w: 'half' })] })
      ] },
      { title: 'Reach — three cards', icon: 'grid', path: 'projects', anchor: '.reach-grid', fields: [arr('reach', 'Cards', titleBody('body'))] },
      legal('projects'),
      seo('projects.seo')
    ]
  };

  docs.gallery = {
    title: 'Gallery', icon: 'photos', preview: 'projects.html', group: 'Collections', wide: true,
    sub: 'Every photo and video on the Work portfolio wall. Drag to reorder.',
    count: c => c.projects.gallery.length,
    sections: [
      { title: 'Gallery wall', icon: 'photos', path: 'projects', anchor: '.gallery-wall', open: true, plain: true, fields: [
        arr('gallery', '', {
          layout: 'grid', filter: 'tag',
          title: it => [it.tag, it.title].filter(Boolean).join(' · ') || 'Untitled', thumb: it => it.src,
          badge: it => (it.hidden ? 'Hidden' : it.size && it.size !== 'normal' ? it.size : ''),
          dim: it => !!it.hidden,
          fromMedia: f => ({ src: f.path, alt: '', tag: '', title: '', size: 'normal', hidden: false }),
          fields: [
            media('src', 'File'),
            s('tag', 'Project or place', { w: 'half', suggest: 'tag', help: 'First part of the caption — e.g. “Bathroom Remodel”.' }),
            s('title', 'Caption', { w: 'half', help: 'Second part — e.g. “Finished Shower”.' }),
            s('alt', 'Description', { help: 'Describe the photo in a few words — used by Google and screen readers.' }),
            { key: 'size', label: 'Tile size on the wall', type: 'select', w: 'half',
              options: [['normal', 'Normal'], ['wide', 'Wide (2 across)'], ['tall', 'Tall (2 down)'], ['big', 'Big (2 × 2)']] },
            bool('hidden', 'Hide from the site', { w: 'half' })
          ]
        })
      ] }
    ]
  };

  docs.estimator = {
    title: 'Estimate request', icon: 'calculator', preview: 'estimator.html', group: 'Pages',
    sub: 'estimator.html — prices are under Estimator pricing',
    sections: [
      hero('estimator.hero'),
      { title: 'Services list', icon: 'grid', path: 'estimator.services', anchor: '#services', fields: [
        s('eyebrow', 'Small label'), t('heading', 'Headline', { rows: 2, help: BREAKS }), t('text', 'Intro', { rows: 3 }),
        arr('items', 'Services', { title: it => it.title, sub: it => it.desc, make: () => ({ title: '', desc: '', tags: [] }),
          fields: [s('title', 'Title'), t('desc', 'Description', { rows: 4, help: RICH }), { key: 'tags', label: 'Tags', type: 'tags' }] }),
        s('estimateLabel', 'First button', { w: 'half' }), s('quoteLabel', 'Second button', { w: 'half' }), link('quoteHref', 'Second button goes to')
      ] },
      legal('estimator'),
      seo('estimator.seo')
    ]
  };

  const R = 'estimator.rates';
  docs.pricing = {
    title: 'Estimator pricing', icon: 'dollar', preview: 'estimator.html', group: 'Collections',
    sub: 'The numbers behind the instant estimate. Ranges are low – high.',
    sections: [
      { title: 'Roofing — installed price per sq ft', icon: 'dollar', path: R + '.roofing.base', anchor: '.cfg-trade-bar', open: true, fields: [
        r('tpo', 'TPO / EPDM'), r('modbit', 'Modified bitumen'), r('bur', 'Built-up (BUR)'), r('tile', 'Tile'), r('shingle', 'Shingle'), r('metal2', 'Metal panel')
      ] },
      { title: 'Roofing — adjustments', icon: 'sliders', path: R + '.roofing', anchor: '.cfg-trade-bar', fields: [
        n('scope.tear', 'Full tear-off', { unit: '×', step: 0.01 }), n('scope.overlay', 'Overlay / recover', { unit: '×', step: 0.01 }),
        n('scope.new', 'New construction', { unit: '×', step: 0.01 }), n('penetration', 'Each penetration', { unit: '$' }),
        n('height.1', '1 story', { unit: '×', step: 0.01 }), n('height.2', '2 stories', { unit: '×', step: 0.01 }), n('height.3', '3+ stories', { unit: '×', step: 0.01 }),
        n('repair.lowMin', 'Repair — low minimum', { unit: '$' }), n('repair.lowPerSqft', 'Repair — low per sq ft', { unit: '$', step: 0.1 }),
        n('repair.highMin', 'Repair — high minimum', { unit: '$' }), n('repair.highPerSqft', 'Repair — high per sq ft', { unit: '$', step: 0.1 }),
        n('specials.solar', 'Solar panels on roof', { unit: '$' }), n('specials.occupied', 'Occupied building', { unit: '$' }),
        n('specials.night', 'Night work', { unit: '$' }), n('specials.phased', 'Phased work', { unit: '$' }),
        n('permit.standard', 'Standard permit', { unit: '$' }), n('permit.hvhz', 'HVHZ permit', { unit: '$' })
      ] },
      { title: 'County adjustment', icon: 'pin', path: R + '.county', anchor: '#location-section', desc: '1.10 means 10% is added', fields: [
        n('miami', 'Miami-Dade', { unit: '×', step: 0.01 }), n('broward', 'Broward', { unit: '×', step: 0.01 }),
        n('palm', 'Palm Beach', { unit: '×', step: 0.01 }), n('other', 'Other Florida', { unit: '×', step: 0.01 })
      ] },
      { title: 'Exterior', icon: 'dollar', path: R + '.exterior', anchor: '.cfg-trade-bar', desc: 'Per sq ft or linear ft', fields: [
        r('stucco', 'Stucco'), r('waterproof', 'Waterproofing'), r('fascia', 'Fascia / soffit'), r('gutters', 'Gutters'), r('other', 'Anything else')
      ] },
      { title: 'Interior', icon: 'dollar', path: R + '.interior', anchor: '.cfg-trade-bar', desc: 'Per sq ft', fields: [
        r('drywall', 'Drywall'), r('ceiling', 'Drop ceiling'), r('flooring', 'Flooring'), r('insulation', 'Insulation'), r('other', 'Anything else'),
        n('renovationMultiplier', 'Renovation (with demo)', { unit: '×', step: 0.01 })
      ] },
      { title: 'Carpentry', icon: 'dollar', path: R + '.carpentry', anchor: '.cfg-trade-bar', fields: [
        r('framing', 'Framing'), r('finish', 'Finish carpentry'), r('decking', 'Decking'), r('millwork', 'Millwork'), r('other', 'Anything else')
      ] },
      { title: 'Labor supply', icon: 'dollar', path: R + '.labor', anchor: '.cfg-trade-bar', fields: [r('perSqftDay', 'Per sq ft, per day', { w: 'full' })] },
      { title: 'Inspection & service fees', icon: 'tag', path: R + '.fees', anchor: '.cfg-trade-bar', desc: 'Price labels on the page update automatically', fields: [
        n('wind', 'Wind design calcs', { unit: '$' }), n('drainage.min', 'Drainage calcs — minimum', { unit: '$' }),
        n('drainage.includedSqft', 'Drainage — sq ft included', { unit: 'sq ft' }), n('drainage.perSqft', 'Drainage — each extra sq ft', { unit: '$', step: 0.05 }),
        n('bidPackage.under50', 'Bid package — under $50K', { unit: '$' }), n('bidPackage.50to250', 'Bid package — $50K–$250K', { unit: '$' }),
        n('bidPackage.250to1m', 'Bid package — $250K–$1M', { unit: '$' }), n('permit.reroof', 'Permit — re-roof', { unit: '$' }),
        n('permit.newconst', 'Permit — new construction', { unit: '$' }), n('permit.addition', 'Permit — addition / renovation', { unit: '$' }),
        n('permit.expedite', 'Permit — expediting', { unit: '$' }), n('drone.min', 'Drone survey — minimum', { unit: '$' }),
        n('drone.includedSqft', 'Drone — sq ft included', { unit: 'sq ft' }), n('drone.perSqft', 'Drone — each extra sq ft', { unit: '$', step: 0.01 }),
        n('drone.render', 'Drone — 3D render add-on', { unit: '$' }), n('drone.prebid', 'Drone — pre-bid docs add-on', { unit: '$' })
      ] }
    ]
  };

  docs.contact = {
    title: 'Contact', icon: 'mail', preview: 'contact.html', group: 'Pages',
    sub: 'contact.html — phone, email and hours come from Company & contact',
    sections: [
      hero('contact.hero'),
      { title: 'Left column', icon: 'type', path: 'contact', anchor: '.contact-layout', fields: [
        t('directHeading', 'Heading', { rows: 2, help: BREAKS }), t('blurb', 'Note under the contact details', { rows: 3, help: RICH })
      ] },
      { title: 'Inquiry form', icon: 'form', path: 'contact.form', anchor: '.cf', fields: [
        s('title', 'Form title', { w: 'half' }), s('submitLabel', 'Button text', { w: 'half' }),
        { key: 'services', label: 'Service choices', type: 'tags', help: 'Options in the Service dropdown.' },
        { key: 'counties', label: 'County choices', type: 'tags' },
        s('messagePlaceholder', 'Hint inside the message box'),
        t('note1', 'Small print — line 1', { rows: 2 }), t('note2', 'Small print — line 2', { rows: 2 }),
        s('successTitle', 'After sending — title', { w: 'half' }), s('successText', 'After sending — message', { w: 'half' })
      ] },
      seo('contact.seo')
    ]
  };

  docs.settings = {
    title: 'Company & contact', icon: 'building', preview: 'contact.html', group: 'Site',
    sub: 'Used across every page — change it once here',
    sections: [
      { title: 'Company', icon: 'building', path: 'site', anchor: 'nav', open: true, fields: [
        s('name', 'Company name', { w: 'half' }), s('legalName', 'Legal name', { w: 'half' }),
        s('logoName', 'Logo text', { w: 'half' }), s('logoSub', 'Logo small line', { w: 'half' })
      ] },
      { title: 'Contact details', icon: 'phone', path: 'site', anchor: '.cl-contacts', open: true, fields: [
        s('phone', 'Phone', { w: 'half' }), s('email', 'Email', { w: 'half' }),
        s('hours', 'Hours'), s('serviceArea', 'Service area', { w: 'half' }), s('responseTime', 'Response time', { w: 'half' })
      ] },
      { title: 'Connections', icon: 'plug', path: 'site', fields: [
        s('url', 'Website address', { w: 'half', help: 'No slash at the end.' }), s('projexUrl', 'Projex link', { w: 'half' }),
        s('formEndpoint', 'Form delivery (Formspree)', { help: 'Where contact and estimate forms are sent.' }),
        s('googleTagId', 'Google tag ID', { help: 'Google Ads / Analytics tracking. Leave empty to turn tracking off.' })
      ] }
    ]
  };

  docs.nav = {
    title: 'Menu', icon: 'menu', preview: 'index.html', group: 'Site',
    sub: 'The links at the top of every page',
    sections: [
      { title: 'Menu links', icon: 'menu', path: 'nav', anchor: 'nav', open: true, fields: [
        arr('items', '', { title: it => it.label, sub: it => it.href, badge: it => (it.cta ? 'Button' : ''), make: () => ({ label: '', href: '', cta: false }),
          fields: [s('label', 'Text', { w: 'half' }), link('href', 'Goes to', { w: 'half' }), bool('cta', 'Show as the gold button')] })
      ] }
    ]
  };

  docs.footer = {
    title: 'Footer', icon: 'footer', preview: 'index.html', group: 'Site',
    sub: 'The dark area at the bottom of every page',
    sections: [
      { title: 'Brand block', icon: 'type', path: 'footer', anchor: 'footer', open: true, fields: [
        s('brandName', 'Name', { w: 'half' }), s('brandSub', 'Small line', { w: 'half' }),
        t('description', 'Description', { rows: 3 }), s('projexLabel', 'Projex link text')
      ] },
      { title: 'Link columns', icon: 'columns', path: 'footer', anchor: 'footer', open: true, fields: [
        arr('columns', '', { title: it => it.title, sub: it => (it.links || []).map(l => l.label).join(', '), make: () => ({ title: '', links: [] }),
          fields: [s('title', 'Column title'),
            arr('links', 'Links', { title: it => it.label, sub: it => it.href, make: () => ({ label: '', href: '' }),
              fields: [s('label', 'Text', { w: 'half' }), link('href', 'Goes to', { w: 'half', help: 'Use mailto:{email} or tel:{tel} to follow Company & contact.' })] })] })
      ] },
      { title: 'Bottom line', icon: 'type', path: 'footer', anchor: '.fbot', fields: [s('bottomLeft', 'Left'), s('bottomRight', 'Right')] }
    ]
  };

  // Custom pages — one doc per entry in content.pages
  const blockVariants = {
    text: { label: 'Text', icon: 'type', make: () => ({ type: 'text', heading: '', body: '' }),
      fields: [t('heading', 'Heading', { rows: 1 }), t('body', 'Text', { rows: 6, help: 'Leave an empty line between paragraphs. ' + RICH })] },
    image: { label: 'Photo', icon: 'image', make: () => ({ type: 'image', src: '', alt: '', caption: '' }),
      fields: [media('src', 'Photo', { kind: 'image' }), s('alt', 'Description', { w: 'half' }), s('caption', 'Caption', { w: 'half' })] },
    gallery: { label: 'Photo grid', icon: 'photos', make: () => ({ type: 'gallery', items: [] }),
      fields: [arr('items', 'Photos & videos', Object.assign({ layout: 'grid' }, photo))] },
    cards: { label: 'Cards', icon: 'grid', make: () => ({ type: 'cards', items: [{ title: '', body: '' }] }),
      fields: [arr('items', 'Cards', titleBody('body', 'Text'))] },
    cta: { label: 'Call to action', icon: 'megaphone', make: () => ({ type: 'cta', heading: '', text: '', buttonLabel: 'Request a Quote', buttonHref: 'contact.html' }),
      fields: [s('heading', 'Heading'), t('text', 'Text', { rows: 2 }), s('buttonLabel', 'Button text', { w: 'half' }), link('buttonHref', 'Button goes to', { w: 'half' })] }
  };
  const blockTitle = b => ({ text: b.heading || 'Text', image: b.caption || b.alt || 'Photo', gallery: `Photo grid · ${(b.items || []).length}`,
    cards: `Cards · ${(b.items || []).length}`, cta: b.heading || 'Call to action' }[b.type] || b.type);

  const pageDoc = (page, i) => ({
    title: () => page.title || 'Untitled page', icon: 'doc', preview: () => page.slug + '.html', group: 'Pages', back: 'pages',
    sub: () => `mecgroup.live/${page.slug}.html — add it to the Menu when it is ready`,
    sections: [
      { title: 'Page', icon: 'doc', path: 'pages.' + i, open: true, fields: [
        s('title', 'Page name', { w: 'half' }),
        s('slug', 'Web address', { w: 'half', prefix: '/', suffix: '.html', slug: true, help: 'Lowercase letters, numbers and dashes.' }),
        s('hero.eyebrow', 'Small label'), t('hero.heading', 'Headline', { rows: 2, help: BREAKS + ' Leave empty to use the page name.' }), t('hero.text', 'Intro', { rows: 3, help: RICH })
      ] },
      { title: 'Content', icon: 'grid', path: 'pages.' + i, anchor: '.cp-body', open: true, fields: [
        arr('blocks', '', { title: blockTitle, sub: b => blockVariants[b.type] ? blockVariants[b.type].label : '', thumb: b => (b.type === 'image' ? b.src : ''), variants: blockVariants, addLabel: 'Add a block' })
      ] },
      { title: 'Search & sharing', icon: 'search', path: 'pages.' + i, fields: [
        s('seoTitle', 'Page title', { max: 60, help: 'Leave empty to use “Page name | Company”.' }),
        t('description', 'Search description', { max: 160, rows: 3 }),
        media('image', 'Share image', { w: 'half', kind: 'image' }), bool('hidden', 'Keep out of Google’s sitemap', { w: 'half' }),
        t('legal', 'Legal note above the footer', { rows: 2 })
      ] }
    ]
  });
  const newPage = () => ({ slug: 'new-page', title: 'New Page', hero: { eyebrow: '', heading: '', text: '' }, blocks: [blockVariants.text.make()], seoTitle: '', description: '', image: '', hidden: false, legal: '' });

  window.SCHEMA = { docs, pageDoc, newPage, order: ['home', 'estimator', 'projects', 'contact'], collections: ['gallery', 'pricing'], site: ['settings', 'nav', 'footer'] };
})();
