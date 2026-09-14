(() => {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const sections = Array.from(document.querySelectorAll('.chapter'));

  if (!sections.length || typeof gsap === 'undefined') {
    document.documentElement.classList.remove('js');
    return;
  }

  history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);

  // ---------- Points de navigation (fonctionnent aussi sans JS : ce sont de vrais liens) ----------
  const navDots = Array.from(document.querySelectorAll('.chapter-dot'));

  function setActiveDot(index) {
    const clamped = Math.max(0, Math.min(navDots.length - 1, index));
    navDots.forEach((dot, i) => dot.classList.toggle('is-active', i === clamped));
  }

  // ---------- Son, synthétisé (aucun fichier audio requis), coupé par défaut ----------
  const soundToggle = document.getElementById('sound-toggle');
  let audioCtx = null;
  let soundEnabled = false;
  try {
    soundEnabled = localStorage.getItem('soundEnabled') === 'true';
  } catch (e) {
    /* stockage indisponible (navigation privée, etc.) : on reste coupé */
  }

  function ensureAudioContext() {
    if (!audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      audioCtx = new Ctx();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }

  function playWhoosh() {
    if (!soundEnabled) return;
    const ctx = ensureAudioContext();
    if (!ctx) return;

    // Bruit blanc passé dans un passe-bas qui descend vite : swoosh court et doux,
    // sans les fréquences aiguës qui rendaient l'ancienne version stridente.
    const duration = 0.22;
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * duration), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 0.3;
    filter.frequency.setValueAtTime(3000, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + duration);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.16, ctx.currentTime + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

    noise.connect(filter).connect(gain).connect(ctx.destination);
    noise.start();
    noise.stop(ctx.currentTime + duration);
  }

  function playTick() {
    if (!soundEnabled) return;
    const ctx = ensureAudioContext();
    if (!ctx) return;

    // Fréquence fixe (pas de glissando) : un tap net plutôt qu'un "boing" de dessin animé.
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, ctx.currentTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.22, ctx.currentTime + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.12);

    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.13);
  }

  function updateSoundToggle() {
    if (!soundToggle) return;
    soundToggle.textContent = soundEnabled ? '🔊' : '🔇';
    soundToggle.setAttribute('aria-pressed', String(soundEnabled));
    soundToggle.setAttribute('aria-label', soundEnabled ? 'Couper le son' : 'Activer le son');
  }

  if (soundToggle) {
    updateSoundToggle();
    soundToggle.addEventListener('click', () => {
      soundEnabled = !soundEnabled;
      updateSoundToggle();
      try {
        localStorage.setItem('soundEnabled', String(soundEnabled));
      } catch (e) {
        /* tant pis, la préférence ne survivra pas à cette visite */
      }
      if (soundEnabled) ensureAudioContext();
    });
  }

  // ---------- Chapitre 3 : panneau incliné qui balaie chaque photo ----------
  function buildWipePanel(item, side) {
    const panel = document.createElement('div');
    panel.className = 'wipe-panel wipe-panel--' + side;
    panel.setAttribute('aria-hidden', 'true');
    item.appendChild(panel);
    return panel;
  }

  // ---------- Titres "éclatés" mot par mot pour une révélation cinétique ----------
  // Le conteneur est caché en CSS (.js ... { opacity: 0 }) le temps que ce script tourne,
  // pour éviter un flash du texte plein avant qu'il ne soit découpé en mots.
  function splitWords(el) {
    const text = el.textContent;
    el.textContent = '';
    const words = [];
    text.split(/(\s+)/).forEach((part) => {
      if (part.trim() === '') {
        if (part) el.appendChild(document.createTextNode(part));
      } else {
        const span = document.createElement('span');
        span.className = 'word';
        span.textContent = part;
        el.appendChild(span);
        words.push(span);
      }
    });
    el.style.opacity = '1';
    return words;
  }

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
      // La photo "se révèle" comme un vieux tirage ; l'année claque en grand,
      // puis le reste du titre s'assemble mot par mot.
      const mark = section.querySelector('.title-mark');
      const year = section.querySelector('.chapter-year');
      const titleLine = section.querySelector('.chapter-title-line');
      const words = titleLine ? splitWords(titleLine) : [];

      tl.fromTo(
        bg,
        { filter: 'sepia(1) saturate(0.3) contrast(0.85) brightness(0.75)' },
        { filter: 'sepia(0.55) saturate(0.7) contrast(1.05) brightness(0.95)', duration: 2.2, ease: 'power2.out' },
        0
      );
      if (mark) tl.fromTo(mark, { scaleX: 0 }, { scaleX: 1, duration: 0.5, ease: 'power3.out' }, 0.2);
      if (year) {
        tl.fromTo(
          year,
          { opacity: 0, y: 30, scale: 1.4 },
          { opacity: 1, y: 0, scale: 1, duration: 0.8, ease: 'back.out(1.7)' },
          0.35
        );
      }
      if (words.length) {
        tl.fromTo(words, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.55, ease: 'power3.out', stagger: 0.07 }, 0.8);
      }
      if (text) tl.fromTo(text, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' }, 1.25);
    } else if (section.classList.contains('chapter--2')) {
      // "2×OUI" tombe comme un tampon qui valide le vote.
      const mark = section.querySelector('.title-mark');
      if (mark) tl.fromTo(mark, { scaleX: 0 }, { scaleX: 1, duration: 0.4, ease: 'power3.out' }, 0.15);
      if (kicker) tl.fromTo(kicker, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }, 0.3);
      tl.fromTo(
        title,
        { opacity: 0, scale: 2.4, rotate: -3 },
        { opacity: 1, scale: 1, rotate: 0, duration: 0.65, ease: 'back.out(2.6)' },
        0.65
      );
      tl.call(playTick, null, 1.3);
      if (text) tl.fromTo(text, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }, 1.05);
    } else if (section.classList.contains('chapter--compare')) {
      // Chaque photo est révélée par un panneau incliné qui se retire comme une lame,
      // un fin trait lumineux (accent) traçant son bord ; la photo se pose derrière
      // avec un léger effet de recul. Les deux panneaux s'ouvrent vers l'extérieur.
      const mark = section.querySelector('.title-mark');
      const introTitle = section.querySelector('.chapter-intro .chapter-title');
      const introText = section.querySelector('.chapter-intro .chapter-text');
      const items = section.querySelectorAll('.compare-item');
      const introWords = introTitle ? splitWords(introTitle) : [];

      if (mark) tl.fromTo(mark, { scaleX: 0 }, { scaleX: 1, duration: 0.45, ease: 'power3.out' }, 0);
      if (introWords.length) {
        tl.fromTo(introWords, { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out', stagger: 0.05 }, 0.15);
      }
      if (introText) tl.fromTo(introText, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }, 0.5);

      items.forEach((item, i) => {
        const side = i === 0 ? 'left' : 'right';
        const panel = buildWipePanel(item, side);
        const img = item.querySelector('img');
        const caption = item.querySelector('figcaption');
        const startAt = 0.65 + i * 0.25;
        const exitXPercent = side === 'left' ? -130 : 130;

        tl.fromTo(
          panel,
          { xPercent: 0, skewX: -14 },
          { xPercent: exitXPercent, skewX: -14, duration: 0.95, ease: 'power3.inOut' },
          startAt
        );

        if (img) {
          tl.fromTo(img, { scale: 1.15 }, { scale: 1, duration: 1.1, ease: 'power2.out' }, startAt);
        }

        if (caption) {
          tl.fromTo(
            caption,
            { opacity: 0, scale: 0 },
            { opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(3)' },
            startAt + 0.75
          );
        }
      });
    } else if (section.classList.contains('chapter--4')) {
      // Le chiffre compte comme un tableau d'affichage, puis "tape" à l'arrivée.
      const mark = section.querySelector('.title-mark');
      const statNumber = section.querySelector('.stat-number');
      const statLabel = section.querySelector('.stat-label');
      const statBarFill = section.querySelector('.stat-bar-fill');

      if (mark) tl.fromTo(mark, { scaleX: 0 }, { scaleX: 1, duration: 0.4, ease: 'power3.out' }, 0.15);
      if (statNumber) tl.fromTo(statNumber, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' }, 0.3);
      if (statLabel) tl.fromTo(statLabel, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' }, 0.5);

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
          0.6
        );

        // La barre se remplit exactement au même rythme que le chiffre compte.
        if (statBarFill) {
          tl.fromTo(statBarFill, { scaleX: 0 }, { scaleX: 1, duration: 1.5, ease: 'power2.out' }, 0.6);
        }

        if (statNumber) {
          tl.to(statNumber, { scale: 1.1, duration: 0.14, ease: 'power1.out' }, 2.1);
          tl.to(statNumber, { scale: 1, duration: 0.3, ease: 'power2.out' }, 2.24);
        }
        tl.call(playTick, null, 2.1);
      }
      if (text) tl.fromTo(text, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }, 1.1);
    } else if (section.classList.contains('chapter--5')) {
      const mark = section.querySelector('.title-mark');
      const words = title ? splitWords(title) : [];

      if (mark) tl.fromTo(mark, { scaleX: 0 }, { scaleX: 1, duration: 0.5, ease: 'power3.out' }, 0.2);
      if (words.length) {
        tl.fromTo(words, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out', stagger: 0.06 }, 0.4);
      }
      if (text) tl.fromTo(text, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' }, 0.95);
    }

    return tl;
  }

  const timelines = sections.map(buildTimeline);

  if (prefersReducedMotion) {
    // Pas de capture du scroll, pas d'animation : tout est affiché directement,
    // la page redevient une longue page qui défile normalement.
    timelines.forEach((tl) => tl.progress(1));

    // La navigation par points reste utile même ici : simple ancrage fluide,
    // et un observateur suit le scroll naturel pour savoir quel point éclairer.
    navDots.forEach((dot, i) => {
      dot.addEventListener('click', (e) => {
        e.preventDefault();
        playWhoosh();
        sections[i].scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });

    if ('IntersectionObserver' in window) {
      const dotObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) setActiveDot(sections.indexOf(entry.target));
          });
        },
        { threshold: 0.6 }
      );
      sections.forEach((s) => dotObserver.observe(s));
    }
    setActiveDot(0);
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
    setActiveDot(index);
    playWhoosh();

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

  navDots.forEach((dot, i) => {
    dot.addEventListener('click', (e) => {
      e.preventDefault();
      if (!isAnimating) goTo(i);
    });
  });

  setActiveDot(0);
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
