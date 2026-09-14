# Storyboard

| Chapitre | Écran | Mouvement | Durée | Déclencheur | Sans mouvement |
| --- | --- | --- | --- | --- | --- |
| 1 | Photo du Voyebœuf en 1973 (extérieur), désaturée en sépia, texte superposé « 1973 — Le Voyebœuf ouvre ses portes » | Aucun | — | — | On voit une patinoire figée dans son époque et on comprend que le récit part d'un lieu ancien |
| 2 | Photo intérieure de l'ancien Voyebœuf, gradins pleins, texte « Le chaudron, usé mais aimé » puis surimpression « 1er juillet 2018 — 2×OUI » | Le texte « 2×OUI » glisse du bas vers le haut sur 80px et passe d'une opacité de 0 à 1 | 0.5s | Scroll — dès que la section atteint 50% du viewport | On voit directement le texte « 2×OUI » affiché sur la photo et on comprend que la population a validé la rénovation |
| 3 | Deux photos côte à côte : le Voyebœuf (avant) et le chantier (pendant), texte « 2019–2020 — Le Voyebœuf disparaît » | Un curseur de comparaison (ligne verticale) se déplace de gauche à droite sur toute la largeur, au rythme du scroll (scrub, pas de durée fixe) | Liée au scroll, sur environ 100vh de défilement | Scroll continu dans la section | On voit les deux photos juxtaposées sans curseur et on comprend la transformation par simple comparaison |
| 4 | Photo de la Raiffeisen Arena en 2022, texte « 5178 places. National League. » avec un compteur numérique | Le nombre s'incrémente de 0 à 5178 pendant que le texte translate de 30px vers le haut | 1.2s | Scroll — entrée de la section à 60% du viewport | On voit directement « 5178 » affiché et on comprend la capacité de la nouvelle salle |
| 5 | Photo d'un match actuel du HC Ajoie, salle pleine, texte « Aujourd'hui, l'Ajoie joue à guichets fermés » | Léger zoom arrière-plan de 1.08x à 1.0x pendant le scroll (parallax discret) | Liée au scroll (scrub, sur la hauteur de la section) | Scroll continu | On voit la photo nette, sans zoom, et le texte, et on comprend l'ambiance actuelle du lieu |

## Note pour l'implémentation

Sous `prefers-reduced-motion: reduce`, tous les mouvements ci-dessus doivent être remplacés directement par leur état final (opacité 1, position finale, compteur déjà à 5178, pas de zoom) — c'est la colonne « Sans mouvement » qui décrit cet état pour chaque chapitre.
