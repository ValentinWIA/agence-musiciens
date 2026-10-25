# Semaine 4 — l'agent qui agit dans le produit (mission)

*Mission validée par l'humain le 25/10/2026 (décisions en section 10). Consigne : **strict nécessaire, au
plus simple** (comme la semaine 3). Plan en tranches A0 → A8 (section 9) ; chaque tranche est détaillée et validée
avant d'être codée.*

Source : la fiche « Vos cinq exercices », semaine 4. La fiche exige que la mission tienne **en un seul document**
écrit avant le code : c'est celui-ci.

## 1. La mission, en une phrase

**L'assistant de Claire Morel** prépare les relances de l'agence (options qui expirent, cachets impayés) et aide à
traiter les demandes reçues ; il lit tout ce qu'il veut, fait seul ce qui est sans risque, et **s'arrête pour
demander validation avant tout envoi**.

## 2. Déclencheur

- **Page `/assistant`** (agent seulement ; un musicien est renvoyé, refus journalisé) : Claire écrit une demande en
  français, l'agent y répond en streaming.
- **Serveur MCP** (`/api/mcp`) : Claude Code appelle les mêmes outils, avec le jeton.
- Rien d'autre : pas de déclenchement la nuit, pas de déclenchement par un message du flux.

## 3. Outils

Les mêmes outils servent aux deux portes (page `/assistant` et serveur MCP) : écrits une fois, mêmes règles.

| Outil | Type | Ce qu'il fait | Code repris |
|---|---|---|---|
| `options_qui_expirent` | lecture | options dont l'échéance tombe sous 7 jours (ou passée) | `optionsQuiExpirent` (récap) |
| `cachets_impayes` | lecture | concerts joués ou facturés, non payés depuis plus de 30 jours | `cachetsImpayes` (récap) |
| `chercher_engagements` | lecture | liste filtrée (musicien, statut, période) | `listerEngagements` |
| `lire_engagement` | lecture | fiche : date, lieu, musiciens, programmateur et son e-mail, cachet, statut | fiche engagement |
| `disponibilite` | lecture | conflits d'agenda d'un musicien à une date | `conflit.ts` |
| `demandes_a_traiter` | lecture | demandes reçues à traiter, **avec leurs messages** | `demandes.ts` |
| `lire_courrier` | lecture | un courrier déposé et ses champs | `courriers` |
| `ajouter_note` | **action sans risque** | ajoute une ligne datée aux notes privées de l'agent sur la fiche d'un musicien | `notes_agent` |
| `creer_engagement_depuis_demande` | **action sans risque** | crée l'engagement au statut « demande », relié à la demande | création depuis une demande (N5e) |
| `proposer_relance` | **action irréversible → proposée** | rédige un courriel au programmateur et le **met en attente** ; n'envoie rien | Resend, à la validation |

**Aucun outil de suppression, de changement de statut ni de paiement** : l'agent ne peut pas les faire, même si on le
lui demande. Pour la fiche (« validation avant toute suppression, tout paiement ») : il n'y en a pas, parce que l'outil
n'existe pas.

Les **trois actions du serveur MCP** sont les trois actions ci-dessus.

## 4. Périmètre

- **Rôle agent seulement**, sur la page comme par MCP. Un outil revérifie le rôle à chaque appel (comme une action
  serveur) : le modèle ne choisit pas ses droits.
- Données fictives seulement (comme partout).
- **Hors périmètre** : paiement ; contrats (le produit ne les rédige pas) ; envoi aux musiciens ; agent la nuit ;
  plusieurs agents en parallèle (badge) ; Claude Desktop (badge) ; mémoire d'une conversation à l'autre (chaque demande
  repart de zéro).

## 5. Sortie vérifiable

Chaque exécution se termine par une réponse en trois listes — **lu**, **fait**, **proposé (à valider)** — et chaque
élément a un lien vers sa fiche. Ce que dit la réponse se vérifie au journal (section 7) : une action annoncée et
absente du journal est une dérive.

## 6. Validation humaine sur l'irréversible

- `proposer_relance` écrit une ligne **« en attente »** dans une table `propositions` (destinataire, sujet, texte,
  engagement, exécution). C'est **le code** qui l'impose : l'outil ne sait pas envoyer.
- Page **`/validations`** (agent seulement), lien au menu : chaque proposition, texte modifiable, **« Envoyer »** ou
  **« Refuser »**. « Envoyer » part par Resend et passe la ligne à « envoyée » (condition dans la requête : deux clics
  ou deux onglets n'envoient qu'une fois, comme le récap).
- Les programmateurs du jeu de données ont des adresses `.test` : **rien n'y part** (règle de la tranche D) ; la ligne
  passe à « validée, non envoyée (adresse fictive) ». Pour une démo d'envoi réel, voir la question 2 (section 10).

## 7. Journal

- Table **`executions_agent`** : une ligne par demande (qui, par où — page ou MCP —, la demande, début, fin, état :
  terminée / arrêtée par le budget / en échec, nombre de tours, coût) et **`etapes`** : la liste de chaque décision
  du modèle et de chaque appel d'outil (outil, entrées, résultat résumé, refus éventuel).
- Visible sur `/assistant` (dernières exécutions, dépliables) : c'est le journal qu'on lit après les scénarios et
  qu'on montre à la démo.
- Chaque exécution compte dans `appels_ia` : son coût apparaît sur `/couts` (fonction « agent »).

## 8. Budget et condition d'arrêt

Par exécution : **10 tours au plus**, **0,20 $ au plus**, **120 s au plus** ; le premier atteint arrête l'agent, le
journal dit lequel. Les limites de la semaine 3 s'appliquent en plus (30 appels par jour, plafond de 5 $ par mois,
vérifiés avant de démarrer).

**Modèle** : Haiku 5.5 par défaut (comme la semaine 3, environ 0,005 $ par exécution estimé) ; on passe à Sonnet 5.5
(environ 0,10 $) si les scénarios montrent qu'il se trompe d'outil ou suit la consigne cachée. Mesuré en A7.

**Deux agents sur le même dossier** : une seule exécution à la fois (verrou par index unique partiel, comme l'import
de nuit) ; une seconde demande pendant qu'une tourne → « l'assistant est déjà occupé ».

**Consigne cachée** : tout ce qui vient de l'extérieur (messages du flux, courriers, documents) est donné au modèle
entre balises, comme une donnée, avec « < » neutralisé (technique de l'analyse de nuit). Le vrai garde-fou est
ailleurs : même trompé, l'agent n'a ni suppression, ni envoi sans validation, ni droits de musicien.

## 9. Plan en tranches

| Tranche | Contenu | Preuve |
|---|---|---|
| **A0** | Ce document ; repérer dans le flux le message piégé | l'humain valide le document |
| **A1** | Essai du SDK d'agents d'Anthropic sur une prévisualisation Vercel (Hobby, 300 s) : un outil de lecture, une réponse. Documentation officielle lue d'abord. Si l'essai échoue : retour à l'humain avec les choix | geste en prévisualisation |
| **A2** | Outils de lecture, journal (`executions_agent`), budget, verrou | tests : budget dépassé → arrêt ; musicien refusé |
| **A3** | Page `/assistant` : streaming, quatre états (vide, en cours, réponse, erreur), journal dépliable | geste |
| **A4** | Actions, table `propositions`, page `/validations` | test : `proposer_relance` n'envoie jamais ; un seul envoi par proposition ; geste |
| **A5** | Serveur MCP `/api/mcp`, jeton `MCP_JETON` (Vercel), branché dans Claude Code | sans jeton → 401 ; action sans risque depuis Claude Code ; relance → en attente |
| **A6** | Consigne cachée : le message piégé du flux et une consigne glissée dans un courrier | test et geste ; le journal montre qu'elle n'est pas suivie |
| **A7** | 20 scénarios rejoués (script), journaux lus, une dérive observée, un garde-fou ajouté | `docs/scenarios-agent.md` |
| **A8** | Rendus : mission, journaux, dérive et garde-fou, coût ; le bogue caché (enveloppe) ; la passation (README, conventions, inventaire des clés, lancement en dix minutes) | relus par l'humain |

## 10. Décisions (25/10) et question ouverte

1. **Le message piégé** (ouvert ; **introuvable au 25/10** d'après l'humain, à surveiller à chaque import) : il arrive par le flux, dans un message entrant. Il faut le trouver (sur `/demandes`, onglet
   « Toutes », ou dans les nuits déjà importées) avant A6.
2. **Envoi réel à la démo** : les adresses `.test` ne reçoivent rien. Pour montrer un vrai courriel parti après
   validation, mettre ton adresse sur un programmateur (en SQL dans Neon, production) ? Sinon, la ligne « validée, non
   envoyée (adresse fictive) » suffit à la fiche. **Décidé : l'adresse de l'humain sur un programmateur.**
3. **Plafond mensuel** : 5 $ partagés avec la semaine 3. Avec Haiku, les 20 scénarios coûtent quelques centimes ; à
   relever seulement si l'on passe à Sonnet. **Décidé : plafond inchangé.**
