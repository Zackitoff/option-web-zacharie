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

  const counterEl = document.querySelector('.counter');

  // Repli : pas de mouvement demandé, ou ScrollTrigger indisponible (CDN en panne).
  // On n'ajoute jamais .is-active : les tableaux restent empilés dans le flux
  // normal, visibles d'emblée (voir CSS) — il suffit ici de figer le compteur.
  if (prefersReducedMotion || typeof ScrollTrigger === 'undefined') {
    if (counterEl) counterEl.textContent = counterEl.dataset.target;
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  travelling.classList.add('is-active');

  // Les tableaux, dans l'ordre du HTML (1973 et 2018 n'ont rien de particulier).
  const [, , fChantier, fFinale, fArena, fToday] = frames;
  const photos = frames.map((frame) => frame.querySelector('.frame-photo'));
  const captions = frames.map((frame) => frame.querySelector('.frame-caption'));

  // Le chapitre du chantier : des photos empilées, des engins qui passent.
  const chantierStage = fChantier.querySelector('.chantier-photos');
  const layers = Array.from(fChantier.querySelectorAll('.chantier-layer'));
  const engins = Array.from(fChantier.querySelectorAll('.chantier-engin'));
  const ouvrier = fChantier.querySelector('.chantier-ouvrier');

  // Le chapitre de la finale : des "temps" dont le rythme est réglé dans le HTML
  // (data-from : apparaît, data-to : disparaît, data-reveal : la photo s'allume).
  const finaleSteps = Array.from(fFinale.querySelectorAll('[data-from], [data-to]'));
  const finalePhoto = fFinale.querySelector('.frame-photo');
  const finaleLayers = Array.from(finalePhoto.querySelectorAll('[data-at]')); // photos qui recouvrent la précédente

  // ---------- Le temps du récit ----------
  // On compte en "unités" : 1 unité = 5 % de la hauteur de l'écran de scroll épinglé
  // (SCROLL_PER_UNIT). 1973 → 2018 occupe 42 unités à lui seul (34 + 8 de fondu), bien
  // plus que les autres transitions (6 chacune) : c'est ce qui fait sentir les 45 ans
  // qui les séparent, plutôt qu'un simple raccord entre deux diapositives.
  const SCROLL_PER_UNIT = 5;
  const FADE = 2; // durée d'une apparition ou d'une disparition de texte

  // Le chapitre du chantier s'allonge tout seul avec le nombre d'engins :
  // une petite pause au début, puis par engin un passage + un temps de pose, puis la fin.
  const PASS = 15; // un engin traverse l'écran
  const REST = 4; // la photo révélée reste seule à l'écran
  const INTRO = 3;
  const OUTRO = 4;
  const chantierLength = INTRO + engins.length * (PASS + REST) + OUTRO;

  // Celui de la finale dure jusqu'à son dernier repère, plus une pause de lecture.
  const lastFinaleStep = Math.max(
    ...finaleSteps.map((el) => Number(el.dataset.to ?? el.dataset.from)),
    ...finaleLayers.map((el) => Number(el.dataset.at)),
    Number(finalePhoto.dataset.reveal)
  );
  const finaleLength = lastFinaleStep + 6;

  const HOLD_LENGTH = [34, 7, chantierLength, finaleLength, 12, 14]; // temps où chaque tableau reste affiché
  const FADE_BEFORE = [0, 8, 6, 6, 6, 6]; // fondu croisé qui y mène

  // HOLDS[i] = [début, fin] du palier du tableau i, en unités.
  const HOLDS = [];
  let cursor = 0;
  HOLD_LENGTH.forEach((length, i) => {
    cursor += FADE_BEFORE[i];
    HOLDS.push([cursor, cursor + length]);
    cursor += length;
  });
  const TOTAL = cursor;
  const holdOf = (frame) => HOLDS[frames.indexOf(frame)];

  // onUpdate sur la timeline elle-même (pas sur le scrollTrigger) : avec
  // scrub:1, la timeline continue de rattraper sa position pendant ~1s
  // après l'arrêt du scroll, et c'est cette valeur-là (pas le scroll brut)
  // qui doit piloter le rail — sinon le label peut rester bloqué sur la
  // carte précédente pendant le rattrapage.
  // invalidateOnRefresh : les valeurs "en fonction" (largeur des engins, voir
  // addPass) sont recalculées quand la fenêtre change de taille.
  const master = gsap.timeline({
    onUpdate: updateRail,
    scrollTrigger: {
      trigger: travelling,
      start: 'top top',
      end: `+=${TOTAL * SCROLL_PER_UNIT}%`,
      pin: true,
      scrub: 1,
      invalidateOnRefresh: true,
    },
  });

  // ---------- Le son ----------
  // Des bruitages synthétisés (Web Audio : aucun fichier). Les navigateurs interdisent de
  // jouer un son avant un geste du visiteur : le son reste donc coupé jusqu'à un clic sur
  // le bouton, et son choix est mémorisé. La timeline déclenche les sons avec master.call().
  let audioCtx = null;
  let noiseBuffer = null;
  let soundOn = false;
  try {
    soundOn = localStorage.getItem('voyeboeuf-son') === 'on';
  } catch (e) {}

  const soundButton = document.createElement('button');
  soundButton.type = 'button';
  soundButton.className = 'sound-toggle';
  document.body.appendChild(soundButton);

  function renderSoundButton() {
    soundButton.setAttribute('aria-pressed', String(soundOn));
    soundButton.textContent = soundOn ? '♪ Son activé' : '♪ Son coupé';
  }

  function ensureAudio() {
    if (audioCtx) return true;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return false;
    audioCtx = new AudioContext();
    noiseBuffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 2, audioCtx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return true;
  }

  // Un son = une source (bruit ou oscillateur) qui passe par un gain à enveloppe courte.
  function envelope(gain, peak, attack, length) {
    const now = audioCtx.currentTime;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(peak, now + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + length);
  }

  function noise(filterType, from, to, peak, attack, length) {
    const source = audioCtx.createBufferSource();
    source.buffer = noiseBuffer;
    const filter = audioCtx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.setValueAtTime(from, audioCtx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(to, audioCtx.currentTime + length);
    const gain = audioCtx.createGain();
    envelope(gain, peak, attack, length);
    source.connect(filter).connect(gain).connect(audioCtx.destination);
    source.start();
    source.stop(audioCtx.currentTime + length);
  }

  function tone(type, frequency, peak, attack, length) {
    const osc = audioCtx.createOscillator();
    osc.type = type;
    osc.frequency.value = frequency;
    const gain = audioCtx.createGain();
    envelope(gain, peak, attack, length);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + length);
  }

  const lastPlayed = {};
  function play(name, action) {
    if (!soundOn || !audioCtx) return;
    const now = performance.now();
    if (now - (lastPlayed[name] || 0) < 150) return; // le scrub peut franchir plusieurs repères d'un coup
    lastPlayed[name] = now;
    action();
  }

  const sound = {
    whoosh: () => play('whoosh', () => noise('bandpass', 300, 2200, 0.35, 0.25, 0.7)), // changement de chapitre
    tick: () => play('tick', () => tone('square', 1400, 0.04, 0.003, 0.04)), // compteur
    rumble: () => play('rumble', () => noise('lowpass', 260, 90, 0.5, 0.3, 1.6)), // un engin passe
    whistle: () =>
      play('whistle', () => {
        tone('sine', 2900, 0.18, 0.02, 0.35); // le coup de sifflet final, deux fois
        setTimeout(() => soundOn && tone('sine', 2900, 0.18, 0.02, 0.6), 450);
      }),
  };

  soundButton.addEventListener('click', () => {
    soundOn = !soundOn;
    if (soundOn && !ensureAudio()) soundOn = false;
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    try {
      localStorage.setItem('voyeboeuf-son', soundOn ? 'on' : 'off');
    } catch (e) {}
    renderSoundButton();
    if (soundOn) sound.whoosh();
  });
  // Choix mémorisé "activé" : le contexte audio ne démarre qu'au premier geste du visiteur.
  if (soundOn) {
    const unlock = () => {
      if (ensureAudio()) audioCtx.resume();
    };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    window.addEventListener('wheel', unlock, { once: true, passive: true });
  }
  renderSoundButton();

  // Poussée d'échelle continue sur toute la traversée : une seule caméra qui
  // avance dans le temps, plutôt qu'un zoom relancé à chaque tableau.
  master.fromTo(photos, { scale: 1 }, { scale: 1.12, duration: TOTAL, ease: 'none' }, 0);

  // Fondu croisé entre un tableau et le suivant, sur la fenêtre qui sépare
  // la fin du palier de l'un du début du palier de l'autre. L'opacité porte
  // sur la carte entière (photo + dégradé + légende d'un coup, voir CSS) ;
  // seule la légende reçoit en plus un léger glissement vertical.
  function crossfade(outFrame, outCaption, inFrame, inCaption, start, duration) {
    master.call(sound.whoosh, null, start);
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

  // Le bouton du dernier tableau n'apparaît — donc n'est cliquable — qu'avec son tableau.
  // (autoAlpha = opacity + visibility:hidden à 0.)
  const actions = fToday.querySelector('.frame-actions');
  if (actions) {
    const [, prevHoldEnd] = HOLDS[frames.indexOf(fToday) - 1];
    const [holdStart] = holdOf(fToday);
    master.fromTo(actions, { autoAlpha: 0 }, { autoAlpha: 1, duration: holdStart - prevHoldEnd, ease: 'power2.out' }, prevHoldEnd);
  }

  // ---------- Chapitre du chantier ----------
  // Un passage : l'engin traverse la scène de droite à gauche (translation en x, depuis
  // left:100% en CSS jusqu'à sortir tout à fait à gauche). Pendant ce temps, le bord du
  // masque de la photo suivante (--edge, en px) parcourt exactement le même chemin,
  // accroché au point `anchor` de l'engin : devant lui l'ancienne photo, derrière lui
  // la nouvelle. Les deux tweens ont la même durée et un ease linéaire, donc le bord
  // reste collé à l'engin à chaque instant.
  function addPass(engin, nextLayer, start, duration) {
    const anchor = Number(engin.dataset.anchor);
    const stageWidth = () => chantierStage.offsetWidth;
    const enginWidth = () => engin.offsetWidth;

    master.call(sound.rumble, null, start);
    master.fromTo(engin, { x: 0 }, { x: () => -(stageWidth() + enginWidth()), duration, ease: 'none' }, start);
    master.fromTo(
      nextLayer,
      { '--edge': () => stageWidth() + anchor * enginWidth() },
      { '--edge': () => -(1 - anchor) * enginWidth(), duration, ease: 'none' },
      start
    );
  }

  const [chantierStart] = holdOf(fChantier);
  const passStart = (i) => chantierStart + INTRO + i * (PASS + REST);

  engins.forEach((engin, i) => {
    const nextLayer = layers[i + 1]; // l'engin n°i révèle la couche n°i+1
    if (nextLayer) addPass(engin, nextLayer, passStart(i), PASS);
  });

  // L'ouvrier surgit du bord bas de l'écran pendant la pause qui suit le dernier passage.
  if (ouvrier) {
    master.fromTo(ouvrier, { yPercent: 105 }, { yPercent: 0, duration: REST, ease: 'power2.out' }, passStart(engins.length) - REST);
  }

  // ---------- Chapitre de la finale 2020 ----------
  // Chaque élément repéré par data-from apparaît à cette unité (comptée depuis le début du
  // palier de la carte), et disparaît à data-to s'il en a un. Rien d'autre à retoucher
  // ici pour changer le rythme : tout est dans le HTML.
  const [finaleStart] = holdOf(fFinale);

  finaleSteps.forEach((el) => {
    if (el.dataset.from !== undefined) {
      master.fromTo(el, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: FADE, ease: 'power2.out' }, finaleStart + Number(el.dataset.from));
    }
    if (el.dataset.to !== undefined) {
      master.to(el, { opacity: 0, y: -14, duration: FADE, ease: 'power2.in' }, finaleStart + Number(el.dataset.to));
    }
  });

  // Le coup de sifflet final : les photos "s'allument", comme les projecteurs de la patinoire…
  master.fromTo(
    finalePhoto,
    { opacity: 0, filter: 'brightness(0.2)' },
    { opacity: 1, filter: 'brightness(1)', duration: 6, ease: 'power2.out' },
    finaleStart + Number(finalePhoto.dataset.reveal)
  );

  master.call(sound.whistle, null, finaleStart + Number(finalePhoto.dataset.reveal));

  // …puis s'enchaînent : chaque photo qui a un data-at recouvre la précédente en fondu.
  finaleLayers.forEach((layer) => {
    master.fromTo(layer, { opacity: 0 }, { opacity: 1, duration: 5, ease: 'power1.inOut' }, finaleStart + Number(layer.dataset.at));
  });

  // L'enfant du sponsor tremblait… ou pas : le mot "tremble" est secoué quand sa réplique arrive.
  const tremble = fFinale.querySelector('.finale-tremble');
  if (tremble) {
    const line = tremble.closest('[data-from]');
    master.to(
      tremble,
      { keyframes: { x: [0, -2, 2, -2, 2, -2, 2, -2, 2, 0], easeEach: 'none' }, duration: 3 },
      finaleStart + Number(line.dataset.from) + FADE
    );
  }

  // ---------- Le compteur, dans le palier de la carte 2022 ----------
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
          const shown = Math.round(proxy.val);
          if (Math.floor(shown / 250) !== Math.floor(Number(counterEl.textContent) / 250)) sound.tick();
          counterEl.textContent = shown;
        },
      },
      holdOf(fArena)[0] + 2
    );
  }

  // ---------- Le temps qui passe, pendant le long palier 1973 ----------
  // La photo vieillit : --age va de 0 à 1 sur tout le palier, au rythme du scroll (le CSS de
  // .frame--sepia dit ce que ça donne : la teinte sépia s'efface, noir et blanc, terne, de plus
  // en plus sombre). Quand 2018 arrive par-dessus, la couleur revient d'un coup.
  const [, firstHoldEnd] = HOLDS[0];
  master.fromTo(photos[0], { '--age': 0 }, { '--age': 1, duration: firstHoldEnd, ease: 'none' }, 0);

  // Les repères d'années dérivent lentement, espacés dans le palier (5-32 sur 34 unités),
  // pour rendre ces 45 ans sensibles.
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
      .fromTo(mark, { opacity: 0, y: 16 }, { opacity: 0.85, y: 0, duration: half, ease: 'power1.inOut' }, start)
      .to(mark, { opacity: 0, y: -16, duration: half, ease: 'power1.inOut' }, start + half);
  });

  // ---------- Repère de progression ----------
  // Fixe (remplace l'ancienne nav à points) : la position suit l'avancement du
  // scroll, le label reprend le data-year du tableau le plus visible à l'instant
  // — jamais une année interpolée/inventée.
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
