/* ==========================================================================
   MediGo: brand.js
   Motion and small interactions. No dependencies.
   Timings and easings match the tokens in brand.css.
   Every motion here is skipped when the visitor prefers reduced motion.
   ========================================================================== */

(() => {
  const root = document.documentElement;
  root.classList.add('js');

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ----------------------------------------------------------------------
  // 1. Reveal on scroll
  //    [data-reveal] fades up 12px and lands in place once, at 0.5s ease-out.
  //    Measured on the site: opacity and padding reveals, 0.5s cubic-bezier(0, 0, 0.2, 1).
  // ----------------------------------------------------------------------
  function initReveal() {
    const items = document.querySelectorAll('[data-reveal]');
    if (!items.length) return;

    // Above-the-fold / eager nodes must never stay at opacity 0
    document.querySelectorAll('[data-reveal-eager]').forEach((el) => {
      el.classList.add('is-in');
    });

    if (reduce || !('IntersectionObserver' in window)) {
      items.forEach((el) => el.classList.add('is-in'));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-in');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -8% 0px' }
    );
    items.forEach((el) => io.observe(el));

    // Fallback: if IO never fires (odd file:// / iframe cases), show everything
    window.setTimeout(() => {
      items.forEach((el) => el.classList.add('is-in'));
    }, 1200);
  }

  // ----------------------------------------------------------------------
  // 2. Header auto-hide
  //    header[data-autohide] slides up after the user scrolls down past 120px,
  //    and returns on any upward scroll. Transform only, 0.3s ease-out [M].
  //    Whether the live site hides its header on scroll was not confirmed
  //    in this pass; this behaviour is the index's pattern, not a measured one.
  // ----------------------------------------------------------------------
  function initHeaderAutohide() {
    const header = document.querySelector('header[data-autohide], .site-header[data-autohide]');
    if (!header) return;

    let lastY = window.scrollY;
    let ticking = false;

    const update = () => {
      const y = window.scrollY;
      const goingDown = y > lastY;
      if (reduce || header.classList.contains('is-open')) {
        header.classList.remove('is-hidden');
      } else if (y > 120 && goingDown) {
        header.classList.add('is-hidden');
      } else if (!goingDown) {
        header.classList.remove('is-hidden');
      }
      header.classList.toggle('has-shadow', y > 8);
      lastY = y;
      ticking = false;
    };

    window.addEventListener('scroll', () => {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    }, { passive: true });
  }

  // ----------------------------------------------------------------------
  // 3. Accordion
  //    details[data-accordion] > summary + [data-accordion-body].
  //    Open: 0.3s ease-out. Close: 0.2s standard. Uses the Web Animations API.
  // ----------------------------------------------------------------------
  function initAccordion() {
    document.querySelectorAll('details[data-accordion]').forEach((details) => {
      const summary = details.querySelector('summary');
      const body = details.querySelector('[data-accordion-body]');
      if (!summary || !body) return;

      summary.addEventListener('click', (event) => {
        event.preventDefault();
        if (details.dataset.animating === 'true') return;

        if (details.open) {
          if (reduce) { details.open = false; return; }
          details.dataset.animating = 'true';
          const from = body.offsetHeight;
          const anim = body.animate(
            [{ height: from + 'px', opacity: 1 }, { height: '0px', opacity: 0 }],
            { duration: 200, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' }
          );
          anim.onfinish = () => {
            details.open = false;
            details.dataset.animating = 'false';
          };
        } else {
          details.open = true;
          if (reduce) return;
          details.dataset.animating = 'true';
          const to = body.scrollHeight;
          const anim = body.animate(
            [{ height: '0px', opacity: 0 }, { height: to + 'px', opacity: 1 }],
            { duration: 300, easing: 'cubic-bezier(0, 0, 0.2, 1)' }
          );
          anim.onfinish = () => { details.dataset.animating = 'false'; };
        }
      });
    });
  }

  // ----------------------------------------------------------------------
  // 4. Copy on click
  //    Any element with data-copy copies its value and flashes "Copied".
  //    Used by the swatches on index.html. Not a site behaviour.
  // ----------------------------------------------------------------------
  function initCopy() {
    document.querySelectorAll('[data-copy]').forEach((el) => {
      el.addEventListener('click', async () => {
        const value = el.getAttribute('data-copy');
        try { await navigator.clipboard.writeText(value); } catch (e) { /* clipboard may be blocked */ }
        const label = el.querySelector('[data-copy-label]');
        if (label) {
          const original = label.textContent;
          label.textContent = 'Copied';
          setTimeout(() => { label.textContent = original; }, 900);
        }
      });
    });
  }

  // ----------------------------------------------------------------------
  // Boot
  // ----------------------------------------------------------------------
  const boot = () => {
    initReveal();
    initHeaderAutohide();
    initAccordion();
    initCopy();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  // Exposed so an agent can read the motion tokens in code.
  window.CareCompassBrand = {
    durations: { fast: 150, base: 200, slow: 300, reveal: 500 },
    easings: {
      standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
      out: 'cubic-bezier(0, 0, 0.2, 1)'
    },
    reducedMotion: reduce
  };
})();
