/**
 * Compare destinations / clinics page helpers for MediGo static build.
 */

const DEST_COUNTRY_LABEL = {
  Türkiye: 'Turkey',
  Czechia: 'Czech Republic',
};

const DEST_DIMS = [
  { key: 'safety', label: 'Safety' },
  { key: 'proximity', label: 'Proximity' },
  { key: 'value', label: 'Value' },
  { key: 'reputation', label: 'Reputation' },
  { key: 'leisure', label: 'Leisure & Fun' },
  { key: 'visa', label: 'Easiest visa process' },
  { key: 'specialty', label: 'Procedure specialty' },
];

const CLINIC_DIMS = [
  { key: 'value', label: 'Best value' },
  { key: 'expertise', label: 'Most expertise' },
  { key: 'specialty', label: 'Procedure specialty' },
  { key: 'reviews', label: 'Reviews' },
  { key: 'price', label: 'Price' },
  { key: 'convenience', label: 'Convenience to hotels / airport' },
  { key: 'facilities', label: 'Surgical facilities' },
  { key: 'language', label: 'Language support' },
  { key: 'tripCost', label: 'Total trip costs' },
];

const SCORE_WORDS = ['Fair', 'Good', 'Solid', 'Strong', 'Excellent'];

function hashSeed(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function scoreWord(n) {
  return SCORE_WORDS[Math.max(0, Math.min(4, n - 1))] || 'Good';
}

function meter(n) {
  const filled = Math.max(1, Math.min(5, n));
  return `<span class="compare-meter" aria-label="${filled} out of 5"><span class="compare-meter__fill" style="--n:${filled}"></span></span>`;
}

function countryLabel(country) {
  return DEST_COUNTRY_LABEL[country] || country;
}

/** Deterministic 1–5 scores for a destination × procedure pair. */
export function destCompareProfile(dest, procedureSlug, { avgUsd } = {}) {
  const seed = hashSeed(`dcmp:${procedureSlug}:${dest.slug}`);
  const roll = (i, bias = 0) => Math.max(1, Math.min(5, 2 + ((seed >> (i * 3)) % 4) + bias));

  const flight = String(dest.flight_time || '').toLowerCase();
  let proximityBias = 0;
  if (/border|tijuana|mexico|costa rica|san jos/.test(`${dest.slug} ${flight}`)) proximityBias = 2;
  else if (/europe|spain|czech|prague|barcelona|hungary|germany/.test(`${dest.slug} ${dest.country}`.toLowerCase()))
    proximityBias = 1;
  else if (/asia|korea|thai|delhi|india|turkey|türkiye|istanbul/.test(`${dest.slug} ${dest.country}`.toLowerCase()))
    proximityBias = 0;

  const visa = String(dest.visa_requirements || '').toLowerCase();
  let visaBias = 0;
  if (/e-?visa|visa.?free|esta|no visa/.test(visa)) visaBias = 2;
  else if (/confirm|embassy|apply/.test(visa)) visaBias = 0;
  else visaBias = 1;

  const specs = (dest.specialties || []).map((s) => s.toLowerCase()).join(' ');
  const focus = String(dest.focus || '').toLowerCase();
  const proc = procedureSlug.replace(/-/g, ' ');
  let specialtyBias = 0;
  if (specs.includes('hair') && proc.includes('hair')) specialtyBias = 2;
  else if ((specs.includes('plastic') || specs.includes('aesthetics')) && /rhino|eyelid|facelift|breast|lipo|jaw|inject/.test(proc))
    specialtyBias = 2;
  else if (specs.includes('dental') && /dental|smile/.test(proc)) specialtyBias = 2;
  else if ((specs.includes('fertility') || specs.includes('ivf')) && proc.includes('ivf')) specialtyBias = 2;
  else if (focus.includes(proc.split(' ')[0])) specialtyBias = 1;

  let valueBias = avgUsd != null && avgUsd < 4000 ? 1 : avgUsd != null && avgUsd > 7000 ? -1 : 0;

  const scores = {
    safety: roll(0, 1),
    proximity: roll(1, proximityBias),
    value: roll(2, valueBias),
    reputation: roll(3, specialtyBias > 0 ? 1 : 0),
    leisure: roll(4, /istanbul|barcelona|bangkok|seoul|mexico/.test(dest.slug) ? 1 : 0),
    visa: roll(5, visaBias),
    specialty: roll(6, specialtyBias),
  };

  const standoutKey = Object.entries(scores).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0];
  const standoutMeta = DEST_DIMS.find((d) => d.key === standoutKey);
  const blurbs = {
    safety: `Travel advisories are manageable and clinic districts are used to medical visitors.`,
    proximity: `Shorter travel time from North America keeps the trip simpler.`,
    value: `Strong package pricing relative to U.S. list rates for this procedure.`,
    reputation: `Known medical-tourism hub with deep specialty supply.`,
    leisure: `Easy to pair recovery days with culture, food, and downtime.`,
    visa: `Entry rules are relatively straightforward for many U.S. passports.`,
    specialty: `Dense clinic supply and surgeons focused on this procedure.`,
  };

  return {
    scores,
    standoutKey,
    standoutLabel: standoutMeta?.label || 'Value',
    standoutBlurb: blurbs[standoutKey],
  };
}

export function clinicCompareProfile(clinic, dest, procedureSlug) {
  const seed = hashSeed(`ccmp:${procedureSlug}:${clinic.slug}`);
  const roll = (i, bias = 0) => Math.max(1, Math.min(5, 2 + ((seed >> (i * 3)) % 4) + bias));
  const focus = String(clinic.focus || '').toLowerCase();
  const proc = procedureSlug.replace(/-/g, ' ');
  let specialtyBias = focus.includes(proc.split(' ')[0]) || focus.includes('multi') ? 1 : 0;
  if (/hair/.test(focus) && /hair/.test(proc)) specialtyBias = 2;
  if (/fertility|ivf/.test(focus) && /ivf/.test(proc)) specialtyBias = 2;
  if (/dental|smile/.test(focus) && /dental|smile/.test(proc)) specialtyBias = 2;

  const accred = (clinic.accreditations || []).length;
  const scores = {
    value: roll(0, clinic.price_min_usd && clinic.price_min_usd < 3000 ? 1 : 0),
    expertise: roll(1, specialtyBias),
    specialty: roll(2, specialtyBias),
    reviews: roll(3, 1),
    price: roll(4, clinic.price_min_usd && clinic.price_min_usd < 2500 ? 1 : 0),
    convenience: roll(5, /istanbul|seoul|bangkok|mexico|tijuana|barcelona/.test(dest?.slug || '') ? 1 : 0),
    facilities: roll(6, accred ? 1 : 0),
    language: roll(7, 1),
    tripCost: roll(8, clinic.price_min_usd && clinic.price_min_usd < 4000 ? 1 : 0),
  };

  const standoutKey = Object.entries(scores).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0];
  const standoutMeta = CLINIC_DIMS.find((d) => d.key === standoutKey);
  const blurbs = {
    value: `Competitive package pricing without cutting core surgical steps.`,
    expertise: `Team focus aligns closely with this procedure.`,
    specialty: `High case volume and clear specialty positioning.`,
    reviews: `Patient feedback highlights coordination and aftercare.`,
    price: `Lower list prices than typical U.S. private quotes.`,
    convenience: `Near hotels and airport corridors used by medical travelers.`,
    facilities: `Modern OR setup with accreditation-style credentials on file.`,
    language: `English-friendly coordinators for consults and follow-ups.`,
    tripCost: `Procedure + stay math stays predictable for a short trip.`,
  };

  return {
    scores,
    standoutKey,
    standoutLabel: standoutMeta?.label || 'Best value',
    standoutBlurb: blurbs[standoutKey],
  };
}

function dimRows(dims, scores, esc) {
  return dims
    .map(({ key, label }) => {
      const n = scores[key] || 3;
      return `<div class="compare-row">
            <p class="compare-row__label">${esc(label)}</p>
            <div class="compare-row__score">
              ${meter(n)}
              <span class="compare-row__word">${esc(scoreWord(n))}</span>
            </div>
          </div>`;
    })
    .join('');
}

function mapPins(items, esc) {
  // Spread pins across a stylized panel; positions are decorative, not geo-accurate.
  return items
    .map((item, i) => {
      const left = 18 + ((i * 19) % 62);
      const top = 22 + ((i * 23) % 48);
      return `<button type="button" class="compare-map__pin" style="left:${left}%;top:${top}%" data-compare-pin="${esc(item.id)}" aria-label="${esc(item.label)}">
          <span class="compare-map__pin-label">${esc(item.pinLabel)}</span>
        </button>`;
    })
    .join('');
}

export function renderDestComparePage({
  head,
  nav,
  footer,
  esc,
  money,
  destCover,
  procedure,
  entries,
  depth = 1,
}) {
  const cols = entries
    .map((entry) => {
      const dest = entry.dest;
      const profile = entry.profile;
      const title = `${dest.city || dest.name}, ${countryLabel(dest.country)}`;
      const from = entry.priceLabel ? `From ${entry.priceLabel.replace(/^From\s+/i, '')}` : '';
      const clinicsHref = `./${procedure.slug}-${dest.slug}.html`;
      const photo = destCover(dest.slug, depth);
      return `<article class="compare-col" data-compare-col="${esc(dest.slug)}">
          <a class="compare-col__media" href="../destinations/${dest.slug}.html">
            <img src="${photo}" alt="" width="640" height="400" loading="lazy" decoding="async">
          </a>
          <div class="compare-col__head">
            <h2 class="compare-col__title"><a href="../destinations/${dest.slug}.html">${esc(title)}</a></h2>
            ${from ? `<p class="compare-col__price">${esc(from)}</p>` : ''}
          </div>
          <div class="compare-col__standout">
            <p class="compare-col__standout-label">What stands out</p>
            <p class="compare-col__standout-title">${esc(profile.standoutLabel)}</p>
            <p class="compare-col__standout-copy">${esc(profile.standoutBlurb)}</p>
          </div>
          <div class="compare-col__dims">
            ${dimRows(DEST_DIMS, profile.scores, esc)}
          </div>
          <a class="btn btn--plum compare-col__cta" href="${clinicsHref}">Compare clinics</a>
        </article>`;
    })
    .join('');

  const pins = mapPins(
    entries.map((e) => ({
      id: e.dest.slug,
      label: e.dest.city || e.dest.name,
      pinLabel: e.priceLabel ? e.priceLabel.replace(/^From\s+/i, '').replace(/\s+to\s+.*/, '') : e.dest.city,
    })),
    esc
  );

  return (
    head({
      title: `Compare destinations for ${procedure.name} — MediGo`,
      description: `Side-by-side destination comparison for ${procedure.name}.`,
      depth,
    }) +
    nav(depth, 'procedures') +
    `<main>
      <section class="section compare-page" data-compare-page data-compare-mode="destinations">
        <div class="compare-shell">
          <div class="compare-main">
            <header class="compare-hero">
              <p class="compare-hero__eyebrow">${esc(procedure.name)}</p>
              <h1 class="compare-hero__title">Compare destinations</h1>
              <p class="compare-hero__lede">Summaries are based on destination profiles and illustrative demo scores — not live travel advisories.</p>
            </header>
            <div class="compare-grid" role="list">${cols}</div>
          </div>
          <aside class="compare-map" aria-label="Destination map">
            <div class="compare-map__canvas">
              <p class="compare-map__hint">Map overview</p>
              ${pins}
            </div>
          </aside>
        </div>
      </section>
    </main>` +
    footer(depth)
  );
}

export function renderClinicComparePage({
  head,
  nav,
  footer,
  inquiryForm,
  esc,
  money,
  destCover,
  procedure,
  destination,
  clinics,
  depth = 1,
}) {
  const destTitle = `${destination.city || destination.name}, ${countryLabel(destination.country)}`;
  const cols = clinics
    .map((item) => {
      const { clinic, profile, fromPrice } = item;
      const inquireHref = `../contact.html?procedure=${encodeURIComponent(procedure.name)}&destination=${encodeURIComponent(destTitle)}&clinic=${encodeURIComponent(clinic.name)}`;
      return `<article class="compare-col" data-compare-col="${esc(clinic.slug)}">
          <a class="compare-col__media" href="../clinics/${clinic.slug}.html">
            <img src="${destCover(destination.slug, depth)}" alt="" width="640" height="400" loading="lazy" decoding="async">
          </a>
          <div class="compare-col__head">
            <h2 class="compare-col__title"><a href="../clinics/${clinic.slug}.html">${esc(clinic.name)}</a></h2>
            <p class="compare-col__meta">${esc(clinic.focus || 'Clinic')}</p>
            ${fromPrice ? `<p class="compare-col__price">From ${esc(money(fromPrice))}</p>` : ''}
          </div>
          <div class="compare-col__standout">
            <p class="compare-col__standout-label">What stands out</p>
            <p class="compare-col__standout-title">${esc(profile.standoutLabel)}</p>
            <p class="compare-col__standout-copy">${esc(profile.standoutBlurb)}</p>
          </div>
          <div class="compare-col__dims">
            ${dimRows(CLINIC_DIMS, profile.scores, esc)}
          </div>
          <a class="btn btn--plum compare-col__cta" href="${inquireHref}">Plan your trip</a>
        </article>`;
    })
    .join('');

  const pins = mapPins(
    clinics.map((c) => ({
      id: c.clinic.slug,
      label: c.clinic.name,
      pinLabel: c.fromPrice != null ? money(c.fromPrice) : c.clinic.name.split(' ')[0],
    })),
    esc
  );

  return (
    head({
      title: `Compare clinics in ${destination.name} for ${procedure.name} — MediGo`,
      description: `Side-by-side clinic comparison in ${destination.name} for ${procedure.name}.`,
      depth,
    }) +
    nav(depth, 'destinations') +
    `<main>
      <section class="section compare-page" data-compare-page data-compare-mode="clinics">
        <div class="compare-shell">
          <div class="compare-main">
            <header class="compare-hero">
              <p class="compare-hero__eyebrow">${esc(procedure.name)} · ${esc(destTitle)}</p>
              <h1 class="compare-hero__title">Compare clinics</h1>
              <p class="compare-hero__lede">Pick a clinic, then send a demo inquiry. Scores are illustrative for product design.</p>
              <p class="compare-hero__back"><a href="./${procedure.slug}.html">← Back to destinations</a></p>
            </header>
            <div class="compare-grid" role="list">${cols}</div>
          </div>
          <aside class="compare-map" aria-label="Clinic area map">
            <div class="compare-map__canvas">
              <p class="compare-map__hint">${esc(destination.name)}</p>
              ${pins}
            </div>
          </aside>
        </div>
      </section>
      ${inquiryForm({
        depth,
        procedure: procedure.name,
        destination: destTitle,
      })}
    </main>` +
    footer(depth)
  );
}

export { DEST_DIMS, CLINIC_DIMS, countryLabel };
