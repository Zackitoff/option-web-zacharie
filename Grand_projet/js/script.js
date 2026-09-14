(() => {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const sections = Array.from(document.querySelectorAll('.chapter'));

  if (!sections.length || typeof gsap === 'undefined') {
    document.documentElement.classList.remove('js');
    return;
  }

  history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);

  // ---------- Un timeline créatif par chapitre ----------
  function buildTimeline(section) {
    const tl = gsap.timeline({ paused: true });
    const bg = section.querySelector('.chapter-bg');
    const title = section.querySelector('.chapter-title');
    const text = section.querySelector('.chapter-text');
    const kicker = section.querySelector('.chapter-kicker');

    // Léger effet Ken Burns sur toutes les photos plein écran.
    if (bg) {
      tl.fromTo(bg, { scale: 1.12 }, { scale: 1, duration: 2, ease: 'power2.out' }, 0);
    }

    if (section.classList.contains('chapter--1')) {
      // La photo "se révèle" comme un vieux tirage qui apparaît.
      tl.fromTo(
        bg,
        { filter: 'sepia(1) saturate(0.3) contrast(0.85) brightness(0.75)' },
        { filter: 'sepia(0.55) saturate(0.7) contrast(1.05) brightness(0.95)', duration: 2.2, ease: 'power2.out' },
        0
      );
      tl.fromTo(title, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out' }, 0.35);
      if (text) tl.fromTo(text, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' }, 0.6);
    } else if (section.classList.contains('chapter--2')) {
      // "2×OUI" tombe comme un tampon qui valide le vote.
      if (kicker) tl.fromTo(kicker, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }, 0.3);
      tl.fromTo(
        title,
        { opacity: 0, scale: 2.4, rotate: -3 },
        { opacity: 1, scale: 1, rotate: 0, duration: 0.65, ease: 'back.out(2.6)' },
        0.65
      );
      if (text) tl.fromTo(text, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }, 1.05);
    } else if (section.classList.contains('chapter--compare')) {
      // Les deux photos s'ouvrent comme un rideau, depuis les bords vers le centre.
      const introTitle = section.querySelector('.chapter-intro .chapter-title');
      const introText = section.querySelector('.chapter-intro .chapter-text');
      const items = section.querySelectorAll('.compare-item');

      if (introTitle) tl.fromTo(introTitle, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' }, 0.1);
      if (introText) tl.fromTo(introText, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }, 0.3);
      if (items[0]) {
        tl.fromTo(
          items[0],
          { opacity: 1, clipPath: 'inset(0 100% 0 0)' },
          { opacity: 1, clipPath: 'inset(0 0% 0 0)', duration: 0.9, ease: 'power3.inOut' },
          0.55
        );
      }
      if (items[1]) {
        tl.fromTo(
          items[1],
          { opacity: 1, clipPath: 'inset(0 0 0 100%)' },
          { opacity: 1, clipPath: 'inset(0 0 0 0%)', duration: 0.9, ease: 'power3.inOut' },
          0.55
        );
      }
    } else if (section.classList.contains('chapter--4')) {
      tl.fromTo(title, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }, 0.3);

      const counterEl = section.querySelector('.counter');
      if (counterEl) {
        const target = parseInt(counterEl.dataset.target, 10);
        const proxy = { val: 0 };
        counterEl.textContent = '0';
        tl.to(
          proxy,
          {
            val: target,
            duration: 1.5,
            ease: 'power2.out',
            snap: { val: 1 },
            onUpdate: () => {
              counterEl.textContent = Math.round(proxy.val);
            },
          },
          0.5
        );
      }
      if (text) tl.fromTo(text, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }, 1);
    } else if (section.classList.contains('chapter--5')) {
      tl.fromTo(title, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }, 0.4);
      if (text) tl.fromTo(text, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' }, 0.65);
    }

    return tl;
  }

  const timelines = sections.map(buildTimeline);

  if (prefersReducedMotion) {
    // Pas de capture du scroll, pas d'animation : tout est affiché directement,
    // la page redevient une longue page qui défile normalement.
    timelines.forEach((tl) => tl.progress(1));
    return;
  }

  // ---------- Pagination : un scroll/geste = un chapitre ----------
  // Un arrêt de plus que le nombre de chapitres : le dernier arrêt (index === sections.length)
  // représente le bas de page (pied de page / crédits), pour qu'il reste atteignable.
  const lastIndex = sections.length;
  let currentIndex = 0;
  let isAnimating = false;

  function targetY(index) {
    if (index >= sections.length) {
      return document.documentElement.scrollHeight - window.innerHeight;
    }
    return sections[index].offsetTop;
  }

  function playChapter(index) {
    if (index < timelines.length) timelines[index].restart();
  }

  function goTo(index) {
    index = Math.max(0, Math.min(lastIndex, index));
    if (index === currentIndex || isAnimating) return;

    isAnimating = true;
    currentIndex = index;

    const proxy = { y: window.scrollY };
    gsap.to(proxy, {
      y: targetY(index),
      duration: 0.9,
      ease: 'power2.inOut',
      onUpdate: () => window.scrollTo(0, proxy.y),
      onComplete: () => {
        isAnimating = false;
      },
    });

    playChapter(index);
  }

  playChapter(0);

  window.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      if (isAnimating) return;
      goTo(currentIndex + (e.deltaY > 0 ? 1 : -1));
    },
    { passive: false }
  );

  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {
      e.preventDefault();
      if (!isAnimating) goTo(currentIndex + 1);
    } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
      e.preventDefault();
      if (!isAnimating) goTo(currentIndex - 1);
    } else if (e.key === 'Home') {
      e.preventDefault();
      if (!isAnimating) goTo(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      if (!isAnimating) goTo(lastIndex);
    }
  });

  let touchStartY = null;

  window.addEventListener(
    'touchstart',
    (e) => {
      touchStartY = e.touches[0].clientY;
    },
    { passive: true }
  );

  window.addEventListener(
    'touchmove',
    (e) => {
      e.preventDefault();
    },
    { passive: false }
  );

  window.addEventListener('touchend', (e) => {
    if (touchStartY === null || isAnimating) return;
    const delta = touchStartY - e.changedTouches[0].clientY;
    touchStartY = null;
    if (Math.abs(delta) < 50) return;
    goTo(currentIndex + (delta > 0 ? 1 : -1));
  });

  window.addEventListener('resize', () => {
    if (!isAnimating) window.scrollTo(0, targetY(currentIndex));
  });
})();
