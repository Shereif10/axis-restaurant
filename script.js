/* AXIS — performance-optimized script (vanilla + GSAP) */
gsap.registerPlugin(ScrollTrigger);
/* Ignore height-only viewport changes on mobile (URL bar show/hide) so scrolling
   does not trigger costly ScrollTrigger refreshes. Width changes still refresh. */
ScrollTrigger.config({ ignoreMobileResize: true });

/* ---------- helpers ---------- */
const $ = (s, ctx = document) => ctx.querySelector(s);
const $$ = (s, ctx = document) => [...ctx.querySelectorAll(s)];
const debounce = (fn, wait) => {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
};

/* ---------- cache DOM ---------- */
const DOM = {
  nav: $('.nav'),
  loader: $('.loader'),
  heroVideo: $('.hero-video-main'),
  heroContent: $('.hero-clean-content'),
  heroSection: $('.hero-clean'),
  revealImgs: $$('.reveal-img'),
  revealPhotos: $$('.reveal-photo'),
  animatedGroups: $$('.story-title,.story-copy,.feature-copy,.gallery-head,.reservation-copy,.visit-copy,.location-copy'),
  galleryItems: $$('.g'),
  galleryImgs: $$('.g img'),
  menuSection: $('.menu-section'),
  rail: $('.menu-rail'),
  progress: $('.menu-progress span'),
  menuCards: $$('.menu-card'),
  menuModal: $('.menu-modal'),
  modalImg: $('.menu-modal .modal-image-wrap img'),
  modalWrap: $('.modal-image-wrap'),
  modalClose: $('.modal-close'),
  prevBtn: $('.prev'),
  nextBtn: $('.next'),
  counter: $('.modal-nav span'),
  form: $('#bookingForm'),
  formStatus: $('.form-status'),
  magneticEls: $$('.magnetic'),
  mobileMenu: $('.mobile-menu'),
  menuBtn: $('.menu-btn'),
  mobileClose: $('.mobile-close'),
  mobileLinks: $$('.mobile-links a'),
};

/* menu image sources — prefer data-src for progressive lazy */
const menuImgs = DOM.menuCards.map((card) => {
  const img = card.querySelector('img');
  return (img && (img.dataset.src || img.getAttribute('src'))) || '';
});

/* ---------- progressive lazy for menu images (data-src) ---------- */
function initMenuLazy() {
  const lazyImgs = $$('.menu-card img[data-src]');
  if (!lazyImgs.length) return;

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const img = entry.target;
        const src = img.dataset.src;
        if (src) {
          // Use decoding async, set src directly; browser will fetch once.
          img.decoding = 'async';
          img.src = src;
          img.removeAttribute('data-src');
          // Remove fetchpriority if present to allow normal priority
        }
        observer.unobserve(img);
      });
    }, { rootMargin: '500px 300px', threshold: 0.01 });
    lazyImgs.forEach((img) => io.observe(img));
  } else {
    lazyImgs.forEach((img) => {
      if (img.dataset.src) {
        img.src = img.dataset.src;
        img.removeAttribute('data-src');
      }
    });
  }
}

/* ---------- main init after window load (keeps loader timing) ---------- */
window.addEventListener('load', () => {
  initMenuLazy();

  const loaderTl = gsap.timeline();
  loaderTl
    .to('.loader-mark', { clipPath: 'inset(0 0% 0 0)', duration: 1.15, ease: 'power4.inOut' })
    .to('.loader-line span', { width: '100%', duration: 1.1, ease: 'power2.inOut' }, '-=.45')
    .to('.loader-meta,.loader p', { opacity: 0, y: 8, duration: 0.35 }, '-=.25')
    .to(DOM.loader, { yPercent: -100, duration: 1.15, ease: 'power4.inOut' })
    .from(DOM.nav, { y: -30, opacity: 0, duration: 0.6 }, '-=.55')
    .from(DOM.heroContent, { opacity: 0, y: 18, duration: 0.7 }, '-=.35')
    // Loader is fully off-screen by now — drop its fixed layer from compositing
    .add(() => { if (DOM.loader) DOM.loader.style.display = 'none'; });

  // Hero parallax — use cached els, transform/opacity only (performant)
  if (DOM.heroVideo && DOM.heroSection) {
    gsap.to(DOM.heroVideo, {
      scale: 1.06,
      yPercent: 3,
      ease: 'none',
      scrollTrigger: {
        trigger: DOM.heroSection,
        start: 'top top',
        end: 'bottom top',
        scrub: 1.4,
      },
    });
    gsap.to(DOM.heroContent, {
      yPercent: -10,
      ease: 'none',
      scrollTrigger: {
        trigger: DOM.heroSection,
        start: 'top top',
        end: 'bottom top',
        scrub: 1.2,
      },
    });
  }

  // Smart navbar — cache nav el, avoid query on every scroll tick
  if (DOM.nav) {
    ScrollTrigger.create({
      start: 'top -80',
      end: 99999,
      onUpdate: (self) => {
        DOM.nav.classList.toggle('scrolled', self.scroll() > 80);
      },
    });
  }

  // Section reveals — batch timeline per element to halve ScrollTrigger instances
  DOM.revealImgs.forEach((el) => {
    const img = el.querySelector('img');
    const tl = gsap.timeline({
      scrollTrigger: { trigger: el, start: 'top 82%' },
    });
    tl.fromTo(el, { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: 1.35, ease: 'power4.out' }, 0);
    if (img) tl.fromTo(img, { scale: 1.22 }, { scale: 1, duration: 1.7, ease: 'power3.out' }, 0);
  });

  DOM.revealPhotos.forEach((el) => {
    const img = el.querySelector('img');
    const tl = gsap.timeline({
      scrollTrigger: { trigger: el, start: 'top 80%' },
    });
    tl.from(el, { clipPath: 'inset(0 100% 0 0)', duration: 1.3, ease: 'power4.out' }, 0);
    if (img) tl.fromTo(img, { scale: 1.22 }, { scale: 1, duration: 1.7, ease: 'power3.out' }, 0);
  });

  DOM.animatedGroups.forEach((el) => {
    if (!el.children.length) return;
    gsap.from(el.children, {
      y: 70,
      opacity: 0,
      stagger: 0.08,
      duration: 0.95,
      ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 80%' },
    });
  });

  const galleryGrid = $('.gallery-grid');
  DOM.galleryItems.forEach((el, i) => {
    gsap.from(el, {
      y: 110,
      opacity: 0,
      rotate: i % 2 ? 1 : -1,
      duration: 1.1,
      delay: i * 0.08,
      ease: 'power3.out',
      scrollTrigger: { trigger: galleryGrid, start: 'top 78%' },
    });
  });

  // Gallery parallax — scrub only, yPercent is transform (GPU)
  DOM.galleryImgs.forEach((img, i) => {
    gsap.to(img, {
      yPercent: i === 1 ? -7 : 7,
      ease: 'none',
      scrollTrigger: { trigger: img, start: 'top bottom', end: 'bottom top', scrub: 1.4 },
    });
  });

  // Menu horizontal — cache els, debounce resize, avoid excessive refresh
  if (DOM.menuSection && DOM.rail && DOM.progress) {
    const rail = DOM.rail;
    const menuSection = DOM.menuSection;
    const progress = DOM.progress;

    const setupHorizontalMenu = () => {
      const distance = Math.max(0, rail.scrollWidth - window.innerWidth);
      gsap.killTweensOf(rail);
      ScrollTrigger.getAll()
        .filter((st) => st.vars && st.vars.id === 'axis-menu-horizontal')
        .forEach((st) => st.kill());

      if (distance <= 0) {
        gsap.set(rail, { x: 0 });
        progress.style.width = '100%';
        return;
      }
      gsap.set(rail, { x: 0 });
      gsap.to(rail, {
        x: -distance,
        ease: 'none',
        scrollTrigger: {
          id: 'axis-menu-horizontal',
          trigger: rail.querySelector('.menu-card'),
          start: 'center center',
          end: () => `+=${distance * 1.15}`,
          pin: menuSection,
          scrub: 1.1,
          invalidateOnRefresh: true,
          anticipatePin: 1,
          onEnter: () => menuSection.classList.add('is-horizontal'),
          onEnterBack: () => menuSection.classList.add('is-horizontal'),
          onLeave: () => menuSection.classList.remove('is-horizontal'),
          onLeaveBack: () => menuSection.classList.remove('is-horizontal'),
          onUpdate: (self) => {
            // Avoid layout thrash: only style.width (not reflow-triggering read)
            progress.style.width = Math.max(8, self.progress * 100) + '%';
          },
        },
      });
    };

    setupHorizontalMenu();

    // --- Bi-directional wheel / trackpad / touch for menu (vertical + horizontal same progress) ---
    const getMenuST = () => ScrollTrigger.getById('axis-menu-horizontal');
    const isMenuPinned = () => menuSection.classList.contains('is-horizontal') && !!getMenuST();
    // allow vertical pan, capture horizontal pan via JS without page horizontal overflow
    menuSection.style.touchAction = 'pan-y';

    const normalizeDelta = (e, val) => {
      if (e.deltaMode === 1) return val * 16;
      if (e.deltaMode === 2) return val * window.innerHeight;
      return val;
    };

    const handleWheel = (e) => {
      if (!isMenuPinned()) return;
      if (e.ctrlKey) return;
      if (DOM.menuModal && DOM.menuModal.classList.contains('open')) return;
      const absX = Math.abs(e.deltaX);
      const absY = Math.abs(e.deltaY);
      if (absX < 0.5 && absY < 0.5) return;
      const horizontalDominant = absX > absY;
      // Only intercept horizontal-dominant input; let pure vertical use native scroll
      if (!horizontalDominant) return;
      let delta = normalizeDelta(e, e.deltaX);
      // No cap: match native vertical wheel speed exactly (full delta -> same px of page scroll)
      if (Math.abs(delta) < 1) return;
      const st = getMenuST();
      if (!st) return;
      const p = st.progress;
      // At edges, allow native scroll to release pin instead of trapping
      if ((p <= 0.001 && delta < 0) || (p >= 0.999 && delta > 0)) return;
      e.preventDefault();
      window.scrollBy(0, delta);
    };

    // wheel must be non-passive to allow preventDefault
    window.addEventListener('wheel', handleWheel, { passive: false });

    // Touch: map horizontal swipe to same vertical scroll progress
    let tStartX = 0, tStartY = 0, tLastX = 0, tLastY = 0, tActive = false;
    let tSamples = []; // recent touchmove samples for release velocity
    const onTouchStart = (e) => {
      stopFling();
      if (!isMenuPinned()) return;
      if (!e.touches || e.touches.length !== 1) return;
      tStartX = tLastX = e.touches[0].clientX;
      tStartY = tLastY = e.touches[0].clientY;
      tSamples = [];
      tActive = true;
    };
    const onTouchMove = (e) => {
      if (!tActive || !isMenuPinned()) return;
      if (!e.touches || e.touches.length !== 1) return;
      const curX = e.touches[0].clientX;
      const curY = e.touches[0].clientY;
      const dX = tLastX - curX;
      const dY = tLastY - curY;
      tLastX = curX;
      tLastY = curY;
      const absX = Math.abs(dX);
      const absY = Math.abs(dY);
      if (absX < 0.5 && absY < 0.5) return;
      const horizontalDominant = absX > absY;
      if (!horizontalDominant) return; // let native vertical scroll handle vertical swipes
      tSamples.push({ t: e.timeStamp, x: curX });
      if (tSamples.length > 8) tSamples.shift();
      const st = getMenuST();
      if (!st) return;
      const p = st.progress;
      if ((p <= 0.001 && dX < 0) || (p >= 0.999 && dX > 0)) return;
      // Convert horizontal touch delta to vertical scroll delta (same magnitude)
      // Touch deltas are already pixel-based; keep 1:1 for natural feel
      e.preventDefault();
      window.scrollBy(0, dX);
    };
    const touchReleaseVelocity = () => {
      const s = tSamples;
      const n = s.length;
      if (n < 2) return 0;
      const last = s[n - 1];
      let i = 0;
      while (i < n - 1 && last.t - s[i].t > 120) i++;
      const span = last.t - s[i].t;
      if (span < 8) return 0;
      return (s[i].x - last.x) / span * 1000; // px/s, + = forward (finger moved left)
    };
    // Native vertical touch scrolling glides after release (momentum). The horizontal
    // path preventDefaults the native gesture, so it must apply the same decaying
    // glide itself — otherwise horizontal swipes feel slower than vertical ones.
    let flingRAF = 0, flingV = 0, flingT = 0;
    const FLING_FRICTION = 0.95; // velocity retained per 16.7ms frame (~325ms time constant)
    const FLING_MIN_START = 220; // px/s — below this a release is a plain stop, not a flick
    const FLING_MIN_KEEP = 25;   // px/s — glide ends when nearly stopped
    const stopFling = () => { if (flingRAF) { cancelAnimationFrame(flingRAF); flingRAF = 0; } };
    const startFling = (v0) => {
      stopFling();
      if (Math.abs(v0) < FLING_MIN_START) return;
      const st0 = getMenuST();
      const p0 = st0 ? st0.progress : 0;
      if ((p0 <= 0.001 && v0 < 0) || (p0 >= 0.999 && v0 > 0)) return;
      flingV = v0;
      flingT = performance.now();
      const step = (t) => {
        flingRAF = 0;
        const dt = Math.min(64, t - flingT);
        flingT = t;
        if (!isMenuPinned() || (DOM.menuModal && DOM.menuModal.classList.contains('open'))) return;
        const st = getMenuST();
        if (!st) return;
        const p = st.progress;
        if ((p <= 0.001 && flingV < 0) || (p >= 0.999 && flingV > 0)) return;
        const dtSec = dt / 1000;
        window.scrollBy(0, flingV * dtSec);
        flingV *= Math.pow(FLING_FRICTION, dt / 16.667);
        if (Math.abs(flingV) < FLING_MIN_KEEP) return;
        flingRAF = requestAnimationFrame(step);
      };
      flingRAF = requestAnimationFrame(step);
    };
    const onTouchEnd = () => {
      if (!tActive) return;
      tActive = false;
      const v = touchReleaseVelocity();
      if (v) startFling(v);
    };

    // touch listeners must be non-passive to allow preventDefault for horizontal
    menuSection.addEventListener('touchstart', onTouchStart, { passive: true });
    menuSection.addEventListener('touchmove', onTouchMove, { passive: false });
    menuSection.addEventListener('touchend', onTouchEnd, { passive: true });
    menuSection.addEventListener('touchcancel', () => { stopFling(); tActive = false; }, { passive: true });

    // Debounced resize handling (150ms): rebuild the horizontal trigger only when
    // the viewport WIDTH actually changed. Height-only changes (mobile URL bar
    // show/hide) are skipped — ScrollTrigger handles them internally (and ignores
    // them on mobile via ignoreMobileResize) — so scrolling on phones never
    // triggers expensive rebuild/refresh cycles.
    let lastWidth = window.innerWidth;
    const onResize = debounce(() => {
      const w = window.innerWidth;
      if (w === lastWidth) return;
      lastWidth = w;
      setupHorizontalMenu();
      ScrollTrigger.refresh();
    }, 150);

    window.addEventListener('resize', onResize, { passive: true });

    // Also listen to orientation change
    window.addEventListener('orientationchange', onResize, { passive: true });
  }

  // Menu modal — cached els, preload neighbors, handle data-src fallback
  const modal = DOM.menuModal;
  const modalImg = DOM.modalImg;
  const counter = DOM.counter;
  let current = 0;

  function updateCounter() {
    if (!counter) return;
    counter.textContent = String(current + 1).padStart(2, '0') + ' / ' + String(menuImgs.length).padStart(2, '0');
  }

  function preloadAround(idx) {
    [1, -1, 2].forEach((off) => {
      const n = (idx + off + menuImgs.length) % menuImgs.length;
      const src = menuImgs[n];
      if (!src) return;
      const im = new Image();
      im.decoding = 'async';
      im.src = src;
    });
  }

  function openMenu(i) {
    current = ((i % menuImgs.length) + menuImgs.length) % menuImgs.length;
    const src = menuImgs[current];
    if (modalImg) {
      modalImg.decoding = 'async';
      // Ensure card image for this index is loaded (if it was data-src)
      const cardImg = DOM.menuCards[current] && DOM.menuCards[current].querySelector('img');
      if (cardImg && cardImg.dataset.src) {
        cardImg.src = cardImg.dataset.src;
        cardImg.removeAttribute('data-src');
        // update menuImgs entry
        menuImgs[current] = cardImg.src;
      }
      if (src) modalImg.src = src;
    }
    updateCounter();
    if (modal) {
      modal.classList.add('open');
      modal.setAttribute('aria-hidden', 'false');
    }
    document.body.classList.add('menu-open');
    if (DOM.modalWrap) {
      gsap.fromTo(DOM.modalWrap, { scale: 0.9, opacity: 0, rotateY: 6 }, { scale: 1, opacity: 1, rotateY: 0, duration: 0.55, ease: 'power3.out' });
    }
    preloadAround(current);
  }

  function closeMenu() {
    if (modal) {
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden', 'true');
    }
    // preserve scroll lock if mobile menu still open
    if (!mobile || mobile.getAttribute('aria-hidden') === 'true') {
      document.body.classList.remove('menu-open');
    }
  }

  DOM.menuCards.forEach((card, i) => {
    card.addEventListener('click', () => openMenu(i), { passive: true });
  });
  if (DOM.modalClose) DOM.modalClose.addEventListener('click', closeMenu, { passive: true });
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeMenu();
    });
  }
  if (DOM.prevBtn) DOM.prevBtn.addEventListener('click', () => openMenu((current - 1 + menuImgs.length) % menuImgs.length), { passive: true });
  if (DOM.nextBtn) DOM.nextBtn.addEventListener('click', () => openMenu((current + 1) % menuImgs.length), { passive: true });

  // Touch swipe navigation inside the OPEN Menu image modal only (mobile):
  // swipe LEFT -> next image, swipe RIGHT -> previous image.
  // Minimum distance + horizontal dominance so taps and vertical gestures are ignored.
  let swX = 0, swY = 0, swId = null, swActive = false;
  const SWIPE_MIN_PX = 50;
  if (modal) {
    modal.addEventListener('touchstart', (e) => {
      if (!modal.classList.contains('open') || !e.touches || e.touches.length !== 1) return;
      swX = e.touches[0].clientX;
      swY = e.touches[0].clientY;
      swId = e.touches[0].identifier;
      swActive = true;
    }, { passive: true });
    modal.addEventListener('touchend', (e) => {
      if (!swActive) return;
      swActive = false;
      const t = e.changedTouches && Array.prototype.find.call(e.changedTouches, (c) => c.identifier === swId);
      if (!t) return;
      const dx = t.clientX - swX;
      const dy = t.clientY - swY;
      if (Math.abs(dx) < SWIPE_MIN_PX || Math.abs(dx) <= Math.abs(dy)) return;
      if (dx < 0) openMenu((current + 1) % menuImgs.length);
      else openMenu((current - 1 + menuImgs.length) % menuImgs.length);
    }, { passive: true });
    modal.addEventListener('touchcancel', () => { swActive = false; }, { passive: true });
  }

  // Reservation form — AXIS booking validation (preserves visual design)
  const form = DOM.form;
  const status = DOM.formStatus;
  const typeEl = document.getElementById('reservationType');
  const dateEl = document.getElementById('bookingDate');
  const timeEl = document.getElementById('bookingTime');
  const nameEl = form ? form.querySelector('input[name="name"]') : null;
  const phoneEl = form ? form.querySelector('input[name="phone"]') : null;
  const guestsEl = document.getElementById('bookingGuests');

  const ADVANCE_MINUTES = {
    regular: 30,
    birthday_no_decoration: 24 * 60,
    birthday_with_decoration: 4 * 24 * 60,
    corporate: 48 * 60,
  };
  const ADVANCE_LABEL = {
    regular: "30 minutes",
    birthday_no_decoration: "24 hours",
    birthday_with_decoration: "4 days",
    corporate: "48 hours",
  };

  const toISODate = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  const getMinDateStr = (type) => {
    const now = new Date();
    const base = new Date(now);
    base.setHours(0, 0, 0, 0);
    if (type === 'birthday_no_decoration') base.setDate(base.getDate() + 1);
    else if (type === 'birthday_with_decoration') base.setDate(base.getDate() + 4);
    else if (type === 'corporate') base.setDate(base.getDate() + 2);
    else if (type === 'regular') { /* today */ }
    else return '';
    return toISODate(base);
  };
  const getAdvanceMinutes = (type) => ADVANCE_MINUTES[type] ?? 0;
  const isWithinOpeningHours = (timeStr) => {
    if (!timeStr || !/^\d{2}:\d{2}$/.test(timeStr)) return false;
    const [h, m] = timeStr.split(':').map(Number);
    const mins = h * 60 + m;
    // 09:00 (540) - 23:59 (1439) and 00:00 (0) - 01:59 (119) inclusive
    if (mins >= 540 && mins <= 1439) return true;
    if (mins >= 0 && mins <= 119) return true;
    return false;
  };
  const parseAppointment = (dateStr, timeStr) => {
    if (!dateStr || !timeStr) return null;
    const dt = new Date(`${dateStr}T${timeStr}:00`);
    return isNaN(dt.getTime()) ? null : dt;
  };
  const setFieldError = (id, msg, input) => {
    const el = document.getElementById(id);
    if (el) el.textContent = msg || '';
    if (input) input.classList.toggle('is-invalid', !!msg);
  };
  const clearAllFieldErrors = () => {
    ['error-reservationType','error-name','error-phone','error-guests','error-date','error-time'].forEach((id)=>{
      const el=document.getElementById(id);
      if(el) el.textContent='';
    });
    if(typeEl) typeEl.classList.remove('is-invalid');
    if(nameEl) nameEl.classList.remove('is-invalid');
    if(phoneEl) phoneEl.classList.remove('is-invalid');
    if(guestsEl) guestsEl.classList.remove('is-invalid');
    if(dateEl) dateEl.classList.remove('is-invalid');
    if(timeEl) timeEl.classList.remove('is-invalid');
    if(status) status.textContent='';
  };

  const updateDateConstraints = () => {
    if (!typeEl || !dateEl) return;
    const type = typeEl.value;
    if (!type) {
      dateEl.disabled = true;
      dateEl.removeAttribute('min');
      dateEl.value = '';
      dateEl.placeholder = 'Select a reservation type first';
      setFieldError('error-date', '', dateEl);
      setFieldError('error-time', '', timeEl);
      return;
    }
    const minStr = getMinDateStr(type);
    // keep native type="date" — do not switch to text, preserve DD/MM/YYYY via lang
    dateEl.disabled = false;
    dateEl.setAttribute('lang', 'en-GB');
    dateEl.placeholder = '';
    if (minStr) dateEl.min = minStr;
    else dateEl.removeAttribute('min');
    // Clear previously selected date/time that is no longer valid
    if (dateEl.value && minStr && dateEl.value < minStr) {
      dateEl.value = '';
      if (timeEl) timeEl.value = '';
      setFieldError('error-date', '', dateEl);
      setFieldError('error-time', '', timeEl);
    } else if (dateEl.value && timeEl && timeEl.value) {
      // revalidate combined date/time against new advance requirement
      validateDateTime(false);
    } else {
      // clear stale errors
      setFieldError('error-date', '', dateEl);
    }
  };

  const validateDateTime = (showErrors = true) => {
    if (!typeEl || !dateEl || !timeEl) return true;
    const type = typeEl.value;
    const dateVal = dateEl.value;
    const timeVal = timeEl.value;
    // if type not selected, date disabled — don't validate date/time yet
    if (!type) return true;
    // opening hours check (only if time present)
    let openingOk = true;
    let advanceOk = true;
    let openingMsg = '';
    let advanceMsg = '';
    if (timeVal) {
      if (!isWithinOpeningHours(timeVal)) {
        openingOk = false;
        openingMsg = 'Please choose a time during our opening hours: 9:00 AM – 2:00 AM.';
      }
    }
    if (dateVal && timeVal) {
      const appt = parseAppointment(dateVal, timeVal);
      const now = new Date();
      const advance = getAdvanceMinutes(type);
      if (appt) {
        const diffMs = appt.getTime() - now.getTime();
        const diffMins = diffMs / 60000;
        if (diffMins < advance - 0.5) { // small epsilon for seconds
          advanceOk = false;
          const label = ADVANCE_LABEL[type] || `${advance} minutes`;
          advanceMsg = `This reservation requires at least ${label}' advance notice.`;
          // spec example uses 48 hours' — keep same phrasing
          if (type === 'corporate') advanceMsg = "This reservation requires at least 48 hours' advance notice.";
          else if (type === 'birthday_no_decoration') advanceMsg = "This reservation requires at least 24 hours' advance notice.";
          else if (type === 'birthday_with_decoration') advanceMsg = "This reservation requires at least 4 days' advance notice.";
          else if (type === 'regular') advanceMsg = "This reservation requires at least 30 minutes' advance notice.";
        }
      }
    }
    if (showErrors) {
      // Time field shows opening-hours or advance error (opening takes precedence if both)
      if (!openingOk) {
        setFieldError('error-time', openingMsg, timeEl);
      } else if (!advanceOk) {
        setFieldError('error-time', advanceMsg, timeEl);
      } else {
        // clear time error only if it was opening/advance related; keep required error otherwise
        const cur = document.getElementById('error-time')?.textContent || '';
        if (cur === openingMsg || cur.includes('advance notice') || cur.includes('opening hours')) {
          setFieldError('error-time', '', timeEl);
        }
      }
    }
    return openingOk && advanceOk;
  };

  const validateForm = () => {
    clearAllFieldErrors();
    let firstInvalid = null;
    const setFirst = (el) => { if (!firstInvalid && el) firstInvalid = el; };

    // 1 Reservation Type
    if (!typeEl || !typeEl.value) {
      setFieldError('error-reservationType', 'Please select a reservation type.', typeEl);
      setFirst(typeEl);
    }
    // 2 Full Name
    if (!nameEl || !nameEl.value.trim()) {
      setFieldError('error-name', 'Please enter your name.', nameEl);
      setFirst(nameEl);
    }
    // 3 Phone
    if (!phoneEl || !phoneEl.value.trim()) {
      setFieldError('error-phone', 'Please enter your phone number.', phoneEl);
      setFirst(phoneEl);
    } else if (phoneEl.value.trim().length < 8) {
      setFieldError('error-phone', 'Please enter a valid phone number.', phoneEl);
      setFirst(phoneEl);
    }
    // Guests (required, not in spec order but keep form integrity)
    if (!guestsEl || !guestsEl.value) {
      setFieldError('error-guests', 'Please select number of guests.', guestsEl);
      setFirst(guestsEl);
    }
    // 4 Date
    if (!dateEl || !dateEl.value) {
      // if type not selected, date is disabled — show type error already, but also date
      if (typeEl && typeEl.value) {
        setFieldError('error-date', 'Please select a date.', dateEl);
        setFirst(dateEl);
      }
    } else if (dateEl.min && dateEl.value < dateEl.min) {
      setFieldError('error-date', 'Please select a valid date.', dateEl);
      setFirst(dateEl);
    }
    // 5 Time
    if (!timeEl || !timeEl.value) {
      setFieldError('error-time', 'Please select a time.', timeEl);
      setFirst(timeEl);
    }

    // 6 Opening hours + 7 Minimum advance notice (only if date & time present and previous checks passed)
    let timeValid = true;
    if (dateEl && dateEl.value && timeEl && timeEl.value && typeEl && typeEl.value) {
      const timeOk = isWithinOpeningHours(timeEl.value);
      const appt = parseAppointment(dateEl.value, timeEl.value);
      const now = new Date();
      const advance = getAdvanceMinutes(typeEl.value);
      let openingOk = timeOk;
      let advanceOk = true;
      if (appt) {
        const diffMins = (appt.getTime() - now.getTime()) / 60000;
        advanceOk = diffMins >= advance - 0.5;
      } else {
        advanceOk = false;
      }
      if (!timeOk) {
        setFieldError('error-time', 'Please choose a time during our opening hours: 9:00 AM – 2:00 AM.', timeEl);
        setFirst(timeEl);
        timeValid = false;
      } else if (!advanceOk) {
        const type = typeEl.value;
        let msg = '';
        if (type === 'regular') msg = "This reservation requires at least 30 minutes' advance notice.";
        else if (type === 'birthday_no_decoration') msg = "This reservation requires at least 24 hours' advance notice.";
        else if (type === 'birthday_with_decoration') msg = "This reservation requires at least 4 days' advance notice.";
        else if (type === 'corporate') msg = "This reservation requires at least 48 hours' advance notice.";
        else msg = 'This reservation requires more advance notice.';
        setFieldError('error-time', msg, timeEl);
        setFirst(timeEl);
        timeValid = false;
      }
    }

    if (firstInvalid) {
      firstInvalid.focus();
      return false;
    }
    // also if timeValid false due to opening/advance, already focused
    return timeValid && !firstInvalid;
  };

  // Initial state: ensure date disabled until type selected — keep native date type, DD/MM/YYYY via lang
  if (dateEl) {
    if (!typeEl || !typeEl.value) {
      dateEl.disabled = true;
      // keep type="date" for native picker, internal YYYY-MM-DD, display DD/MM/YYYY via lang="en-GB"
      dateEl.setAttribute('lang', 'en-GB');
      dateEl.placeholder = 'Select a reservation type first';
    }
    // Ensure lang hint for DD/MM/YYYY display where supported
    dateEl.setAttribute('lang', 'en-GB');
    if (timeEl) timeEl.setAttribute('lang', 'en-GB');
  }

  if (typeEl) {
    typeEl.addEventListener('change', () => {
      setFieldError('error-reservationType', '', typeEl);
      updateDateConstraints();
      // revalidate if date/time already chosen
      if (dateEl && dateEl.value && timeEl && timeEl.value) validateDateTime(true);
    });
  }
  if (dateEl) {
    dateEl.addEventListener('change', () => {
      setFieldError('error-date', '', dateEl);
      // if time already selected, validate combined
      if (timeEl && timeEl.value) validateDateTime(true);
      else setFieldError('error-time', '', timeEl);
    });
    dateEl.addEventListener('input', () => {
      if (dateEl.value) setFieldError('error-date', '', dateEl);
    });
  }
  if (timeEl) {
    timeEl.addEventListener('change', () => validateDateTime(true));
    timeEl.addEventListener('input', () => validateDateTime(true));
  }
  if (nameEl) nameEl.addEventListener('input', () => setFieldError('error-name', '', nameEl));
  if (phoneEl) phoneEl.addEventListener('input', () => setFieldError('error-phone', '', phoneEl));
  if (guestsEl) guestsEl.addEventListener('change', () => setFieldError('error-guests', '', guestsEl));
  if (typeEl) typeEl.addEventListener('input', () => setFieldError('error-reservationType', '', typeEl));

  // Helpers for WhatsApp message — reuse existing validation formats, keep internal YYYY-MM-DD
  const formatDateForWhatsApp = (isoDate) => {
    if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return isoDate || '';
    const [y, m, d] = isoDate.split('-');
    return `${d}/${m}/${y}`;
  };
  const formatTimeForWhatsApp = (time24) => {
    if (!time24 || !/^\d{1,2}:\d{2}$/.test(time24)) return time24 || '';
    const [hStr, mStr] = time24.split(':');
    let h = parseInt(hStr, 10);
    const m = mStr;
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    if (h === 0) h = 12;
    return `${String(h).padStart(2, '0')}:${m} ${ampm}`;
  };

  if (form && status) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const ok = validateForm();
      if (!ok) {
        status.textContent = '';
        return;
      }
      // Collect actual form values (before reset) for WhatsApp
      const reservationTypeText = typeEl && typeEl.options[typeEl.selectedIndex]
        ? typeEl.options[typeEl.selectedIndex].textContent.trim()
        : (typeEl ? typeEl.value : '');
      const nameVal = nameEl ? nameEl.value.trim() : '';
      const dateVal = dateEl ? dateEl.value : '';
      const timeVal = timeEl ? timeEl.value : '';
      const guestsVal = guestsEl && guestsEl.value ? guestsEl.value.trim() : '';
      const phoneVal = phoneEl ? phoneEl.value.trim() : '';
      const noteEl = form.querySelector('textarea[name="note"]');
      const noteVal = noteEl ? noteEl.value.trim() : '';

      const dateForMsg = formatDateForWhatsApp(dateVal);
      const timeForMsg = formatTimeForWhatsApp(timeVal);

      const lines = [
        'Hello AXIS Restaurant & Cafe,',
        '',
        'I would like to request a reservation.',
        '',
        `Reservation Type: ${reservationTypeText}`,
        `Name: ${nameVal}`,
        `Date: ${dateForMsg}`,
        `Time: ${timeForMsg}`,
        `Guests: ${guestsVal}`,
        `Phone: ${phoneVal}`,
      ];
      if (noteVal) lines.push(`Note: ${noteVal}`);
      lines.push('', 'Thank you.');
      const message = lines.join('\n');
      const whatsappUrl = 'https://wa.me/201063333165?text=' + encodeURIComponent(message);
      try { window.open(whatsappUrl, '_blank'); } catch (err) {}

      // Keep existing success behavior — request, not confirmed
      status.textContent = `Thanks ${nameVal || ''}. Your reservation request has been received — AXIS will confirm it shortly.`;
      gsap.fromTo(status, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.5 });
      form.reset();
      clearAllFieldErrors();
      // reset date to disabled state after successful submit — keep native date type
      if (dateEl) {
        dateEl.disabled = true;
        dateEl.removeAttribute('min');
        dateEl.value = '';
        dateEl.placeholder = 'Select a reservation type first';
        dateEl.setAttribute('lang', 'en-GB');
      }
      if (timeEl) timeEl.value = '';
      if (typeEl) typeEl.value = '';
    });
  }

  // Targeted UX fix — Date/Time picker opens on click anywhere inside input (no visual change)
  (() => {
    const candidates = [
      document.getElementById('dateInput'),
      document.getElementById('bookingDate'),
      document.getElementById('timeInput'),
      document.getElementById('bookingTime')
    ];
    // also cover generic form inputs in case IDs differ
    const formDate = form ? form.querySelector('input[type="date"], input[type="text"][name="date"]') : null;
    const formTime = form ? form.querySelector('input[type="time"]') : null;
    if (formDate && !candidates.includes(formDate)) candidates.push(formDate);
    if (formTime && !candidates.includes(formTime)) candidates.push(formTime);
    const seen = new Set();
    candidates.forEach((input) => {
      if (!input || seen.has(input)) return;
      seen.add(input);
      input.addEventListener('click', () => {
        if (input.disabled) return;
        // respect existing disabled/min/max and validation — do not bypass
        if (typeof input.showPicker !== 'function') return;
        try { input.showPicker(); } catch (e) {}
      });
    });
  })();

  // Magnetic buttons — cache rect, use rAF throttle, passive listeners.
  // One shared debounced scroll/resize listener invalidates cached rects
  // (re-read lazily on the next pointer interaction) instead of 2 listeners
  // per element — same visual effect, far less work while scrolling.
  const magStates = DOM.magneticEls.map((el) => ({ el, rect: el.getBoundingClientRect() }));
  const invalidateMagRects = debounce(() => {
    magStates.forEach((s) => { s.rect = null; });
  }, 200);
  window.addEventListener('resize', invalidateMagRects, { passive: true });
  window.addEventListener('scroll', invalidateMagRects, { passive: true });

  magStates.forEach((state) => {
    const el = state.el;
    let rafId = null;
    let lastX = 0;
    let lastY = 0;

    const apply = () => {
      rafId = null;
      if (!state.rect) return;
      gsap.to(el, {
        x: (lastX - state.rect.left - state.rect.width / 2) * 0.14,
        y: (lastY - state.rect.top - state.rect.height / 2) * 0.14,
        duration: 0.25,
        ease: 'power2.out',
        overwrite: true,
      });
    };

    el.addEventListener(
      'pointermove',
      (e) => {
        lastX = e.clientX;
        lastY = e.clientY;
        if (!state.rect) state.rect = el.getBoundingClientRect();
        if (rafId === null) rafId = requestAnimationFrame(apply);
      },
      { passive: true }
    );
    el.addEventListener(
      'pointerleave',
      () => {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = null;
        gsap.to(el, { x: 0, y: 0, duration: 0.5, ease: 'elastic.out(1,.45)' });
      },
      { passive: true }
    );
    el.addEventListener(
      'pointerenter',
      () => {
        state.rect = el.getBoundingClientRect();
      },
      { passive: true }
    );
  });

  // Mobile navigation — cached, no repeated queries
  const mobile = DOM.mobileMenu;
  const menuBtnEl = DOM.menuBtn;
  // TARGETED FIX: CSS translateY(-100%) is read by GSAP as y:-844 not yPercent.
  // Animating only yPercent left y offset -> menu stayed hidden while body locked.
  // Sync GSAP state: y:0 + yPercent:-100 gives correct hidden position without doubling.
  if (mobile) gsap.set(mobile, { y: 0, yPercent: -100 });
  const isMobileOpen = () => mobile && mobile.getAttribute('aria-hidden') === 'false';
  const openMobile = () => {
    if (!mobile) return;
    if (isMobileOpen()) return;
    gsap.killTweensOf(mobile);
    document.body.classList.add('menu-open');
    mobile.setAttribute('aria-hidden', 'false');
    if (menuBtnEl) menuBtnEl.setAttribute('aria-expanded', 'true');
    gsap.set(mobile, { visibility: 'visible' });
    gsap.to(mobile, { y: 0, yPercent: 0, duration: 0.8, ease: 'power4.inOut', overwrite: 'auto' });
    gsap.fromTo('.mobile-links a', { y: 70, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.08, duration: 0.6, ease: 'power3.out', delay: 0.25, overwrite: 'auto' });
  };
  const closeMobile = () => {
    if (!mobile) return;
    if (!isMobileOpen()) {
      gsap.killTweensOf(mobile);
      gsap.set(mobile, { y: 0, yPercent: -100, visibility: 'hidden' });
      // preserve scroll lock if modal still open
      if (!modal || !modal.classList.contains('open')) document.body.classList.remove('menu-open');
      mobile.setAttribute('aria-hidden', 'true');
      if (menuBtnEl) menuBtnEl.setAttribute('aria-expanded', 'false');
      return;
    }
    gsap.killTweensOf(mobile);
    gsap.to(mobile, {
      y: 0,
      yPercent: -100,
      duration: 0.7,
      ease: 'power4.inOut',
      overwrite: 'auto',
      onComplete: () => {
        gsap.set(mobile, { visibility: 'hidden' });
        if (!modal || !modal.classList.contains('open')) document.body.classList.remove('menu-open');
        mobile.setAttribute('aria-hidden', 'true');
        if (menuBtnEl) menuBtnEl.setAttribute('aria-expanded', 'false');
      },
    });
  };
  const toggleMobile = () => {
    if (isMobileOpen()) closeMobile();
    else openMobile();
  };
  if (menuBtnEl) menuBtnEl.addEventListener('click', toggleMobile, { passive: true });
  if (DOM.mobileClose) DOM.mobileClose.addEventListener('click', closeMobile, { passive: true });
  DOM.mobileLinks.forEach((a) => a.addEventListener('click', closeMobile, { passive: true }));

  // Keyboard — single listener, cached checks
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeMenu();
      closeMobile();
    }
    if (modal && modal.classList.contains('open')) {
      if (e.key === 'ArrowRight') openMenu((current + 1) % menuImgs.length);
      if (e.key === 'ArrowLeft') openMenu((current - 1 + menuImgs.length) % menuImgs.length);
    }
  });
});
