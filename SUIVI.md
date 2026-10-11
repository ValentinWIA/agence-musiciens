# Suivi du travail — Agence-musiciens

Ce document suit l'avancement du projet. Il dit **ce qui a été fait**, **à quoi sert chaque élément**,
et **à quel stade conceptuel** appartient chaque ensemble de tâches.
Il est mis à jour à la fin de chaque session (c'est l'« état de reprise » demandé par la fiche).

Légende : ✅ fait · 🔄 en cours · ⬜ à faire

---

## État de reprise

*Dernière mise à jour : 12 octobre 2026*

- **Fait** : cadrage (SPEC), comptes, squelette Next.js, dépôt GitHub public, site en ligne
  (https://agence-musiciens.vercel.app), région `fra1`, base Neon reliée à Vercel.
  Fonctionnalité « connexion » fusionnée (pull request n° 1) et vérifiée en production ; compte de l'agent créé en production.
  Fonctionnalité « invitations » fusionnée (pull request n° 2) et vérifiée en production.
- **En cours** : réinitialisation du mot de passe sur la branche `reinitialisation`, tranche 1 **validée** en prévisualisation
  (adresse sans compte : même message ; courriel reçu ; mot de passe trop court refusé ; lien consommé ; ancien mot de
  passe refusé, nouveau accepté ; journaux). Prête à fusionner.
- **Limite connue** : changer le mot de passe ne ferme pas les sessions déjà ouvertes (elles expirent seules).
- **Reste à faire (côté humain)** : créer le compte UptimeRobot.
- **Points d'attention** :
  - Vercel Hobby ne garde les journaux qu'environ une heure : refaire la tentative juste avant la démo,
    ou ajouter plus tard une table `journal` consultable par l'agent.
  - Améliorations possibles : permettre à l'agent d'annuler une invitation (faute de frappe dans l'adresse) ;
    lien de réinitialisation généré par l'agent pour un musicien (Resend ne lui écrit pas sans nom de domaine).
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
| 4. Identité et droits | Qui est connecté, et qu'a-t-il le droit de faire ? | 1 | 🔄 (connexion, invitations, rôles ✅ ; réinitialisation à venir) |
| 5. Métier | Que fait le produit ? (engagements, cycle de vie, règles, API externe, courriels, pièces jointes) | 1 | ⬜ |
| 6. Fiabilité | Comment sait-on que ça marche et que c'est sûr ? (tests, journaux, revue de sécurité, README) | 1 | ⬜ |
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
| 11/10/2026 | Table `utilisateurs` limitée à 7 colonnes | Invitations et réinitialisations iront dans des tables séparées ; ajouter une colonne plus tard est peu coûteux |
