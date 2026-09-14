# Vérification sobre

| Chapitre | Idée à conserver | Mesure avant | Coupe | Mesure après | État sans mouvement |
| --- | --- | ---: | --- | ---: | --- |
| 3 | On voit l'ancienne patinoire disparaître face à la nouvelle | 2 images ~1.9–2.9 MB en JPG + curseur scroll-scrubbed (repaint à chaque frame de scroll) | Conversion des 2 images en WebP 1600px ; curseur remplacé par un fondu enchaîné déclenché une seule fois (plus de scrub continu) | cible : 2 × ≤150 KB, un seul repaint au lieu d'un repaint par frame *(à mesurer après implémentation)* | Les deux photos restent visibles côte à côte, sans curseur ; la comparaison avant/après reste compréhensible |
| 5 | On voit et on ressent l'ambiance d'un match actuel | 1 photo + zoom parallax continu (scrub) | Suppression du zoom parallax, image statique optimisée en WebP | cible : ≤150 KB, 0 recalcul de transform au scroll *(à mesurer après implémentation)* | La photo reste nette et lisible, le texte reste au même endroit ; l'ambiance se lit sans le mouvement |

## Test à 390 pixels

*(Section à compléter après l'implémentation réelle du site. Ce test ne peut pas être simulé : il faut faire tester la vraie page, sur un vrai téléphone ou en réduisant la fenêtre à 390px, à une vraie personne, sans rien lui expliquer. Notez ensuite ci-dessous ce qu'elle raconte, le chapitre mal compris, et la correction apportée.)*

La personne a raconté `/* à compléter après le test */`. Le chapitre mal compris était `/* à compléter */`. J'ai corrigé `/* à compléter */`.
