# Suivi du travail — Agence-musiciens

Ce document suit l'avancement du projet. Il dit **ce qui a été fait**, **à quoi sert chaque élément**,
et **à quel stade conceptuel** appartient chaque ensemble de tâches.
Il est mis à jour à la fin de chaque session (c'est l'« état de reprise » demandé par la fiche).

Légende : ✅ fait · 🔄 en cours · ⬜ à faire

---

## État de reprise

*Dernière mise à jour : 19 octobre 2026 (semaine 3 : **I1 à I7 et brouillon faits**, PR n° 24 à 29 ; semaine 3 terminée)*

- **Semaine 2 — flux de nuit**, branche `flux-de-nuit` (depuis `main`, 17/10). Cadrage validé par l'humain le 17/10 :
  `docs/flux-de-nuit.md` (lu sur une vraie nuit : 15 événements dont 2 doublons ; créations sans musicien, sans heure,
  sans cachet). Décidé : boîte « Demandes reçues » (l'agent en fait un engagement), statuts du flux sans effet sur
  les engagements, messages jamais suivis, **rattrapage des nuits depuis le 20/09**. Manques de l'ancien brouillon
  ajoutés : tableau des exécutions, coût de la nuit, alerte de panne, récap une fois par jour, une nuit par étape.
  Plan validé le 17/10, ordre **N1 → N2 → N3 → N4 → R → S → N5 → D** (la démo d'abord). Décidé : « + nouveau
  programmateur » et « Écarter » dans N5. Estimation : 3 à 4 journées de sessions.
  **N1 ✅** (17/10, commit `5eb0e6b`) : `src/lib/flux.ts`, lecture d'une nuit sans jamais planter (zod, doublons, ordre,
  traduction), 21 tests sur la vraie nuit du 17/10 et des cas mal formés fabriqués (aucun dans les 28 nuits relevées).
  Décidé : référence inconnue → mis de côté, mais messages montrés à part sur `/nuit` et dans le récap.
  **N2 ✅** (17/10, commit `fd7456b`) : tables `executions`, `evenements_flux`, `demandes_recues` (migration 0010),
  vidées par le jeu de données ; migration jouée en prévisualisation, tables vérifiées dans Neon par l'humain.
  Décidé : messages gardés dans `evenements_flux` (pas de 4ᵉ table) ; engagement supprimé → la demande reste, lien
  vidé ; copie de même `id` comptée, pas stockée ; une colonne `appels` (essais compris), une exécution = une nuit.
  **N3 ✅** (17/10, commits `7ba56dc`, `c22b4e4`, `254d33e`) : appel au flux (`src/lib/appel-flux.ts`, 10 s, 3 essais,
  pas de nouvel essai sur 4xx), import d'une nuit (`src/lib/import-nuit.ts`, écriture en un seul `db.batch`), verrou
  par index unique partiel (migration 0011, verrou périmé libéré après 5 min), page `/nuit` avec formulaire
  « Importer la nuit » pré-rempli par la plus ancienne nuit manquante depuis le 20/09 (`prochaineNuit`). 222 tests.
  Vérifiée en prévisualisation par l'humain : 20/09 importée, rejouée → 0 traité, 16 doublons ; 21/09 ; musicien
  renvoyé. Décidé (décisions 4 à 7 du cadrage) : nuits importées dans l'ordre ; récap → migration 0012 ; lien du menu
  renommé « Journal des imports » ; en N5, « Demandes reçues » après « Engagements », journal hors menu.
  Limite connue : un événement sans `id` lisible serait réenregistré si sa nuit est rejouée (aucun cas relevé).
  **N4 ✅** (17/10, plan `c31f3cc` = section 12 du cadrage, commits `dde7b67`, `19fc43b`) : `nuitsManquantes`
  (`src/lib/flux.ts`, 3 tests, 225 au total) ; `rattraper` (`src/lib/import-nuit.ts`) importe les nuits manquantes
  dans l'ordre, s'arrête à la première en échec ou après 200 s (fonction Hobby : 300 s au plus) ; bouton « Rattraper
  les nuits manquantes » sur `/nuit` ; route `/api/cron/nuit` (401 sans `CRON_SECRET`, comparaison en temps constant),
  cron `0 4 * * *` UTC dans `vercel.json`. Gestes validés en prévisualisation le 17/10 : 28 nuits rattrapées en
  quelques secondes, second clic → « Rien à importer », nuit rejouée → 0 traité ; route sans secret → 401 journalisé.
  `CRON_SECRET` créé par l'humain (Production et Preview). **PR n° 16 fusionnée le 17/10** (`65a99f5`, migrations
  0010 et 0011 jouées en production). **Gestes validés en production le 17/10** : route ouverte au navigateur → 401
  journalisé (User-Agent Chrome) ; 28 nuits rattrapées au bouton ; « Run » du cron dans Vercel → 200, « 0 nuit(s)
  importée(s) » (tout était à jour). Le 1er « Run » n'avait laissé aucune trace (clic sans effet). Le premier passage
  automatique aura lieu le 18/10 entre 6 h et 7 h (heure de Paris) : vérifier une ligne « cron » au journal.
  Rien de cassé.
  **D ✅** (17/10, branche `domaine` depuis `recap`, plan = section 13 du cadrage, commit `1423458`) :
  passée avant R (le récap doit arriver chez l'agent). Expéditeur `ne-pas-repondre@mail.valentinwalczak.com` ; rien
  n'est envoyé vers une adresse `.test` (3 tests, 228 au total). Panne trouvée : `RESEND_API_KEY` refusée par Resend
  (« API key is invalid ») ; nouvelle clé `agence-musiciens-vercel` mise par l'humain dans Vercel (Production et
  Preview). Gestes validés le 17/10 : invitation reçue sur Hotmail, en boîte de réception ; `.test` → rien envoyé ;
  invitations annulées. Vers l'ESSEC : « Delivered » chez Resend, reçu avec retard (domaine neuf). **PR n° 17
  fusionnée le 17/10** (`f62897c`). En production, 1er essai « API key is invalid » : la variable de Production gardait
  l'ancienne clé ; corrigée par l'humain (nouvelle clé, Redeploy). **Geste validé en production le 17/10** : invitation
  reçue sur Hotmail, invitations à de vraies adresses annulées. À faire par l'humain : supprimer dans Resend les clés
  inutilisées ; garder une seule variable `RESEND_API_KEY` (Production et Preview) évite ce décalage.
  **R ✅** (17/10, branche `recap`, plan = section 14 du cadrage, commits `2f5f8c8` à `a716557`) :
  R1 `src/lib/recap.ts` (pur : options qui expirent sous 7 j, cachets impayés après 30 j, rédaction) ; R2 migration 0012
  (`recaps`, `engagements.option_expire_le`), échéance saisie en posant l'option (J+14 proposé, jamais après le concert),
  affichée sur la fiche ; R3 `src/lib/envoi-recap.ts` (ligne du jour réservée avant l'envoi, retirée si l'envoi échoue),
  appelé après le rattrapage par le cron, bouton « Envoyer le récap du jour » sur `/nuit`. 244 tests.
  Décidé : récap = tout ce qui est importé depuis le précédent (listes limitées à 20) ; adresse perso de l'humain sur le
  compte agent (changée en SQL dans Neon, production). Retours de l'humain au geste : récap peu lisible → refait
  (« En bref », « À faire » avec artistes et salle, « Reçu du flux », import en une phrase) ; lien vers `/nuit` pour les
  mis de côté ; plus de « voir le site » tant que `/demandes` n'existe pas. Gestes validés en prévisualisation :
  option posée (J+14, date passée refusée) ; récap reçu ; second clic → « Déjà envoyé aujourd'hui ».
  **Ordre changé le 17/10 : N5 avant S** (le récap annonce des demandes que l'agent ne peut pas encore ouvrir).
  **PR n° 18 fusionnée le 17/10** (`e093c24`, migration 0012 jouée en production). **Gestes validés en production le
  17/10** : option posée (J+14 proposé, date passée refusée, échéance affichée) ; récap reçu au bouton, second clic →
  « Déjà envoyé aujourd'hui ». **Reste à vérifier le 18/10** : récap reçu sans clic après le cron (6 h–7 h, heure de
  Paris) et ligne « cron » au journal. Rien de cassé.
  **Échéance sous la pastille ✅** (17/10, branche `echeance-option`, commit `b82975f`) : sur la fiche d'une option,
  « jusqu'au sam. 31 oct. » en petit sous la pastille, agent seulement, en orange à 7 jours ou moins ou passée ; ligne
  « Option » du bas retirée. Règle partagée avec le récap (`optionARelancer`, `src/lib/recap.ts`, 1 test, 245 au total).
  Gestes validés en prévisualisation (gris à J+14, orange à 7 j, rien côté musicien). **PR n° 19 fusionnée le 17/10**
  (`d5b548c`), vérifiée en production. Trouvé en production : les 6 options du jeu de données, chargées le 16/10 avant
  la migration 0012, n'avaient pas d'échéance (ni affichée, ni au récap) ; dates du jeu de données remises par l'humain
  en SQL dans Neon (6 lignes), affichage vérifié. **Le 18/10, le récap doit lister 3 options à relancer** (Londres
  passée, Zurich, Bordeaux). Rien de cassé.
  **N5 ✅** (branche `demandes-recues`, PR n° 20 fusionnée le 18/10, `6185d2e`). Plan validé = **section 15 du cadrage**
  (`c0967b2`) : 7 tranches, pushs groupés N5a+N5b, N5c, N5d, N5e, N5f+N5g. Décidé : annulée / terminée sortent de
  « À traiter » ; « Remettre à traiter » existe.
  **N5a ✅** (`dfd2759`) `src/lib/demandes.ts` (à traiter, tri, pré-remplissage, homonyme → personne) ; menu « Demandes
  reçues » après « Engagements », journal hors menu. **N5b ✅** (`988d94d`) page `/demandes` (À traiter / Toutes,
  messages pour une demande inconnue déplacés depuis `/nuit`, « Dernier import — voir le journal »).
  **N5c ✅** (`e2d6859`, `a189cf9`) fiche `/demandes/[id]` avec historique. Retours de l'humain au geste : liste peu
  claire → phrase d'explication, « Côté programmateur » (et non « statut du flux »), référence seulement sur la fiche,
  lien sur la **date** (un programmateur peut faire plusieurs demandes), historique au jour, une phrase par événement.
  Expliqué : message ↔ demande par la **référence** du flux. **N5d ✅** (`e733bf3`) migration 0013
  (`demandes_recues.ecartee_le`), « Écarter » / « Remettre à traiter » (condition dans la requête, journalisé).
  258 tests. Gestes N5b à N5d validés le 17/10 (cas des deux onglets : il fallait recharger le second).
  **N5e ✅** (18/10, commits `42c5883` à `30bf0b5`) : « Créer l'engagement » sur la fiche (sauf écartée) →
  `/engagements/nouveau?demande=<id>` : résumé de la demande et historique (déplié s'il y a des messages) au-dessus du
  formulaire ; date et durée reprises, programmateur de même nom, lieu du flux rappelé, `demandeId` caché. Liaison
  dans le même `db.batch` : les musiciens prennent l'engagement **dans la demande** ; reliée ou écartée entre-temps →
  valeur vide, la base refuse (23502), rien n'est gardé ; refus journalisé. 259 tests.
  Retours de l'humain au geste : page qui plantait (`VIDE`, constante d'un fichier « use client », dépliée côté
  serveur ; le chemin `?musicien=` depuis M3b l'était aussi) ; formulaire non pré-rempli et brouillon d'une autre
  demande (Next garde les pages visitées avec leur saisie : `key` par demande) ; retour à la liste par ancre sans effet
  (même raison) → `?ici=<id>`, ligne surlignée en doré et ramenée à l'écran, onglet gardé.
  **Décidé le 18/10** : demande à date passée **non bloquée** (le flux ne change jamais la date ; une nouvelle date
  convenue par message reste du texte) : date laissée vide, phrase en rouge « saisissez la date convenue ».
  Gestes validés le 18/10 : pré-remplissage, pas de brouillon d'une autre demande, date passée, retour sur « À
  traiter » et « Toutes », seconde tentative refusée (deux onglets, un seul engagement), écartée sans bouton.
  Surlignage doré (`30bf0b5`) : jugé assez visible au geste de N5f.
  **N5f ✅** (18/10, `b7fe84e`, `ad962f1`, `413aa98`) : `src/lib/programmateurs.ts` (lecture, doublon = même e-mail,
  homonyme permis, `presenterProgrammateur`) ; « + nouveau programmateur » dans le formulaire (fenêtre à côté, nom
  du demandeur pré-rempli, créé → choisi), action réservée à l'agent ; phrase d'aide sous la liste (aucun / plusieurs
  du même nom, règle `programmateursDeMemeNom` partagée avec le pré-remplissage). Pas de téléphone (décidé).
  Retour au geste : **structure facultative** → migration 0014 (`programmateurs.structure` sans `NOT NULL`), vide →
  null, nom seul affiché ; lignes existantes en production : toutes ont une structure, rien à remplir.
  **N5g ✅** (`651e511`) : le récap ajoute « Traiter les demandes reçues : …/demandes » après les listes dès que la
  nuit apporte quelque chose du flux. 269 tests.
  **Retours N5e au geste** (`5ee1409`, `8cf77c9`) : après création depuis une demande, retour sur « À traiter »
  (option A : vider la file) ; la demande traitée reste une fois à sa place, surlignée, défilée, « Voir l'engagement
  → » sur la ligne ; création à la main → fiche, inchangé. Phrase au-dessus du formulaire en sous-titre sans cadre
  (le cadre la faisait prendre pour un champ).
  Gestes validés le 18/10 en prévisualisation : phrase d'aide, refus (vides, e-mail mal formé, e-mail connu en
  majuscules), création avec et sans structure, saisie gardée, retour à la ligne traitée, bouton hors demande,
  récap reçu avec le lien, sous-titre (date à venir et passée).
  **PR n° 20 fusionnée le 18/10** (`6185d2e`, migrations 0013 et 0014 jouées en production). **Gestes validés en
  production le 18/10** : menu, liste `/demandes`, fiche, formulaire pré-rempli (sous-titre, « + nouveau
  programmateur », annulé sans rien enregistrer), musicien renvoyé. **Reste à vérifier le 19/10** : lien « Traiter les
  demandes reçues » dans le récap du cron. Rien de cassé.
  **S ✅** (branche `surveillance` depuis `main`, 18/10). Plan validé = **section 16 du cadrage** (`3eeede2`) : S1 santé,
  S2 Sentry, S3 alerte de panne, S4 UptimeRobot. Décidé : **deux sondes** (`/api/sante` toutes les 5 min sans la base,
  `?base=1` toutes les heures : Neon gratuit = 100 CU-h/mois, une sonde de la base toutes les 5 min l'épuiserait) ;
  bouton « Envoyer une erreur de test » sur `/nuit` ; pas de `SENTRY_AUTH_TOKEN` ; **pas de captures** (décidé au geste).
  **S1 ✅** (`88aa58e`) `src/lib/sante.ts` + `/api/sante` (`ok` 200 / `en panne` 503, 5 s au plus pour la base), 4 tests.
  Geste validé en prévisualisation : les deux adresses → `ok`.
  **S2 ✅** (`ae32518`, `a905107`) `@sentry/nextjs` 11.7.0 fixée, `src/instrumentation.ts` (`onRequestError`),
  `src/instrumentation-client.ts`, `src/app/global-error.tsx`, `src/lib/sentry.ts` : Sentry 11 collecte tout par
  défaut → cookies, en-têtes, corps, variables locales coupés, jetons d'invitation / réinitialisation masqués (4 tests,
  277 au total). Variable **`SENTRY_DSN`** (déjà dans Vercel, Production et Preview), recopiée dans le code du
  navigateur par `next.config.ts` (`env`) avec `VERCEL_ENV`. Carte « Surveillance » sur `/nuit`, sous « Exécutions ».
  Geste validé en prévisualisation : erreur de test vue dans Sentry, courriel de Sentry reçu.
  **S3 ✅** (`2c65961`) `src/lib/alerte.ts` (règle pure « une alerte par panne » : aucune exécution depuis la dernière
  réussie n'a d'`alerte_le` ; courriel composé), 6 tests, 283 au total ; migration 0015 (`executions.alerte_le`, lignes
  existantes vides = aucune alerte, rien à remplir) ; `src/lib/envoi-alerte.ts` appelé dans `echouer` avant de libérer
  le verrou : courriel à l'agent + Sentry, `alerte_le` posé seulement si le courriel est parti. Sentry seul : exécution
  interrompue, base absente à la création, récap non parti. « alerte envoyée le … » dans la colonne État de `/nuit`.
  Gestes validés en prévisualisation le 18/10 (fausse `FLUX_DE_NUIT_CLE` en Preview, branche `surveillance`) :
  1er échec → courriel, erreur Sentry, mention sur `/nuit` ; 2e échec → rien de plus ; variable de branche supprimée,
  Redeploy → rattrapage réussi.
  **S4 ✅** (18/10, l'humain, sans code) : compte UptimeRobot, sonde `/api/sante` toutes les 5 min et
  `/api/sante?base=1` toutes les heures, sur la production. Preuve : la sonde 1, créée avant la fusion, a reçu un 404
  (`/api/sante` n'existait pas encore en production) → courriel « Down » reçu ; vertes après la fusion.
  **PR n° 21 fusionnée le 18/10** (`bf469a6`, migration 0015 jouée en production). **Gestes validés en production le
  18/10** : sondes UptimeRobot vertes, erreur de test Sentry reçue (environnement `production`), `/nuit` inchangée.
  Leçon : une sonde ne surveille que la production (les prévisualisations sont protégées, 302) → la créer après la
  fusion. Rien de cassé.
  **Semaine 2 terminée** (flux de nuit : N1 à N5, D, R, S en production). Branches Neon des prévisualisations
  supprimées par l'humain le 18/10.
  **Prochaines demandes après S** : les reportés ci-dessous.
- **Passe de design « envoi » ✅** (branche `design-envoi`, **PR n° 22 fusionnée le 18/10**, `fa52147`). Décidé le 18/10 :
  le projet doit avoir l'air fini à l'envoi → design **avant** le code de la semaine 3 (une session, ordinateur
  d'abord). Cadrage, décisions et écarts : `docs/design.md`, section « Passe « envoi » » (sections 1 à 5).
  Tranches V1 à V8 (`052071f` à `2b3cf97`) : palette « black tie » (cadre noir via la classe `.dark` posée sur le menu
  et les bandeaux, contenu sur blanc froid, filet or, en-têtes de tableau noirs) ; logo « la maison » C | M et
  `src/app/icon.svg` ; titres en **Playfair Display** partout ; connexion accueillante (contact fictif
  `assistance@cm-management.test`, « © CM Management 2026 ») ; tableau de bord en deux colonnes : **« À faire »**
  (factures à relancer, contrats à envoyer, options qui expirent, demandes à traiter ; 10 lignes par liste, listes
  réparties en deux colonnes équilibrées), saison en frise verticale centrée, calendrier, liste compacte des musiciens ;
  liste dépliable des musiciens dans le menu de l'agent ; « Invitations » retiré du menu → tuile « + Inviter un
  musicien » sur `/musiciens` ; « Nouvel engagement » au niveau des filtres. **« À faire » lit la base avec le même code
  que le récap** (`src/lib/lecture-a-faire.ts`). 293 tests. Choix faits sur des planches HTML locales (palette et
  logos, puis cinq polices). **Gestes validés en prévisualisation puis en production le 18/10.**
  Écart corrigé avant commit : `npx prettier` (absent du projet) avait reformaté un fichier → ne pas l'utiliser.
  **Reste à vérifier le 18/10** (après le cron, 6 h–7 h) : ligne « cron » sur `/nuit` et récap reçu sans clic, dont les
  options et factures correspondent au panneau « À faire » (première preuve en production de la lecture partagée).
  **Le 19/10** : lien « Traiter les demandes reçues » dans le récap du cron. Rien de cassé.
- **Prochaine demande : filtre des engagements par programmateur** (rappelé par l'humain le 18/10), branche
  `filtre-programmateur` depuis `main`, court cadrage d'abord (engagements sans programmateur ? filtre dans l'adresse
  comme les autres ?). Puis **semaine 3 (IA)**.
  **Cadrage validé le 18/10** : filtre pour l'agent seulement, à côté de « Musicien » ; tous les programmateurs
  listés (« Nom — Structure ») ; `?programmateur=<id>` dans l'adresse, identifiant mal formé ignoré ; aucun
  engagement sans programmateur (`programmateur_id` obligatoire). Hors périmètre : total des cachets, export, colonne
  « Programmateur ». Une tranche **P1** ; preuve = geste en prévisualisation (pas de test ajouté, décidé).
  **P1 ✅** (`5a4b77a`, `d94fb18`) : condition `programmateurId` dans `listerEngagements`, liste déroulante dans
  `/engagements` (agent seulement). Retour au geste : case trop large (libellé le plus long) → largeur fixe `w-56`.
  Geste validé en prévisualisation le 18/10 (filtre seul, avec « Tous », avec un musicien, effacer, vue musicien).
  Premier déploiement Vercel en échec puis relancé seul avec succès ; cause non lue (connecteur Vercel refusé, 403).
  **PR n° 23 fusionnée le 18/10** (`a466a0d`). **Geste validé en production le 18/10** (filtrer, effacer). Rien de cassé.
  **Prochaine demande : semaine 3 (IA)**, après `/clear`.
- **Semaine 3 — lecture préparatoire faite le 18/10** : 10 courriers (`/api/courriers?sujet=reservations`) lus ; pièges
  confirmés : COU-07 sans montant, COU-04 daté « la semaine dernière » ; références `RES-2024-589` (format différent
  des nuits, ne correspondent à aucune demande) ; contenu = réunions et salles, **ni date de concert ni programme** →
  l'adaptation au vocabulaire du produit est à trancher au cadrage. 20 documents listés (procédures, contrats,
  comptes rendus, notes de service, FAQ ; 2 à 3 pages chacun) mais **texte des pages pas encore lu** : il faut
  `GET /api/documents?sujet=reservations&id=DOC-reservations-NN`. Le garde-fou de Claude Code a refusé ces appels
  (pris pour des données personnelles) → c'est l'humain qui les lance avec `!` (commande dans la conversation du 18/10 :
  boucle `for n in $(seq -w 1 20)` vers le dossier temporaire de la session).
  **Cadrage de la semaine 3 validé le 18/10** (branche `ia` depuis `main`) : `docs/semaine-3.md`. Les 20 documents
  (50 pages) lus : 4 versions de la même procédure aux seuils différents, titres qui contredisent le contenu.
  Décidé : extrait exact exigé pour chaque champ d'un courrier, vérifié par le code (sinon « à relire ») ; citations
  natives de l'API pour les questions ; modèle **choisi sur mesure en I2** (Haiku 5.5 contre Opus 5.5 sur les 10
  courriers) ; Voyage AI si gratuit ; fonctions IA pour l'agent seulement ; classer + brouillon (pas de résumé) ;
  courrier enregistré après validation ; 30 appels par jour et plafond de 5 $ par mois ; analyse de nuit sur `/nuit`
  et dans le récap. Plan I1 → I7 (section 7). Consigne de l'humain : **strict nécessaire, au plus simple**.
  **I1 ✅** (`8ea3074`) : `@anthropic-ai/sdk`, `src/lib/couts-ia.ts` (prix en millionièmes de dollar, 30 appels par
  jour, plafond 5 $ par mois, 6 tests, 299 au total), `src/lib/ia.ts` (seul appel à Claude, `server-only`, limites
  vérifiées avant, appel enregistré même en échec, Sentry au plafond, 60 s et un nouvel essai au plus), migration 0016
  (`appels_ia`, jamais vidée par le jeu de données), page `/couts` (agent) avec « Tester l'IA », lien depuis `/nuit`.
  Clé `ANTHROPIC_API_KEY` (Production et Preview) et plafond de dépense dans la console : faits par l'humain.
  Geste validé en prévisualisation le 18/10 : page vide, test → « OK » et ligne comptée, lien sur `/nuit`, musicien
  renvoyé.
  **I2 ✅** (`e48a7f1`, `87e3a92`) : `src/lib/courrier.ts` (format imposé, consigne, vérification des extraits : extrait
  présent dans le courrier, chiffres de la date et du montant écrits dans l'extrait, sinon « à relire » ; saisie en
  centimes), 12 tests sur les 10 vrais courriers (`src/lib/courriers.flux.json`) avec des réponses fabriquées, 311 au
  total ; migration 0017 (`courriers`) ; page `/courriers` (dépôt texte / `.txt` / `.pdf` par `unpdf`, champs à relire,
  validation, liste), lien « Courriers » au menu de l'agent. Le classement est fait dans le même appel.
  Retour au geste : signataire réduit au nom de famille → c'était la consigne (« nom seulement ») ; corrigée.
  Gestes validés le 18/10 : COU-07 montant absent, COU-04 date absente, validation, recette → rien de vérifié,
  coûts comptés, musicien renvoyé ; **les 10 courriers justes avec Haiku**. Décidé : **Haiku par défaut** (comparaison
  avec Opus sautée : zéro erreur), **Sonnet 5.5 au choix** dans le menu pour un courrier complexe.
  **I3 ✅ (résumé à la place du brouillon)** (`68512cd` à `058eb4e`) : décidé le 18/10 faute de temps ; le résumé
  (une phrase, même appel que la lecture, migration 0018 `courriers.resume`) remplit l'exigence « deux sur trois »
  avec le classement ; le streaming exigé est fait en I5. Fiche `/courriers/[id]` (champs, résumé, texte, « Courrier
  introuvable ») avec un cadre « Réponse » : zone de texte à remplir à la main, non enregistrée, « Rédaction d'un
  brouillon par l'IA : en développement ». « Valider » renommé **« Enregistrer »** (pouvait se lire comme accepter
  la demande) avec la phrase « ne répond pas à l'expéditeur et ne modifie aucun engagement ». Gestes validés le
  18/10 en prévisualisation. **Le brouillon de réponse est à faire après l'envoi de midi.**
  **PR n° 24 fusionnée le 18/10** (`f6a6b39`, migrations 0016 à 0018 jouées en production). **Gestes validés en
  production le 18/10** : menu « Courriers », « Tester l'IA » → « OK » compté sur `/couts`, COU-07 montant absent,
  enregistré, fiche avec cadre « Réponse ». Retours en production → **PR n° 25** (`c8fa058`, branche
  `courriers-retouches`) : lien « Coûts » sur `/courriers` (il n'était que sur `/nuit`), colonne « Expéditeur » à
  `min-w-44` (14 rem écrasait « Classement »), validés en prévisualisation. Rien de cassé.
  **I4 ✅** (19/10, branche `documents`, commits `1742234`, `4cd870d`, `b963fb6`) : Voyage vérifié (offre gratuite
  sans carte : 3 requêtes et 10 000 jetons par minute ; 200 M de jetons offerts sur `voyage-4`). Idée écartée : envoyer
  les 50 pages à Claude sans index — la fiche exige « découpage, embeddings, pgvector ». `src/lib/documents.ts` (une
  page = un passage, empreinte SHA-256, 8 tests), `src/lib/indexation.ts` (documents lus sur le flux au moment
  d'indexer, un seul appel à Voyage, compté sur `/couts` à 0 $), migration 0019 (extension `vector`, table `passages`,
  jamais vidée par le jeu de données), bouton « Indexer les documents ». `VOYAGE_API_KEY` mise par l'humain
  (Production et Preview). Retour au geste : chaque page qui appelle une IA le dit et mène à « Coûts ».
  **PR n° 26 fusionnée le 19/10** (`32c7c67`).
  **I5 ✅** (19/10, branche `questions`, commits `e4959c6`, `8b4af0a`, `10573e2`) : `src/lib/questions.ts` (consigne,
  pages fournies comme résultats de recherche avec citations natives : l'API ne peut citer que ces pages ; tri des
  sources citées ; 5 tests, 324 au total), `chercherPassages` (5 pages les plus proches, distance cosinus),
  streaming dans `appelerModele` (fonction « question », Haiku 5.5), route `POST /api/questions` (agent seulement,
  403 sinon ; une ligne JSON par message : étapes, texte, sources). Retours au geste : « Questions » ne disait rien à
  l'agent → section renommée **« Documents »** (adresse `/questions` inchangée) ; aucun document visible → liste
  dépliable des 20 documents et de leurs pages (sert aussi à vérifier une page citée). **PR n° 27 fusionnée le 19/10**
  (`9477424`, migration 0019 jouée en production). **Gestes validés en production le 19/10** : indexation, question
  sur la double validation (streaming, pages citées), question hors sujet → « aucune source citée », lignes sur
  `/couts`. Le premier déploiement de la branche `questions` a échoué puis s'est relancé seul (cause non lue).
  Adresse fixe d'une prévisualisation : `agence-musiciens-git-<branche>-valentin-4768.vercel.app` (la donner à
  l'humain plutôt que l'adresse de chaque déploiement).
  **I6 ✅** (19/10, branche `analyse-nuit`, commits `12e98e6` à `f4bd1a3`) : `src/lib/analyse-nuit.ts` (consigne,
  données de la nuit entre `<donnees>`, « < » des messages neutralisé pour qu'un message piégé ne sorte pas des données,
  réponse vide ou trop longue refusée ; 5 tests), fonction « analyse » (Haiku 5.5, 2000 jetons, effort bas). **Une seule
  analyse par passage** (la dernière nuit importée par le cron, « Rattraper » ou « Importer la nuit ») : rattraper
  28 nuits ne coûte qu'un appel. Faite après l'écriture de la nuit : une panne de l'IA ne fait jamais échouer l'import.
  Migration 0020 (`executions.analyse`, `analyse_erreur` ; anciennes nuits sans analyse, assumé). « Analyse (IA, à
  relire) » sous la nuit sur `/nuit`, bloc après « En bref » dans le récap (1 test, 330 au total). Budget du rattrapage
  ramené à 150 s (place pour l'analyse dans les 300 s). Au 1er geste : « indisponible (réponse vide de l'IA) » — la
  réflexion de Haiku comptait dans `max_tokens` (600) ; corrigé (2000, effort bas). Panne ainsi vue en vrai : nuit
  importée, raison affichée, récap reçu. Retour au geste : **lien de retour sur `/couts`** (`?depuis=nuit|courriers|
  questions` → « ← Journal des imports », « ← Courriers », « ← Documents »). Gestes validés en prévisualisation
  (analyse jugée correcte, second rattrapage sans appel, ligne sur `/couts`). **PR n° 28 fusionnée le 19/10**
  (`db6de68`, migration 0020 jouée en production) ; **gestes validés en production** : nuit importée et analysée,
  retour depuis Coûts. La création et la fusion de PR par Claude sont bloquées par le garde-fou (« Merge Without
  Review ») : l'humain lance `gh pr create … --fill` et `gh pr merge … --merge` avec `!`.
  Remarque de l'humain : le flux (salles, rendez-vous) ne correspond pas vraiment au métier ; à écrire dans I7 comme
  limite connue.
  **Reste à vérifier le 20/10** : cron du matin (6 h–7 h, heure de Paris) → ligne « cron » avec analyse sur `/nuit`,
  récap reçu sans clic avec le bloc « ANALYSE (IA, À RELIRE) ».
  **Brouillon de réponse ✅** (19/10, branche `brouillon`, commit `3489034`) : bouton « Proposer un brouillon (IA) »
  dans le cadre « Réponse » de la fiche courrier, texte en streaming (route `POST /api/courriers/[id]/brouillon`, agent
  seulement, 403 sinon ; fonction « brouillon », Haiku 5.5), modifiable, « Copier », mention « rédigé par l'IA, à
  relire » ; rien n'est enregistré ni envoyé. Consigne : ne rien inventer ni promettre, demander ce qui manque ; courrier
  balisé comme donnée (`src/lib/brouillon.ts`, 1 test, 331 au total). Gestes validés en prévisualisation le 19/10.
  **Panne au déploiement** : `url: undefined` à `drizzle-kit migrate` (aussi au 1er déploiement de `questions`) —
  **limite de branches de l'offre gratuite Neon atteinte**, l'intégration ne créait pas la base de la nouvelle branche ;
  l'humain a supprimé dans Neon les branches de prévisualisation des fonctionnalités fusionnées, puis « Redeploy ».
  **À refaire avant chaque nouvelle branche** si la liste est pleine (jamais la branche principale).
  **I7 ✅** (19/10, branche `rendu-ia`) : `docs/ia.md` — fonctions IA et erreurs visibles, coûts **estimés** (chiffres
  réels sur `/couts`), récit de la panne Neon comme moment où l'IA a tourné en rond.
  **Prochaine étape** : semaine 4 (agent), après `/clear`.
  Après chaque push, rattraper les nuits sur `/nuit` (le jeu de données vide les tables du flux).
  Clé du flux recopiée dans Vercel (`FLUX_DE_NUIT_CLE`, Production et Preview) le 17/10.
  Domaine `valentinwalczak.com` (OVH, `contact@` déjà utilisé) : envoi par le sous-domaine `mail.` (tranche D).
- **Reportés en semaine 5** (décidé le 17/10) : améliorations n° 3 (design global) et n° 8 (engagements en cartes
  sur téléphone), pour une seule passe de design quand tous les écrans existeront. *(18/10 : n° 3 fait en grande partie
  par la passe « envoi » ; restent le téléphone (n° 8) et les fiches / formulaires, après l'envoi.)*
- **Reporté** (noté le 18/10, demande à part avec son cadrage) : l'heure obligatoire d'un engagement est trop
  contraignante → pouvoir choisir « matin », « après-midi (12 h-18 h) » ou « soir » ; heures de 5 en 5 minutes.
  Touche le formulaire d'engagement et sans doute le schéma (précision de la date).
- **Reporté** (noté le 18/10, demande à part avec son cadrage) : sur la fiche musicien, avant le cachet moyen,
  afficher les **revenus totaux de la saison en cours**. À trancher au cadrage : bornes de la saison (septembre à
  août ?), engagements comptés (confirmés, réalisés, payés ?), cachets en plusieurs devises.
- ~~**Reporté** (noté le 18/10) : bouton « Nouvel engagement » au niveau des filtres~~ ✅ fait dans la passe « envoi ».
- ~~**Reporté** : filtrer les engagements par programmateur~~ ✅ fait (P1, PR n° 23).
- **Reporté** (noté le 18/10) : rendre la page `/couts` plus visible (liens depuis `/nuit`, `/courriers` et
  « Documents » ; pas encore au menu).
- **Piste notée le 19/10** (après la semaine 3, demande à part) : réunir « Courriers » et « Demandes reçues » dans une
  seule section du menu (« Documents » reste à part, décidé par l'humain).
- **Question notée le 18/10** (après la semaine 3) : une demande reçue devient un engagement au statut « demande »,
  pas « option ». Raison actuelle : le flux ne donne pas l'heure, et une option exige date et heure précises, durée et
  échéance (`src/lib/cycle-de-vie.ts`) ; poser une option, c'est s'engager auprès du programmateur (date tenue jusqu'à
  l'échéance, relance au récap), ce que l'agent fait après avoir vérifié la disponibilité du musicien. Piste si
  l'agent pose souvent l'option tout de suite : une case « poser l'option dès la création » (heure et échéance
  saisies) dans le formulaire de création depuis une demande, plutôt qu'un changement de règle.

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
  **Fin de semaine 1 (branche `fin-semaine-1`, 16/10)** : jours fériés (`src/lib/feries.ts`, Nager.Date, jours
  nationaux seulement, avertissement à côté de la date, jamais de refus) ; cachet en devise converti en euros à titre
  indicatif (`src/lib/change.ts`, Frankfurter, taux BCE du jour, relus au plus 2 fois par jour, rien n'est rangé en base) ; service en panne → rien
  d'affiché, une ligne dans les journaux. `CredentialsSignin` d'Auth.js filtré (`src/auth.ts`). 114 tests.
  Cas ajouté au jeu : récital d'Inès à Gaveau le 8 mai 2027. **Gestes à faire en prévisualisation** : fiche du 8 mai
  → « jour férié : Victoire 1945 » ; duo de Genève en CHF → « ≈ … € (taux BCE du …) » ; engagement en EUR → pas de
  conversion ; mauvais mot de passe → plus de `[auth][error]` dans les journaux Vercel.
- **Reprise du 16/10 (après /clear)** — lire d'abord `AGENTS.md` (la boucle), puis ceci :
  - **PR n° 7 `fin-semaine-1` fusionnée** (jours fériés, devises, filtre `CredentialsSignin` par `type`) ; gestes 1 à 4
    validés en prévisualisation ; les 2 gestes en production (CHF → €, plus de trace après un mauvais mot de passe)
    confirmés par l'humain le 17/10.
  - **En cours : branche `fiches-musiciens`** (poussée ; prévisualisation
    https://agence-musiciens-git-fiches-musiciens-valentin-4768.vercel.app). Cadrage `docs/fiches-musiciens.md`, ajouts
    validés le 16/10 : notes privées de l'agent (point 8), **portraits réalistes générés par IA** pour la démo (point 9,
    remplace « pas de photo fictive »), cachet moyen **en euros** (taux BCE du jour, repli par devise sans taux),
    passés : 5 affichés + « Afficher plus ».
    M1 ✅ migration 0008 jouée en prévisualisation. M2 ✅ `src/lib/musiciens.ts` (règles pures, testées).
    M3 ✅ pages `/musiciens` (agent) et `/musiciens/[id]` (`lireMusicien` : « introuvable » + « Accès refusé »
    journalisé), tuiles « Musiciens » / « Ma fiche », tuile « Nouvel engagement » retirée ; 4 gestes validés.
    M3b (commit `de38685`) : grille des musiciens sur le tableau de bord de l'agent, « Nouvel engagement » depuis une
    fiche (`?musicien=`, pré-coché), « Inviter » sur `/musiciens`. M3c (commit `e9f7a52`) : `cachetMoyenEnEuros`,
    `<details>` « Afficher plus ». 138 tests ; vérifications vertes, déploiement réussi.
    **Gestes à faire (M3b + M3c)** : grille au tableau de bord ; Inès pré-cochée → engagement créé visible dans
    « À venir » ; « Inviter » ; Louis sans grille ni bouton ; cachet de Louis en un seul « ≈ … € » avec date du taux ;
    « Afficher plus » sur une fiche à plus de 5 passés.
    M4a ✅ (commit `2e84e9d`) : colonne `notes_agent` (migration 0009, jouée en prévisualisation), `verifierFiche`
    limite les notes à 2 000 caractères et ne les renvoie que si elles étaient dans la saisie ; notes fictives pour
    Anna et Louis. M4b ✅ (commit `63ce4e0`) : page `/musiciens/[id]/modifier`, action `modifierFiche` (musicien : sa
    fiche seulement ; notes envoyées par un musicien → refus journalisé), notes lues pour l'agent seulement, bloc
    « Notes de l'agent » et « Modifier la fiche » sur la fiche. 140 tests. **Gestes 1 à 5 validés le 16/10** (dont la
    requête trafiquée : champ `notesAgent` ajouté depuis les outils de développement → refusé). Astuce notée : Chrome
    exige de taper `allow pasting` avant de coller dans la console.
    M5a ✅ (commit `d4cdf2a`) : photo du musicien (envoi, remplacement qui efface l'ancienne, retrait), stockage Blob
    privé, route protégée `/musiciens/[id]/photo` (`lireCheminPhoto`, refus journalisé), adresse avec empreinte du
    chemin (`?v=`) pour recharger une photo remplacée, photo sur la fiche et la grille. **Gestes 1 à 6 validés le
    16/10** (envoi, remplacement, faux JPEG, plus de 2 Mo, Louis sur la photo d'Anna → introuvable, retrait).
    M5b ✅ (commit `30ac6b1`, fait par l'humain) : portraits de démonstration (`scripts/portraits/<clé>.jpeg`) envoyés
    au stockage privé par le jeu de données, à des chemins fixes (`musiciens/demo/…`), remplacés à chaque rechargement.
    **Écart assumé** : ce sont des **photos de banques d'images** (filigranes visibles), pas des portraits générés ;
    signalé par l'IA, **gardées par décision de l'humain** le 16/10 (le garde-fou de Claude Code a refusé de les publier,
    l'humain a commité lui-même). Signalé dans le README ; à remplacer avant tout usage réel.
    **Gestes validés le 16/10** (« Portraits envoyés : 4. » dans les journaux ; visages dans la grille et les fiches ;
    Louis sur la photo d'Anna → introuvable ; retrait → initiales).
    **PR n° 8 fusionnée le 16/10** (vérifications vertes). En production, le jeu de données n'est pas rechargé :
    pas de biographies, notes ni portraits fictifs tant qu'on ne relance pas le chargement (avec le jeton Blob).
    **Samuel Vrignon supprimé de la production** le 16/10 par l'humain (éditeur SQL Neon, en une transaction : son
    engagement d'essai « Récital piano » du 05/11, puis ses réinitialisations, puis le compte, rôle musicien exigé).
    Leçon : la clé étrangère `engagement_musiciens → utilisateurs` refuse de supprimer un musicien encore engagé.
  - **✅ Fusionné : branche `engagements-en-cours`** (depuis `main`, 16/10). Cadrage plus bas (« En cours / Tous »).
    **Précisions validées le 16/10** : (a) *joué* avec cachet « à définir » reste en cours (seul un cachet 0, bénévole,
    sort) ; (b) « date passée » pour une date au mois ou à la saison seulement **après la fin de la période** ;
    (c) « En cours » + statut payé ou annulé → liste vide, « Aucun engagement en cours avec ce statut » + lien
    « Voir dans Tous ». États : vide « Aucun engagement en cours. » (ou « …ne correspond à ces filtres. ») ;
    chargement inchangé ; mention discrète « date passée » à côté de la date (demande, option, contrat envoyé).
    **Tranches validées** : **C1** règles pures `estEnCours` et `dateDepassee` dans `src/lib/cycle-de-vie.ts` + tests
    (payé et annulé exclus, bénévole joué exclu, joué « à définir » gardé, facturé gardé, mois passé seulement à sa
    fin) → **C2** page `/engagements` : sélecteur « En cours / Tous », requête et tris, mention, ancienne adresse
    `?periode=passes` → « En cours », messages vides (gestes) → **C3** test garantissant dans le jeu de données un
    impayé passé, une demande à date passée et un bénévole joué (puis gestes).
    **C1 ✅** (commit `ed52a9c`) : `estEnCours` et `dateDepassee` (`src/lib/cycle-de-vie.ts`), 6 tests.
    **C2 ✅** (commit `408de8a`) : `/engagements` en « En cours / Tous » ; « En cours » filtré par `estEnCours`
    (règle non recopiée en SQL), mention « date passée », message « Aucun engagement en cours avec ce statut » + lien
    « Voir dans Tous ». **Gestes 1 à 6 validés le 16/10.** La fiche musicien garde « À venir / Passés » (son parcours ;
    hors périmètre, décidé le 16/10).
    **C3 ✅** (commit `93d88c7`) : deux cas fictifs ajoutés **en fin de liste** (les identifiants dépendent de la
    position) : « Concert-lecture » (demande à date passée, 05/09) et « Concert caritatif » (bénévole joué, 27/06) ;
    3 tests dans `src/lib/jeu-de-donnees.test.ts`, jugés au 16/10/2026 (149 tests). **Gestes validés le 16/10.**
    **PR n° 9 fusionnée le 16/10** (vérifications vertes, commit `23e8b03`). **Gestes validés en production le 16/10**
    (« En cours » par défaut, impayés passés en tête ; « Tous » avec payés et annulés ; « payé » en « En cours » →
    message et « Voir dans Tous »). Les deux cas fictifs de C3 n'y sont pas tant que le jeu n'est pas rechargé.
  - **✅ Menu latéral (7)**, branche `menu-lateral` (depuis `main`, 16/10). Cadrage, écran et plan dans
    `docs/menu-lateral.md` (commit `a3792f5`). Agent : Tableau de bord · Engagements · Musiciens · Invitations ;
    musicien : Ma fiche · Mes engagements, et `/tableau-de-bord` le renvoie vers sa fiche (sa page d'accueil).
    **T1 ✅** (`a42f3d1`) : `liensDuMenu` et `estActif` (`src/lib/menu.ts`), 8 tests (157 au total).
    **T2 ✅** (`2ebbf52`) : groupes de routes `(connecte)/` (menu) et `(public)/` (logo seul) ; adresses inchangées.
    **T3 ✅** (`b5cbbae`) : musicien renvoyé vers sa fiche ; bouton de déconnexion du tableau de bord et liens
    « ← Tableau de bord » retirés. **T4 ✅** (`5101052`) : menu repliable sur téléphone (`<dialog>`, bouton ✕ gardé).
    **Gestes T2 à T4 validés le 16/10** en prévisualisation.
    **PR n° 10 fusionnée le 16/10** (commit `54f57b8`, vérifications vertes) ; **vérifiée en production le 16/10**.
    Une fois, sur le téléphone de l'humain, le menu ouvert ne couvrait que le coin supérieur gauche ; non reproduit
    ensuite (en production, sans correction), ni dans Chrome. Correction possible gardée **sans push** sur la branche
    locale `menu-telephone-hauteur` (`9924b66` : `<dialog>` sorti de la barre floutée, accroché aux bords haut et bas).
    À pousser si le défaut revient ; sinon supprimer la branche.
  - **✅ Colonnes des engagements**, branche `engagements-colonnes` (depuis `main`, 16/10) : « Musiciens » passe avant
    « Lieu » (le titre du concert reste avec le lieu), car sur téléphone on ne voyait que la date et le lieu ;
    « date passée » sous la date (colonne plus étroite). Solution rapide choisie par l'humain ; les cartes sur
    téléphone sont notées pour plus tard (amélioration n° 8). Gestes validés sur la prévisualisation le 16/10 ;
    **PR n° 11 fusionnée le 16/10**, gestes validés en production le 16/10.
  - **✅ Agent renommé** en production le 16/10 : « Agent » → **Claire Morel** (nom fictif), par l'humain dans
    l'éditeur SQL de Neon (branche `main`, `UPDATE` d'une ligne de `utilisateurs`). Le nom est copié dans le cookie
    à la connexion : il a fallu se déconnecter et se reconnecter. Vérifié dans le menu.
  - **✅ Indicateurs (amélioration n° 2)**, branche `indicateurs` (depuis `main`, 16/10). Cadrage validé : saison
    septembre → août (et non l'année civile), rangée par **date du concert**, calculée à l'heure du lieu (une date
    approximative est enregistrée à minuit locale : « automne 2026 » à Paris = 31 août en UTC). Contrat = contrat
    envoyé, confirmé, joué, facturé ou payé (bénévole compris, annulé exclu). Frise des 7 statuts + annulé à part,
    sur la même saison ; chaque pastille mène à `/engagements?statut=…&periode=tous`.
    K1 `src/lib/indicateurs.ts` (`saisonDe`, `compterIndicateurs`, 7 tests, 164 au total) ; K2 bloc
    `tableau-de-bord/indicateurs.tsx` + requête `listerPourIndicateurs()`. Gestes 1 à 7 validés en prévisualisation
    le 16/10 (17 contrats ; 9 / 6 / 4 / 8 / 4 / 1 / 0, annulé 1 ; liens ; téléphone ; Louis sans indicateurs).
    Limite connue : la liste des engagements n'a pas de filtre de saison (un clic montre toutes les saisons).
    **PR n° 12 fusionnée le 16/10** ; **gestes validés en production le 16/10** par l'humain.
  - **✅ Calendrier (amélioration n° 5)**, branche `calendrier` (depuis `main`, 17/10, poussée ; prévisualisation
    https://agence-musiciens-git-calendrier-valentin-4768.vercel.app). Cadrage, plan et écarts : `docs/calendrier.md`.
    Décidé : annulés cachés ; dates approximatives dans un bandeau « Date à préciser » (chaque mois de leur période).
    **L1 ✅** (`8921715`) `src/lib/calendrier.ts`, règles pures, 16 tests (180 au total).
    **L2 ✅** (`a7c9b1d`) page `/calendrier` (grille du mois, navigation `?mois=`, lien dans le menu des deux rôles,
    requête `listerPourCalendrier` filtrée par rôle). Gestes 1 à 6 validés le 17/10.
    **Tableau de bord ✅** (`d05c1b1`, écart validé, section 4 du cadrage) : tuiles de navigation retirées ; frise des
    indicateurs, mois en grille (bloc partagé `calendrier/calendrier-mois.tsx`, flèches sur place), grille des
    musiciens. Les 7 prochains jours n'y sont plus. Gestes 1 à 5 validés le 17/10.
    **L3 ✅** (`ef799ee`, `0f6c4ef`, `051b5a8`) bloc « 7 prochains jours » en haut de la fiche, pour le musicien
    seulement (`calendrier/sept-jours.tsx`) ; seuls les jours occupés. Écart validé : aujourd'hui **à J+7** (de samedi
    au samedi suivant). Décidé : l'agent ne voit pas ce bloc (proposé, refusé le 17/10). Gestes validés le 17/10.
    **L4 ✅** L4a (`3ca8c8e`) le mois en liste sur téléphone (sous 768 px, seuls les jours occupés ; vaut aussi pour
    le tableau de bord). L4b (`da7a517`) concert de Louis le 24/10 à Metz (jour à deux concerts, ajouté en fin de
    liste) ; test : 7 prochains jours jamais vides du 17/10 au 19/12 (démo avant mi-décembre ; après, trou des fêtes
    jusqu'au 16/01 : décaler les dates). Gestes validés le 17/10. 185 tests. Rien de cassé.
    **PR n° 13 fusionnée le 17/10** ; **gestes validés en production le 17/10** par l'humain.
    En production, le concert du 24/10 n'apparaît qu'après rechargement du jeu de données (étape « photos en production »).
    **Ensuite (une demande à la fois)** : ✅ renommer en « CM Management » (voir plus bas) ; ✅ **photos en production**
    (demandé le 17/10, pour un air « fini ») : **jeu de données rechargé en production le 17/10** par l'humain (requête de
    contrôle : 50 engagements, tous fictifs, 0 pièce jointe ; secrets tirés par `vercel env pull` dans
    `.env.production.local`, mot de passe de démo retapé à la main car protégé). Résultat : 53 engagements, **sans
    portraits** : la production accède au stockage Blob par OIDC (`VERCEL_OIDC_TOKEN` + `BLOB_STORE_ID`), sans
    `BLOB_READ_WRITE_TOKEN`, et le script n'acceptait que ce dernier. Correctif : branche `portraits-oidc`, puis
    relancer le chargement (sans risque : mêmes données, mêmes identifiants). Puis **supprimer** `.env.production.local`
    et `.env.local` (secrets). Portraits à filigrane **gardés** par décision de l'humain le 17/10 (« c'est un exercice »).
    Branche `portraits-oidc` : le script accepte `BLOB_READ_WRITE_TOKEN` **ou** `VERCEL_OIDC_TOKEN` + `BLOB_STORE_ID`
    (commit `eada199`, README). 187 tests, lint OK.
    **Incident** : la prévisualisation échouait (`drizzle-kit migrate` : `url: undefined`) car le projet Neon était à
    **10 branches sur 10** (limite du plan gratuit : `main`, `vercel-dev` et 8 `preview/…`). L'humain a supprimé le
    17/10 les 8 branches de prévisualisation des fonctionnalités fusionnées ; commit vide `ed67104` pour redéployer.
    L'intégration a alors créé `preview/portraits-oidc` (un déploiement annulé, puis un réussi).
    Gestes validés le 17/10 : 4 portraits en prévisualisation ; production rechargée par l'humain (`Portraits envoyés :
    4.`, 53 engagements : l'accès OIDC marche), 4 portraits en production ; `.env.production.local` et `.env.local`
    effacés. **PR n° 15 fusionnée le 17/10**, déploiement de production « Ready ». Rien de cassé.
    **À retenir** : après chaque fusion, supprimer la branche `preview/<nom>` dans Neon (garder `main` et `vercel-dev`),
    ou activer la suppression automatique des branches obsolètes dans l'intégration Neon–Vercel (à décider).
    `docs/flux-de-nuit.md` (non suivi) n'est pas de cette session : ne pas y toucher.
  - **Ordre décidé** (tout avant la semaine 2) : fiches musiciens (+ tuile « Nouvel engagement » retirée) →
    **engagements « En cours / Tous »** (branche `engagements-en-cours`, depuis `main`) → menu
    latéral (7) → KPI et calendrier (accueil : 7 jours à venir) → semaine 2. *(Plusieurs agents (6) : mis de côté
    le 16/10, voir plus bas.)*
  - **Cadrage validé le 16/10 — engagements « En cours / Tous »** (l'agent doit suivre les impayés des concerts
    passés) : le filtre de période de `/engagements` devient « En cours » (par défaut) et « Tous », au lieu de
    « À venir / Passés ». En cours = tout statut sauf payé et annulé, quelle que soit la date, trié du plus ancien au
    plus récent (impayés anciens en tête) ; Tous = tout, du plus récent au plus ancien. Cas limites : bénévole joué
    exclu d'« en cours » (statut final) ; demande / option / contrat envoyé à date passée restent en cours, avec
    impayés passés, marqués « date passée » ; ancienne adresse `?periode=passes` → ignorée, « En cours ». Filtres
    statut, musicien et recherche inchangés ; même règle pour un musicien (ses engagements). Hors périmètre :
    relances et échéances de paiement (piste pour le flux de nuit, semaine 2).
  - **Couleurs des statuts** (commits `9a06be8`, `985ab0c`, poussés) : gradation rouge (demande) → vert (payé),
    teintes espacées ; badge pâle avant « confirmé », plein ensuite ; annulé gris barré. **Validées** par l'humain
    le 16/10 en prévisualisation.
  - **M3e ✅** (commit `16ba2ec`) : tuile « Mes engagements » retirée du tableau de bord du **musicien** (sa fiche
    devient sa page principale) ; lien « Rechercher dans mes engagements → » sur sa fiche (s'il a des engagements).
    Fiche inchangée pour l'agent. Gestes validés le 16/10 (Louis : une tuile, lien vers ses seuls engagements ;
    agent : trois tuiles, pas de lien). Plus tard : décider si le musicien arrive directement sur sa fiche.
  - M3b et M3c : **gestes 1 à 6 validés** le 16/10.
  - `docs/flux-de-nuit.md` : brouillon du cadrage de la semaine 2, non commité, à valider plus tard.
- **Quota** : semaine à 79 % le 12/10 (réinitialisation le 14/10 à 11 h 59). Sessions courtes, `/clear` entre étapes,
  explications courtes.
- **Limite connue** : changer le mot de passe ne ferme pas les sessions déjà ouvertes (elles expirent seules).
- **Reste à faire (côté humain)** : créer le compte UptimeRobot.
  ✅ « Samuel Vrignon » supprimé des musiciens en production (16/10).
  **Brancher un vrai nom de domaine sur Resend** (noté le 16/10) : sans domaine vérifié, Resend n'écrit qu'à
  l'adresse du propriétaire du compte, donc les courriels d'invitation et de réinitialisation n'arrivent pas aux
  musiciens (leur lien est seulement affiché à l'agent). Étapes : acheter un domaine, l'ajouter dans Resend,
  recopier les enregistrements DNS demandés (SPF, DKIM) chez le fournisseur du domaine, attendre la vérification,
  puis changer l'adresse d'expédition dans le code (`src/lib/courriel.ts`).
- **Points d'attention** :
  - Vercel Hobby ne garde les journaux qu'environ une heure : refaire la tentative juste avant la démo,
    ou ajouter plus tard une table `journal` consultable par l'agent.
  - **Améliorations futures (demandées par l'humain le 12/10)** — **décidé le 16/10 : toutes faites avant la semaine 2**,
    une à la fois, chacune avec la boucle d'`AGENTS.md` (ordre : fiches musiciens + point 4, menu latéral (7), puis KPI et calendrier) :
    1. **Fiches musiciens** : photo, biographie, répertoire, cachet moyen (divisé par 2 pour un duo, par le nombre
       de musiciens en général), **récap de ses engagements** (à venir, passés, par statut).
    2. ✅ **Indicateurs (KPI)** : nombre de contrats sur l'année ; frise du nombre d'engagements par stade
       (demande → option → contrat envoyé → confirmé → joué, annulé).
    3. **Design global** à poursuivre (pistes non faites dans `docs/design.md` : fiche, formulaire, téléphone, favicon).
    4. **« Nouvel engagement »** : retirer la tuile du tableau de bord ; le bouton existe déjà sur la page des
       engagements, il y reste seul.
    5. **Calendrier** (précisé le 16/10) : sur la **page d'accueil** (tableau de bord), les engagements des musiciens
       des **7 jours à venir** ; en plus, vue mensuelle où les engagements apparaissent à leur date (couleur par statut, clic → fiche ;
       un musicien n'y voit que les siens).
    6. **Plusieurs agents** — **mis de côté le 16/10** (hypothèse de développement futur, hors du projet actuel) : chaque agent a son portefeuille de musiciens et ne voit que leurs engagements ;
       nouveau rôle **directeur** (vue d'ensemble de l'agence, tous agents confondus, et répartition des musiciens).
       Gros chantier : 3ᵉ rôle dans Auth.js, lien agent ↔ musicien en base (migration), et tous les contrôles
       d'accès côté serveur à revoir (un agent ne doit pas ouvrir l'engagement d'un autre : même risque d'IDOR).
       Les KPI (point 2) sont donc calculés pour l'agence seulement.
    7. **Menu latéral à gauche, toujours présent** (demandé le 16/10) : liens vers les pages selon le rôle
       (tableau de bord, engagements, musiciens ou « Ma fiche », calendrier, invitations…) et **déconnexion
       possible depuis toutes les pages**, pas seulement le tableau de bord. Sur téléphone : menu repliable. ✅ (PR n° 10)
    8. **Engagements en cartes sur téléphone** (demandé le 16/10, pour plus tard) : une carte par engagement (date et
       statut en haut, puis musiciens, lieu, cachet), sans défilement horizontal ; le tableau reste sur ordinateur.
       Pour l'instant, seules les colonnes « Musiciens » et « Lieu » ont été échangées (le statut reste caché à droite
       sur téléphone).
  - **Renommer « AM Management » en « CM Management »** (demandé le 17/10, les initiales de Claire Morel) : logo
    (`src/components/logo.tsx`), titre et libellés des trois `layout.tsx`, puis `docs/` (design, présentation,
    maquettes). Fichiers partagés : sur une petite branche à part, entre deux fonctionnalités (après le calendrier).
    ✅ Cadrage validé le 17/10, branche `cm-management` : monogramme « CM » ; aussi la carte de connexion et
    l'expéditeur des courriels (« Agence-musiciens » → « CM Management ») ; les PDF de `docs/` gardent l'ancien nom
    (exports figés). Hors périmètre : nouveau logo, domaine, noms du dépôt et du projet Vercel.
    **R1 ✅** (`226efe8`) application + test `src/lib/marque.test.ts` (187 tests) ; gestes validés le 17/10.
    **R2 ✅** (`089f2cf`) `docs/` (design, menu latéral, présentation, slides, maquette). Rien de cassé.
    **PR n° 14 fusionnée le 17/10** ; **gestes validés en production le 17/10** par l'humain.
  - Améliorations possibles : permettre à l'agent d'annuler une invitation (faute de frappe dans l'adresse) ;
    lien de réinitialisation généré par l'agent pour un musicien (Resend ne lui écrit pas sans nom de domaine).
  - **Chaque déploiement de prévisualisation recharge le jeu de données** (`vercel-build`) : les essais faits à la main
    sont effacés au push suivant.
  - Dans les journaux Vercel, une requête qui écrit plusieurs lignes n'en montre qu'une dans la liste :
    cliquer sur l'entrée pour les voir toutes.
- ✅ Mot de passe trop court : les trois pages (installation, invitation, réinitialisation) appellent la même règle
  `src/lib/mot-de-passe.ts`, couverte par 4 tests.
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
- **Optionnel (noté le 12/10/2026)** : maquettage des écrans sur Figma (parcours agent et musicien). Pas prévu
  d'office, mais on peut en avoir besoin si l'on retouche l'interface : travailler l'UX (parcours, étapes) et l'UI
  (rendu visuel) sur maquette avant de coder.
- ✅ **Fait (12/10/2026)** : fiche « Infrastructure » — langages, paquets et versions utilisés
  par le code, expliqués de façon pédagogique. Source unique : `docs/infrastructure.html` (commande de régénération du
  PDF en tête du fichier) → `docs/infrastructure.pdf`. Versions relevées dans `package-lock.json`, pas de mémoire.

---

## Les stades conceptuels

Un produit se construit par couches. Chaque couche répond à une question et s'appuie sur la précédente.

| Stade | Question à laquelle il répond | Semaine | État |
|---|---|---|---|
| 0. Cadrage | Que construit-on, pour qui, avec quelles règles ? | Avant tout | ✅ |
| 1. Fondations | Où vit le produit ? (comptes, dépôt, hébergeur, base) | 1, jour 1 | ✅ |
| 2. Squelette | Avec quoi le construit-on ? (framework, langage, interface) | 1, jour 1 | ✅ |
| 3. Données | Que retient le produit, et sous quelle forme ? | 1 | ✅ (comptes, invitations, réinitialisations, engagements, lieux, programmateurs, pièces jointes ; 10 migrations) |
| 4. Identité et droits | Qui est connecté, et qu'a-t-il le droit de faire ? | 1 | ✅ (connexion, invitations, rôles, réinitialisation, refus d'accès journalisés) |
| 5. Métier | Que fait le produit ? (engagements, cycle de vie, règles, API externe, courriels, pièces jointes) | 1 | ✅ (cycle de vie, conflit d'agenda, géocodage, jours fériés, devises, pièces jointes, fiches musiciens, calendrier) |
| 6. Fiabilité | Comment sait-on que ça marche et que c'est sûr ? (tests, journaux, revue de sécurité, README) | 1 | ✅ (tests à chaque push, journaux, revue de sécurité `docs/securite.md`, README) |
| 7. Automatisation | Que fait le produit tout seul, la nuit ? | 2 | 🔄 (import des nuits, rattrapage et cron faits ; récap, surveillance, boîte à faire) |
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

### 3. Données ✅ — fonctionnalité « connexion », tranche 1 ✅

| Tâche | État | À quoi ça sert |
|---|---|---|
| Créer la branche `connexion` | ✅ | Travailler sans toucher à la production |
| Installer Drizzle et le pilote Neon | ✅ | Parler à la base en TypeScript, écrire et jouer les migrations |
| Décrire la table `utilisateurs` | ✅ | Stocker l'agent et les musiciens (rôle, instrument, mot de passe chiffré) |
| Générer la migration | ✅ | Le fichier SQL qui crée la table, conservé dans Git |
| Jouer les migrations à chaque déploiement (`vercel-build`) | ✅ | La base suit toujours le code, sans manipulation à la main |

**Preuve constatée (11/10/2026)** : prévisualisation verte ; table `utilisateurs` présente dans la branche Neon `preview/connexion`, absente de `production`.

Fait depuis : tables `invitations`, `reinitialisations`, puis celles des engagements (détail dans l'état de reprise).

### 4. Identité et droits ✅ — tranches 2 ✅ et 3 ✅

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
| 16/10/2026 | Plusieurs agents et rôle directeur mis de côté | Hypothèse de développement futur ; un seul agent suffit au projet |
| 16/10/2026 | Musicien : sa fiche est sa page d'accueil (`/tableau-de-bord` y renvoie) | Son tableau de bord n'avait qu'une tuile, « Ma fiche » |
| 16/10/2026 | Pages rangées en groupes de routes `(connecte)` et `(public)` ; menu de téléphone en `<dialog>` | Un cadre avec menu pour les seules pages connectées, sans changer les adresses ; Échap, voile et clavier fournis par le navigateur, sans paquet |
| 11/10/2026 | Table `utilisateurs` limitée à 7 colonnes | Invitations et réinitialisations iront dans des tables séparées ; ajouter une colonne plus tard est peu coûteux |
| 17/10/2026 | Flux de nuit : créations rangées dans « Demandes reçues », statuts et messages du flux sans effet sur les engagements, rattrapage depuis le 20/09 | Le flux ne donne ni musicien, ni heure, ni cachet, et ses statuts sautent nos étapes ; l'agent décide ; un message est une donnée, jamais un ordre |
| 17/10/2026 | Flux : mise à jour ou message vers une demande inconnue mis de côté, messages montrés à part sur `/nuit` et dans le récap | 101 sur 148 visent une demande antérieure au 20/09 ; on ne rattache rien à une demande absente, mais l'agent doit pouvoir lire les messages |
| 18/10/2026 | Passe de design « envoi » avant le code de la semaine 3 ; palette « black tie » (cadre noir, contenu blanc), Playfair Display, « À faire » sur le tableau de bord | Le projet doit avoir l'air fini à l'envoi même si la semaine 3 n'est pas terminée ; « À faire » reprend les règles et la lecture du récap pour ne jamais le contredire |
