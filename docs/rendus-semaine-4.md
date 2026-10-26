# Semaine 4 — rendus (tranche A8)

*La fiche demande, pour la semaine 4 : la mission, les journaux des scénarios, la dérive et le garde-fou ajouté, le
coût, l'enveloppe du bogue, la passation. Cette page dit où se trouve chacun.*

| Rendu | Où | En bref |
|---|---|---|
| **Mission** | `docs/semaine-4.md` | Écrite et validée le 25/10, avant le code : déclencheur, outils, périmètre, sortie vérifiable, arrêt, budget, validation humaine |
| **Journaux des scénarios** | `docs/scenarios-agent.md` (§ 2), `docs/scenarios-agent-resultats.json`, page `/assistant` | 20 scénarios, 17 ✅ du premier coup ; chaque exécution et chaque appel d'outil au journal |
| **Dérives et garde-fous** | `docs/scenarios-agent.md` (§ 3) | 3 dérives observées, 3 garde-fous dans le code (résumé ci-dessous) |
| **Coût** | ci-dessous, et page `/couts` (fonction « agent ») | 0,031 $ pour les 20 scénarios |
| **Enveloppe du bogue** | remise au formateur, **hors du dépôt** | — |
| **Passation** | `README.md`, `AGENTS.md` | Lancement en dix minutes, inventaire des clés, conventions |

## Journaux : où les lire

- **Base** : table `executions_agent`, une ligne par demande (qui, porte page ou MCP, demande, état, tours, coût,
  durée) avec la liste de ses `etapes` (chaque appel d'outil, ses entrées, son résultat résumé, un refus éventuel,
  « ⚠ consigne possible »).
- **Page `/assistant`** : les 50 dernières demandes, dépliables, avec le filtre « Actions seulement ». C'est là qu'on
  vérifie qu'une action annoncée par l'assistant a bien eu lieu.
- **Journaux Vercel** : une ligne par exécution et par refus, jamais de clé ni de jeton.

## Dérives et garde-fous, en une ligne chacun

| N° | Dérive observée | Garde-fou dans le code | Preuve |
|---|---|---|---|
| 1 | Demande introuvable par sa référence ; demandeurs pris pour des musiciens | Recherche dans les demandes, outils `lire_demande` et `lister_musiciens` | Scénarios 6, 9, 10 |
| 2 | Par MCP, un courrier piégé fait enchaîner 24 actions | 5 actions MCP au plus en 10 minutes ; une seule relance en attente par engagement | Geste du 26/10, test `budgetActionsAtteint` |
| 3 | 31 appels d'outils en une demande malgré « 10 tours » | 20 appels au plus par demande, comptés par notre code | Test `appelsAtteints`, scénario 8 rejoué |

## Coût

- **Modèle** : Haiku 5.5 (0,10 $ / 0,50 $ par million de jetons en entrée / sortie). Il a été gardé : aucun mauvais
  outil, aucune consigne cachée suivie (condition de passage à Sonnet non remplie).
- **Mesuré sur les 20 scénarios** (26/10) : **0,031 $ en tout**, soit **0,0016 $ par demande en moyenne**. Les demandes
  vont de 0,0004 $ (« quels musiciens a l'agence ? ») à 0,009 $ (scénario 8, 31 appels d'outils). Durée : de 5 à 48 s.
- **Par mois, estimé** : à 10 demandes par jour ouvré, environ 200 demandes, soit **≈ 0,30 $**.
- **Par MCP : 0 $ pour le produit.** Le serveur MCP n'appelle pas de modèle : il exécute les outils, et c'est l'IA
  de Claude Code qui réfléchit, sur l'abonnement de celui qui l'utilise.
- **Bornes qui empêchent la facture surprise** : 0,20 $, 120 s et 20 appels d'outils au plus par demande ; 100 appels
  d'IA par jour et par utilisateur ; **plafond de 5 $ par mois**, partagé avec les fonctions de la semaine 3 et
  vérifié avant chaque demande. Au pire, la dépense s'arrête à 5 $.
- Chaque exécution est comptée dans `appels_ia` et apparaît sur `/couts`, ligne « agent ».
