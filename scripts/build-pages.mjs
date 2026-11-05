#!/usr/bin/env node
/**
 * MediGo PRD v2 — static HTML generator (Netlify-ready).
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SITE = join(__dirname, '..');
const catalog = JSON.parse(readFileSync(join(SITE, 'data', 'catalog.json'), 'utf8'));

const { procedures, destinations, clinics, doctors, prices, sentiments, search_index } = catalog;

const byId = {
  procedure: Object.fromEntries(procedures.map((p) => [p.id, p])),
  destination: Object.fromEntries(destinations.map((d) => [d.id, d])),
  clinic: Object.fromEntries(clinics.map((c) => [c.id, c])),
  doctor: Object.fromEntries(doctors.map((d) => [d.id, d])),
};

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function money(n) {
  if (n == null) return '—';
  return `$${Number(n).toLocaleString('en-US')}`;
}

function rangeLabel(min, max) {
  return `${money(min)}–${money(max)}`;
}

function rel(fromDepth, path) {
  const prefix = fromDepth === 0 ? './' : '../'.repeat(fromDepth);
  return prefix + path.replace(/^\.\//, '');
}

function fonts() {
  return `  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Figtree:wght@600;700;800;900&display=swap">`;
}

function logoSrc(depth) {
  return rel(depth, 'assets/logo-care-compass.png');
}

function logoMarkSrc(depth) {
  return rel(depth, 'assets/logo-care-compass-mark.png');
}

function faviconLinks(depth) {
  const src = logoSrc(depth);
  return `  <link rel="icon" href="${src}" type="image/png">
  <link rel="apple-touch-icon" href="${src}">`;
}

function brandMark(depth, { className = 'nav__logo', size = 44 } = {}) {
  return `<img class="${className}" src="${logoMarkSrc(depth)}" alt="" width="${size}" height="${size}" decoding="async">`;
}

/** Cover art for hub tiles (3:2). Falls back to abstract placeholder. */
const DEST_COVER = {
  istanbul: 'assets/destination-turkey.jpg',
  seoul: 'assets/destination-south-korea.jpg',
  bangkok: 'assets/destination-thailand.jpg',
  tijuana: 'assets/destination-tijuana.jpg',
  'mexico-city': 'assets/destination-mexico-city.jpg',
  medellin: 'assets/destination-colombia.jpg',
  delhi: 'assets/destination-delhi.jpg',
  'san-jose': 'assets/destination-san-jose.jpg',
  barcelona: 'assets/destination-barcelona.jpg',
  prague: 'assets/destination-prague.jpg',
};

/** Procedure tile art (4:5 cover). Falls back to abstract placeholder. */
const PROC_COVER = {
  'hair-transplant': 'assets/procedure-hair-transplant.jpg',
  rhinoplasty: 'assets/procedure-rhinoplasty.jpg',
  'eyelid-surgery': 'assets/procedure-blepharoplasty.jpg',
  'dental-implants': 'assets/procedure-dental-implants.jpg',
  ivf: 'assets/procedure-ivf.jpg',
  'tummy-tuck': 'assets/procedure-tummy-tuck.jpg',
  injectables: 'assets/procedure-injectables.jpg',
};

function destCover(slug, depth = 0) {
  return rel(depth, DEST_COVER[slug] || 'assets/placeholders/dest-abstract.svg');
}

function procCover(slug, depth = 0) {
  return rel(depth, PROC_COVER[slug] || 'assets/placeholders/proc-abstract.svg');
}

/** Fixed-shape specialty snippet — first 3 labels, clamped further in CSS. */
function specialtySnippet(d) {
  const specs = d.specialties || [];
  if (!specs.length) return d.focus || '';
  return specs.slice(0, 3).join(', ');
}

function destTile(d, depth = 0) {
  return `<li>
              <a class="dest-tile" href="${rel(depth, `destinations/${d.slug}.html`)}">
                <span class="dest-tile__media">
                  <img src="${destCover(d.slug, depth)}" alt="" width="600" height="400" loading="lazy" decoding="async">
                </span>
                <span class="dest-tile__body">
                  <span class="dest-tile__name">${esc(d.name)}</span>
                  <span class="dest-tile__country">${esc(d.country)}</span>
                  <span class="dest-tile__focus">${esc(specialtySnippet(d))}</span>
                </span>
              </a>
            </li>`;
}

/** Synthetic destination price for a procedure×hub pair. */
function destPriceForProcedure(procedureId, destinationId) {
  return prices.find(
    (x) =>
      x.entity_type === 'destination' &&
      x.procedure_id === procedureId &&
      x.entity_id === destinationId
  );
}

function fromPriceLabel(min) {
  if (min == null) return '';
  return `From ${money(min)}`;
}

/** Destination photo cards under a procedure (city · country · From $X). */
function hubDestCards(dests, depth = 0, procedureId = null) {
  if (!dests.length) return '';
  const items = dests
    .map((d) => {
      const pr = procedureId ? destPriceForProcedure(procedureId, d.id) : null;
      const price = pr ? fromPriceLabel(pr.min_usd) : '—';
      return `<li>
                  <a class="hub-dest-card" href="${rel(depth, `destinations/${d.slug}.html`)}">
                    <span class="hub-dest-card__media">
                      <img src="${destCover(d.slug, depth)}" alt="" width="600" height="400" loading="lazy" decoding="async">
                    </span>
                    <span class="hub-dest-card__body">
                      <span class="hub-dest-card__city">${esc(d.name)}</span>
                      <span class="hub-dest-card__country">${esc(d.country)}</span>
                      <span class="hub-dest-card__price">${esc(price)}</span>
                    </span>
                  </a>
                </li>`;
    })
    .join('');
  return `<ul class="hub-dest-rail" aria-label="Destinations for this procedure">${items}</ul>`;
}

function procedureDests(p) {
  return (p.destination_ids || []).map((id) => byId.destination[id]).filter(Boolean);
}

function procedureEntry(p, depth = 0) {
  const dests = procedureDests(p);
  return `<li data-proc-item data-name="${esc(p.name.toLowerCase())}" data-category="${esc(p.category)}" data-letter="${esc(p.name.charAt(0).toUpperCase())}">
                <div class="az-list__entry">
                  <a class="az-list__link" href="${rel(depth, `procedures/${p.slug}.html`)}">
                    <span class="az-list__title">${esc(p.name)}</span>
                  </a>
                  ${hubDestCards(dests, depth, p.id)}
                </div>
              </li>`;
}

/** Specialty section order — common medical-travel specialties first. */
const SPECIALTY_ORDER = [
  'Plastic surgery',
  'Dental',
  'Fertility',
  'Orthopedics',
  'Aesthetics',
  'Bariatric',
  'Cardiac',
  'Dermatology',
  'Eye',
  'Oncology',
];

function specialtyRank(cat) {
  const i = SPECIALTY_ORDER.indexOf(cat);
  return i === -1 ? SPECIALTY_ORDER.length : i;
}

function procTile(p, depth = 0, { home = false } = {}) {
  const name = home && p.home_tile_name ? p.home_tile_name : p.name;
  const meta = home && p.home_tile_meta ? p.home_tile_meta : p.category;
  return `<li>
              <a class="proc-tile" href="${rel(depth, `procedures/${p.slug}.html`)}">
                <span class="proc-tile__media">
                  <img class="proc-photo" src="${procCover(p.slug, depth)}" alt="" width="400" height="500" loading="lazy" decoding="async">
                </span>
                <span class="proc-tile__body">
                  <span class="proc-tile__name">${esc(name)}</span>
                  <span class="proc-tile__meta">${esc(meta)}</span>
                </span>
              </a>
            </li>`;
}

function head({ title, description, depth, extra = '' }) {
  const b = rel(depth, 'brand.css');
  const s = rel(depth, 'site.css');
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${esc(description)}">
  <meta name="robots" content="noindex,nofollow">
  <title>${esc(title)}</title>
${faviconLinks(depth)}
${fonts()}
  <link rel="stylesheet" href="${b}">
  <link rel="stylesheet" href="${s}">
  <style>body{margin:0;background:#fffbe6;color:#40032b;font-family:"DM Sans",system-ui,sans-serif}.section--dark{background:#40032b;color:#fffbe6}.t-display{font-family:"Figtree",system-ui,sans-serif;font-weight:900;letter-spacing:-0.03em}</style>
${extra}</head>
<body>
`;
}

function nav(depth, active) {
  const home = rel(depth, 'index.html');
  const p = (path) => rel(depth, path);
  const link = (href, label, key, className = 'site-menu__link') => {
    const isActive = active === key;
    return `<a class="${className}${isActive ? ' is-active' : ''}" href="${p(href)}"${isActive ? ' aria-current="page"' : ''}>${label}</a>`;
  };
  const destCard = (destHref, destLabel, items, photo, photoAlt) => `
              <article class="site-menu__card">
                <div class="site-menu__card-media">
                  <img src="${p(photo)}" alt="${esc(photoAlt)}" width="640" height="360" loading="lazy" decoding="async">
                </div>
                <div class="site-menu__card-body">
                  <h3 class="site-menu__dest">${destLabel}</h3>
                  <ul class="site-menu__procs">
                    ${items
                      .map(
                        ([href, label]) =>
                          `<li><a class="site-menu__proc" href="${p(href)}">${label}</a></li>`
                      )
                      .join('')}
                  </ul>
                  <a class="site-menu__view-all" href="${p(destHref)}">View all</a>
                </div>
              </article>`;
  return `  <header class="site-header" data-autohide>
    <div class="nav container nav--bar">
      <div class="nav__start">
        <button class="nav__toggle" type="button" aria-expanded="false" aria-controls="site-menu" aria-haspopup="dialog" data-nav-toggle>
          <span class="visually-hidden">Open menu</span>
          <span class="nav__toggle-icon" aria-hidden="true"></span>
        </button>
        <a class="nav__brand" href="${home}">${brandMark(depth)}MediGo</a>
      </div>
    </div>
    <div id="site-menu" class="site-menu" data-site-menu hidden role="dialog" aria-modal="true" aria-label="Site menu">
      <div class="site-menu__panel" data-site-menu-panel>
        <div class="site-menu__top container">
          <a class="nav__brand site-menu__brand" href="${home}">${brandMark(depth)}MediGo</a>
          <button class="site-menu__close" type="button" data-nav-close>
            <span class="visually-hidden">Close menu</span>
            <span class="site-menu__close-icon" aria-hidden="true"></span>
          </button>
        </div>
        <div class="site-menu__inner container">
          <form class="site-menu__search" action="${p('procedures.html')}" method="get" role="search" data-menu-search>
            <label class="visually-hidden" for="menu-search-input">Search destination, procedure, clinic, or doctor</label>
            <div class="site-menu__search-shell">
              <input id="menu-search-input" class="site-menu__search-input" name="q" type="search" inputmode="search" autocomplete="off" spellcheck="false" placeholder="Search destination, procedure, clinic, or doctor" aria-label="Search destination, procedure, clinic, or doctor" aria-expanded="false" aria-controls="menu-search-panel" aria-autocomplete="list">
              <button class="site-menu__search-btn" type="submit">Search</button>
            </div>
            <div id="menu-search-panel" class="search-panel site-menu__suggest" data-search-panel hidden>
              <div class="search-panel__hits search-suggest" data-search-suggest hidden></div>
            </div>
          </form>
          <div class="site-menu__cols">
            <nav class="site-menu__col site-menu__col--nav" aria-label="Navigation">
              ${link('procedures.html', 'Procedures', 'procedures')}
              ${link('destinations.html', 'Destinations', 'destinations')}
              ${link('clinics.html', 'Clinics', 'clinics')}
            </nav>
            <div class="site-menu__col site-menu__col--featured" aria-label="Top procedures and destinations">
              <div class="site-menu__cards">
                ${destCard(
                  'destinations/istanbul.html',
                  'Istanbul, Turkey',
                  [
                    ['procedures/breast-augmentation.html', 'Breast Augmentation'],
                    ['procedures/hair-transplant.html', 'Hairline Transplant'],
                    ['procedures/rhinoplasty.html', 'Rhinoplasty'],
                  ],
                  'assets/menu-istanbul-waterfront.jpg',
                  'Istanbul waterfront at sunset'
                )}
                ${destCard(
                  'destinations/seoul.html',
                  'Seoul, South Korea',
                  [
                    ['procedures/injectables.html', 'Lasers &amp; Injectables'],
                    ['procedures/facelift.html', 'Facelift'],
                    ['procedures/eyelid-surgery.html', 'Eyebrow Lift'],
                  ],
                  'assets/menu-seoul-gangnam.jpg',
                  'Gangnam shopping district in Seoul'
                )}
                ${destCard(
                  'destinations/mexico-city.html',
                  'Mexico City, MX',
                  [
                    ['procedures/injectables.html', 'Lasers &amp; Injectables'],
                    ['procedures/dental-implants.html', 'Dental Implants'],
                    ['procedures/smile-makeover.html', 'Invisalign'],
                    ['procedures/dental-implants.html', 'Root Canal'],
                  ],
                  'assets/menu-mexico-angel.jpg',
                  'Angel of Independence in Mexico City'
                )}
              </div>
            </div>
            <nav class="site-menu__col site-menu__col--company" aria-label="Company">
              <p class="site-menu__eyebrow">Company</p>
              ${link('about.html', 'About Us', 'about')}
              ${link('contact.html', 'Contact', 'contact')}
            </nav>
          </div>
        </div>
      </div>
    </div>
  </header>
`;
}

function footer(depth) {
  return `  <footer class="site-footer section section--flame">
    <div class="container footer-grid">
      <div>
        <p class="footer-brand">${brandMark(depth, { className: 'footer-brand__logo', size: 32 })}MediGo</p>
      </div>
      <div class="footer-links">
        <a href="${rel(depth, 'destinations.html')}">Destinations</a>
        <a href="${rel(depth, 'procedures.html')}">Procedures</a>
        <a href="${rel(depth, 'clinics.html')}">Clinics</a>
        <a href="${rel(depth, 'about.html')}">About</a>
        <a href="${rel(depth, 'contact.html')}">Contact</a>
      </div>
    </div>
  </footer>
  <aside class="demo-badge" data-demo-badge aria-label="Demo">
    <span class="demo-badge__pill">Demo</span>
  </aside>
  <script src="${rel(depth, 'brand.js')}" defer></script>
  <script src="${rel(depth, 'app.js')}" defer></script>
</body>
</html>
`;
}

function contactForm({ depth = 0, heading = 'Get in touch' } = {}) {
  const action = rel(depth, 'contact.html');
  return `<section class="inquiry section section--lavender" id="inquire" data-reveal>
    <div class="container inquiry-wrap">
      <div class="inquiry-copy">
        <h2 class="t-h2">${esc(heading)}</h2>
        <p class="t-body">Demo form only, nothing is transmitted to a server.</p>
      </div>
      <form class="inquiry-form" action="${action}" method="get" data-contact-form>
        <div class="field field--light">
          <label for="contact-name">Name</label>
          <input id="contact-name" name="name" type="text" autocomplete="name" placeholder="Your name" required>
        </div>
        <div class="field field--light">
          <label for="contact-email">Email</label>
          <input id="contact-email" name="email" type="email" autocomplete="email" placeholder="you@example.com" required>
        </div>
        <div class="field field--light">
          <label for="contact-message">Message</label>
          <textarea id="contact-message" name="message" rows="5" placeholder="How can we help?" required></textarea>
        </div>
        <button class="btn btn--plum" type="submit">Send message</button>
        <p class="t-caption inquiry-note">Demo contact — submissions stay on this page. Nothing is emailed.</p>
      </form>
    </div>
  </section>`;
}

function inquiryForm({ depth, procedure = '', destination = '', heading = 'Plan this trip' }) {
  const action = rel(depth, 'contact.html');
  const procOpts = procedures
    .map((p) => `<option value="${esc(p.name)}"${p.name === procedure ? ' selected' : ''}>${esc(p.name)}</option>`)
    .join('');
  const destOpts = destinations
    .map((d) => {
      const label = `${d.name}, ${d.country}`;
      return `<option value="${esc(label)}"${label === destination || d.name === destination ? ' selected' : ''}>${esc(label)}</option>`;
    })
    .join('');
  return `<section class="inquiry section section--lavender" id="inquire" data-reveal>
    <div class="container inquiry-wrap">
      <div class="inquiry-copy">
        <h2 class="t-h2">${esc(heading)}</h2>
        <p class="t-body">Tell us the procedure, destination, and budget. A concierge can help shape a full trip plan — demo form only, nothing is sent.</p>
      </div>
      <form class="inquiry-form" action="${action}" method="get" data-inquiry>
        <div class="field field--light">
          <label for="inq-procedure">Procedure</label>
          <select id="inq-procedure" name="procedure" required>
            <option value="">Select</option>
            ${procOpts}
          </select>
        </div>
        <div class="field field--light">
          <label for="inq-destination">Destination</label>
          <select id="inq-destination" name="destination" required>
            <option value="">Select</option>
            ${destOpts}
          </select>
        </div>
        <div class="field field--light">
          <label for="inq-budget">Budget (USD)</label>
          <input id="inq-budget" name="budget" type="text" inputmode="numeric" placeholder="e.g. 8000" required>
        </div>
        <div class="field field--light">
          <label for="inq-email">Email</label>
          <input id="inq-email" name="email" type="email" placeholder="you@example.com" required>
        </div>
        <button class="btn btn--plum" type="submit">Request a plan</button>
        <p class="t-caption inquiry-note">Demo inquiry — submissions stay on this page / contact confirmation. Not a medical booking.</p>
      </form>
    </div>
  </section>`;
}

function sentimentBlock(entityName, entityType) {
  const s = sentiments.find((x) => x.entity_type === entityType && x.summary.includes(entityName));
  if (!s) return '';
  const themes = (s.themes || [])
    .map((t) => `<li><span class="theme-pill theme-pill--${esc(t.tone)}">${esc(t.theme)}</span></li>`)
    .join('');
  return `<section class="panel" data-reveal>
    <h2 class="t-h3">Patient sentiment (illustrative)</h2>
    <p class="banner-demo">Labeled demo: synthesized from public-style post patterns — not live Reddit/TikTok/Instagram scrapes.</p>
    <p>${esc(s.summary)}</p>
    <ul class="theme-list">${themes}</ul>
    <p class="t-caption">Confidence: ${esc(s.confidence)} · ${esc(s.labeled || 'illustrative/demo')}</p>
  </section>`;
}

function clearDirKeep(dir) {
  mkdirSync(dir, { recursive: true });
  for (const f of readdirSync(dir)) {
    if (f.endsWith('.html')) rmSync(join(dir, f));
  }
}

clearDirKeep(join(SITE, 'procedures'));
clearDirKeep(join(SITE, 'destinations'));
clearDirKeep(join(SITE, 'clinics'));
clearDirKeep(join(SITE, 'doctors'));

// ---------- Homepage ----------
const popularProcs = procedures.filter((p) => p.popular);
const featuredDests = destinations.filter((d) => d.featured);

const indexHtml =
  head({
    title: 'MediGo — Medical travel, made easy',
    description: 'MediGo helps you compare procedures, destinations, clinics, and doctors abroad — with trip planning and AI research over public social sources.',
    depth: 0,
  }) +
  nav(0, 'home') +
  `<main id="top">
    <section class="section section--hero hero-band hero-band--atmosphere" aria-labelledby="hero-title">
      <div class="hero-atmosphere" aria-hidden="true"></div>
      <div class="container hero hero--solo">
        <h1 id="hero-title" class="t-display" data-reveal data-reveal-eager>Medical travel, made easy.</h1>
        <form id="search" class="hero-search" data-reveal data-reveal-eager action="./procedures.html" method="get" role="search" data-global-search>
          <label class="visually-hidden" for="hero-search-input">Search destination, procedure, clinic, or doctor</label>
          <div class="hero-search__shell">
            <div class="hero-search__field">
              <span class="hero-search__rotator" data-search-rotator aria-hidden="true">
                <span class="hero-search__slot" data-rotate-slot></span><span class="hero-search__caret" aria-hidden="true"></span>
              </span>
              <input id="hero-search-input" class="hero-search__input" name="q" type="text" inputmode="search" autocomplete="off" spellcheck="false" placeholder="" aria-label="Search destination, procedure, clinic, or doctor" aria-expanded="false" aria-controls="hero-search-panel" aria-autocomplete="list">
            </div>
            <button class="hero-search__icon" type="submit" aria-label="Search">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2"/>
                <path d="M20 20l-3.5-3.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </button>
          </div>
          <div id="hero-search-panel" class="search-panel" data-search-panel hidden>
            <div class="search-panel__trending" data-search-trending>
              <div class="search-panel__section">
                <h3 class="search-panel__heading">Popular procedures</h3>
                <ul class="search-panel__list">
                  <li><a class="search-panel__item" href="./procedures/hair-transplant.html"><span class="search-panel__icon search-panel__icon--plum" aria-hidden="true"><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><ellipse cx="12" cy="12" rx="8.5" ry="9.5" stroke="currentColor" stroke-width="2"/><path fill="currentColor" d="M9 18.2c.15-1.5 1.15-2.55 2.25-3.25-.15-.55-.25-1.2-.25-1.95 0-1.7.55-3.15 1.55-4 .35-.3.8-.4 1.15-.25.25-.65.8-1.1 1.55-1.1.65 0 1.2.35 1.5.9.3-.2.75-.15 1.05.25.55.55.45 1.4 0 1.9.7.55 1.15 1.4 1.15 2.4 0 .95-.4 1.8-1.15 2.4v.25c1.05.7 1.8 1.75 1.8 3.1 0 .45-.35.75-.8.75H9.75c-.5 0-.85-.4-.75-.95z"/></svg></span><span class="search-panel__copy"><span class="search-panel__title">Hair Transplants</span><span class="search-panel__sub">Aesthetics</span></span></a></li>
                  <li><a class="search-panel__item" href="./procedures/rhinoplasty.html"><span class="search-panel__icon search-panel__icon--flame" aria-hidden="true"><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M8.5 4v8.2c0 1.1.55 2.1 1.7 3L15 19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M8.5 12.5c2.8.6 5.4 2.2 7 4.2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M15 19c-1.1.9-2.1 2.1-2.6 3.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></span><span class="search-panel__copy"><span class="search-panel__title">Rhinoplasty</span><span class="search-panel__sub">Plastic surgery</span></span></a></li>
                  <li><a class="search-panel__item" href="./procedures/ivf.html"><span class="search-panel__icon search-panel__icon--pink" aria-hidden="true"><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="9.5" r="5.5" stroke="currentColor" stroke-width="2"/><circle cx="9.8" cy="9.2" r="1.1" fill="currentColor"/><circle cx="14.2" cy="9.2" r="1.1" fill="currentColor"/><path d="M9.6 11.8c.9 1.3 1.9 1.9 2.4 1.9s1.5-.6 2.4-1.9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M7.5 18.5c1.3 1.8 2.8 2.7 4.5 2.7s3.2-.9 4.5-2.7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M12 4V2.8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></span><span class="search-panel__copy"><span class="search-panel__title">IVF</span><span class="search-panel__sub">Fertility</span></span></a></li>
                  <li><a class="search-panel__item" href="./procedures/dental-implants.html"><span class="search-panel__icon search-panel__icon--blue" aria-hidden="true"><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 3.5c-1.9 0-3.2 1.5-3.2 3.4 0 1.7.4 3.8 1.1 6.2L8.2 21h2.4l.9-6.5.9 6.5h2.4l1.3-7.9c.7-2.4 1.1-4.5 1.1-6.2 0-1.9-1.3-3.4-3.2-3.4-1.1 0-2 .5-2.2 1-.2-.5-1.1-1-2.2-1z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg></span><span class="search-panel__copy"><span class="search-panel__title">Dental implants</span><span class="search-panel__sub">Dental</span></span></a></li>
                </ul>
              </div>
              <div class="search-panel__section">
                <h3 class="search-panel__heading">Top destinations</h3>
                <ul class="search-panel__list">
                  <li><a class="search-panel__item" href="./destinations/istanbul.html"><span class="search-panel__icon search-panel__icon--sunglow" aria-hidden="true"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M2 20.2h20M3.8 22.3h16.4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M4.8 20.2V7.8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M3.3 9.6h3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M3.3 7.8 4.8 4.8 6.3 7.8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M4.8 4.8V3.3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M8.2 20.2v-6.2h12.2v6.2" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M8.2 14c0-4.4 2.8-7.4 6.1-7.4S20.4 9.6 20.4 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M14.3 6.6V5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M11.2 14c0-2.2 1.4-3.6 3.1-3.6s3.1 1.4 3.1 3.6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M12.6 20.2v-2.6a1.7 1.7 0 0 1 3.4 0v2.6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M21.2 20.2V11.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M20.2 12.8h2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M20.2 11.5 21.2 9.6 22.2 11.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></span><span class="search-panel__copy"><span class="search-panel__title">Istanbul</span><span class="search-panel__sub">Türkiye</span></span></a></li>
                  <li><a class="search-panel__item" href="./destinations/seoul.html"><span class="search-panel__icon search-panel__icon--tangerine" aria-hidden="true"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M2.5 20.2h19M4.5 22.3h15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M2 15.2 12 10.2 22 15.2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M3.8 15.2v3.8h16.4v-3.8" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M4.6 11.2 12 6.8 19.4 11.2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 11.2v2.6h12v-2.6" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M7 7.2 12 3.4 17 7.2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M8.4 7.2v1.8h7.2V7.2" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M12 3.4V1.9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M9.2 19h5.6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></span><span class="search-panel__copy"><span class="search-panel__title">Seoul</span><span class="search-panel__sub">South Korea</span></span></a></li>
                  <li><a class="search-panel__item" href="./destinations/bangkok.html"><span class="search-panel__icon search-panel__icon--forest" aria-hidden="true"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M2 18.2c1.6 1.3 3.2 1.3 4.8 0s3.2-1.3 4.8 0 3.2 1.3 4.8 0 3.2-1.3 4.8 0" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M3 20.8c1.4 1.1 2.9 1.1 4.3 0s2.9-1.1 4.3 0 2.9 1.1 4.3 0 2.9-1.1 4.3 0" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M3.2 16.8V9.2h7.4v7.6" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M3.2 9.2 6.9 5.4 10.6 9.2" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><circle cx="5.5" cy="12" r="0.9" fill="currentColor"/><circle cx="8.3" cy="12" r="0.9" fill="currentColor"/><path d="M6.2 16.8v-2.2h1.6v2.2" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M17 16.8V8.4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M17 9C13.6 6.8 12 4.2 11.4 2.2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M17 9C20.4 6.8 22 4.2 22.6 2.2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M17 9C15 5.8 14.6 3.4 15.4 1.6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M17 9C19 5.8 19.4 3.4 18.6 1.6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M17 9C13.2 8.4 11 9 9.4 10.6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M17 9C20.8 8.4 23 9 24.6 10.6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></span><span class="search-panel__copy"><span class="search-panel__title">Bangkok</span><span class="search-panel__sub">Thailand</span></span></a></li>
                  <li><a class="search-panel__item" href="./destinations/tijuana.html"><span class="search-panel__icon search-panel__icon--plum-soft" aria-hidden="true"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M2 20.2h20M3.8 22.3h16.4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="19.8" cy="5.8" r="2.5" stroke="currentColor" stroke-width="1.5"/><path d="M2.8 20.2V13h6.2v7.2" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M2.8 13 5.9 9.8 9 13" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M5 20.2v-2.4h1.6v2.4" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><circle cx="4.4" cy="15.2" r="0.7" fill="currentColor"/><circle cx="7.2" cy="15.2" r="0.7" fill="currentColor"/><path d="M12.2 13.6V8.2a3.8 3.4 0 0 1 7.6 0v5.4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M12.6 12.8h6.8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M9.4 15c1.6-1.2 4-1.9 6.6-1.9s5 0.7 6.6 1.9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M9.4 15c1.8 3.2 4.6 4.8 6.6 4.8s4.8-1.6 6.6-4.8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M11.2 16.6h11.6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></span><span class="search-panel__copy"><span class="search-panel__title">Tijuana</span><span class="search-panel__sub">Mexico</span></span></a></li>
                </ul>
              </div>
            </div>
            <div class="search-panel__hits search-suggest" data-search-suggest hidden></div>
          </div>
        </form>
        <div class="hero-cta-row" data-reveal data-reveal-eager>
          <a class="btn btn--dark-bg" href="./procedures.html">Browse procedures</a>
          <a class="btn btn--dark-bg" href="./destinations.html">Explore destinations</a>
        </div>
      </div>
    </section>

    <section class="section" aria-labelledby="proc-home-title">
      <div class="container" data-reveal>
        <div class="section-head">
          <h2 id="proc-home-title" class="t-h2">Popular procedures</h2>
          <a class="text-link" href="./procedures.html">View All</a>
        </div>
        <ul class="proc-rail">
          ${popularProcs.map((p) => procTile(p, 0, { home: true })).join('')}
        </ul>
      </div>
    </section>

    <section class="section section--lavender" aria-labelledby="dest-home-title">
      <div class="container" data-reveal>
        <div class="section-head">
          <h2 id="dest-home-title" class="t-h2">Destinations</h2>
          <a class="text-link" href="./destinations.html">View All</a>
        </div>
        <ul class="dest-rail">
          ${featuredDests.map((d) => destTile(d, 0)).join('')}
        </ul>
      </div>
    </section>

    ${inquiryForm({ depth: 0, heading: 'Plan your trip.' })}
  </main>
` +
  footer(0);

writeFileSync(join(SITE, 'index.html'), indexHtml);

// ---------- Procedures index ----------
const proceduresSorted = [...procedures].sort((a, b) => a.name.localeCompare(b.name));

const proceduresBySpecialty = [...procedures].sort((a, b) => {
  const rank = specialtyRank(a.category) - specialtyRank(b.category);
  if (rank !== 0) return rank;
  return a.name.localeCompare(b.name);
});

const specialtyGroups = [];
{
  const map = new Map();
  for (const p of proceduresBySpecialty) {
    if (!map.has(p.category)) map.set(p.category, []);
    map.get(p.category).push(p);
  }
  for (const [cat, list] of map) specialtyGroups.push({ cat, list });
  specialtyGroups.sort((a, b) => specialtyRank(a.cat) - specialtyRank(b.cat) || a.cat.localeCompare(b.cat));
}

const azLetterGroups = [];
{
  const map = new Map();
  for (const p of proceduresSorted) {
    const letter = p.name.charAt(0).toUpperCase();
    if (!map.has(letter)) map.set(letter, []);
    map.get(letter).push(p);
  }
  for (const [letter, list] of [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    azLetterGroups.push({ letter, list });
  }
}

const presentLetters = new Set(azLetterGroups.map((g) => g.letter));
const letterJump = Array.from({ length: 26 }, (_, i) => {
  const letter = String.fromCharCode(65 + i);
  if (presentLetters.has(letter)) {
    return `<a class="letter-jump__link" href="#proc-letter-${letter.toLowerCase()}">${letter}</a>`;
  }
  return `<span class="letter-jump__link is-disabled" aria-disabled="true">${letter}</span>`;
}).join('');

const specialtyViewHtml = specialtyGroups
  .map(
    ({ cat, list }) => `<section class="proc-group" data-proc-group data-category="${esc(cat)}">
            <h2 class="t-h3 proc-group__heading">${esc(cat)}</h2>
            <ul class="az-list proc-list">
              ${list.map((p) => procedureEntry(p, 0)).join('')}
            </ul>
          </section>`
  )
  .join('');

const azViewHtml = `<nav class="letter-jump" aria-label="Jump to letter">${letterJump}</nav>
          ${azLetterGroups
            .map(
              ({ letter, list }) => `<section class="proc-letter-group" id="proc-letter-${letter.toLowerCase()}" data-proc-letter="${esc(letter)}">
            <h2 class="proc-letter-group__mark" aria-label="Letter ${esc(letter)}">${esc(letter)}</h2>
            <ul class="az-list proc-list">
              ${list.map((p) => procedureEntry(p, 0)).join('')}
            </ul>
          </section>`
            )
            .join('')}`;

const proceduresIndex =
  head({
    title: 'Procedures — MediGo',
    description: 'Browse procedures by specialty or A–Z, with destination starting prices.',
    depth: 0,
  }) +
  nav(0, 'procedures') +
  `<main>
    <section class="section section--hero page-hero">
      <div class="container" data-reveal data-reveal-eager>
        <h1 class="t-display">Procedures</h1>
        <p class="t-lead page-hero__lede">Compare destinations and starting prices by specialty or A–Z.</p>
        <form class="filter-bar" data-proc-search>
          <label class="visually-hidden" for="proc-q">Search procedures</label>
          <input id="proc-q" name="q" type="search" placeholder="Search procedures" data-filter-input autocomplete="off">
        </form>
        <div class="seg-control" role="tablist" aria-label="Procedure directory view" data-proc-tabs>
          <button type="button" class="seg-control__btn is-active" role="tab" id="tab-specialty" aria-selected="true" aria-controls="proc-view-specialty" data-proc-view="specialty">By specialty</button>
          <button type="button" class="seg-control__btn" role="tab" id="tab-az" aria-selected="false" aria-controls="proc-view-az" data-proc-view="az" tabindex="-1">A–Z</button>
        </div>
      </div>
    </section>
    <section class="section">
      <div class="container" data-reveal data-reveal-eager data-proc-directory>
        <div id="proc-view-specialty" class="proc-view" role="tabpanel" aria-labelledby="tab-specialty" data-proc-panel="specialty">
          ${specialtyViewHtml}
        </div>
        <div id="proc-view-az" class="proc-view" role="tabpanel" aria-labelledby="tab-az" data-proc-panel="az" hidden>
          ${azViewHtml}
        </div>
      </div>
    </section>
  </main>` +
  footer(0);
writeFileSync(join(SITE, 'procedures.html'), proceduresIndex);

function hashSeed(str) {
  let h = 2166136261;
  for (let i = 0; i < String(str).length; i++) {
    h ^= String(str).charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function synthProcStats(p, destPrices) {
  const seed = hashSeed(p.slug);
  const worth = 92 + (seed % 7);
  const mids = destPrices
    .map((pr) => (Number(pr.min_usd) + Number(pr.max_usd)) / 2)
    .filter((n) => Number.isFinite(n) && n > 0);
  let avgCost = mids.length
    ? Math.round(mids.reduce((a, b) => a + b, 0) / mids.length / 50) * 50
    : 2500 + (seed % 1500);
  // Abroad package averages — hair transplant aligns to Turkey list price
  if (p.slug === 'hair-transplant') avgCost = 3500;
  const photos = 18 + (seed % 40);
  const doctorsClinics = Math.max(
    3,
    Math.min(8, (p.clinic_ids || []).length || 3 + (seed % 4))
  );
  // Typical abroad stay for recovery / follow-up
  let tripDays = 7 + (seed % 5);
  if (p.slug === 'hair-transplant') tripDays = 7;
  if (p.slug === 'rhinoplasty') tripDays = 10;
  // Rhinoplasty: smaller marketplace stats; broad US avg from ASPS surgeon fee (~$7,637)
  if (p.slug === 'rhinoplasty') {
    return {
      worth: 91,
      avgCost: 7650,
      photos: 48,
      doctorsClinics: 12,
      tripDays: 10,
    };
  }
  return { worth, avgCost, photos, doctorsClinics, tripDays };
}

function shortBlurb(p) {
  if (p.slug === 'hair-transplant' || p.slug === 'rhinoplasty') return '';
  const t = String(p.description || '').trim();
  if (!t) return '';
  const sentence = (t.match(/^.*?[.!?](?:\s|$)/) || [t])[0].trim();
  return sentence.length > 110 ? `${sentence.slice(0, 107).trim()}…` : sentence;
}

/** Ranked destinations for hair transplant (demo editorial copy). */
const HAIR_TRANSPLANT_DEST_RANKING = [
  {
    country: 'Turkey',
    city: 'Istanbul',
    priceLabel: '$3,500',
    avgUsd: 3500,
    copy: 'Skilled surgeons, accredited hospitals, low prices, and all-inclusive packages.',
    destSlugs: ['istanbul'],
    maxClinics: 6,
    packageTypes: [
      'FUE',
      'DHI',
      'Hairline restoration',
      'Vertex restoration',
      'Beard transplantation',
      'Eyebrow transplantation',
    ],
    fallbackClinics: [
      { name: 'Bosphorus Follicle Institute', focus: 'Hair & aesthetics' },
      { name: 'Marmara Aesthetic Hospital', focus: 'Multispecialty' },
      { name: 'Kadikoy Graft Atelier', focus: 'Hair transplant' },
      { name: 'Besiktas Follicle Lab', focus: 'Hair transplant' },
      { name: 'Cengelkoy Hair Pavilion', focus: 'Hair restoration' },
      { name: 'Ortakoy Density Works', focus: 'Hair transplant' },
    ],
  },
  {
    country: 'Mexico',
    city: 'Mexico City',
    priceLabel: '$3,202',
    avgUsd: 3202,
    copy: 'Close and affordable for patients in the U.S. and Canada. An estimated 40 to 60 percent of medical tourists there come from the U.S.',
    destSlugs: ['mexico-city', 'tijuana'],
    packageTypes: [
      'FUE',
      'DHI',
      'Hairline restoration',
      'Temporal restoration',
      'Vertex restoration',
      'Platelet-rich plasma',
    ],
    fallbackClinics: [
      { name: 'Reforma Aesthetic Institute', focus: 'Cosmetic surgery' },
      { name: 'Pacific Border Surgery', focus: 'Surgical care' },
      { name: 'Condesa Follicle Atelier', focus: 'Hair transplant' },
    ],
  },
  {
    country: 'South Korea',
    city: 'Seoul',
    priceLabel: '$6,000 to $8,000',
    avgUsd: 7000,
    priceMinUsd: 6000,
    priceMaxUsd: 8000,
    copy: 'Hundreds of thousands of medical tourists visit each year. Most come for dermatology or plastic surgery.',
    destSlugs: ['seoul'],
    packageTypes: [
      'FUE',
      'DHI',
      'Hairline restoration',
      'Female pattern restoration',
      'Facial hair transplantation',
      'Scar revision transplant',
    ],
    fallbackClinics: [
      { name: 'Gangnam Lumen Surgery', focus: 'Plastic surgery' },
      { name: 'Cheongdam SoftLift Clinic', focus: 'Facial aesthetics' },
      { name: 'Apgujeong Vector Surgery', focus: 'Contour surgery' },
    ],
  },
  {
    country: 'Thailand',
    city: 'Bangkok',
    priceLabel: '$5,758',
    avgUsd: 5758,
    copy: 'Clinics in Bangkok and Phuket. Easy to pair surgery with a vacation.',
    destSlugs: ['bangkok'],
    packageTypes: [
      'FUE',
      'DHI',
      'Hairline restoration',
      'Vertex restoration',
      'Long-hair FUE',
      'Beard transplantation',
    ],
    fallbackClinics: [
      { name: 'Chao Phraya Care Pavilion', focus: 'Multispecialty' },
      { name: 'Thonglor Follicle House', focus: 'Hair transplant' },
      { name: 'Asok Crown Restoration', focus: 'Hair restoration' },
    ],
  },
  {
    country: 'Hungary',
    city: 'Budapest',
    priceLabel: '$3,650',
    avgUsd: 3650,
    copy: 'A low-cost option. Medical tourism is projected to grow 15% a year through 2030.',
    destSlugs: [],
    packageTypes: [
      'FUE',
      'DHI',
      'Hairline restoration',
      'Vertex restoration',
      'Temporal restoration',
      'Eyebrow transplantation',
    ],
    fallbackClinics: [
      { name: 'Budapest Contour Atelier', focus: 'Cosmetic surgery' },
      { name: 'Danube Aesthetic Pavilion', focus: 'Aesthetics' },
      { name: 'Pest Profile Clinic', focus: 'Facial procedures' },
    ],
  },
  {
    country: 'Germany',
    city: 'Berlin',
    priceLabel: '$7,372',
    avgUsd: 7372,
    copy: 'Strict healthcare rules and clinics in Berlin. Known more for orthopedic surgery than cosmetic work.',
    destSlugs: [],
    packageTypes: [
      'FUE',
      'DHI',
      'Hairline restoration',
      'Vertex restoration',
      'Scar revision transplant',
      'Reconstructive transplantation',
    ],
    fallbackClinics: [
      { name: 'Berlin Ortho & Form Clinic', focus: 'Orthopedics' },
      { name: 'Mitte Profile Institute', focus: 'Specialty surgery' },
      { name: 'Spree Surgical Collective', focus: 'Hospital care' },
    ],
  },
];

/** Ranked destinations for rhinoplasty (demo editorial copy). */
const RHINOPLASTY_DEST_RANKING = [
  {
    country: 'Turkey',
    city: 'Istanbul',
    priceLabel: '$4,150',
    avgUsd: 4150,
    paragraphs: [
      'Istanbul has a large concentration of plastic surgery clinics catering to international patients. Surgeons offer primary and revision rhinoplasty, with a wide range of aesthetic approaches.',
    ],
    why: 'Competitive pricing, surgeon availability, and established medical tourism infrastructure.',
    destSlugs: ['istanbul'],
    maxClinics: 4,
    packageTypes: [
      'Primary rhinoplasty',
      'Revision rhinoplasty',
      'Septorhinoplasty',
      'Tip rhinoplasty',
      'Open rhinoplasty',
      'Closed rhinoplasty',
    ],
    fallbackClinics: [
      { name: 'Galata Contour Surgery', focus: 'Plastic surgery' },
      { name: 'Marmara Aesthetic Hospital', focus: 'Multispecialty' },
      { name: 'Nisantasi Profile Institute', focus: 'Facial surgery' },
      { name: 'Bebek Septum Clinic', focus: 'Rhinoplasty' },
    ],
  },
  {
    country: 'South Korea',
    city: 'Seoul',
    priceLabel: '$6,000',
    avgUsd: 6000,
    priceMinUsd: 3500,
    priceMaxUsd: 8500,
    paragraphs: [
      'South Korea is internationally recognized for cosmetic facial surgery. Seoul has a particularly developed aesthetic surgery industry.',
    ],
    why: 'Facial aesthetics expertise, detailed surgical planning, and experience with Asian rhinoplasty.',
    destSlugs: ['seoul'],
    maxClinics: 4,
    packageTypes: [
      'Primary rhinoplasty',
      'Revision rhinoplasty',
      'Augmentation rhinoplasty',
      'Tip rhinoplasty',
      'Septorhinoplasty',
      'Alar base reduction',
    ],
    fallbackClinics: [
      { name: 'Cheongdam Lumen Plastic', focus: 'Plastic surgery' },
      { name: 'Apgujeong Vector Surgery', focus: 'Facial surgery' },
      { name: 'Gangnam Profile Atelier', focus: 'Facial aesthetics' },
      { name: 'Sinsa Tip & Bridge Clinic', focus: 'Rhinoplasty' },
    ],
  },
  {
    country: 'Colombia',
    city: 'Bogotá',
    priceLabel: '$3,850',
    avgUsd: 3850,
    paragraphs: [
      'Colombia has a well-established cosmetic surgery industry, with Bogotá serving as a major hub for plastic and facial surgery. The city attracts international patients seeking experienced surgeons and more affordable treatment.',
    ],
    why: 'Established plastic surgery expertise, competitive pricing, and proximity to the United States.',
    // No Bogotá hub in catalog yet — synthetic clinics; Colombia cover from Medellín asset.
    destSlugs: [],
    coverSlug: 'medellin',
    maxClinics: 4,
    packageTypes: [
      'Primary rhinoplasty',
      'Revision rhinoplasty',
      'Septorhinoplasty',
      'Functional rhinoplasty',
      'Tip rhinoplasty',
      'Closed rhinoplasty',
    ],
    fallbackClinics: [
      { name: 'Chapinero Contour Surgery', focus: 'Plastic surgery' },
      { name: 'Zona T Facial Institute', focus: 'Facial surgery' },
      { name: 'Usaquén Profile Clinic', focus: 'Rhinoplasty' },
      { name: 'Chicó Septorhinoplasty Center', focus: 'Facial surgery' },
    ],
  },
  {
    country: 'Mexico',
    city: 'Mexico City',
    priceLabel: '$4,300',
    avgUsd: 4300,
    paragraphs: [
      'Mexico is an established destination for Americans seeking more affordable elective procedures.',
    ],
    why: 'Geographic proximity, established private healthcare infrastructure, and competitive pricing.',
    destSlugs: ['mexico-city'],
    maxClinics: 4,
    packageTypes: [
      'Primary rhinoplasty',
      'Revision rhinoplasty',
      'Septorhinoplasty',
      'Tip rhinoplasty',
      'Open rhinoplasty',
      'Functional rhinoplasty',
    ],
    fallbackClinics: [
      { name: 'Insurgentes Aesthetic Pavilion', focus: 'Cosmetic surgery' },
      { name: 'Pedregal Care Hospital', focus: 'Surgical care' },
      { name: 'Polanco Profile Surgery', focus: 'Facial surgery' },
      { name: 'Roma Norte Rhinoplasty Studio', focus: 'Rhinoplasty' },
    ],
  },
];

function rankingForProcedure(p) {
  if (p.slug === 'rhinoplasty') return RHINOPLASTY_DEST_RANKING;
  if (p.slug === 'hair-transplant') return HAIR_TRANSPLANT_DEST_RANKING;
  return HAIR_TRANSPLANT_DEST_RANKING;
}

/** Synthetic packages for a clinic; prices cluster around the destination average. */
function packagesForClinic(entry, clinicIndex, clinicName) {
  const types = entry.packageTypes || [];
  const seed = hashSeed(`${entry.country}:${clinicName}:${clinicIndex}`);
  const pick = (offset) => types[(seed + offset * 3) % types.length];
  const labels = [pick(0), pick(1), pick(2)].filter(Boolean);
  // Keep three distinct labels when the catalog is large enough
  const unique = [];
  for (let i = 0; i < types.length && unique.length < 3; i++) {
    const label = types[(seed + i * 5) % types.length];
    if (!unique.includes(label)) unique.push(label);
  }
  const chosen = unique.length ? unique : labels;

  const min = entry.priceMinUsd ?? Math.round(entry.avgUsd * 0.82);
  const max = entry.priceMaxUsd ?? Math.round(entry.avgUsd * 1.18);
  const mid = entry.avgUsd;
  const jitter = (n, j) => Math.round((n + ((seed >> (j * 3)) % 17) * 10 - 80) / 10) * 10;
  const raw = [
    jitter(Math.max(min, mid * 0.88), 0),
    jitter(mid, 1),
    jitter(Math.min(max, mid * 1.12), 2),
  ]
    .map((n) => Math.min(max, Math.max(min, n)))
    .sort((a, b) => a - b);

  // Nudge so the clinic mean stays near the destination average
  const mean = raw.reduce((a, b) => a + b, 0) / raw.length;
  const shift = Math.round((mid - mean) / 10) * 10;
  const prices = raw.map((n) => Math.min(max, Math.max(min, n + shift)));

  return chosen.map((procedure, i) => ({
    procedure,
    price: money(prices[i] ?? mid),
  }));
}

function clinicsForRank(entry, procedureClinicList) {
  const max = entry.maxClinics || 3;
  const primarySlug = entry.destSlugs[0] || entry.coverSlug;
  const destIds = new Set(
    entry.destSlugs
      .map((slug) => destinations.find((d) => d.slug === slug)?.id)
      .filter(Boolean)
  );
  const linked = procedureClinicList
    .filter((c) => destIds.has(c.destination_id))
    .slice(0, max)
    .map((c, i) => ({
      name: c.name,
      focus: c.focus || '',
      href: `../clinics/${c.slug}.html`,
      cover: destCover(
        destinations.find((d) => d.id === c.destination_id)?.slug || primarySlug || 'istanbul',
        1
      ),
      packages: packagesForClinic(entry, i, c.name),
    }));

  const used = new Set(linked.map((c) => c.name.toLowerCase()));
  const fallbacks = (entry.fallbackClinics || [])
    .filter((c) => !used.has(String(c.name).toLowerCase()))
    .map((c, i) => ({
      name: c.name,
      focus: c.focus || '',
      href: primarySlug ? `../destinations/${primarySlug}.html` : '../destinations.html',
      cover: destCover(primarySlug || 'istanbul', 1),
      packages: packagesForClinic(entry, linked.length + i, c.name),
    }));

  return [...linked, ...fallbacks].slice(0, max);
}

function renderClinicPackages(packages) {
  if (!packages?.length) return '';
  return `<ul class="proc-clinic-card__packages">
              ${packages
                .map(
                  (pkg) => `<li class="proc-clinic-card__pkg">
                <span class="proc-clinic-card__pkg-name">${esc(pkg.procedure)}</span>
                <span class="proc-clinic-card__pkg-price">${esc(pkg.price)}</span>
              </li>`
                )
                .join('')}
            </ul>`;
}

function renderRankCopy(entry) {
  const paras = entry.paragraphs?.length
    ? entry.paragraphs
    : entry.copy
      ? [entry.copy]
      : [];
  const body = paras
    .map((t) => `<p class="proc-rank__copy">${esc(t)}</p>`)
    .join('');
  const why = entry.why
    ? `<p class="proc-rank__why"><span class="proc-rank__why-label">Why we recommend it:</span> ${esc(entry.why)}</p>`
    : '';
  return body + why;
}

function renderRankedDestinations(ranking, procedureClinicList) {
  return ranking.map((entry, i) => {
    const rank = i + 1;
    const destSlug = entry.destSlugs[0] || entry.coverSlug;
    const dest = destSlug ? destinations.find((d) => d.slug === destSlug) : null;
    const titleHref = dest ? `../destinations/${dest.slug}.html` : '../destinations.html';
    const title = entry.city ? `${entry.city}, ${entry.country}` : entry.country;
    const clinics = clinicsForRank(entry, procedureClinicList);
    const clinicCards = clinics
      .map(
        (c) => `<a class="proc-clinic-card" href="${c.href}">
            <span class="proc-clinic-card__media" aria-hidden="true">
              <img src="${c.cover}" alt="" width="320" height="214" loading="lazy" decoding="async">
            </span>
            <span class="proc-clinic-card__body">
              <span class="proc-clinic-card__name">${esc(c.name)}</span>
              ${c.focus ? `<span class="proc-clinic-card__focus">${esc(c.focus)}</span>` : ''}
              ${renderClinicPackages(c.packages)}
            </span>
          </a>`
      )
      .join('');
    const clinicsClass =
      (entry.maxClinics || 3) === 4
        ? 'proc-rank__clinics proc-rank__clinics--4'
        : 'proc-rank__clinics';
    return `<li class="proc-rank__item">
        <h3 class="proc-rank__heading">
          <span class="proc-rank__n">${rank}.</span>
          <a class="proc-rank__title" href="${titleHref}">${esc(title)}</a>
          ${entry.priceLabel ? `<span class="proc-rank__price">· ${esc(entry.priceLabel)}</span>` : ''}
        </h3>
        ${renderRankCopy(entry)}
        <div class="${clinicsClass}">${clinicCards}</div>
      </li>`;
  }).join('');
}

// ---------- Procedure detail ----------
for (const p of procedures) {
  const clinicList = (p.clinic_ids || []).map((id) => byId.clinic[id]).filter(Boolean);
  const destPrices = prices.filter((x) => x.procedure_id === p.id && x.entity_type === 'destination');
  const stats = synthProcStats(p, destPrices);
  const blurb = shortBlurb(p);
  const rankedList = renderRankedDestinations(rankingForProcedure(p), clinicList);

  const html =
    head({ title: `${p.name} — MediGo`, description: p.description, depth: 1 }) +
    nav(1, 'procedures') +
    `<main>
      <section class="section proc-overview" aria-labelledby="proc-title">
        <div class="container proc-overview__inner" data-reveal data-reveal-eager>
          <h1 id="proc-title" class="proc-overview__title">${esc(p.name)}</h1>
          <div class="proc-stats" data-proc-stats>
            <button class="proc-stats__nav proc-stats__nav--prev" type="button" aria-label="Previous stats" data-proc-stats-prev>
              <span aria-hidden="true">‹</span>
            </button>
            <ul class="proc-stats__track" data-proc-stats-track>
              <li class="proc-stats__item">
                <span class="proc-stats__icon" aria-hidden="true">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M8 10v10H5.5A1.5 1.5 0 0 1 4 18.5v-5A1.5 1.5 0 0 1 5.5 12H8Zm0 0V9a3 3 0 0 1 3-3h.4c.9 0 1.7.5 2.1 1.3L15 11h3.5A1.5 1.5 0 0 1 20 12.5v2.2c0 .4-.1.7-.4 1l-2.3 3.1c-.4.5-1 .8-1.6.8H10a2 2 0 0 1-2-2v-7.6Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>
                </span>
                <span class="proc-stats__value">${stats.worth}%</span>
                <span class="proc-stats__label">Worth it rating</span>
              </li>
              <li class="proc-stats__item">
                <span class="proc-stats__icon" aria-hidden="true">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8.25" stroke="currentColor" stroke-width="1.6"/><path d="M12 7.5v9M14.2 9.2c-.5-.6-1.2-.9-2.2-.9-1.4 0-2.3.7-2.3 1.8s.9 1.6 2.5 1.9c1.7.3 2.7.8 2.7 2.1s-1 2-2.6 2c-1.1 0-1.9-.4-2.4-1" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
                </span>
                <span class="proc-stats__value">${money(stats.avgCost)}</span>
                <span class="proc-stats__label">Average cost</span>
              </li>
              <li class="proc-stats__item">
                <span class="proc-stats__icon" aria-hidden="true">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><rect x="3.5" y="5" width="17" height="15" rx="2" stroke="currentColor" stroke-width="1.6"/><path d="M3.5 9.5h17M8 3.5v3M16 3.5v3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
                </span>
                <span class="proc-stats__value">${stats.tripDays} days</span>
                <span class="proc-stats__label">Average trip duration</span>
              </li>
              <li class="proc-stats__item">
                <span class="proc-stats__icon" aria-hidden="true">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M6.5 14.5c1.8-1.4 3.7-2.1 5.5-2.1s3.7.7 5.5 2.1" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="12" cy="8.2" r="2.6" stroke="currentColor" stroke-width="1.6"/><path d="M5 18.5h14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M8 18.5v-1.2c0-1 .6-1.8 1.5-2.1M16 18.5v-1.2c0-1-.6-1.8-1.5-2.1" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
                </span>
                <span class="proc-stats__value">${stats.doctorsClinics}</span>
                <span class="proc-stats__label">Doctors &amp; clinics</span>
              </li>
            </ul>
            <button class="proc-stats__nav proc-stats__nav--next" type="button" aria-label="Next stats" data-proc-stats-next>
              <span aria-hidden="true">›</span>
            </button>
          </div>
          ${blurb ? `<p class="proc-overview__blurb">${esc(blurb)}</p>` : ''}
          <div class="proc-overview__destinations" aria-labelledby="proc-hubs-title">
            <h2 id="proc-hubs-title" class="t-h2">Top destinations</h2>
            <ol class="proc-rank">
              ${rankedList}
            </ol>
          </div>
        </div>
      </section>
      <section class="section">
        <div class="container" data-reveal>
          <h2 class="t-h3">Before / after</h2>
          <div class="placeholder-frame">
            <img src="${p.slug === 'hair-transplant' ? '../assets/procedure-hair-transplant-before-after.jpg' : '../assets/placeholders/before-after.svg'}" alt="${p.slug === 'hair-transplant' ? 'Hair Transplants before and after' : 'Synthetic before and after placeholder'}" width="${p.slug === 'hair-transplant' ? 1774 : 1200}" height="${p.slug === 'hair-transplant' ? 887 : 600}" loading="lazy"${p.slug === 'hair-transplant' ? ' decoding="async"' : ''}>
          </div>
        </div>
      </section>
      ${inquiryForm({ depth: 1, procedure: p.name, heading: `Inquire about ${p.name}` })}
    </main>` +
    footer(1);
  writeFileSync(join(SITE, 'procedures', `${p.slug}.html`), html);
}

// ---------- Destinations index ----------
const destIndex =
  head({ title: 'Find a Destination — MediGo', description: 'Find a destination for medical travel — synthetic MediGo demo.', depth: 0 }) +
  nav(0, 'destinations') +
  `<main>
    <section class="section section--hero page-hero page-hero--find">
      <div class="container" data-reveal data-reveal-eager>
        <h1 class="t-display">Find a Destination</h1>
        <p class="t-lead page-hero__lede">We suggest where to go based on your procedure and budget.</p>
        <form class="find-dest-form" data-dest-suggest novalidate>
          <div class="field field--light">
            <label for="sug-proc">Procedure</label>
            <select id="sug-proc" name="procedure" required>
              <option value="" selected disabled>Choose a procedure</option>
              <option value="breast-augmentation">Breast augmentation</option>
              <option value="rhinoplasty">Rhinoplasty</option>
              <option value="hair-transplant">Hair Transplants</option>
              <option value="dental-implants">Dental implants</option>
            </select>
          </div>
          <div class="field field--light">
            <label for="sug-budget">Budget (USD)</label>
            <input id="sug-budget" name="budget" type="number" min="500" step="100" inputmode="numeric" placeholder="8000" required>
            <p class="find-dest-budget__hint" data-budget-hint hidden></p>
          </div>
          <button class="btn btn--plum find-dest-form__submit" type="submit">Suggest destinations.</button>
        </form>
        <div class="find-dest-results" data-suggest-results hidden>
          <p class="find-dest-results__label" id="demo-data-label">Demo data</p>
          <div class="find-dest-table-wrap" role="region" aria-labelledby="demo-data-label">
            <table class="find-dest-table" data-find-table>
              <thead>
                <tr>
                  <th scope="col">
                    <button type="button" class="find-dest-sort" data-sort="destination" aria-pressed="false">
                      Destination <span class="find-dest-sort__ind" aria-hidden="true"></span>
                    </button>
                  </th>
                  <th scope="col">
                    <button type="button" class="find-dest-sort" data-sort="clinic" aria-pressed="false">
                      Clinic <span class="find-dest-sort__ind" aria-hidden="true"></span>
                    </button>
                  </th>
                  <th scope="col">
                    <button type="button" class="find-dest-sort" data-sort="from" aria-pressed="false">
                      From <span class="find-dest-sort__ind" aria-hidden="true"></span>
                    </button>
                  </th>
                  <th scope="col" class="find-dest-col--reviews">
                    <button type="button" class="find-dest-sort" data-sort="reviews" aria-pressed="false">
                      Reviews <span class="find-dest-sort__ind" aria-hidden="true"></span>
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody data-find-tbody></tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
    <section class="section" data-featured-dests>
      <div class="container" data-reveal>
        <h2 class="t-h3">Featured Destinations</h2>
        <ul class="dest-rail">
          ${featuredDests.map((d) => destTile(d, 0)).join('')}
        </ul>
      </div>
    </section>
  </main>` +
  footer(0);
writeFileSync(join(SITE, 'destinations.html'), destIndex);

// ---------- Destination detail ----------
for (const d of destinations) {
  const destClinics = clinics.filter((c) => c.destination_id === d.id);
  const destDocs = doctors.filter((doc) => doc.destination_id === d.id);
  const destProcs = (d.top_procedure_ids || []).map((id) => byId.procedure[id]).filter(Boolean);
  const destPrices = prices.filter((x) => x.entity_id === d.id && x.entity_type === 'destination');
  const sent = sentimentBlock(d.name, 'destination');

  const html =
    head({ title: `${d.name}, ${d.country} — MediGo`, description: d.focus, depth: 1 }) +
    nav(1, 'destinations') +
    `<main>
      <section class="section section--hero page-hero page-hero--dest">
        <div class="container" data-reveal data-reveal-eager>
          <p class="hero-brand hero-brand--inline">${brandMark(1, { className: 'hero-brand__logo', size: 40 })}MediGo</p>
          <h1 class="t-display">${esc(d.name)}</h1>
          <p class="t-lead">${esc(d.country)} · ${esc(d.focus)}</p>
          <p class="banner-demo">Synthetic destination intel for product design.</p>
        </div>
      </section>
      <section class="section">
        <div class="container detail-grid">
          <div class="panel" data-reveal>
            <h2 class="t-h3">Healthcare reputation</h2>
            <p>${esc(d.who_reputation_notes)}</p>
          </div>
          <div class="panel" data-reveal>
            <h2 class="t-h3">Culture, safety & tourism</h2>
            <p>${esc(d.culture_safety_tourism)}</p>
          </div>
          <div class="panel" data-reveal>
            <h2 class="t-h3">Travel basics</h2>
            <ul class="kv-list">
              <li><span>Flight time</span><span>${esc(d.flight_time)}</span></li>
              <li><span>Visa / tourist reqs</span><span>${esc(d.visa_requirements)}</span></li>
              <li><span>Tourist healthcare subsidised</span><span>${d.healthcare_subsidised ? 'Yes (demo flag)' : 'No (demo flag)'}</span></li>
            </ul>
          </div>
          <div class="panel" data-reveal>
            <h2 class="t-h3">Top specialties</h2>
            <ul class="chip-row">${(d.specialties || []).map((s) => `<li><span class="chip">${esc(s)}</span></li>`).join('')}</ul>
          </div>
        </div>
      </section>
      <section class="section section--lavender">
        <div class="container" data-reveal>
          <h2 class="t-h2">Top procedures & est. costs</h2>
          <div class="table-wrap"><table class="data-table">
            <thead><tr><th>Procedure</th><th>Demo range (USD)</th></tr></thead>
            <tbody>
              ${destProcs
                .map((p) => {
                  const pr = destPrices.find((x) => x.procedure_id === p.id);
                  return `<tr><td><a href="../procedures/${p.slug}.html">${esc(p.name)}</a></td><td>${pr ? rangeLabel(pr.min_usd, pr.max_usd) : '—'}</td></tr>`;
                })
                .join('')}
            </tbody>
          </table></div>
        </div>
      </section>
      <section class="section">
        <div class="container" data-reveal>
          <h2 class="t-h2">Top clinics</h2>
          <ul class="az-list">
            ${destClinics
              .map(
                (c) => `<li>
                <a href="../clinics/${c.slug}.html">
                  <span class="az-list__title">${esc(c.name)}</span>
                  <span class="az-list__meta">${esc(c.focus)} · ${c.price_min_usd != null ? rangeLabel(c.price_min_usd, c.price_max_usd) : ''}</span>
                </a>
              </li>`
              )
              .join('')}
          </ul>
          <h3 class="t-h3" style="margin-top:2rem">Doctors</h3>
          <ul class="plain-list cols-2">
            ${destDocs.map((doc) => `<li><a href="../doctors/${doc.slug}.html">${esc(doc.name)}</a> · ${esc(doc.title)}</li>`).join('')}
          </ul>
        </div>
      </section>
      <section class="section">
        <div class="container" data-reveal>
          <h2 class="t-h3">Map placeholder</h2>
          <p class="t-caption">Static placeholder — not a live Google Maps / Street View embed.</p>
          <div class="placeholder-frame">
            <img src="../assets/placeholders/clinic-3.svg" alt="Map placeholder" width="1200" height="800" loading="lazy">
          </div>
        </div>
      </section>
      <div class="container">${sent}</div>
      ${inquiryForm({ depth: 1, destination: `${d.name}, ${d.country}`, heading: `Plan a trip to ${d.name}` })}
    </main>` +
    footer(1);
  writeFileSync(join(SITE, 'destinations', `${d.slug}.html`), html);
}

// ---------- Clinics index ----------
const clinicSorted = [...clinics].sort((a, b) => a.name.localeCompare(b.name));
const clinicsIndex =
  head({ title: 'Clinics — MediGo', description: 'Synthetic demo clinics across hub destinations.', depth: 0 }) +
  nav(0, 'clinics') +
  `<main>
    <section class="section section--hero page-hero">
      <div class="container" data-reveal data-reveal-eager>
        <h1 class="t-display">Clinics</h1>
        <p class="t-lead page-hero__lede">Demo treatment centers across ${destinations.length} hubs. All names are invented.</p>
        <form class="filter-bar" data-list-filter data-filter-target="#clinic-list">
          <label class="visually-hidden" for="clinic-q">Search clinics</label>
          <input id="clinic-q" name="q" type="search" placeholder="Search clinics" data-filter-input>
        </form>
      </div>
    </section>
    <section class="section">
      <div class="container">
        <ul id="clinic-list" class="clinic-rail">
          ${clinicSorted
            .map((c) => {
              const dest = byId.destination[c.destination_id];
              return `<li data-name="${esc(c.name.toLowerCase())} ${esc((dest?.name || '').toLowerCase())}">
                <a class="clinic-tile" href="./clinics/${c.slug}.html">
                  <span class="clinic-tile__body">
                    <span class="clinic-tile__name">${esc(c.name)}</span>
                    <span class="clinic-tile__meta">${esc(dest ? `${dest.name}, ${dest.country}` : '')} · ${esc(c.focus)}</span>
                  </span>
                </a>
              </li>`;
            })
            .join('')}
        </ul>
      </div>
    </section>
  </main>` +
  footer(0);
writeFileSync(join(SITE, 'clinics.html'), clinicsIndex);

// ---------- Clinic detail ----------
for (const c of clinics) {
  const dest = byId.destination[c.destination_id];
  const docs = doctors.filter((d) => d.clinic_id === c.id);
  const procs = (c.procedure_ids || []).map((id) => byId.procedure[id]).filter(Boolean);
  const clinicPrices = prices.filter((x) => x.entity_id === c.id);
  const sent = sentimentBlock(c.name, 'clinic');

  const html =
    head({ title: `${c.name} — MediGo`, description: c.summary, depth: 1 }) +
    nav(1, 'clinics') +
    `<main>
      <section class="section section--hero page-hero">
        <div class="container" data-reveal data-reveal-eager>
          <p class="t-eyebrow">${esc(dest ? `${dest.name}, ${dest.country}` : '')}</p>
          <h1 class="t-display">${esc(c.name)}</h1>
          <p class="t-body-lg">${esc(c.summary)}</p>
          <p class="banner-demo">Synthetic clinic — invented for MediGo demo.</p>
        </div>
      </section>
      <section class="section">
        <div class="container media-row" data-reveal>
          <div class="placeholder-frame"><img src="../assets/placeholders/clinic-1.svg" alt="" width="1200" height="800" loading="lazy"></div>
          <div class="placeholder-frame"><img src="../assets/placeholders/clinic-2.svg" alt="" width="1200" height="800" loading="lazy"></div>
          <div class="placeholder-frame"><img src="../assets/placeholders/clinic-3.svg" alt="Street / map placeholder — not live Street View" width="1200" height="800" loading="lazy"></div>
        </div>
      </section>
      <section class="section section--lavender">
        <div class="container detail-grid">
          <div class="panel" data-reveal>
            <h2 class="t-h3">Procedures & demo prices</h2>
            <div class="table-wrap"><table class="data-table">
              <thead><tr><th>Procedure</th><th>Range</th></tr></thead>
              <tbody>
                ${procs
                  .map((p) => {
                    const pr = clinicPrices.find((x) => x.procedure_id === p.id);
                    return `<tr><td><a href="../procedures/${p.slug}.html">${esc(p.name)}</a></td><td>${pr ? rangeLabel(pr.min_usd, pr.max_usd) : '—'}</td></tr>`;
                  })
                  .join('')}
              </tbody>
            </table></div>
            <p class="t-caption">${esc(c.package_notes)}</p>
          </div>
          <div class="panel" data-reveal>
            <h2 class="t-h3">Accreditations (demo)</h2>
            <ul class="plain-list">${(c.accreditations || []).map((a) => `<li>${esc(a)}</li>`).join('')}</ul>
            <h3 class="t-h3" style="margin-top:1.5rem">Doctors</h3>
            <ul class="plain-list">
              ${docs.map((d) => `<li><a href="../doctors/${d.slug}.html">${esc(d.name)}</a> — ${esc(d.title)}</li>`).join('')}
            </ul>
          </div>
        </div>
      </section>
      <section class="section">
        <div class="container" data-reveal>
          <h2 class="t-h3">Before / after placeholders</h2>
          <div class="placeholder-frame">
            <img src="../assets/placeholders/before-after.svg" alt="Synthetic before after" width="1200" height="600" loading="lazy">
          </div>
        </div>
      </section>
      <div class="container">${sent}</div>
      ${inquiryForm({
        depth: 1,
        destination: dest ? `${dest.name}, ${dest.country}` : '',
        procedure: procs[0]?.name || '',
        heading: `Inquire about ${c.name}`,
      })}
    </main>` +
    footer(1);
  writeFileSync(join(SITE, 'clinics', `${c.slug}.html`), html);
}

// ---------- Doctor detail ----------
for (const d of doctors) {
  const clinic = byId.clinic[d.clinic_id];
  const dest = byId.destination[d.destination_id];
  const procs = (d.procedure_ids || []).map((id) => byId.procedure[id]).filter(Boolean);
  const sent = sentimentBlock(d.name, 'doctor');

  const html =
    head({ title: `${d.name} — MediGo`, description: d.credentials, depth: 1 }) +
    nav(1, 'clinics') +
    `<main>
      <section class="section section--hero page-hero">
        <div class="container" data-reveal data-reveal-eager>
          <p class="t-eyebrow">${esc(d.title)} · ${esc(d.specialty)}</p>
          <h1 class="t-display">${esc(d.name)}</h1>
          <p class="t-body-lg">${esc(d.credentials)}</p>
          <p class="banner-demo">Synthetic doctor profile — not a real clinician.</p>
          <p class="t-body">Clinic: ${clinic ? `<a href="../clinics/${clinic.slug}.html">${esc(clinic.name)}</a>` : '—'}
          ${dest ? ` · <a href="../destinations/${dest.slug}.html">${esc(dest.name)}</a>` : ''}</p>
        </div>
      </section>
      <section class="section">
        <div class="container" data-reveal>
          <h2 class="t-h3">Procedures</h2>
          <ul class="chip-row">${procs.map((p) => `<li><a class="chip" href="../procedures/${p.slug}.html">${esc(p.name)}</a></li>`).join('')}</ul>
        </div>
      </section>
      <div class="container">${sent}</div>
      ${inquiryForm({
        depth: 1,
        destination: dest ? `${dest.name}, ${dest.country}` : '',
        procedure: procs[0]?.name || '',
        heading: `Inquire about care with ${d.name}`,
      })}
    </main>` +
    footer(1);
  writeFileSync(join(SITE, 'doctors', `${d.slug}.html`), html);
}

// ---------- About ----------
const about =
  head({ title: 'About — MediGo', description: 'Why MediGo exists.', depth: 0 }) +
  nav(0, 'about') +
  `<main>
    <section class="section section--hero page-hero">
      <div class="container" data-reveal data-reveal-eager>
        <p class="hero-brand hero-brand--inline">${brandMark(0, { className: 'hero-brand__logo', size: 40 })}MediGo</p>
        <h1 class="t-display">About</h1>
      </div>
    </section>
    <section class="section section--lavender section--founder-letter">
      <div class="container">
        <article class="founder-letter">
          <div class="founder-letter__media">
            <img class="founder-letter__photo" src="./assets/founder-sharin.jpg" alt="Sharin, founder of MediGo" width="224" height="224" decoding="async">
          </div>
          <div class="founder-letter__body" data-reveal>
            <p>Each year, millions of Americans travel abroad for care they can't access at home. If you’re one of them, you’ve probably spent hours on Reddit and TikTok trying to find a doctor you can trust. It’s hard to tell which reviews are from real patients and which are sponsored.</p>
            <p><strong>You deserve clear, safe options.</strong></p>
            <p>We're here to take the guesswork out of planning your trip, so you can focus on what matters most: getting better.</p>
            <div class="founder-close">
              <p>With gratitude,</p>
              <p class="founder-signature"><img class="founder-signature__img" src="./assets/founder-signature.png" alt="Sharin" width="280" height="96" decoding="async"></p>
              <p class="founder-signoff">
                <span class="founder-signoff__name">Sharin Khander</span>
                <span class="founder-signoff__role">Founder &amp; CEO, MediGo</span>
              </p>
            </div>
          </div>
        </article>
      </div>
    </section>
  </main>` +
  footer(0);
writeFileSync(join(SITE, 'about.html'), about);

// ---------- Contact ----------
const contact =
  head({ title: 'Contact — MediGo', description: 'Contact MediGo concierge (demo).', depth: 0 }) +
  nav(0, 'contact') +
  `<main>
    <section class="section section--hero page-hero">
      <div class="container" data-reveal data-reveal-eager>
        <h1 class="t-display">Contact</h1>
      </div>
    </section>
    ${contactForm({ depth: 0, heading: 'Get in touch' })}
    <section class="section">
      <div class="container" data-reveal>
        <div class="panel" data-contact-result hidden>
          <h2 class="t-h3">Thanks — demo only</h2>
          <p data-contact-summary></p>
        </div>
      </div>
    </section>
  </main>` +
  footer(0);
writeFileSync(join(SITE, 'contact.html'), contact);

// Write search index for app.js
writeFileSync(
  join(SITE, 'data', 'search-index.json'),
  JSON.stringify(
    {
      updated: catalog.updated,
      items: search_index,
      destination_prices: prices.filter((p) => p.entity_type === 'destination'),
      destinations: destinations.map((d) => ({ id: d.id, name: d.name, country: d.country, slug: d.slug, specialties: d.specialties })),
      procedures: procedures.map((p) => ({ id: p.id, name: p.name, slug: p.slug })),
    },
    null,
    2
  )
);

const pages = {
  root: ['index.html', 'procedures.html', 'destinations.html', 'clinics.html', 'about.html', 'contact.html'],
  procedures: procedures.length,
  destinations: destinations.length,
  clinics: clinics.length,
  doctors: doctors.length,
};
const total =
  pages.root.length + pages.procedures + pages.destinations + pages.clinics + pages.doctors;

console.log(JSON.stringify({ total_html_pages: total, ...pages }, null, 2));
