(() => {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const travelling = document.querySelector('.travelling');
  const frames = travelling ? Array.from(travelling.querySelectorAll('.frame')) : [];

  if (!frames.length || typeof gsap === 'undefined') {
    document.documentElement.classList.remove('js');
    return;
  }

  history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);

  const photos = frames.map((frame) => frame.querySelector('.frame-photo'));
  const captions = frames.map((frame) => frame.querySelector('.frame-caption'));
  const counterEl = frames[3] && frames[3].querySelector('.counter');

  // Repli : pas de mouvement demandé, ou ScrollTrigger indisponible (CDN en panne).
  // On n'ajoute jamais .is-active : les tableaux restent empilés dans le flux
  // normal, visibles d'emblée (voir CSS) — il suffit ici de figer le compteur.
  if (prefersReducedMotion || typeof ScrollTrigger === 'undefined') {
    if (counterEl) counterEl.textContent = counterEl.dataset.target;
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  travelling.classList.add('is-active');

  // Le temps du récit, en points de la distance de scroll épinglée (0 à 100).
  // 1973 → 2018 occupe à lui seul 42 points, largement plus que les 3 transitions
  // suivantes (6 points chacune) : c'est ce qui fait sentir les 45 ans qui séparent
  // l'ouverture du vote, plutôt qu'un simple raccord entre deux diapositives.
  const HOLDS = [
    [0, 34],   // 1973
    [42, 49],  // 2018 — le vote
    [55, 62],  // 2019–2020 — le chantier
    [68, 80],  // 2022 — l'inauguration
    [86, 100], // aujourd'hui — reste affiché jusqu'à la fin
  ];

  // onUpdate sur le timeline lui-même (pas sur le scrollTrigger) : avec
  // scrub:1, le timeline continue de rattraper sa position pendant ~1s
  // après l'arrêt du scroll, et c'est cette valeur-là (pas le scroll brut)
  // qui doit piloter le rail — sinon le label peut rester bloqué sur la
  // carte précédente pendant le rattrapage.
  const master = gsap.timeline({
    onUpdate: updateRail,
    scrollTrigger: {
      trigger: travelling,
      start: 'top top',
      end: '+=500%',
      pin: true,
      scrub: 1,
    },
  });

  // Poussée d'échelle continue sur toute la traversée : une seule caméra qui
  // avance dans le temps, plutôt qu'un zoom relancé à chaque tableau.
  master.fromTo(photos, { scale: 1 }, { scale: 1.12, duration: 100, ease: 'none' }, 0);

  // Fondu croisé entre un tableau et le suivant, sur la fenêtre qui sépare
  // la fin du palier de l'un du début du palier de l'autre. L'opacité porte
  // sur la carte entière (photo + dégradé + légende d'un coup, voir CSS) ;
  // seule la légende reçoit en plus un léger glissement vertical.
  function crossfade(outFrame, outCaption, inFrame, inCaption, start, duration) {
    master.to(outFrame, { opacity: 0, duration, ease: 'power2.in' }, start);
    master.to(outCaption, { y: -18, duration, ease: 'power2.in' }, start);
    master.fromTo(inFrame, { opacity: 0 }, { opacity: 1, duration, ease: 'power2.out' }, start);
    master.fromTo(inCaption, { y: 18 }, { y: 0, duration, ease: 'power2.out' }, start);
  }

  frames.forEach((frame, i) => {
    if (i === 0) return; // le 1er tableau est déjà visible au chargement (voir CSS)
    const [, prevHoldEnd] = HOLDS[i - 1];
    const [holdStart] = HOLDS[i];
    crossfade(frames[i - 1], captions[i - 1], frame, captions[i], prevHoldEnd, holdStart - prevHoldEnd);
  });

  // Le compteur, dans le palier de la carte 2022.
  if (counterEl) {
    const target = parseInt(counterEl.dataset.target, 10);
    const proxy = { val: 0 };
    master.to(
      proxy,
      {
        val: target,
        duration: 6,
        ease: 'power1.out',
        snap: { val: 1 },
        onUpdate: () => {
          counterEl.textContent = Math.round(proxy.val);
        },
      },
      70
    );
  }

  // Repères d'années qui dérivent lentement, espacés dans le long palier 1973
  // (5-32 sur 34 points) pour rendre le temps qui passe sensible.
  const driftMarks = Array.from(document.querySelectorAll('.year-drift-mark'));
  const driftWindows = [
    [5, 11],
    [12, 18],
    [19, 25],
    [26, 32],
  ];
  driftMarks.forEach((mark, i) => {
    const range = driftWindows[i];
    if (!range) return;
    const [start, end] = range;
    const half = (end - start) / 2;
    master
      .fromTo(mark, { opacity: 0, y: 16 }, { opacity: 0.45, y: 0, duration: half, ease: 'power1.inOut' }, start)
      .to(mark, { opacity: 0, y: -16, duration: half, ease: 'power1.inOut' }, start + half);
  });

  // Repère de progression fixe (remplace l'ancienne nav à points) : la position
  // suit l'avancement du scroll, le label reprend le data-year du tableau le
  // plus visible à l'instant — jamais une année interpolée/inventée.
  const railMarker = document.querySelector('.timeline-rail-marker');
  const railYear = document.querySelector('.timeline-rail-year');

  function updateRail() {
    const percent = master.progress() * 100 + '%';
    if (railMarker) railMarker.style.top = percent;
    if (railYear) railYear.style.top = percent;
    if (!railYear) return;

    let visible = frames[0];
    let bestOpacity = -1;
    frames.forEach((frame) => {
      const opacity = gsap.getProperty(frame, 'opacity');
      if (opacity > bestOpacity) {
        bestOpacity = opacity;
        visible = frame;
      }
    });
    railYear.textContent = visible.dataset.year;
  }
})();
