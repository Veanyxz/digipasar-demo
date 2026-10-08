/* ============================================================
   DigiPasar — layer gerak: 3D tilt, parallax hero, reveal scroll
   Semua dimatikan otomatis jika prefers-reduced-motion.
   ============================================================ */
(function () {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = window.matchMedia('(pointer: fine)').matches;

  /* ---------- 1. Reveal on scroll ---------- */
  function initReveal() {
    const targets = document.querySelectorAll(
      '.p-card, .cat-card, .feature, .stat-card, .order-card, .card, .hero h1, .hero-sub, .hero-pill, .section-title, .steps, .marquee'
    );
    if (reduce || !('IntersectionObserver' in window)) {
      targets.forEach(t => t.classList.add('in'));
      return;
    }
    let ioFired = false;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e, i) => {
        if (e.isIntersecting) {
          ioFired = true;
          const el = e.target;
          // stagger: elemen dalam grid masuk berurutan
          const delay = (Array.prototype.indexOf.call(el.parentNode.children, el) % 8) * 55;
          setTimeout(() => el.classList.add('in'), delay);
          io.unobserve(el);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    // jaring pengaman: kalau IO/raf tak pernah fire (window hidden/throttled),
    // jangan biarkan konten tersembunyi selamanya
    setTimeout(() => {
      if (ioFired) return;
      document.querySelectorAll('.reveal:not(.in)').forEach(el => el.classList.add('in'));
    }, 2500);
    targets.forEach(t => {
      if (t.classList.contains('in')) return;
      // beri state awal tersembunyi dulu supaya transisi `.reveal.in` jalan
      t.classList.add('reveal');
      io.observe(t);
    });
  }

  /* ---------- 2. 3D tilt pada kartu ---------- */
  function initTilt() {
    if (reduce || !fine) return;
    const MAX = 9; // derajat
    document.addEventListener('pointermove', (e) => {
      const card = e.target.closest && e.target.closest('.p-card, .feature, .stat-card, .cat-card');
      if (!card) return;
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform =
        `perspective(700px) rotateX(${(-py * MAX).toFixed(2)}deg) rotateY(${(px * MAX).toFixed(2)}deg) translateY(-4px)`;
      card.style.transition = 'transform .08s ease-out, box-shadow .18s ease';
    }, { passive: true });
    document.addEventListener('pointerout', (e) => {
      const card = e.target.closest && e.target.closest('.p-card, .feature, .stat-card, .cat-card');
      if (!card) return;
      const to = e.relatedTarget && e.relatedTarget.closest ? e.relatedTarget.closest('.p-card, .feature, .stat-card, .cat-card') : null;
      if (to === card) return;
      card.style.transition = 'transform .35s cubic-bezier(.34,1.56,.64,1), box-shadow .18s ease';
      card.style.transform = '';
    }, { passive: true });
  }

  /* ---------- 3. Parallax dekorasi hero ---------- */
  function initParallax() {
    if (reduce || !fine) return;
    const hero = document.querySelector('.hero');
    if (!hero) return;
    const decos = hero.querySelectorAll('.deco');
    const inner = hero.querySelector('.hero-inner');
    let raf = null;
    hero.addEventListener('pointermove', (e) => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        const r = hero.getBoundingClientRect();
        const dx = (e.clientX - r.left) / r.width - 0.5;
        const dy = (e.clientY - r.top) / r.height - 0.5;
        decos.forEach((d, i) => {
          const depth = (i % 3 + 1) * 14;
          d.style.marginLeft = (-dx * depth).toFixed(1) + 'px';
          d.style.marginTop = (-dy * depth).toFixed(1) + 'px';
        });
        if (inner) inner.style.transform = `translate(${(dx * 8).toFixed(1)}px, ${(dy * 6).toFixed(1)}px)`;
        raf = null;
      });
    }, { passive: true });
    hero.addEventListener('pointerleave', () => {
      decos.forEach(d => { d.style.marginLeft = ''; d.style.marginTop = ''; d.style.transition = 'margin .4s ease'; });
      if (inner) { inner.style.transition = 'transform .4s ease'; inner.style.transform = ''; }
    }, { passive: true });
  }

  /* ---------- 4. Magnetic (tekan) pada tombol utama ---------- */
  function initMagnet() {
    if (reduce || !fine) return;
    document.addEventListener('pointerover', (e) => {
      const b = e.target.closest && e.target.closest('.btn-lg, .hero-pill');
      if (b && !b.dataset.mag) {
        b.dataset.mag = '1';
        b.style.transition = 'transform .18s cubic-bezier(.34,1.56,.64,1), box-shadow .15s ease';
      }
    }, { passive: true });
  }

  function boot() {
    initReveal();
    initTilt();
    initParallax();
    initMagnet();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
  // Kartu sering dirender setelah fetch — pantau DOM baru.
  if ('MutationObserver' in window) {
    const mo = new MutationObserver(() => {
      // reveal untuk node baru; jalan sekali per burst
      clearTimeout(mo._t);
      mo._t = setTimeout(initReveal, 60);
    });
    mo.observe(document.body, { childList: true, subtree: true });
  }
})();
