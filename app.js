/* MediGo site interactions — PRD v2 */
(() => {
  const depth = document.body?.dataset?.depth;
  void depth;

  function catalogBase() {
    const path = window.location.pathname.replace(/\\/g, '/');
    if (/\/(procedures|destinations|clinics|doctors)\//.test(path)) return '../data/';
    return './data/';
  }

  function rootPrefix() {
    const path = window.location.pathname.replace(/\\/g, '/');
    if (/\/(procedures|destinations|clinics|doctors)\//.test(path)) return '../';
    return './';
  }

  // Site menu (full-page takeover)
  function initSiteMenu() {
    const header = document.querySelector('.site-header');
    const openBtn = document.querySelector('[data-nav-toggle]');
    const closeBtn = document.querySelector('[data-nav-close]');
    const menu = document.querySelector('[data-site-menu]');
    if (!header || !openBtn || !menu) return;

    const isOpen = () => !menu.hidden;

    const focusables = () =>
      [...menu.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])')].filter(
        (el) => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true' && el.offsetParent !== null
      );

    const setOpen = (open) => {
      header.classList.toggle('is-open', open);
      document.body.classList.toggle('menu-open', open);
      openBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) {
        menu.hidden = false;
        header.classList.remove('is-hidden');
        const search = menu.querySelector('#menu-search-input');
        window.requestAnimationFrame(() => search?.focus());
      } else {
        menu.hidden = true;
        openBtn.focus();
      }
    };

    openBtn.addEventListener('click', () => {
      setOpen(true);
    });
    closeBtn?.addEventListener('click', () => {
      setOpen(false);
    });

    menu.addEventListener('click', (e) => {
      const link = e.target.closest('a[href]');
      if (!link || !menu.contains(link)) return;
      setOpen(false);
    });

    document.addEventListener('keydown', (e) => {
      if (!isOpen()) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
        return;
      }
      if (e.key !== 'Tab') return;
      const items = focusables();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });
  }

  initSiteMenu();

  // Hero rotating suggestions + search
  const suggestions = [
    'Hair Transplant in Istanbul',
    'Eyelid Surgery in Seoul',
    'IVF in Barcelona',
    'Dental Implants in Tijuana',
    'Gastric Sleeve in Tijuana',
    'Rhinoplasty in Medellín',
    'Cardiac Bypass in Delhi',
    'Knee Replacement in San José',
    'LASIK in Mexico City',
    'IVF in Prague',
  ];

  async function loadSearchIndex() {
    try {
      const res = await fetch(catalogBase() + 'search-index.json');
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  function bindSearchForm(form, index, { allowRotator = false } = {}) {
    const input =
      form.querySelector('.hero-search__input') || form.querySelector('.site-menu__search-input');
    const rotator = allowRotator ? form.querySelector('[data-rotate-slot]') : null;
    const panel = form.querySelector('[data-search-panel]');
    const trending = form.querySelector('[data-search-trending]');
    const suggestBox = form.querySelector('[data-search-suggest]');
    if (!input) return;

    let i = 0;
    let typeTimer = 0;
    let holdTimer = 0;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const clearTypeTimers = () => {
      window.clearTimeout(typeTimer);
      window.clearTimeout(holdTimer);
    };

    const idle = () =>
      !form.classList.contains('is-focused') && !form.classList.contains('has-value');

    const typeSuggestion = (text, char = 0) => {
      if (!rotator || !idle()) return;
      rotator.textContent = text.slice(0, char);
      if (char < text.length) {
        typeTimer = window.setTimeout(() => typeSuggestion(text, char + 1), 38);
        return;
      }
      holdTimer = window.setTimeout(() => {
        if (!idle()) return;
        i += 1;
        runCycle();
      }, 2200);
    };

    const runCycle = () => {
      if (!rotator || !idle()) return;
      const text = suggestions[i % suggestions.length];
      if (reduce) {
        rotator.textContent = text;
        i += 1;
        holdTimer = window.setTimeout(runCycle, 2800);
        return;
      }
      rotator.classList.remove('hero-search__slot');
      void rotator.offsetWidth;
      rotator.classList.add('hero-search__slot');
      typeSuggestion(text, 0);
    };

    if (rotator) {
      clearTypeTimers();
      runCycle();
    }

    const setOpen = (open) => {
      if (panel) panel.hidden = !open;
      form.classList.toggle('is-open', open);
      input.setAttribute('aria-expanded', open ? 'true' : 'false');
    };

    const showTrending = () => {
      if (!panel) return;
      if (trending) {
        trending.hidden = false;
        setOpen(true);
        return;
      }
      if (suggestBox) {
        suggestBox.hidden = true;
        suggestBox.innerHTML = '';
      }
      setOpen(false);
    };

    const renderSuggest = (q) => {
      const query = q.trim().toLowerCase();
      if (!query) {
        showTrending();
        return;
      }
      if (trending) trending.hidden = true;
      if (!suggestBox || !index?.items) {
        setOpen(false);
        return;
      }
      const hits = index.items
        .filter((item) => item.name.toLowerCase().includes(query) || (item.category || '').toLowerCase().includes(query))
        .slice(0, 8);
      if (!hits.length) {
        suggestBox.hidden = true;
        suggestBox.innerHTML = '';
        setOpen(false);
        return;
      }
      const prefix = rootPrefix();
      suggestBox.innerHTML = hits
        .map((h) => {
          const href = h.href.replace(/^\.\//, prefix);
          return `<a href="${href}"><span class="search-suggest__type">${h.type}</span>${h.name}</a>`;
        })
        .join('');
      suggestBox.hidden = false;
      setOpen(true);
    };

    const openPanel = () => {
      form.classList.add('is-focused');
      clearTypeTimers();
      if (input.value.trim()) renderSuggest(input.value);
      else showTrending();
    };

    const closePanel = () => {
      form.classList.remove('is-focused');
      setOpen(false);
      if (trending) trending.hidden = false;
      if (suggestBox) {
        suggestBox.hidden = true;
        suggestBox.innerHTML = '';
      }
      if (rotator && idle()) {
        clearTypeTimers();
        runCycle();
      }
    };

    input.addEventListener('focus', openPanel);
    input.addEventListener('click', openPanel);
    input.addEventListener('input', () => {
      form.classList.toggle('has-value', Boolean(input.value.trim()));
      if (form.classList.contains('has-value')) clearTypeTimers();
      renderSuggest(input.value);
    });

    document.addEventListener('pointerdown', (e) => {
      if (!form.contains(e.target)) closePanel();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape' || !panel || panel.hidden) return;
      if (document.querySelector('.site-header.is-open') && form.hasAttribute('data-menu-search')) return;
      e.preventDefault();
      closePanel();
      input.blur();
    });

    form.addEventListener('submit', (e) => {
      const q = input.value.trim().toLowerCase();
      if (!q || !index?.items) return;
      e.preventDefault();
      const hit = index.items.find((item) => item.name.toLowerCase().includes(q));
      if (hit) {
        window.location.href = hit.href.replace(/^\.\//, rootPrefix());
      } else {
        window.location.href = rootPrefix() + 'procedures.html?q=' + encodeURIComponent(input.value.trim());
      }
    });
  }

  function initHeroSearch(index) {
    document.querySelectorAll('[data-global-search]').forEach((form) => {
      bindSearchForm(form, index, { allowRotator: true });
    });
    document.querySelectorAll('[data-menu-search]').forEach((form) => {
      bindSearchForm(form, index, { allowRotator: false });
    });
  }

  function initListFilters() {
    document.querySelectorAll('[data-list-filter]').forEach((form) => {
      const targetSel = form.getAttribute('data-filter-target');
      const list = targetSel ? document.querySelector(targetSel) : null;
      if (!list) return;
      const input = form.querySelector('[data-filter-input]');
      const cat = form.querySelector('[data-filter-category]');
      const apply = () => {
        const q = (input?.value || '').trim().toLowerCase();
        const category = cat?.value || '';
        list.querySelectorAll('li[data-name]').forEach((li) => {
          const name = li.getAttribute('data-name') || '';
          const liCat = li.getAttribute('data-category') || '';
          const okQ = !q || name.includes(q);
          const okC = !category || liCat === category;
          li.classList.toggle('is-hidden', !(okQ && okC));
        });
      };
      input?.addEventListener('input', apply);
      cat?.addEventListener('change', apply);
      const params = new URLSearchParams(window.location.search);
      if (params.get('q') && input) {
        input.value = params.get('q');
        apply();
      }
    });
  }

  function initProcDirectory() {
    const root = document.querySelector('[data-proc-directory]');
    const tabs = document.querySelector('[data-proc-tabs]');
    const searchForm = document.querySelector('[data-proc-search]');
    if (!root || !tabs) return;

    const panels = {
      specialty: root.querySelector('[data-proc-panel="specialty"]'),
      az: root.querySelector('[data-proc-panel="az"]'),
    };
    const input = searchForm?.querySelector('[data-filter-input], #proc-q, input[type="search"]');
    let emptyNote = root.querySelector('[data-proc-empty]');
    if (!emptyNote) {
      emptyNote = document.createElement('p');
      emptyNote.className = 't-body proc-search-empty';
      emptyNote.hidden = true;
      emptyNote.setAttribute('data-proc-empty', '');
      emptyNote.textContent = 'No procedures match that search.';
      root.appendChild(emptyNote);
    }

    const itemSelector = '[data-proc-item], .proc-list > li[data-name]';

    const setView = (view) => {
      const next = view === 'az' ? 'az' : 'specialty';
      tabs.querySelectorAll('[data-proc-view]').forEach((btn) => {
        const active = btn.getAttribute('data-proc-view') === next;
        btn.classList.toggle('is-active', active);
        btn.setAttribute('aria-selected', active ? 'true' : 'false');
        btn.tabIndex = active ? 0 : -1;
      });
      Object.entries(panels).forEach(([key, panel]) => {
        if (!panel) return;
        panel.hidden = key !== next;
      });
      try {
        const url = new URL(window.location.href);
        if (next === 'specialty') url.searchParams.delete('view');
        else url.searchParams.set('view', next);
        window.history.replaceState({}, '', url);
      } catch {
        /* ignore */
      }
      applySearch();
    };

    const applySearch = () => {
      const q = (input?.value || '').trim().toLowerCase();
      const tokens = q ? q.split(/\s+/).filter(Boolean) : [];
      const items = [...root.querySelectorAll(itemSelector)];

      items.forEach((li) => {
        const name = (li.getAttribute('data-name') || '').toLowerCase();
        const category = (li.getAttribute('data-category') || '').toLowerCase();
        const hay = `${name} ${category} ${(li.textContent || '').toLowerCase()}`;
        const match = !tokens.length || tokens.every((t) => hay.includes(t));
        li.classList.toggle('is-hidden', !match);
        if (match) li.removeAttribute('hidden');
        else li.setAttribute('hidden', '');
      });

      root.querySelectorAll('[data-proc-group]').forEach((group) => {
        const any = [...group.querySelectorAll(itemSelector)].some((li) => !li.classList.contains('is-hidden'));
        group.classList.toggle('is-hidden', !any);
        group.toggleAttribute('hidden', !any);
      });
      root.querySelectorAll('[data-proc-letter]').forEach((group) => {
        const any = [...group.querySelectorAll(itemSelector)].some((li) => !li.classList.contains('is-hidden'));
        group.classList.toggle('is-hidden', !any);
        group.toggleAttribute('hidden', !any);
      });
      root.querySelectorAll('.letter-jump__link:not(.is-disabled)').forEach((link) => {
        const href = link.getAttribute('href') || '';
        const id = href.startsWith('#') ? href.slice(1) : '';
        const target = id ? document.getElementById(id) : null;
        const dead = !target || target.classList.contains('is-hidden') || target.hidden;
        link.classList.toggle('is-muted', dead);
        link.setAttribute('aria-disabled', dead ? 'true' : 'false');
        if (dead) link.setAttribute('tabindex', '-1');
        else link.removeAttribute('tabindex');
      });

      const activePanel = panels.specialty && !panels.specialty.hidden ? panels.specialty : panels.az;
      const visibleInActive = activePanel
        ? [...activePanel.querySelectorAll(itemSelector)].some((li) => !li.classList.contains('is-hidden'))
        : items.some((li) => !li.classList.contains('is-hidden'));
      emptyNote.hidden = !tokens.length || visibleInActive;
    };

    tabs.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-proc-view]');
      if (!btn || !tabs.contains(btn)) return;
      setView(btn.getAttribute('data-proc-view'));
    });

    tabs.addEventListener('keydown', (e) => {
      const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];
      if (!keys.includes(e.key)) return;
      const buttons = [...tabs.querySelectorAll('[data-proc-view]')];
      const i = buttons.indexOf(document.activeElement);
      if (i < 0) return;
      e.preventDefault();
      let next = i;
      if (e.key === 'ArrowLeft') next = (i - 1 + buttons.length) % buttons.length;
      if (e.key === 'ArrowRight') next = (i + 1) % buttons.length;
      if (e.key === 'Home') next = 0;
      if (e.key === 'End') next = buttons.length - 1;
      buttons[next].focus();
      setView(buttons[next].getAttribute('data-proc-view'));
    });

    searchForm?.addEventListener('submit', (e) => e.preventDefault());
    if (input) {
      input.addEventListener('input', applySearch);
      input.addEventListener('search', applySearch);
      input.addEventListener('keyup', applySearch);
    }

    const params = new URLSearchParams(window.location.search);
    if (params.get('q') && input) input.value = params.get('q');
    setView(params.get('view') === 'az' ? 'az' : 'specialty');
  }

  function initDestSuggest() {
    const form = document.querySelector('[data-dest-suggest]');
    const out = document.querySelector('[data-suggest-results]');
    const tbody = document.querySelector('[data-find-tbody]');
    const featured = document.querySelector('[data-featured-dests]');
    if (!form || !out || !tbody) return;

    const DESTINATIONS = [
      { city: 'Istanbul', country: 'Türkiye', clinic: 'Bosphorus Contour Atelier' },
      { city: 'Seoul', country: 'South Korea', clinic: 'Gangnam Lumen Surgery' },
      { city: 'Bangkok', country: 'Thailand', clinic: 'Chao Phraya Care Pavilion' },
      { city: 'Mexico City', country: 'Mexico', clinic: 'Reforma Aesthetic Institute' },
      { city: 'Tijuana', country: 'Mexico', clinic: 'Pacific Border Surgery' },
      { city: 'Medellín', country: 'Colombia', clinic: 'Andes Contour Center' },
      { city: 'Delhi', country: 'India', clinic: 'Yamuna Multicare Hospital' },
      { city: 'Barcelona', country: 'Spain', clinic: 'Gothic Quarter Clinic' },
    ];

    const BASE_FROM = {
      'breast-augmentation': 3200,
      rhinoplasty: 2800,
      'hair-transplant': 2100,
      'dental-implants': 900,
    };

    const BUDGET_BAND = {
      'breast-augmentation': { min: 2500, typicalMax: 7500 },
      rhinoplasty: { min: 2000, typicalMax: 6500 },
      'hair-transplant': { min: 1500, typicalMax: 5500 },
      'dental-implants': { min: 700, typicalMax: 3500 },
    };

    const procSelect = form.querySelector('[name="procedure"]');
    const budgetHint = form.querySelector('[data-budget-hint]');

    let rows = [];
    let sortKey = 'recommended';
    let sortDir = 'asc';

    const moneyLabel = (n) =>
      `$${Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

    const updateBudgetRange = (procedure) => {
      if (!budgetHint) return;
      const band = BUDGET_BAND[procedure];
      if (!band) {
        budgetHint.hidden = true;
        budgetHint.textContent = '';
        return;
      }
      budgetHint.textContent = `Typical abroad: ${moneyLabel(band.min)}–${moneyLabel(band.typicalMax)}`;
      budgetHint.hidden = false;
    };

    procSelect?.addEventListener('change', () => {
      updateBudgetRange(procSelect.value);
    });

    function mulberry32(seed) {
      let t = seed >>> 0;
      return () => {
        t += 0x6d2b79f5;
        let r = Math.imul(t ^ (t >>> 15), 1 | t);
        r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
        return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
      };
    }

    function hashSeed(str) {
      let h = 2166136261;
      for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 16777619);
      }
      return h >>> 0;
    }

    function buildRows(procedure, budget) {
      const rand = mulberry32(hashSeed(`${procedure}|${budget}`));
      const base = BASE_FROM[procedure] || 2500;
      const built = DESTINATIONS.map((d, i) => {
        const jitter = 0.55 + rand() * 1.35;
        let from = Math.round((base * jitter) / 50) * 50;
        if (Number.isFinite(budget) && budget > 0) {
          const ceiling = Math.max(500, budget);
          from = Math.min(from, ceiling);
          from = Math.max(500, from - Math.floor(rand() * 6) * 50);
        }
        const reviews = 40 + Math.floor(rand() * 960);
        return {
          destination: `${d.city}, ${d.country}`,
          clinic: d.clinic,
          from,
          reviews,
          recommended: false,
          _i: i,
        };
      });
      const recIndex = Math.floor(rand() * built.length);
      built[recIndex].recommended = true;
      return built;
    }

    function compareRows(a, b) {
      if (sortKey === 'recommended') {
        if (a.recommended !== b.recommended) return a.recommended ? -1 : 1;
        const byFrom = a.from - b.from;
        return byFrom || a._i - b._i;
      }
      let av;
      let bv;
      if (sortKey === 'from' || sortKey === 'reviews') {
        av = a[sortKey];
        bv = b[sortKey];
      } else {
        av = String(a[sortKey]).toLowerCase();
        bv = String(b[sortKey]).toLowerCase();
      }
      let cmp = 0;
      if (av < bv) cmp = -1;
      else if (av > bv) cmp = 1;
      else cmp = a._i - b._i;
      return sortDir === 'asc' ? cmp : -cmp;
    }

    function render() {
      const sorted = [...rows].sort(compareRows);
      tbody.innerHTML = sorted
        .map((row) => {
          const badge = row.recommended
            ? '<span class="find-dest-badge">Recommended</span>'
            : '';
          return `<tr>
            <td>
              <span class="find-dest-dest">${row.destination}</span>
              ${badge}
            </td>
            <td>${row.clinic}</td>
            <td>$${row.from.toLocaleString('en-US')}</td>
            <td class="find-dest-col--reviews">${row.reviews.toLocaleString('en-US')}</td>
          </tr>`;
        })
        .join('');

      out.querySelectorAll('.find-dest-sort').forEach((btn) => {
        const key = btn.getAttribute('data-sort');
        const active = sortKey !== 'recommended' && key === sortKey;
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
        const ind = btn.querySelector('.find-dest-sort__ind');
        if (ind) ind.textContent = active ? (sortDir === 'asc' ? '↑' : '↓') : '';
        const label = key.charAt(0).toUpperCase() + key.slice(1);
        btn.setAttribute(
          'aria-label',
          active
            ? `Sort by ${label}, currently ${sortDir === 'asc' ? 'ascending' : 'descending'}`
            : `Sort by ${label}`
        );
      });
    }

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const proc = form.querySelector('[name="procedure"]').value;
      const budgetRaw = form.querySelector('[name="budget"]').value;
      const budget = Number(budgetRaw);
      if (!proc) {
        form.querySelector('[name="procedure"]').focus();
        return;
      }
      if (!budgetRaw || !Number.isFinite(budget) || budget < 500) {
        form.querySelector('[name="budget"]').focus();
        return;
      }
      rows = buildRows(proc, budget);
      sortKey = 'recommended';
      sortDir = 'asc';
      out.hidden = false;
      if (featured) {
        featured.hidden = true;
        featured.setAttribute('aria-hidden', 'true');
      }
      render();
      out.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });

    out.querySelectorAll('.find-dest-sort').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (out.hidden || !rows.length) return;
        const key = btn.getAttribute('data-sort');
        if (sortKey === key) sortDir = sortDir === 'asc' ? 'desc' : 'asc';
        else {
          sortKey = key;
          sortDir = 'asc';
        }
        render();
      });
    });
  }

  function initInquiry() {
    const showContactResult = (text) => {
      const box = document.querySelector('[data-contact-result]');
      const summary = document.querySelector('[data-contact-summary]');
      if (!box || !summary) return;
      box.hidden = false;
      summary.textContent = text;
      box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    };

    document.querySelectorAll('[data-contact-form]').forEach((form) => {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const data = new FormData(form);
        const name = String(data.get('name') || '').trim();
        const email = String(data.get('email') || '').trim();
        const message = String(data.get('message') || '').trim();
        showContactResult(
          `Demo message captured locally from ${name} · ${email}. Nothing was emailed.${message ? ` “${message.slice(0, 160)}${message.length > 160 ? '…' : ''}”` : ''}`
        );
      });
    });

    document.querySelectorAll('[data-inquiry]').forEach((form) => {
      form.addEventListener('submit', (e) => {
        // Allow GET to contact with params; on contact page intercept for demo message
        if (!document.querySelector('[data-contact-result]')) return;
        e.preventDefault();
        const data = new FormData(form);
        showContactResult(
          `Demo request captured locally: ${data.get('procedure')} in ${data.get('destination')} · budget ${data.get('budget')} · ${data.get('email')}. Nothing was emailed.`
        );
      });
    });

    // Prefill contact / inquiry fields from query string
    const params = new URLSearchParams(window.location.search);
    ['name', 'email', 'message', 'procedure', 'destination', 'budget'].forEach((key) => {
      const val = params.get(key);
      if (!val) return;
      const el =
        document.querySelector(`[data-contact-form] [name="${key}"]`) ||
        document.querySelector(`[data-inquiry] [name="${key}"]`);
      if (el) el.value = val;
    });
    if (params.get('name') && params.get('email')) {
      const message = params.get('message') || '';
      showContactResult(
        `Demo message captured locally from ${params.get('name')} · ${params.get('email')}. Nothing was emailed.${message ? ` “${message.slice(0, 160)}${message.length > 160 ? '…' : ''}”` : ''}`
      );
    } else if (params.get('procedure') || params.get('email')) {
      if (params.get('email')) {
        showContactResult(
          `Demo request captured locally: ${params.get('procedure')} in ${params.get('destination')} · budget ${params.get('budget')} · ${params.get('email')}. Nothing was emailed.`
        );
      }
    }
  }

  // Fixed Demo pill — visible at top, disappears after scroll
  function initDemoBadge() {
    const badge = document.querySelector('[data-demo-badge]');
    if (!badge) return;

    let ticking = false;
    const threshold = 24;

    const update = () => {
      const hide = window.scrollY > threshold;
      badge.classList.toggle('is-hidden', hide);
      badge.setAttribute('aria-hidden', hide ? 'true' : 'false');
      ticking = false;
    };

    update();
    window.addEventListener(
      'scroll',
      () => {
        if (!ticking) {
          window.requestAnimationFrame(update);
          ticking = true;
        }
      },
      { passive: true }
    );
  }

  async function boot() {
    // Wire page filters immediately — do not wait on catalog fetch
    initListFilters();
    initProcDirectory();
    initDestSuggest();
    initInquiry();
    initDemoBadge();
    const index = await loadSearchIndex();
    initHeroSearch(index);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
