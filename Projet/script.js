/* ==========================================================================
   HYRULE — SCROLLYTELLING
   GSAP + ScrollTrigger : plongée continue des Cieux jusqu'au Roi Démon

   Principe (simplifié) :
   Les 4 panels sont FIXES plein écran (voir CSS, position: fixed).
   Une timeline UNIQUE, pilotée par le scroll, contrôle pour chaque
   chapitre : un zoom continu sur place (scale), puis une coupe nette
   d'opacité vers le chapitre suivant. Aucune image ne glisse ou ne
   remonte depuis le bas — le rythme est : zoom, coupe, zoom, coupe...
   ========================================================================== */

gsap.registerPlugin(ScrollTrigger);

// Un rechargement repart toujours du début, sans restaurer l'ancienne position.
if ("scrollRestoration" in history) history.scrollRestoration = "manual";

const REDUCE_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const EASE_LINEAR = "none"; // le scrub gère lui-même l'accélération/décélération

const CHAPTERS = [
  { panel: ".panel--1", isFirst: true,  isLast: false },
  { panel: ".panel--2", isFirst: false, isLast: false },
  { panel: ".panel--3", isFirst: false, isLast: false },
  { panel: ".panel--4", isFirst: false, isLast: true  }
];

const SEGMENT = 1;      // durée (unités de timeline) allouée à chaque chapitre
const CUT = 0.16;       // portion du segment utilisée pour la coupe entre deux chapitres
const ZOOM_TO = 1.16;   // amplitude du zoom-in sur place, par chapitre

document.addEventListener("DOMContentLoaded", () => {

  window.scrollTo(0, 0);

  // Révélation immédiate de l'image d'ouverture dès le premier scroll.
  const openingImage = document.querySelector(".panel--1 .panel__img");
  const updateOpeningImage = () => {
    openingImage.classList.toggle("panel__img--revealed", window.scrollY > 0);
  };

  window.addEventListener("scroll", updateOpeningImage, { passive: true });
  updateOpeningImage();

  // ------------------------------------------------------------------
  // ÉTATS INITIAUX
  // ------------------------------------------------------------------
  gsap.set(".panel__img", { scale: 1 });
  gsap.set(".panel__texture", { yPercent: 22 });
  gsap.set(".panel--4 .chapter-mark--stagger, .panel--4 .panel__title--stagger, .panel--4 .panel__subtitle--stagger, .panel--4 .chapter-next--stagger", {
    opacity: 0,
    y: 30
  });

  // ------------------------------------------------------------------
  // PARALLAX SOURIS : l'atmosphère suit légèrement le curseur.
  // ------------------------------------------------------------------
  if (!REDUCE_MOTION && window.matchMedia("(pointer: fine)").matches) {
    const moveTextureX = gsap.quickTo(".panel__texture", "x", { duration: 0.7, ease: "power3.out" });
    const moveTextureY = gsap.quickTo(".panel__texture", "y", { duration: 0.7, ease: "power3.out" });

    window.addEventListener("pointermove", event => {
      const cursorX = (event.clientX / window.innerWidth - 0.5) * 2;
      const cursorY = (event.clientY / window.innerHeight - 0.5) * 2;

      moveTextureX(cursorX * 24);
      moveTextureY(cursorY * 16);
    });

    window.addEventListener("blur", () => {
      moveTextureX(0);
      moveTextureY(0);
    });
  }

  // Les panels sont tous superposés : seul celui affiché doit capter les clics.
  const panels = document.querySelectorAll(".panel");
  const updateInteractivePanel = () => {
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    const activeIndex = Math.min(
      Math.floor((window.scrollY / maxScroll) * CHAPTERS.length),
      CHAPTERS.length - 1
    );

    panels.forEach((panel, index) => {
      panel.classList.toggle("panel--interactive", index === activeIndex);
    });
  };

  window.addEventListener("scroll", updateInteractivePanel, { passive: true });
  window.addEventListener("resize", updateInteractivePanel);
  updateInteractivePanel();

  // ------------------------------------------------------------------
  // BOUTON « CHAPITRE SUIVANT »
  // ------------------------------------------------------------------
  document.querySelectorAll("[data-next-chapter], [data-scroll-to]").forEach(button => {
    button.addEventListener("click", () => {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const destination = button.dataset.scrollTo;
      let nextChapterPosition;

      if (destination === "top") {
        nextChapterPosition = 0;
      } else if (destination === "end") {
        nextChapterPosition = maxScroll;
      } else {
        const targetChapter = Number(button.dataset.nextChapter);
        // Le décalage de 20 % laisse le temps à l'image et au texte du
        // chapitre suivant d'apparaître avant d'arrêter le défilement.
        nextChapterPosition = ((targetChapter - 1 + 0.2) / CHAPTERS.length) * maxScroll;
      }

      window.scrollTo(0, nextChapterPosition);
      updateInteractivePanel();
      ScrollTrigger.update();
    });
  });

  // ------------------------------------------------------------------
  // BARRE DE PROGRESSION GLOBALE
  // ------------------------------------------------------------------
  gsap.to("#progressFill", {
    height: "100%",
    ease: EASE_LINEAR,
    scrollTrigger: {
      trigger: "#wrapper",
      start: "top top",
      end: "bottom bottom",
      scrub: 0.3
    }
  });

  // ==================================================================
  // TIMELINE UNIQUE : ZOOM → COUPE → ZOOM → COUPE ...
  // ==================================================================
  const master = gsap.timeline({
    scrollTrigger: {
      trigger: "#wrapper",
      start: "top top",
      end: "bottom bottom",
      scrub: 1
    }
  });

  CHAPTERS.forEach((ch, i) => {
    const start = i * SEGMENT;
    const img = ch.panel + " .panel__img";
    const content = ch.panel + " .panel__content";
    const staggerTargets = ".panel--4 .chapter-mark--stagger, .panel--4 .panel__title--stagger, .panel--4 .panel__subtitle--stagger, .panel--4 .chapter-next--stagger";

    // Zoom-in continu sur place pendant tout le segment du chapitre
    master.fromTo(img, { scale: 1 }, { scale: ZOOM_TO, ease: EASE_LINEAR, duration: SEGMENT }, start);

    // Parallax de la texture (nuages / fumée / cristaux / braises) :
    // se déplace plus lentement que le zoom de l'image, ce qui crée
    // la sensation de profondeur.
    master.fromTo(ch.panel + " .panel__texture", { yPercent: 22 }, { yPercent: -22, ease: EASE_LINEAR, duration: SEGMENT }, start);

    // Coupe d'entrée : le chapitre apparaît net au tout début de son segment
    if (!ch.isFirst) {
      master.fromTo(ch.panel, { opacity: 0 }, { opacity: 1, ease: EASE_LINEAR, duration: CUT * 0.6 }, start);
    }

    // Texte
    if (ch.panel === ".panel--4") {
      // Chapitre final : révélation en cascade, le texte reste ensuite affiché
      master.to(staggerTargets, { opacity: 1, y: 0, ease: EASE_LINEAR, stagger: 0.12, duration: 0.3 }, start + CUT);
    } else {
      master.fromTo(content, { opacity: 0, y: 20 }, { opacity: 1, y: 0, ease: EASE_LINEAR, duration: CUT * 0.7 }, start + CUT * 0.3);
      master.to(content, { opacity: 0, y: -20, ease: EASE_LINEAR, duration: CUT * 0.7 }, start + SEGMENT - CUT);
    }

    // Coupe de sortie : le chapitre s'efface juste avant que le suivant n'entre
    if (!ch.isLast) {
      master.to(ch.panel, { opacity: 0, ease: EASE_LINEAR, duration: CUT * 0.6 }, start + SEGMENT - CUT * 0.6);
    }
  });

  // ------------------------------------------------------------------
  // Recalcule les positions après chargement complet des images HD
  // ------------------------------------------------------------------
  window.addEventListener("load", () => ScrollTrigger.refresh());

  if (REDUCE_MOTION) {
    ScrollTrigger.getAll().forEach(st => st.kill());
    document.querySelectorAll(".panel").forEach(p => gsap.set(p, { opacity: 1 }));
    document.querySelectorAll(".panel__img").forEach(img => gsap.set(img, { scale: 1 }));
    document.querySelectorAll(".panel__content, .chapter-mark--stagger, .panel__title--stagger, .panel__subtitle--stagger, .chapter-next--stagger")
      .forEach(el => gsap.set(el, { opacity: 1, y: 0 }));
  }

});
