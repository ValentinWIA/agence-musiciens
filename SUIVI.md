# Suivi du travail — Agence-musiciens

Ce document suit l'avancement du projet. Il dit **ce qui a été fait**, **à quoi sert chaque élément**,
et **à quel stade conceptuel** appartient chaque ensemble de tâches.
Il est mis à jour à la fin de chaque session (c'est l'« état de reprise » demandé par la fiche).

Légende : ✅ fait · 🔄 en cours · ⬜ à faire

---

## État de reprise

*Dernière mise à jour : 12 octobre 2026 (H5 faite ; passe de design, pull request n° 6)*

- **Fait** : cadrage (SPEC), comptes, squelette Next.js, dépôt GitHub public, site en ligne
  (https://agence-musiciens.vercel.app), région `fra1`, base Neon reliée à Vercel.
  Fonctionnalité « connexion » fusionnée (pull request n° 1) et vérifiée en production ; compte de l'agent créé en production.
  Fonctionnalité « invitations » fusionnée (pull request n° 2) et vérifiée en production.
  Réinitialisation du mot de passe fusionnée (pull request n° 3), vérifiée en production.
  Vérifications automatiques à chaque push (lint, 8 tests, construction) fusionnées (pull request n° 4).
- **En cours** : engagements, branche `engagements` (pas encore fusionnée). Validés en prévisualisation : cadrage
  (`docs/engagements.md`), B1 (4 tables), B2 (jeu de données), C1 (liste filtrable), C2 (fiche + « introuvable »,
  vérifiée le 11/10 : fiches de Louis sans coordonnées, fiche d'Anna → « introuvable » + « Accès refusé »,
  adresse inventée → « introuvable » sans journal).
  D1 (règles du cycle de vie, `src/lib/cycle-de-vie.ts`, 10 tests) : vérifications GitHub vertes le 11/10.
  D2 (boutons de statut sur la fiche, action `changerStatut`) : vérifiée le 11/10 en prévisualisation (refus expliqué,
  « contrat envoyé », annulation abandonnée sans effet, aucun bouton pour Louis).
  D2b (**rétablir** un engagement annulé, colonne `statut_avant_annulation`, migration 0004, 30 tests) : vérifiée le 11/10
  (retour au statut d'avant ; « confirmé » revient à « contrat envoyé »). Message d'annulation corrigé (plus « définitif »).
  D3 (**création**, `/engagements/nouveau`, action `creerEngagement`, 36 tests) : vérifiée le 11/10 en prévisualisation
  (solo à date précise, duo à la saison en CHF, refus sous le bon champ avec saisie conservée, Louis sans bouton et
  renvoyé). Date saisie à l'heure locale du lieu (`versInstant`) ; date passée refusée. Corrigé : React vidait les listes
  déroulantes après un refus → formulaire envoyé sans remise à zéro automatique (à reprendre pour D4).
  Décidé : concert **bénévole** (cachet 0) → contrat possible, « joué » est final ; durée exigée pour poser une option.
  D4a (**règles de modification**, `estVerrouille` et `controlerModification` dans `src/lib/cycle-de-vie.ts`, 40 tests) :
  commit `4a14206` poussé. Décidé : à partir de « confirmé » (et pour « annulé »), seuls titre, programme et notes
  restent modifiables ; avant, une modification ne défait pas une étape franchie (date précise + durée dès l'option,
  cachet non vide dès le contrat envoyé) ; une date passée n'est refusée que si on la change.
  D4b (**modification**, `/engagements/[id]/modifier`, action `modifierEngagement`, bouton « Modifier », 46 tests,
  commit `89c9216`) : vérifiée le 11/10 en prévisualisation (option : heure et musicien changés → « Engagement modifié. » ;
  passage au mois refusé sous Date ; confirmé : champs grisés, notes modifiables ; Louis sur `/modifier` → renvoyé).
  Formulaire partagé (`src/app/engagements/formulaire-engagement.tsx`) et lecture partagée côté serveur
  (`src/app/engagements/saisie.ts`) : création et modification vérifient les mêmes règles. Pré-remplissage par
  `versChampsDate` (dates) et `versSaisie` (argent). Chaque écriture exige que le statut n'ait pas changé depuis la lecture.
  **Étape E (géocodage)** : cadrage validé (`docs/engagements.md`, section 7). E1 ✅ `src/lib/geocodage.ts`
  (service IGN `data.geopf.fr/geocodage`, 5 propositions, délai 5 s, 51 tests, essai réel « 78 rue Cardinet » juste).
  E2a ✅ coordonnées fixes des 12 lieux (étranger relevé sur carte). E2b ✅ migration 0005 : coordonnées obligatoires,
  jouée sans erreur en prévisualisation le 11/10 (preuve que tous les lieux ont leurs coordonnées).
  Leçon : une migration passe **avant** le rechargement des données → données d'abord, contrainte ensuite.
  E3 ✅ (commits `93645f9`, `c002acd`, `5b27b0c`) : actions `chercherLieu` / `creerLieu`
  (`src/app/engagements/lieux/actions.ts`), fenêtre `<dialog>` « + nouveau lieu » (`nouveau-lieu.tsx`, à côté du
  formulaire d'engagement, saisie conservée, lieu créé sélectionné). Vérification et règle de doublon dans
  `src/lib/lieux.ts` (63 tests). Pays en liste fermée (`PAYS`, `src/lib/dates.ts`). Vérifiée le 12/10 en
  prévisualisation : lieu français choisi, lieu suisse saisi (virgule refusée), création sans proposition refusée,
  doublon refusé, Louis refusé. Bug trouvé au geste : « Paris 75013 » ≠ « 75013 Paris » laissait passer un doublon →
  règle élargie (ville sans chiffres, ou moins de 100 m).
  **Étape F (règle de conflit)** : cadrage validé (`docs/engagements.md`, section 8). F1 ✅ `src/lib/conflit.ts`
  (distance par haversine, trajet × 1,3 ÷ 80 km/h, marge 1 h, `trouverConflits`, fonction pure ; 15 tests, 78 au total).
  F2 ✅ branchement dans `changerStatut` : à « confirmer », `lireAgendaPourConfirmer` (`src/lib/engagements.ts`) relit
  en base les engagements tenus des musiciens ; refus expliqué (`messageConflits`, heure locale du lieu, trajet arrondi
  au quart d'heure) et journalisé. 81 tests, build et lint verts.
  F3 ✅ jeu de données : les cas existaient déjà, mais celui de Menton ne bloquait plus avec 1 h de marge (13 h
  disponibles, 12 h 16 exigées) → concert avancé à 10 h. Nouveau test `src/lib/jeu-de-donnees.test.ts` (85 tests) :
  les cas de démonstration restent justes si l'on change un réglage. **Gestes à faire sur la prévisualisation** :
  duo Genève 21/11 refusé (Louis, Londres) ; Menton 05/12 refusé (Inès, Paris) ; Lyon 12/12 (Anna) confirmé ;
  Louis sans bouton.
  Constaté : créer un engagement trop proche reste permis (voulu : seule la confirmation bloque).
  F4 (cadrage validé le 12/10, `docs/engagements.md` section 9) : avertissement sur la fiche en option et contrat
  envoyé (agent seulement), même calcul que le refus (`avertissementConflits`), 86 tests. Gestes : duo Genève
  21/11 et Menton 05/12 avertis ; Lyon 12/12 sans avertissement ; Louis ne voit rien ; option posée sur un engagement
  trop proche → averti. Plus tard : signaler aussi les autres options concurrentes aux dates proches.
  **F4 ✅** gestes validés par l'humain le 12/10.
  **À faire plus tard (décidé le 12/10)** : « confirmer quand même » avec une raison écrite, conservée et journalisée
  (le trajet est estimé en voiture, trop pessimiste en train ou en avion). Après G si le temps le permet, sinon semaine 2.
- **Bug corrigé (commit `7d220dd`)** : `scripts/jeu-de-donnees.ts` utilise des identifiants **fixes**, calculés par
  empreinte du nom (`idStable("musicien:louis")`, format UUID accepté par `z.uuid()`) : les sessions ouvertes et les
  adresses des fiches restent valables après un rechargement du jeu. Vérifié le 11/10 : même nom → même identifiant.
  Constaté en prévisualisation le 11/10 : Louis reste connecté après un nouveau déploiement.
- **Reprise (nouvelle session)** : lire `SUIVI.md`, `AGENTS.md`, `docs/engagements.md` ;
  étapes D et E terminées.
  **Étape G (pièces jointes)** : cadrage validé le 12/10 (`docs/engagements.md`, section 10 ; commit `817c810`).
  G1 ✅ `src/lib/pieces-jointes.ts` : `verifierPiece` (type, aucun fichier / vide, 4 Mo au plus, signature `%PDF-`
  lue dans le contenu, pas l'extension), `formaterTaille` ; 94 tests.
  G2 ✅ (commit `6d7c084`) : table `pieces_jointes` (migration 0006, cascade avec l'engagement), jouée en
  prévisualisation le 12/10 (déploiement « Ready »). Stockage Blob `agence-musiciens-pieces` créé par l'humain,
  relié aux 3 environnements (`BLOB_READ_WRITE_TOKEN`, pris en compte au prochain déploiement).
  Limite : `npm run donnees` efface les lignes, pas les fichiers du stockage (orphelins en prévisualisation).
  G3 ✅ (commit `1591fae`) : `@vercel/blob` installé ; action `ajouterPiece`
  (`src/app/engagements/[id]/pieces/actions.ts`, chemin aléatoire, fichier effacé du stockage si la base échoue),
  formulaire `ajout-piece.tsx` (trop lourd refusé dès le navigateur), liste « Pièces jointes » sur la fiche
  (`lirePiecesJointes`). Limite des actions serveur relevée à 4,5 Mo (`next.config.ts`, 1 Mo par défaut).
  **Gestes à faire sur la prévisualisation** : PDF ajouté (agent) ; faux PDF (fichier renommé en .pdf) refusé ;
  fichier de plus de 4 Mo refusé ; aucun fichier / aucun type refusés ; Louis voit la liste sans formulaire.
  **G3 ✅** gestes validés par l'humain le 12/10.
  G4 (commit `af0492e`, poussée) : route `src/app/engagements/[id]/pieces/[pieceId]/route.ts` (droits revérifiés,
  pièce rattachée à cet engagement exigée via `lirePieceJointe`, sinon « Pièce introuvable. » en 404 ; PDF servi sans
  cache partagé) ; action `supprimerPiece` (ligne puis fichier) et bouton `supprimer-piece.tsx` avec confirmation.
  **Gestes à faire sur la prévisualisation** : agent ouvre un PDF ; Louis ouvre une pièce de son engagement ; Louis
  colle l'adresse d'une pièce d'un engagement d'Anna → « Pièce introuvable. » (+ « Accès refusé » dans les journaux) ;
  agent supprime (Annuler dans la fenêtre → rien ; OK → la ligne disparaît, l'ancienne adresse → introuvable).
  **G4 ✅** gestes validés par l'humain le 12/10 (et bouton « Choisir un fichier » remplacé par le nom choisi).
  **Confirmer quand même** : cadrage validé le 12/10 (`docs/engagements.md`, section 11).
  Q1 (commit `a340e4a`) : `verifierRaisonConflit` (10 à 300 caractères, `src/lib/conflit.ts`, 99 tests),
  colonne `raison_conflit` (migration 0007). Q2 : `changerStatut` accepte `raisonConflit` (conflits recalculés,
  raison gardée seulement s'il y a conflit, effacée au rétablissement) ; champ sous le refus (`boutons-statut.tsx`) ;
  ligne « Conflit d'agenda » sur la fiche, visible du musicien.
  **Gestes à faire sur la prévisualisation** : cas piégé → refus puis champ ; raison « ok » refusée (saisie gardée) ;
  raison valable → « confirmé », raison affichée ; Louis voit la raison sans bouton ; annuler puis rétablir → raison
  effacée.
  **Q1 + Q2 ✅** gestes validés par l'humain le 12/10.
  **Étape H** : cadrage validé le 12/10 (`docs/engagements.md`, section 12 ; rendus et démo de la fiche recopiés).
  H1 ✅ (commit `e58d33f`) : revue de sécurité, `docs/securite.md`. Corrigé : liens des courriels fabriqués depuis
  l'en-tête `Host` (falsifiable) → adresse fournie par Vercel (`src/lib/origine.ts`). Reportés en semaine 2 : limite
  d'essais de connexion, écart de temps à la connexion, sessions non fermées, clickjacking. Gestes validés le 12/10 :
  lien d'invitation à la bonne adresse ; Louis sur une fiche d'Anna → « introuvable » + journal.
  H2 (commit `e67c2b5`, poussé, vérifications GitHub vertes) : `README.md` en français (rôle, organisation,
  variables d'environnement par leur nom, commandes, rechargement des données) avec deux schémas Mermaid : couches
  du produit et trajet d'une création d'engagement. **Gestes à faire** : schémas affichés par GitHub (branche
  `engagements`) ; l'humain raconte sans le schéma le trajet d'une création (droits par `verifierAdmin`, relecture
  en base de ce qu'envoie le navigateur, refus affiché sous le champ avec saisie gardée, écriture en une seule
  opération).
  **H2 ✅** validée par l'humain le 12/10 : schémas affichés par GitHub ; trajet raconté. Précisé en route : jeton
  et cookie sont la même chose (session signée avec `AUTH_SECRET`, changer de navigateur ou modifier le cookie ne
  donne aucun droit) ; Louis *peut* appeler l'action, c'est la vérification serveur qui protège ; refus d'accès ≠
  connexion ratée ; ce sont des identifiants (pas des jetons) que le serveur relit ; écriture atomique = tout ou rien.
  **H3 ✅** démo répétée de bout en bout par l'humain le 12/10 en prévisualisation (tout fonctionne).
  Remarques de l'humain : « poser une option » peu clair face à « demande » ; « envoyer le contrat » laisse croire que
  l'application envoie le contrat (elle note seulement que l'agent l'a envoyé) → explications données, libellés **gardés** (décision de l'humain). Idée retenue : envoi automatique du contrat
  au programmateur en semaine 2 ou 3.
  H3 : `docs/demo.md` écrit (préparatifs, 6 temps, ce qui manque). Fiche d'Anna pour l'essai de Louis :
  `/engagements/7f33cfdb-4527-5821-83d4-db54f20e4d24` (récital de Lyon, identifiant fixe). **Geste à faire** : répéter
  la démo de bout en bout en prévisualisation (sauf la rotation, temps 5).
  **H4 ✅** pull request n° 5 fusionnée le 12/10 (vérifications vertes), déploiement de production réussi (migrations
  0003 à 0007 jouées). Vérifié par l'humain en production : connexion agent, liste vide, formulaire, adresse inventée
  → « introuvable », invitations. Aucune donnée écrite.
  **H5 ✅** le 12/10 : jeu de données chargé en production par l'humain (`npx tsx --env-file=.env.production.local
  scripts/jeu-de-donnees.ts`, base vérifiée par l'identifiant `ep-…` de la branche Default de Neon, fichier supprimé
  ensuite) → 50 engagements visibles. Rotation de `RESEND_API_KEY` répétée (nouvelle clé, redéploiement, ancienne
  révoquée, invitation reçue). Le garde-fou de Claude Code refuse lectures et écritures en production : c'est l'humain
  qui lance ces commandes (préfixe `!`).
  **Design ✅** (branche `design`, pull request n° 6, vérifications vertes) : police sans serif enfin branchée, fond
  chaud à grain, boutons encre, tableaux encadrés, logo fictif « AM Management », tableau de bord en tuiles. Choix
  consignés dans `docs/design.md`. Vérifié en prévisualisation par l'humain (agent et Louis). Fusion à faire par
  l'humain (le garde-fou de Claude Code refuse la fusion), puis vérification en production.
  Ce `SUIVI.md` arrive dans `main` par cette pull request : la branche `engagements` n'a plus rien à fusionner.
  **Laissés de côté (décision de l'humain, 12/10)** : jours fériés et Frankfurter (taux de change, conversion des
  cachets en EUR) ; à reprendre plus tard sur une branche à part, annoncés comme manquants à la démo.
  Proposition jours fériés (non cadrée) : avertissement, pas refus, si la date tombe un jour férié du pays du lieu ;
  source Nager.Date (gratuite, sans clé, FR/CH/GB/JP).
- **Quota** : semaine à 79 % le 12/10 (réinitialisation le 14/10 à 11 h 59). Sessions courtes, `/clear` entre étapes,
  explications courtes.
- **Limite connue** : changer le mot de passe ne ferme pas les sessions déjà ouvertes (elles expirent seules).
- **Reste à faire (côté humain)** : créer le compte UptimeRobot.
- **Points d'attention** :
  - Vercel Hobby ne garde les journaux qu'environ une heure : refaire la tentative juste avant la démo,
    ou ajouter plus tard une table `journal` consultable par l'agent.
  - **Améliorations futures (demandées par l'humain le 12/10)** :
    1. **Fiches musiciens** : photo, biographie, répertoire, cachet moyen (divisé par 2 pour un duo, par le nombre
       de musiciens en général).
    2. **Indicateurs (KPI)** : nombre de contrats sur l'année ; frise du nombre d'engagements par stade
       (demande → option → contrat envoyé → confirmé → joué, annulé).
    3. **Design global** à poursuivre (pistes non faites dans `docs/design.md` : fiche, formulaire, téléphone, favicon).
    4. **« Nouvel engagement »** : retirer la tuile du tableau de bord ; le bouton existe déjà sur la page des
       engagements, il y reste seul.
    5. **Calendrier** : vue mensuelle où les engagements apparaissent à leur date (couleur par statut, clic → fiche ;
       un musicien n'y voit que les siens).
  - Améliorations possibles : permettre à l'agent d'annuler une invitation (faute de frappe dans l'adresse) ;
    lien de réinitialisation généré par l'agent pour un musicien (Resend ne lui écrit pas sans nom de domaine).
  - **Chaque déploiement de prévisualisation recharge le jeu de données** (`vercel-build`) : les essais faits à la main
    sont effacés au push suivant.
  - Dans les journaux Vercel, une requête qui écrit plusieurs lignes n'en montre qu'une dans la liste :
    cliquer sur l'entrée pour les voir toutes.
- **Vérifié par lecture seulement** : le refus d'un mot de passe trop court sur la page d'acceptation. La règle commune
  (`src/lib/mot-de-passe.ts`) a depuis été constatée sur la page de réinitialisation — à couvrir par un test automatique.
- **Piste (fin de semaine 1 ou badge)** : tests passant par une vraie base (Postgres jetable dans GitHub Actions) pour
  couvrir automatiquement les contrôles d'accès et les liens expirés, aujourd'hui vérifiés à la main.
- **À faire à la fin du projet** : retirer la permission `workflow` de la connexion GitHub
  (`gh auth refresh -h github.com -r workflow`). Accordée le 12/10/2026 pour publier les vérifications automatiques.
  Risque jugé minime : aucun secret GitHub Actions dans les dépôts (`agence-musiciens`, `piano-website`, `studio_piano`) ;
  à reconsidérer si l'on en ajoute un.
- **Compréhension (tour du 12/10/2026, 3 questions)** — à reposer sous une autre forme avant la démo :
  - 🟡 Trajet d'une action : juste sur le résultat et le « pourquoi côté serveur » ; à revoir : le serveur reconnaît
    l'utilisateur et son rôle grâce au **cookie de session signé** (`AUTH_SECRET`), sans consulter la base.
  - 🟡 Méthode : confusion **commit** (version enregistrée sur le Mac) / **push** (envoi vers GitHub, qui déclenche
    vérifications, prévisualisation et copie de base) ; la production n'arrive qu'à la **fusion** dans `main`.
  - ❌ Empreinte du jeton : le serveur recalcule l'empreinte du jeton du lien et la compare ; on ne peut pas remonter
    de l'empreinte au jeton ; protège contre une lecture de la base.
- **Compréhension (2ᵉ question, 12/10/2026)** : 🟡 « Hugo modifie son cookie » — juste : vérification serveur, tricherie
  impossible. À consolider : distinction **hachage** (sans clé, à sens unique : mots de passe, jetons) / **chiffrement par
  clé** (cookie de session, clé `AUTH_SECRET`) ; un cookie modifié est invalide → renvoi à la connexion, pas « Accès refusé ».
- **Cassé** : rien.
- **À améliorer avant Sentry (semaine 2)** : Auth.js journalise chaque mauvais mot de passe comme une erreur
  (`[auth][error] CredentialsSignin`) ; notre ligne « Connexion refusée » suffit, le message d'Auth.js est à faire taire.

---

## Les stades conceptuels

Un produit se construit par couches. Chaque couche répond à une question et s'appuie sur la précédente.

| Stade | Question à laquelle il répond | Semaine | État |
|---|---|---|---|
| 0. Cadrage | Que construit-on, pour qui, avec quelles règles ? | Avant tout | ✅ |
| 1. Fondations | Où vit le produit ? (comptes, dépôt, hébergeur, base) | 1, jour 1 | ✅ |
| 2. Squelette | Avec quoi le construit-on ? (framework, langage, interface) | 1, jour 1 | ✅ |
| 3. Données | Que retient le produit, et sous quelle forme ? | 1 | 🔄 (tables `utilisateurs` et `invitations` ✅ ; engagements à venir) |
| 4. Identité et droits | Qui est connecté, et qu'a-t-il le droit de faire ? | 1 | ✅ (connexion, invitations, rôles, réinitialisation) |
| 5. Métier | Que fait le produit ? (engagements, cycle de vie, règles, API externe, courriels, pièces jointes) | 1 | ⬜ |
| 6. Fiabilité | Comment sait-on que ça marche et que c'est sûr ? (tests, journaux, revue de sécurité, README) | 1 | 🔄 (tests à chaque push et journaux ✅ ; revue de sécurité, README à venir) |
| 7. Automatisation | Que fait le produit tout seul, la nuit ? | 2 | ⬜ |
| 8. Intelligence | Que comprend le produit ? (lecture de documents, recherche qui cite ses sources) | 3 | ⬜ |
| 9. Action | Qu'est-ce que le produit fait à notre place, sous contrôle ? (agent, serveur MCP) | 4 | ⬜ |
| 10. Transmission | Quelqu'un d'autre peut-il le reprendre ? (passation, API pour les autres systèmes) | 5 | ⬜ |

---

## Détail par stade

### 0. Cadrage ✅

| Tâche | État | À quoi ça sert |
|---|---|---|
| Lire la fiche « 5 exercices » | ✅ | Comprendre ce qui est exigé chaque semaine |
| Choisir le sujet : agence de musiciens | ✅ | Un métier connu de l'intérieur, qui peut grandir sur 5 semaines |
| Écrire `SPEC.md` | ✅ | La référence de ce qu'on construit : personnes, rôles, cycle de vie, règles métier. L'IA la relit à chaque session |
| Choisir le sujet du flux de nuit : `reservations` | ✅ | Aucun sujet « concerts » n'existe ; c'est le plus proche |

### 1. Fondations ✅

| Tâche | État | À quoi ça sert |
|---|---|---|
| Créer les comptes GitHub, Vercel, Neon, Resend, Sentry | ✅ | Chaque service est une pièce du produit (voir le glossaire) |
| Créer le compte UptimeRobot | ⬜ | La sonde de surveillance, branchée en semaine 2 |
| Créer le projet Neon (région Francfort) | ✅ | La base de données du produit |
| Publier le dépôt GitHub `ValentinWIA/agence-musiciens` (public) | ✅ | Le code est sauvegardé, versionné, partageable avec le formateur et le repreneur de la semaine 5 |
| Importer le dépôt dans Vercel | ✅ | Chaque push déclenche un déploiement automatique |
| Régler la région des fonctions Vercel sur `fra1` | ✅ | Placer le serveur à côté de la base (Francfort) pour des échanges rapides |
| Relier Neon à Vercel (intégration) | ✅ | `DATABASE_URL` est fournie automatiquement ; chaque prévisualisation reçoit sa propre copie de la base |

### 2. Squelette ✅

| Tâche | État | À quoi ça sert |
|---|---|---|
| Générer le projet Next.js (`create-next-app`) | ✅ | La structure de base du site : pages, serveur, configuration |
| Installer shadcn/ui | ✅ | Les composants d'interface (boutons, formulaires…) exigés par la fiche |
| Vérifier `npm run build` et `npm run lint` | ✅ | Preuve que le projet compile et respecte les règles de style |
| Revue de simplicité du code généré | ✅ | Rien de superflu, hormis la page d'accueil par défaut, remplacée à la tranche 3 |

### 3. Données 🔄 — fonctionnalité « connexion », tranche 1 ✅

| Tâche | État | À quoi ça sert |
|---|---|---|
| Créer la branche `connexion` | ✅ | Travailler sans toucher à la production |
| Installer Drizzle et le pilote Neon | ✅ | Parler à la base en TypeScript, écrire et jouer les migrations |
| Décrire la table `utilisateurs` | ✅ | Stocker l'agent et les musiciens (rôle, instrument, mot de passe chiffré) |
| Générer la migration | ✅ | Le fichier SQL qui crée la table, conservé dans Git |
| Jouer les migrations à chaque déploiement (`vercel-build`) | ✅ | La base suit toujours le code, sans manipulation à la main |

**Preuve constatée (11/10/2026)** : prévisualisation verte ; table `utilisateurs` présente dans la branche Neon `preview/connexion`, absente de `production`.

À venir, hors de cette table : `invitations` et jetons de réinitialisation (tables séparées), colonne `actif` si besoin.

### 4. Identité et droits 🔄 — tranches 2 ✅ et 3 ✅

| Tâche | État | À quoi ça sert |
|---|---|---|
| Page `/installation` (premier admin) | ✅ | Créer le compte de l'agent ; la page se ferme dès qu'un compte existe |
| Auth.js : connexion par e-mail et mot de passe | ✅ | Savoir qui est connecté, sans écrire l'authentification à la main |
| Page de connexion à la place de l'accueil Next.js | ✅ | La porte d'entrée du produit |
| Page protégée `/tableau-de-bord` + déconnexion | ✅ | Vérifier que seuls les connectés y accèdent |
| Fusion dans `main`, vérification en production | ✅ | La fonctionnalité arrive sur le vrai site |
| Invitations : table `invitations` + page `/invitations` réservée à l'admin | ✅ | L'agent invite un musicien et obtient le lien à transmettre (tranche 1) |
| Invitations : page d'acceptation, création du compte musicien | ✅ | Tranche 2 ; refus d'accès d'un musicien à `/invitations` constaté et journalisé |
| Invitations : courriel par Resend | ✅ | Tranche 3 : courriel reçu à l'adresse du compte Resend ; autre adresse refusée par Resend, lien affiché, échec journalisé |
| Réinitialisation du mot de passe | ✅ | Tranche 1 validée en prévisualisation (par courriel, lien d'une heure à usage unique) |
| Journal des déconnexions | ✅ | Ajouté avec la tranche 1 des invitations |

**Preuve constatée pour la tranche 2 (11/10/2026)** : erreurs affichées (e-mail invalide, mot de passe trop court) ;
compte créé avec le rôle `admin` et un mot de passe chiffré (`$2…`) ; `/installation` fermée ensuite.
À faire après la fusion : créer le compte de l'agent en production **immédiatement**, avec un nouveau mot de passe.

Correctif avant fusion : erreur `crypto.getRandomValues()` repérée dans les journaux Vercel, reproduite en local,
corrigée par `lireSession()` (appel de `connection()` avant Auth.js), contre-épreuve sans erreur.

**Preuve constatée pour la tranche 3 (11/10/2026)** : mauvais mot de passe refusé (« Identifiants incorrects ») ;
bon mot de passe → tableau de bord (nom, rôle `admin`) ; session conservée au rechargement ;
déconnexion ; `/tableau-de-bord` sans session → renvoi vers la connexion.

---

## Glossaire : à quoi sert chaque chose

### Outils de travail
- **Node.js** — exécute du JavaScript hors du navigateur ; Next.js en a besoin.
- **npm** — gestionnaire de paquets : télécharge les bibliothèques du projet.
- **`npx`** — lance un outil une fois, sans l'installer durablement.
- **Git** — enregistre l'historique des versions du code.
- **commit** — une version enregistrée, avec un message qui dit pourquoi.
- **branche** — une copie parallèle du code pour travailler sans toucher à `main`.
- **`main`** — la branche principale ; ce qui y arrive part en production.
- **push** — envoyer ses commits vers GitHub.
- **fusion (merge)** — intégrer une branche terminée dans `main`.
- **`gh`** — l'outil GitHub en ligne de commande.
- **tranche** — un petit morceau de fonctionnalité, terminé et vérifié seul avant le suivant.

### Services
- **GitHub** — héberge le dépôt (le code et son historique).
- **Vercel** — héberge le site ; déploie automatiquement à chaque push.
- **production** — le vrai site (`agence-musiciens.vercel.app`) ; on n'y teste jamais rien.
- **prévisualisation (preview)** — une copie complète du site pour chaque branche ; c'est là qu'on teste.
- **région `fra1`** — l'endroit où tourne le serveur Vercel (Francfort), choisi pour être à côté de la base.
- **Neon** — héberge la base de données Postgres.
- **branche Neon** — une copie des **données** (à ne pas confondre avec une branche Git, qui est une copie du **code**).
- **intégration Neon–Vercel** — relie les deux : variables fournies automatiquement, une branche de base par prévisualisation.
- **Resend** — envoie les courriels (invitations, réinitialisation).
- **Vercel Blob** — stocke les pièces jointes (contrats, fiches techniques).
- **Sentry** — signale les erreurs du site (semaine 2).
- **UptimeRobot** — vérifie toutes les 5 minutes que le site répond (semaine 2).

### Fichiers et technologies du projet
- **Next.js** — le framework : il organise les pages selon les dossiers et fait tourner le serveur dans le même projet.
- **React** — la bibliothèque d'interface sur laquelle Next.js est construit (composants).
- **TypeScript** — JavaScript avec des types ; refuse avant l'exécution les erreurs de forme (du texte à la place d'un nombre…).
- **Tailwind CSS** — la mise en forme par petites classes.
- **shadcn/ui** — des composants d'interface copiés dans le projet, qui nous appartiennent.
- **ESLint** — vérifie le code (erreurs, mauvaises pratiques).
- **`package.json`** — la carte d'identité du projet : bibliothèques et commandes.
- **`package-lock.json`** — les versions exactes de chaque bibliothèque.
- **`.gitignore`** — ce que Git ne doit jamais enregistrer (bibliothèques téléchargées, secrets locaux).
- **`components.json`** — les réglages de l'outil shadcn (où ranger les composants, quel style).
- **`next-env.d.ts`** — généré par Next.js, apprend à TypeScript ce qui est propre à Next.js ; jamais modifié, jamais enregistré.
- **`AGENTS.md`** — les consignes que l'IA lit à chaque session (conventions du projet).
- **bcrypt** — chiffre les mots de passe de façon irréversible ; seul le résultat (`$2…`) est stocké.
- **zod** — vérifie côté serveur que les données d'un formulaire ont la bonne forme.
- **action serveur (`"use server"`)** — fonction exécutée sur le serveur quand on envoie un formulaire ; appelable depuis l'extérieur, donc elle revérifie tout.
- **Drizzle** — l'outil qui fait parler le code à la base et écrit les migrations.
- **migration** — un fichier qui décrit une modification de la structure de la base ; rejoué sur chaque base.
- **UUID** — identifiant aléatoire, impossible à deviner.
- **Auth.js** — la bibliothèque d'authentification (sessions, connexion).
- **session (JWT)** — cookie signé avec `AUTH_SECRET` qui prouve, à chaque visite, qui est connecté et avec quel rôle.
- **`verifierSession()`** — le point de contrôle unique côté serveur, appelé par chaque page protégée.
- **pull request** — demande de fusion d'une branche dans `main` sur GitHub ; garde une trace de ce qui a été intégré.

### Sécurité
- **variable d'environnement** — un réglage donné au programme de l'extérieur, rangé chez l'hébergeur ; c'est là que vivent les secrets.
- **`DATABASE_URL`** — adresse de la base via le pooler (connexion mutualisée) ; utilisée par l'application.
- **`DATABASE_URL_UNPOOLED`** — adresse directe de la base ; utilisée pour les migrations.
- **`RESEND_API_KEY`** — la clé qui autorise le produit à envoyer des courriels par Resend (droit « envoi » seulement).
- **`AUTH_SECRET`** — la clé avec laquelle Auth.js signe les sessions.
- **rôle vérifié côté serveur** — le serveur contrôle les droits à chaque demande ; cacher un bouton n'est pas une protection.
- **empreinte (SHA-256)** — résumé irréversible d'un jeton ; seule l'empreinte est stockée, le lien reste secret.
- **`verifierAdmin()`** — contrôle de rôle côté serveur : un non-admin est renvoyé et la tentative journalisée.
- **clé étrangère** — colonne qui pointe vers une ligne d'une autre table (`invitations.cree_par` → `utilisateurs.id`).
- **IDOR** — la faille qui consiste à ouvrir la donnée d'un autre en changeant l'identifiant dans l'adresse.

---

## Journal des décisions

| Date | Décision | Pourquoi |
|---|---|---|
| 10/10/2026 | Sujet : agence de musiciens (1 agent, 2 pianistes, 2 violonistes, 5 programmateurs) | Métier connu ; 10 personnes comme demandé par la fiche |
| 10/10/2026 | Deux rôles : `admin` et `musicien` ; programmateurs sans compte | Réaliste : un programmateur échange par courriel |
| 10/10/2026 | Musiciens en consultation seule | Seul l'agent gère l'agenda |
| 10/10/2026 | Identifiants aléatoires (UUID) | Gratuit maintenant, coûteux à changer plus tard |
| 10/10/2026 | Règle de conflit : trajet (distance × 1,3 ÷ 80 km/h) + 4 h | Rendre la règle testable avec des chiffres |
| 10/10/2026 | Flux de nuit : sujet `reservations` | Le plus proche des engagements de concert |
| 10/10/2026 | Neon plutôt que Supabase | Une copie de base par prévisualisation, stack commune |
| 11/10/2026 | Dépôt GitHub public | Partage simple avec le formateur et le repreneur ; aucun secret dans le code |
| 11/10/2026 | Région Francfort (Neon et Vercel) | Neon n'a pas de région Paris ; serveur à côté des données |
| 11/10/2026 | Drizzle, e-mail + mot de passe, page `/installation` | Plan de la fonctionnalité « connexion » validé |
| 12/10/2026 | Coordonnées des programmateurs réservées à l'agent | L'agent gère la relation ; le musicien voit nom et structure |
| 11/10/2026 | Rétablir un engagement annulé (sauf date passée) ; « confirmé » revient à « contrat envoyé » | Une annulation par erreur obligeait à tout recréer ; reconfirmer rejoue la règle de conflit |
| 11/10/2026 | Création : date passée refusée ; heure saisie = heure locale du lieu | Une demande pour un concert passé n'a pas de sens ; 11 h à Genève reste 11 h à Genève |
| 11/10/2026 | Modification : après « confirmé » (et si annulé), seuls titre, programme et notes changent | Date, lieu, musiciens, durée et cachet sont au contrat ; les changer contournerait la règle de conflit |
| 12/10/2026 | Pays d'un lieu en liste fermée (4 pays dont on connaît le fuseau) | Un pays inconnu recevait l'heure de Paris sans avertissement |
| 12/10/2026 | Doublon de lieu : même nom et (même ville sans chiffres ou moins de 100 m) | La ville en texte exact laissait créer deux fois la même salle |
| 12/10/2026 | Règle de conflit : marge ramenée de 4 h à 1 h ; seuls les engagements tenus (confirmé et après) bloquent ; concerts passés comptés ; égalité permise | Choix de l’humain au cadrage F ; deux options sur une même date restent possibles, la première confirmée l’emporte |
| 12/10/2026 | Trajet toujours estimé en voiture (× 1,3 ÷ 80 km/h) ; plus tard, « confirmer quand même » avec une raison | Trop pessimiste en train ou en avion, mais sûr ; la nuit (pas de transport) fait le cas piégé, une vitesse plus haute l'effacerait ; l'agent connaît les horaires |
| 11/10/2026 | Table `utilisateurs` limitée à 7 colonnes | Invitations et réinitialisations iront dans des tables séparées ; ajouter une colonne plus tard est peu coûteux |
