# GSAP : comment ça marche, et comment le site l'utilise

Document d'appui pour présenter le projet « Du Voyebœuf à la Raiffeisen Arena ». Il décrit le site tel qu'il est au 26 octobre 2026. Les extraits viennent de `index.html`, `css/style.css` et `js/script.js`. Si des chiffres changent dans le code, la logique décrite ici reste la même.

## En 30 secondes

- **GSAP** est une bibliothèque JavaScript qui fait varier une valeur au fil du temps : l'opacité d'une image, la position d'un élément, un filtre, ou même un simple nombre.
- **ScrollTrigger** est un plugin de GSAP qui relie une animation au scroll : chaque position de la molette correspond à un instant précis de l'animation.
- Le site tient dans **une seule timeline**, une partition qui dit à quel moment chaque chose apparaît, bouge ou disparaît. L'écran reste fixe (on dit « épinglé ») et c'est le scroll qui fait avancer la partition.
- Chaque fichier a son rôle : le **HTML** dit ce qu'il y a, le **CSS** dit à quoi ça ressemble, **GSAP** dit quand.
- Si GSAP ne se charge pas, ou si le visiteur a demandé moins d'animations, la page reste lisible : les chapitres s'empilent comme sur un site ordinaire.

---

## 1. GSAP, le principe

### Un tween : une valeur qui change

```js
gsap.to('.carte', { x: 300, opacity: 0.5, duration: 1 });     // de l'état actuel vers cet état
gsap.from('.carte', { x: 300, opacity: 0.5, duration: 1 });   // de cet état vers l'état actuel
gsap.fromTo('.carte', { x: 0 }, { x: 300, duration: 1 });      // départ et arrivée écrits tous les deux
```

Une animation GSAP s'appelle un *tween*. Elle a une cible (un élément, une liste d'éléments, ou même un objet JavaScript), des valeurs à atteindre et une durée. `x`, `y`, `scale` et `rotation` sont des raccourcis : GSAP les range lui-même dans la propriété CSS `transform`.

Le site utilise presque toujours `fromTo`. Une timeline qu'on parcourt dans les deux sens (le visiteur peut remonter) doit toujours savoir d'où part chaque animation, sinon le résultat dépendrait de l'endroit d'où l'on arrive.

### L'ease : la façon d'accélérer

| ease | effet | où sur le site |
| --- | --- | --- |
| `'none'` | vitesse constante | ce qui doit coller au scroll : la caméra, les engins, le vieillissement de 1973 |
| `'power2.out'` | part vite, finit doucement | un élément qui apparaît |
| `'power2.in'` | part doucement, finit vite | un élément qui disparaît |
| `'power1.inOut'` | doux aux deux bouts | les repères d'années, les photos de la finale |

### Une timeline : plusieurs tweens placés dans le temps

```js
const tl = gsap.timeline();
tl.to('.a', { opacity: 1, duration: 2 })     // sans position : à la suite de ce qui précède (ici, au début)
  .to('.b', { x: 100, duration: 2 }, 0)       // position 0 : en même temps que .a
  .to('.c', { y: 50, duration: 2 }, 1.5);     // position 1.5 : à 1,5 s
```

Le troisième paramètre, la *position*, dit à quel instant de la timeline le tween démarre. Une timeline peut se lancer, se mettre en pause, s'inverser, ou être pilotée par autre chose que l'horloge. C'est ce que fait le site.

### ScrollTrigger : le scroll devient l'horloge

```js
gsap.registerPlugin(ScrollTrigger);

gsap.timeline({
  scrollTrigger: {
    trigger: '.scene',   // l'élément qui sert de repère
    start: 'top top',    // début : le haut de .scene touche le haut de l'écran
    end: '+=300%',       // fin : 300 % de la hauteur de l'écran plus loin
    pin: true,           // .scene reste fixe à l'écran pendant tout ce trajet
    scrub: 1,            // la progression suit le scroll, avec environ 1 s de rattrapage
  },
});
```

Avec `scrub`, la timeline ne se joue plus toute seule : sa progression (de 0 à 1) est celle du scroll entre `start` et `end`. On descend, l'animation avance. On remonte, elle recule. On s'arrête, elle s'arrête. `pin: true` fixe l'élément et ScrollTrigger ajoute autour de lui l'espace nécessaire (un `pin-spacer`) pour que la barre de défilement ait la bonne longueur.

### Ce que GSAP peut animer

Pas seulement du CSS : n'importe quelle valeur numérique. Sur le site on anime des propriétés CSS (`opacity`, `x`, `scale`, `filter`), des variables CSS (`--edge`, `--age`) et un objet JavaScript tout simple (`{ val: 0 }`) pour le compteur des 5178 places.

---

## 2. Comment GSAP est branché sur le site

### Le chargement

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js" defer></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js" defer></script>
<script src="js/script.js" defer></script>
```

GSAP vient d'un CDN (cdnjs), en version 3.12.5 : pas d'installation, pas d'outil de build. `defer` fait télécharger les scripts pendant que la page se lit, puis les exécute dans l'ordre une fois la page lue. L'ordre compte : GSAP d'abord, ensuite ScrollTrigger (qui en dépend), enfin `script.js` (qui utilise les deux).

### Trois fichiers, trois rôles

| Fichier | Rôle | Exemple |
| --- | --- | --- |
| `index.html` | le contenu et ses repères | 6 `<section class="frame">`, une par chapitre. Dans la finale, `data-from="13"` dit à quel moment un texte apparaît. |
| `css/style.css` | l'apparence et l'état de départ | empiler les chapitres les uns sur les autres, le dégradé qui garde le texte lisible, ce que « photo vieillie » veut dire |
| `js/script.js` | le temps | une timeline qui place chaque animation à son instant |

Dans le code, un chapitre s'appelle un *frame* (`class="frame"`), et un « tableau » dans les commentaires.

### Le garde-fou `.is-active`

Par défaut, le CSS décrit une page normale : les chapitres sont les uns sous les autres et tout est visible. C'est seulement quand le JavaScript sait qu'il peut animer qu'il ajoute la classe `is-active` à `.travelling`. Le CSS empile alors les chapitres en `position: absolute`, tous transparents sauf le premier, et GSAP les fait apparaître au fil du scroll.

```js
// Repli : pas de mouvement demandé, ou ScrollTrigger indisponible (CDN en panne).
if (prefersReducedMotion || typeof ScrollTrigger === 'undefined') {
  if (counterEl) counterEl.textContent = counterEl.dataset.target;
  return;
}

gsap.registerPlugin(ScrollTrigger);
travelling.classList.add('is-active');
```

Sans JavaScript, avec le réglage système « réduire les animations » (`prefers-reduced-motion: reduce`) ou si le CDN est en panne, la classe n'est jamais ajoutée : on obtient la page de repli, lisible, sans rien de cassé. Ce test se fait une seule fois, au chargement de la page.

Deux autres lignes en haut du script : `history.scrollRestoration = 'manual'` et `window.scrollTo(0, 0)`. Sans elles, un rechargement ramènerait le visiteur au milieu de la timeline. Avec elles, le site recommence toujours au début.

---

## 3. La timeline du site

### Un storyboard en « unités »

Toutes les animations sont placées dans une seule timeline, `master`. Comme c'est le scroll qui la pilote, on ne compte pas en secondes mais en **unités** : 1 unité = 5 % de la hauteur de l'écran de scroll.

```js
const SCROLL_PER_UNIT = 5;
```

Chaque chapitre a un *palier* (le temps pendant lequel il reste affiché) et un fondu qui y mène :

```js
const HOLD_LENGTH = [34, 7, chantierLength, finaleLength, 12, 14]; // temps où chaque tableau reste affiché
const FADE_BEFORE = [0, 8, 6, 6, 6, 6];                            // fondu croisé qui y mène
```

Le script en déduit où commence et finit chaque palier (`HOLDS`), puis la durée totale (`TOTAL`) :

| Chapitre | Fondu qui y mène | Palier (unités) | Écrans de scroll |
| --- | ---: | ---: | ---: |
| 1973 | — | 0 → 34 | 0 → 1,7 |
| 1er juillet 2018 | 8 | 42 → 49 | 2,1 → 2,45 |
| Chantier 2019-2020 | 6 | 55 → 100 | 2,75 → 5 |
| Finale du 2 février 2020 | 6 | 106 → 178 | 5,3 → 8,9 |
| 2022, la Raiffeisen Arena | 6 | 184 → 196 | 9,2 → 9,8 |
| Aujourd'hui | 6 | 202 → 216 | 10,1 → 10,8 |

Total : 216 unités, soit un peu moins de 11 écrans de scroll (216 × 5 % = 1080 % de la hauteur de l'écran).

Deux durées ne sont pas écrites à la main : celle du chantier (3 + un passage et une pause par engin + 4) et celle de la finale (son dernier repère + 6). Ajouter un engin ou un texte allonge le chapitre tout seul.

Entre 1973 et 2018, le visiteur scrolle 42 unités : 34 de palier pour 1973, plus 8 de fondu. Les autres fondus n'en font que 6. C'est ce qui laisse sentir les 45 ans entre l'ouverture de la patinoire et le vote.

### La timeline `master`

```js
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
```

| Option | Valeur sur le site | Ce que ça fait |
| --- | --- | --- |
| `trigger` | `.travelling`, la scène qui contient les 6 chapitres | l'élément qui sert de repère |
| `start` | `'top top'` | l'animation commence quand le haut de la scène touche le haut de l'écran, donc dès l'arrivée sur la page |
| `end` | `'+=1080%'` (216 × 5) | elle se termine 1080 % de hauteur d'écran plus loin |
| `pin` | `true` | la scène reste fixe à l'écran pendant tout ce trajet |
| `scrub` | `1` | la timeline suit le scroll avec environ une seconde de rattrapage |
| `invalidateOnRefresh` | `true` | si la fenêtre change de taille, GSAP recalcule les valeurs écrites sous forme de fonctions (la largeur des engins, voir plus bas) |
| `onUpdate` | `updateRail` | à chaque pas de la timeline, met à jour le repère d'année à droite |

Toute la chaîne, du doigt à l'écran :

```
le visiteur scrolle
  → ScrollTrigger calcule la progression (0 à 1) entre start et end
  → la timeline master se place à cette progression (avec ~1 s de rattrapage)
  → chaque tween en cours écrit ses valeurs sur les éléments (opacité, position, filtre…)
```

---

## 4. Ce que GSAP fait, chapitre par chapitre

| Animation | Où | Outil GSAP | Pourquoi |
| --- | --- | --- | --- |
| Poussée d'échelle de 1 à 1,12 | les six photos, tout le trajet | `fromTo` sur une liste, `ease: 'none'` | donner l'impression d'une seule caméra qui avance dans le temps |
| Fondu entre chapitres | entre chaque paire | fonction `crossfade()` : `to` et `fromTo` sur `opacity` et `y` | passer d'une époque à l'autre sans coupure |
| La photo vieillit | 1973 | variable CSS `--age` | rendre sensibles les 45 ans jusqu'au vote |
| Repères 1980, 1990, 2000, 2010 | 1973 | `fromTo` puis `to` | idem |
| Les engins révèlent les photos | chantier | `x` + variable CSS `--edge` + valeurs en fonctions | montrer la transformation physique, étape par étape |
| Textes et photos au rythme du match | finale | boucle sur `data-from`, `data-to`, `data-at`, filtre `brightness`, `keyframes` | raconter la finale comme elle s'est vécue |
| Compteur de 0 à 5178 | 2022 | objet intermédiaire + `snap` | donner de l'ampleur au chiffre |
| Bouton « Calendrier des matchs » | aujourd'hui | `autoAlpha` | il n'est cliquable que quand on le voit |
| Repère d'année à droite | partout | `onUpdate` + `gsap.getProperty` | savoir où l'on en est dans l'histoire |

### La caméra qui avance

```js
master.fromTo(photos, { scale: 1 }, { scale: 1.12, duration: TOTAL, ease: 'none' }, 0);
```

Un seul tween pour les six photos, sur toute la durée de la timeline : elles grossissent de 12 % pendant tout le trajet. L'œil lit ça comme une caméra qui avance, plutôt que comme un zoom relancé à chaque chapitre.

### Le fondu entre deux chapitres

```js
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
```

Une seule fonction sert pour les six chapitres. Le chapitre qui part et celui qui arrive changent d'opacité en même temps, et le texte glisse de 18 px. C'est la carte entière qui s'efface, pas la photo et le texte séparément (voir « Problèmes rencontrés »).

### 1973 : le temps qui passe

Pendant tout le palier de 1973 (34 unités), la photo vieillit : elle perd sa teinte sépia, passe en noir et blanc, devient plus terne et s'assombrit. Les repères 1980, 1990, 2000 et 2010 apparaissent et disparaissent l'un après l'autre.

GSAP ne touche qu'à un nombre, une variable CSS `--age` qui va de 0 à 1 :

```js
const [, firstHoldEnd] = HOLDS[0];
master.fromTo(photos[0], { '--age': 0 }, { '--age': 1, duration: firstHoldEnd, ease: 'none' }, 0);
```

C'est le CSS qui décide ce que 0 et 1 veulent dire :

```css
.frame--sepia .frame-photo {
  --age: 0;
  filter:
    sepia(calc(0.5 * (1 - var(--age))))
    saturate(0.65)
    contrast(calc(1.05 - 0.2 * var(--age)))
    grayscale(var(--age))
    brightness(calc(1 - 0.55 * var(--age)));
}
```

À `--age: 0`, la photo a sa teinte sépia d'origine. À `--age: 1`, elle est en noir et blanc, avec 20 points de contraste en moins et 55 % de luminosité en moins. Pour changer l'effet, on modifie les chiffres du CSS sans toucher au JavaScript. Sans animation, `--age` reste à 0 et la photo garde son look sépia.

Les repères d'années suivent un autre principe : chacun apparaît puis disparaît dans une fenêtre du palier (`[5, 11]`, `[12, 18]`, `[19, 25]`, `[26, 32]`), avec un tween `fromTo` suivi d'un tween `to`.

### Le chantier : un engin révèle la photo suivante

Trois photos du chantier sont empilées. Un engin (la pelleteuse, puis la grue) traverse l'écran de droite à gauche, et la photo suivante apparaît derrière lui. Il y a deux mouvements à garder synchronisés : l'engin lui-même, et le bord d'un masque CSS qui découpe la photo suivante.

```js
function addPass(engin, nextLayer, start, duration) {
  const anchor = Number(engin.dataset.anchor);
  const stageWidth = () => chantierStage.offsetWidth;
  const enginWidth = () => engin.offsetWidth;

  master.fromTo(engin, { x: 0 }, { x: () => -(stageWidth() + enginWidth()), duration, ease: 'none' }, start);
  master.fromTo(
    nextLayer,
    { '--edge': () => stageWidth() + anchor * enginWidth() },
    { '--edge': () => -(1 - anchor) * enginWidth(), duration, ease: 'none' },
    start
  );
}
```

```css
.is-active .chantier-layer + .chantier-layer {
  --edge: 99999; /* hors champ à droite tant que le script ne l'a pas posé */
  --reveal: linear-gradient(to right, transparent calc(var(--edge) * 1px - 6vw), #000 calc(var(--edge) * 1px));
  -webkit-mask-image: var(--reveal);
  mask-image: var(--reveal);
}
```

Le masque rend la photo transparente à gauche de `--edge` et visible à droite. GSAP déplace `--edge` en même temps que l'engin : devant lui on voit l'ancienne photo, derrière lui la nouvelle.

Le point délicat est de garder le bord collé à l'engin à chaque instant. Les deux tweens partent au même moment, durent autant et ont `ease: 'none'`, donc ils avancent à la même vitesse. Les valeurs sont écrites sous forme de fonctions (`() => …`) parce qu'elles dépendent de la largeur de l'écran, et `invalidateOnRefresh: true` les recalcule quand la fenêtre change de taille.

Pour ajouter une étape au chantier, il suffit d'ajouter dans le HTML une `<img class="chantier-layer">` et une `<img class="chantier-engin" data-anchor="…">`. Le script s'adapte tout seul.

### La finale : le rythme est écrit dans le HTML

Pour ce chapitre, les moments sont des attributs `data-*` dans le HTML. Les chiffres sont des unités depuis le début du palier de la finale.

```html
<figure class="finale-temps finale-quote" data-from="13" data-to="28">
  <blockquote class="finale-citation">
    <p>…</p>
    <p class="finale-ligne finale-ligne--accent" data-from="19">…</p>
  </blockquote>
</figure>
```

`data-from` dit quand l'élément apparaît, `data-to` quand il disparaît. Le script lit ces attributs et construit les tweens :

```js
finaleSteps.forEach((el) => {
  if (el.dataset.from !== undefined) {
    master.fromTo(el, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: FADE, ease: 'power2.out' }, finaleStart + Number(el.dataset.from));
  }
  if (el.dataset.to !== undefined) {
    master.to(el, { opacity: 0, y: -14, duration: FADE, ease: 'power2.in' }, finaleStart + Number(el.dataset.to));
  }
});
```

Les photos fonctionnent de la même façon. `data-reveal` sur le bloc photo marque le coup de sifflet final, où la première photo « s'allume » (opacité et luminosité). `data-at` sur les photos suivantes marque le moment où chacune recouvre la précédente.

```js
master.fromTo(
  finalePhoto,
  { opacity: 0, filter: 'brightness(0.2)' },
  { opacity: 1, filter: 'brightness(1)', duration: 6, ease: 'power2.out' },
  finaleStart + Number(finalePhoto.dataset.reveal)
);
```

Un dernier détail : le mot « tremble » est secoué de 2 px quand la réplique arrive, avec des `keyframes` (une liste de positions successives) :

```js
master.to(
  tremble,
  { keyframes: { x: [0, -2, 2, -2, 2, -2, 2, -2, 2, 0], easeEach: 'none' }, duration: 3 },
  finaleStart + Number(line.dataset.from) + FADE
);
```

Pour changer le rythme de la finale, on ne touche donc pas au JavaScript : on change les chiffres `data-from`, `data-to`, `data-at` et `data-reveal` dans le HTML.

### Le compteur de 5178 places

```js
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
  holdOf(fArena)[0] + 2
);
```

GSAP peut animer un objet JavaScript ordinaire. Ici `proxy.val` va de 0 à 5178, `snap: { val: 1 }` l'arrondit à l'entier, et `onUpdate` recopie la valeur dans le texte de la page. Le compteur ne tourne pas tout seul : comme le reste, il avance avec le scroll. Il démarre 2 unités après l'arrivée du chapitre 2022.

### Le bouton « Calendrier des matchs »

```js
master.fromTo(actions, { autoAlpha: 0 }, { autoAlpha: 1, duration: holdStart - prevHoldEnd, ease: 'power2.out' }, prevHoldEnd);
```

`autoAlpha` est un raccourci de GSAP : il anime `opacity` et bascule `visibility` en `hidden` quand l'opacité tombe à 0. Un bouton invisible ne peut donc ni recevoir un clic ni être atteint au clavier avec Tab.

### Le repère d'année à droite

```js
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
```

La hauteur du point suit la progression de la timeline (`master.progress()`, de 0 à 1). L'année affichée est le `data-year` du chapitre le plus visible à cet instant, lu avec `gsap.getProperty`. Le repère n'invente donc jamais d'année entre deux chapitres.

---

## 5. Accessibilité et repli

- **Le scroll reste le vrai scroll du navigateur.** ScrollTrigger n'intercepte pas la molette : la barre de défilement, le clavier (espace, flèches, Page suivante) et le tactile marchent normalement. La première version du site gérait le scroll à la main.
- **Moins d'animations.** Avec `prefers-reduced-motion: reduce`, la timeline n'est pas construite : page normale, compteur déjà à 5178.
- **Sans JavaScript, ou si GSAP ne charge pas** : même page de repli. Dans le chantier on garde une seule photo, sans engins. Dans la finale, tout s'affiche l'un sous l'autre.
- **Lecteurs d'écran.** Les chapitres s'effacent avec l'opacité seule, donc leur texte reste lisible même quand il est invisible. Chaque chapitre est une `<section>` avec un `<h2>`, ce qui permet de naviguer par titres.
- **Le bouton** n'est atteignable que quand il est visible (`autoAlpha`).
- **Éléments décoratifs** (repères d'années, rail, chiffre qui défile) : `aria-hidden="true"`. Le texte « 5178 places. National League. » est lu à leur place grâce à une classe `.sr-only`.
- **Petit écran.** Le site a été contrôlé en simulant 390 px de large. Le label du rail est masqué sous 760 px pour ne pas chevaucher les textes.

---

## 6. Problèmes rencontrés

**L'écran noir.** Chaque chapitre a son propre dégradé sombre (`::after`) pour que le texte reste lisible. Au début, seuls la photo et le texte s'effaçaient : les dégradés de tous les chapitres restaient allumés et s'additionnaient jusqu'à tout noircir. Solution : faire disparaître la carte entière (`.frame`) d'un coup, photo, dégradé et texte ensemble. À retenir : quand une carte a plusieurs couches, on anime la carte, pas chaque couche.

**Le repère d'année en retard.** Avec `scrub: 1`, la timeline continue de rattraper le scroll pendant environ une seconde après l'arrêt de la molette. Le repère lisait la position brute du scroll et affichait donc l'ancien chapitre pendant ce rattrapage. Solution : mettre `onUpdate` sur la timeline elle-même et lire `master.progress()`.

**Un état de départ posé trop tôt.** Le CSS cachait les chapitres suivants dès que le JavaScript était activé, alors que l'empilement n'était posé que plus tard. Pendant un court instant, des chapitres étaient cachés et encore dans le flux de la page. Solution : tout est accroché à la classe `.is-active`, que le script n'ajoute qu'au moment précis où il construit la timeline.

**Des chapitres cachés aux lecteurs d'écran.** Une version rendait les chapitres inactifs `visibility: hidden` (avec `autoAlpha`), ce qui les masquait aussi aux lecteurs d'écran. Retour à l'opacité seule pour les chapitres. Seul le bouton reste caché tant qu'il est invisible.

---

## 7. Pour présenter

### Un plan possible (environ 7 minutes)

| Étape | Durée | Contenu |
| --- | --- | --- |
| Le projet | 30 s | Un récit en 6 chapitres, de la patinoire de 1973 à la Raiffeisen Arena et au HC Ajoie d'aujourd'hui |
| Le choix technique | 1 min | Pas de pages découpées : une scène épinglée et une seule timeline GSAP pilotée par le scroll. HTML = quoi, CSS = apparence, GSAP = quand |
| La démo | 3 min | Voir le parcours ci-dessous |
| Sous le capot | 2 min | Ouvrir `script.js` et montrer les unités, puis `addPass` |
| Robustesse | 30 s | Activer « réduire les animations » : la page redevient une page normale |

### Parcours de démo

Scroller lentement : avec `scrub: 1` l'animation rattrape le scroll avec une seconde de retard, puis s'arrête dès qu'on s'arrête. Les positions sont celles du tableau de la partie 3.

1. **0 à 1,7 écran, 1973.** La photo perd ses couleurs et s'assombrit pendant que les repères 1980, 1990, 2000 et 2010 passent. Dire : « le temps qui passe est dans le scroll ».
2. **2,75 à 5 écrans, le chantier.** Les engins traversent l'écran et révèlent les photos. Dire : « deux tweens synchronisés, l'engin et le bord du masque ».
3. **5,3 à 8,9 écrans, la finale.** Les textes arrivent un par un, la photo s'allume au coup de sifflet, le mot « tremble » tremble. Dire : « tout le rythme est écrit dans le HTML ».
4. **9,2 à 9,8 écrans, 2022.** Le compteur monte jusqu'à 5178, puis le bouton apparaît à la fin.
5. **Remonter un peu.** Tout se déroule à l'envers : c'est la preuve que le scroll est l'horloge.

### Montrer le code, dans cet ordre

Dans `js/script.js`, les sections sont séparées par des commentaires `// ----------` :

1. Le haut du fichier : le repli, puis `is-active`.
2. « Le temps du récit » : les unités, `HOLD_LENGTH`, `FADE_BEFORE`.
3. La timeline `master`, la poussée d'échelle et `crossfade`.
4. « Chapitre du chantier » : `addPass`.
5. « Chapitre de la finale 2020 » : la boucle sur les `data-*`.
6. « Le compteur ».
7. « Le temps qui passe, pendant le long palier 1973 » : `--age`.
8. « Repère de progression ».

### Trois astuces pour la démo

- **Voir ScrollTrigger travailler.** Dans `script.js`, ajouter `markers: true,` dans `scrollTrigger: { … }` : des étiquettes « start » et « end » apparaissent au bord de l'écran. À retirer ensuite.
- **Voir le temps de la timeline.** Dans la console du navigateur (F12), `ScrollTrigger.getAll()[0].animation.time()` donne l'unité actuelle. Elle change à chaque scroll, et on peut la comparer au tableau de la partie 3.
- **Montrer le repli.** Dans Chrome : F12, puis Plus d'outils → Rendu (Rendering) → « Emulate CSS media feature prefers-reduced-motion » → `reduce`, puis recharger la page. Le test n'est fait qu'au chargement, donc le rechargement est nécessaire.

### Questions probables

**Pourquoi GSAP plutôt que du CSS seul ?**
Le CSS anime bien une chose isolée. Ici, il faut une partition unique où tout est coordonné, reliée au scroll, qui se lit dans les deux sens, avec un compteur et des valeurs calculées (la largeur des engins). GSAP le fait avec le même code sur tous les navigateurs. Les animations CSS pilotées par le scroll existent, mais leur prise en charge dépend encore du navigateur et de sa version.

**Pourquoi une seule timeline plutôt qu'une animation par chapitre ?**
La timeline est lisible comme un storyboard : on voit tout dans un seul fichier et on règle le rythme en changeant des chiffres. Les fondus entre chapitres, la caméra et le repère d'année ont besoin de connaître le reste du récit.

**C'est quoi `scrub` ? et `pin` ?**
`scrub` relie la progression de l'animation à celle du scroll. `pin` garde la scène fixe à l'écran pendant ce trajet.

**Pourquoi des « unités » et pas des secondes ?**
Le temps réel n'existe pas : c'est le visiteur qui décide de la vitesse en scrollant. Seules les proportions comptent. 1 unité vaut 5 % de la hauteur de l'écran de scroll.

**Pourquoi `fromTo` presque partout ?**
Parce qu'on peut remonter. Avec `fromTo`, le départ de chaque animation est toujours défini, quel que soit l'endroit d'où le visiteur arrive.

**Comment l'engin révèle-t-il la photo ?**
Un masque CSS dont le bord (`--edge`) est animé par GSAP à la même vitesse que l'engin. Devant l'engin, l'ancienne photo, derrière, la nouvelle.

**Comment la photo de 1973 vieillit-elle ?**
GSAP anime une variable CSS, `--age`, de 0 à 1 pendant tout le chapitre. Le CSS la transforme en filtre : moins de sépia, plus de gris, moins de contraste, moins de luminosité.

**Comment marche le compteur ?**
GSAP anime un objet JavaScript (`{ val: 0 }`). `snap` arrondit la valeur à l'entier et `onUpdate` la recopie dans le texte de la page. Il avance avec le scroll comme le reste.

**Que se passe-t-il si GSAP ne charge pas ?**
La classe `is-active` n'est jamais ajoutée, donc le CSS garde sa version « page normale » : les chapitres s'affichent les uns sous les autres, tout est lisible.

**Et si on redimensionne la fenêtre ?**
ScrollTrigger recalcule ses positions tout seul. `invalidateOnRefresh: true` recalcule aussi les valeurs écrites sous forme de fonctions, comme la largeur des engins.

**À quoi sert `defer` ?**
Les scripts se téléchargent sans bloquer l'affichage de la page, et s'exécutent dans l'ordre une fois la page lue.

**Est-ce lourd pour le navigateur ?**
Les animations portent surtout sur `opacity` et `transform`, que le navigateur sait faire sans tout redessiner. Le masque du chantier et le filtre de 1973 coûtent plus : l'image est recalculée à chaque pas du scroll. Aucune mesure précise n'a été faite pour l'instant.

**C'est gratuit ?**
GSAP et ScrollTrigger sont gratuits pour un projet comme celui-ci (la licence est détaillée sur gsap.com).

---

## 8. Lexique

| Mot | Sens |
| --- | --- |
| tween | une animation GSAP : une ou plusieurs valeurs qui passent de A à B |
| timeline | un conteneur qui place plusieurs tweens dans le temps |
| position | le 3e paramètre d'un tween dans une timeline : l'instant où il démarre |
| ease | la courbe de vitesse d'un tween (constante, qui ralentit, qui accélère) |
| `fromTo` | un tween où l'on écrit le départ et l'arrivée |
| ScrollTrigger | le plugin qui relie une animation au scroll |
| `scrub` | la progression de l'animation suit celle du scroll |
| `pin` | l'élément reste fixe à l'écran pendant un trajet de scroll |
| `autoAlpha` | `opacity` + `visibility`, utile pour qu'un élément invisible ne soit plus cliquable |
| `snap` | arrondit la valeur animée (ici à l'entier) |
| `keyframes` | une suite de valeurs successives dans un seul tween |
| unité | l'unité de temps de la timeline du site : 5 % de la hauteur de l'écran de scroll |
| palier | le temps pendant lequel un chapitre reste affiché |
| frame | un chapitre du site (`<section class="frame">`), appelé « tableau » dans les commentaires du code |
| `data-*` | un attribut HTML personnalisé que le JavaScript peut lire (`data-from`, `data-to`…) |
| CDN | un serveur public qui héberge des bibliothèques (ici cdnjs) |
| `defer` | le script s'exécute après la lecture de la page, dans l'ordre des balises |

---

## 9. Pour aller plus loin

- Documentation de GSAP : https://gsap.com/docs/v3/
- Les timelines : https://gsap.com/docs/v3/GSAP/Timeline/
- Les courbes d'ease : https://gsap.com/docs/v3/Eases/
- ScrollTrigger : https://gsap.com/docs/v3/Plugins/ScrollTrigger/
- Pour démarrer : https://gsap.com/resources/get-started/
