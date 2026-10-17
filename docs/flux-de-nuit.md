# Semaine 2 — flux de nuit et récapitulatif du matin (cadrage)

*Cadrage validé le 17/10/2026 (boîte « Demandes reçues », statuts du flux sans effet sur les engagements, messages
jamais suivis, rattrapage des nuits passées). Plan validé le 17/10, dans l'ordre N1 → N2 → N3 → N4 → R → S → N5 → D
(ce que la démo du vendredi exige d'abord ; la boîte et le domaine ensuite).*

Source : https://flux-de-nuit.vercel.app, sujet `reservations`, clé dans la variable `FLUX_DE_NUIT_CLE`
(en-tête `Authorization: Bearer …`). `GET /api/evenements?sujet=reservations` rend la nuit qui vient de se terminer
(date du matin, heure de Paris) ; `&date=AAAA-MM-JJ` rend une nuit passée (le futur est refusé). Une nuit rejouée
rend exactement les mêmes événements.

## 1. Ce qu'on veut, en dix lignes

1. Chaque nuit, le produit va chercher les événements du flux, avec la clé côté serveur.
2. Il ignore les doublons, met de côté ce qui est mal formé (avec la raison) et ne plante jamais.
3. Relancer une nuit ne crée rien et n'envoie rien en double (idempotence), qu'on relance à la main ou par le cron.
4. Les créations arrivent dans une boîte **« Demandes reçues »** ; l'agent en fait un engagement s'il le veut.
5. Les changements de statut et les messages s'affichent sur la demande ; ils ne modifient jamais un engagement seuls.
6. Chaque passage écrit une ligne de journal ; une page montre les exécutions, ce qui a été mis de côté, et le coût.
7. Si le flux est en panne ou trop lent : 3 essais, puis une **alerte immédiate** à l'agent ; le reste du produit tourne.
8. Chaque matin, l'agent (et lui seul) reçoit un récapitulatif, **une seule fois par jour**.
9. Une sonde externe surveille le site ; Sentry suit les erreurs ; chaque alerte a été déclenchée en vrai.
10. Au départ, on **rattrape les nuits passées** (depuis le 20/09/2026) pour avoir un historique cohérent.

**Hors périmètre** : créer ou faire avancer un engagement automatiquement ; répondre aux programmateurs (semaine 3) ;
lire les messages par l'IA (semaine 3) ; agir sur une consigne contenue dans un message (jamais, piège de la semaine 4).

## 2. Ce que contient une vraie nuit (lue le 17/10/2026)

15 événements, dont 2 doublons (même `id` deux fois) : 7 `creation`, 2 `mise_a_jour`, 4 `message`. Les nuits du 20/09
(16 événements) et du 01/09 (11) se lisent aussi.

Relevé des 28 nuits du 20/09 au 17/10 (fait en N1, 347 événements) : 2 doublons par nuit, toujours identiques à
l'original ; **aucun événement mal formé** ; statuts reçus : `demandee` (créations), `confirmee`, `terminee`, `annulee` ;
4 catégories ; 3 textes de message seulement. **101 mises à jour ou messages sur 148 visent une référence jamais créée
depuis le 20/09** : avec la règle « référence inconnue → mis de côté », environ 70 % sont mis de côté (décision 3,
section 10).

```json
{ "id": "RES-20261017-05", "type": "creation", "horodatage": "2026-10-17T04:00:00+02:00", "objet": "réservation",
  "donnees": { "reference": "RES-20261017-05", "statut": "demandee", "categorie": "rendez_vous",
               "demandeur": "Camille Girard", "ressource": "Bureau 12", "debut": "2026-11-15",
               "duree_min": 120, "cree_le": "2026-10-17" } }
{ "type": "mise_a_jour", "donnees": { "reference": "RES-20260929-06", "statut": "terminee", "commentaire": "Vu avec le responsable." } }
{ "type": "message",     "donnees": { "reference": "RES-20260923-04", "de": "Louise Moreau",
                                      "texte": "Merci d'annuler la réservation de jeudi, la réunion est reportée." } }
```

## 3. Correspondance avec notre vocabulaire

| Flux | Produit |
|---|---|
| réservation (`reference`) | **demande reçue** (référence du flux gardée) |
| `demandeur` | programmateur (nom seulement : ni structure ni e-mail) |
| `ressource` | nom du lieu (ni adresse ni coordonnées) |
| `debut` (date sans heure) | date du concert |
| `duree_min` | durée prévue |
| `categorie` (salle, rendez_vous, intervention, permanence) | gardée pour information |
| `statut` : demandee, confirmee, terminee (annulee probable) | statut **de la demande** : demandée, confirmée, terminée, annulée |
| `message` (`de`, `texte`) | message du programmateur, affiché en texte brut |
| — | ni musicien, ni heure, ni cachet : l'agent les ajoute |

## 4. Ce que l'import fait de chaque événement

Les événements d'une nuit sont traités dans l'ordre de leur `horodatage`.

| Événement | Effet |
|---|---|
| `creation` | Une ligne dans `demandes_recues`. Référence déjà connue → ignorée (rien n'est écrasé). |
| `mise_a_jour` | Le statut de la demande de même référence change ; le commentaire est gardé. Référence inconnue ou statut inconnu → **mis de côté**. Si la demande est déjà devenue un engagement, celui-ci ne bouge pas : le récap signale l'écart (« le programmateur dit : confirmée »). |
| `message` | Rangé avec la demande, affiché en texte brut, signalé dans le récap. **Jamais exécuté** (« annulez », « décalez » restent des données). Référence inconnue → mis de côté. |

Tout événement reçu est conservé tel quel (`evenements_flux`, clé = `id` du flux), avec son état : traité, doublon,
mis de côté (et la raison). Un `id` déjà présent n'est pas retraité.
Une copie portant un `id` déjà présent n'est que comptée (`executions.doublons`), pas stockée une seconde fois (N2).

**Mal formé** (montant en texte, date impossible, champ manquant, accent cassé) : lecture par `zod` ; échec → mis de
côté avec la raison. Un seul événement cassé n'arrête pas la nuit.

## 5. Panne, lenteur, durée d'une fonction

- Délai de 10 s par appel, 3 essais espacés. Échec → l'exécution est notée « en échec » avec le message,
  l'**alerte part** (section 7), et la nuit sera réessayée au passage suivant.
- **Une étape = une nuit.** Un passage traite les nuits manquantes, de la plus ancienne à la plus récente, et s'arrête
  avant la durée maximale d'une fonction Vercel (à vérifier dans la doc à la tranche N4). Le passage suivant reprend
  où le précédent s'est arrêté. Le rattrapage initial (~28 nuits) se fait donc en quelques clics sur « Importer ».
- Deux passages en même temps (cron + clic) : le second ne fait rien (verrou en base).

## 6. Déclenchement

- **Vercel Cron**, une fois par jour vers 5 h (heure de Paris) : l'offre Hobby n'autorise qu'un passage par jour, à
  l'heure près. Route `/api/cron/nuit`, protégée par `CRON_SECRET` (Vercel l'envoie lui-même dans l'en-tête).
  Les crons ne tournent qu'en production : en prévisualisation, on appelle la route à la main.
- Bouton **« Importer la nuit »** sur la page des exécutions (agent seulement), pour relancer sans attendre.

## 7. Récapitulatif, alertes, surveillance

- **Récap du matin**, courriel à l'agent après l'import, **une fois par jour** (table `recaps`, une ligne par jour :
  si elle existe, rien n'est renvoyé). Contenu :
  - demandes reçues cette nuit, changements de statut et messages à lire ;
  - options qui **expirent** dans les 7 jours (nouvelle colonne `option_expire_le`, saisie à la pose de l'option,
    proposée à 14 jours) ;
  - **cachets impayés** : concert « joué » ou « facturé » passé depuis plus de 30 jours (sans nouvelle colonne) ;
  - la nuit : événements reçus, doublons, mis de côté (avec raisons), panne éventuelle.
- **Alerte de panne** : courriel immédiat à l'agent + erreur envoyée à Sentry, une seule fois par panne.
- **Sentry** (`@sentry/nextjs`) : erreurs du serveur et du navigateur. Variable `SENTRY_DSN`.
- **UptimeRobot** : sonde toutes les 5 minutes sur `/api/sante` (répond `ok` si la base répond). Il surveille
  *notre* site, pas le flux : d'où l'alerte de panne ci-dessus.
- Les courriels partent d'un sous-domaine de l'humain (`mail.valentinwalczak.com`, chez OVH), pour ne pas toucher à
  `contact@valentinwalczak.com`. Petite branche à part, avant le récap.

## 8. Les écrans et leurs états

- **Exécutions** (`/nuit`, agent seulement) : une ligne par passage (date, nuit, déclencheur, durée, appels au flux,
  essais, reçus, doublons, traités, mis de côté, état), les événements mis de côté avec leur raison, le dernier récap,
  et **ce que la nuit a coûté** (durée, appels, courriels ; 0 € sur les offres gratuites, le coût de l'IA s'y ajoutera
  en semaine 3). Vide : « Aucune exécution : importez la première nuit ». Chargement : squelette. Erreur : message.
- **Demandes reçues** (`/demandes`, agent seulement) : liste (à traiter / toutes), fiche avec statut, historique et
  messages, bouton « Créer l'engagement » (formulaire existant pré-rempli : date, durée ; l'agent choisit musicien,
  lieu, heure, cachet). Vide : « Aucune demande reçue ». La demande garde le lien vers l'engagement créé.

## 9. Plan en tranches (à corriger)

Branche `flux-de-nuit` (N1 à N5) ; une branche à part pour le domaine, le récap, la surveillance.

| Tranche | Contenu | Preuve |
|---|---|---|
| N1 | `src/lib/flux.ts` : lecture et validation (`zod`), tri des doublons, ordre, correspondance | tests sur la vraie nuit (doublons, mal formé, référence inconnue) |
| N2 | tables `executions`, `evenements_flux`, `demandes_recues` (migration 0010) ; jeu de données rechargeable | migration jouée en prévisualisation |
| N3 | import d'une nuit (appel, délai, essais, idempotence, verrou) + page `/nuit` + bouton | geste : importer deux fois → rien en double ; journal visible |
| N4 | rattrapage par étapes + route cron + `CRON_SECRET` | geste : rattraper depuis le 20/09 ; appel de la route sans secret refusé |
| N5 | boîte `/demandes` + « Créer l'engagement » pré-rempli ; menu « Demandes reçues » après « Engagements », journal hors menu, messages pour une demande inconnue sur `/demandes` (décision 7) | geste : une demande devient un engagement ; un musicien n'y a pas accès |
| D | domaine Resend `mail.valentinwalczak.com` (branche `domaine`) | courriel reçu à une autre adresse que celle du compte |
| R | récap du matin + `option_expire_le` (migration 0012), une fois par jour (branche `recap`) | geste : relancer → récap non renvoyé |
| S | Sentry, `/api/sante`, UptimeRobot, alerte de panne (branche `surveillance`) | **alertes déclenchées en vrai**, capture gardée |

Reportés de la revue de sécurité (`docs/securite.md`), à placer après : limite d'essais de connexion, anti-clickjacking.

## 10. Décisions du 17/10 (anciennes questions)

1. **Programmateur inconnu** : l'application ne sait pas créer de programmateur, et la table exige structure et
   e-mail, que le flux ne donne pas. **Oui** : un « + nouveau programmateur » dans le formulaire (comme
   « + nouveau lieu »), pré-rempli avec le nom du demandeur ; l'agent complète structure et e-mail.
2. **Demande sans suite** : **oui**, un bouton « Écarter » (la demande sort de « à traiter ») ; sinon la boîte se
   remplit à chaque nuit. Les deux vont dans N5.
3. **Référence inconnue** (décidé le 17/10, après le relevé de N1) : la règle reste, la mise à jour ou le message est
   mis de côté (on ne rattache rien à une demande qui n'existe pas). Mais `/nuit` et le récap montrent ces messages à
   part, sous « messages pour une demande inconnue », pour que l'agent les lise quand même (N3 et R).
4. **Quelle nuit importer** (N3) : un champ date, pré-rempli avec la plus ancienne nuit pas encore importée depuis le
   20/09 (sinon la nuit qui vient de finir). Importer dans l'ordre évite de mettre de côté pour toujours une mise à
   jour dont la création n'a pas encore été lue ; le champ permet de rejouer une nuit (preuve d'idempotence).
5. **Verrou** (N3) : migration 0011, index unique partiel « une seule exécution `en_cours` » : la base refuse elle-même
   le second import. Une exécution `en_cours` depuis plus de 5 min est déclarée interrompue au passage suivant.
   Le récap (R) prend donc la migration 0012.
6. **Essais** (N3) : 10 s par appel, 3 essais ; une réponse 4xx (clé refusée, date future) échoue sans nouvel essai.
   L'écriture d'une nuit se fait en un seul bloc (`db.batch`) : tout ou rien.
7. **Présentation** (17/10, après N3) : « flux de nuit » est un mot de développeur et `/nuit` une page de
   surveillance. Le lien du menu devient « Journal des imports » tout de suite. En N5, le menu montre « Demandes
   reçues » juste après « Engagements » (pas dedans : une demande n'est pas un engagement) ; le journal sort du menu
   et s'ouvre depuis `/demandes` (« Dernier import : … — voir le journal ») ; les messages pour une demande inconnue
   passent sur `/demandes`, car ce sont des messages à lire, pas de la surveillance.

## 11. Ce que l'humain fait

1. ✅ Clé obtenue (17/10), rangée dans `.env.local` (ignoré par git). À recopier dans Vercel → `FLUX_DE_NUIT_CLE`
   (Production et Preview) avant N3.
2. Créer `CRON_SECRET` dans Vercel (une longue chaîne aléatoire : `openssl rand -hex 32`) avant N4.
3. Resend + zone DNS OVH pour `mail.valentinwalczak.com` (tranche D).
4. Comptes Sentry (projet Next.js, DSN dans `SENTRY_DSN`) et UptimeRobot (tranche S).

## 12. N4 — rattrapage et cron (plan validé le 17/10)

Vérifié dans la doc Vercel le 17/10 : sur Hobby, une fonction dure **300 s au plus** ; un cron passe **une fois par
jour**, à l'heure près, heure **UTC**, en production seulement, avec `Authorization: Bearer <CRON_SECRET>`.

- `rattraper` importe les nuits manquantes, du 20/09 à celle du matin, une à la fois (verrou et tout ou rien par nuit).
  Arrêt : plus rien à importer, première nuit en échec, import déjà en cours, ou 200 s écoulées (une nuit coûte au pire
  ~40 s : 3 essais de 10 s et les attentes).
- Tout est à jour → rien n'est fait, aucune ligne d'exécution (une exécution = une nuit).
- Bouton « Rattraper les nuits manquantes » sur `/nuit` ; le formulaire « une nuit » reste pour rejouer.
- Route `/api/cron/nuit` : sans le bon secret → 401 journalisé. Cron `0 4 * * *` (UTC) : 6 h–7 h à Paris l'été,
  5 h–6 h l'hiver, nuit bien finie.
- **N4a** : `nuitsManquantes` (pure, testée) + `rattraper` + bouton. **N4b** : route + `vercel.json`. Preuve de N4b :
  adresse ouverte sans secret → 401 ; en production, « Run » du cron dans Vercel → ligne « cron » au journal (le secret
  n'est jamais tapé ni collé). `CRON_SECRET` créé par l'humain (Production et Preview) le 17/10.

## 13. D — domaine d'envoi (plan validé le 17/10)

DNS de `mail.valentinwalczak.com` vérifiés dans Resend par l'humain le 17/10. D passe avant R : la preuve du récap
exige qu'un courriel arrive à l'agent, pas seulement au propriétaire du compte Resend.

- **D1** : expéditeur `CM Management <ne-pas-repondre@mail.valentinwalczak.com>` (`src/lib/courriel.ts`) ; rien n'est
  envoyé vers une adresse en `.test` (domaine réservé, le jeu de données : un envoi rebondirait et abîmerait la
  réputation du domaine), une ligne au journal à la place ; le lien d'invitation reste affiché à l'agent, le message
  d'échec ne parle plus de « sans nom de domaine ».
- Hors périmètre : adresse de réponse, courriels en HTML, le récap (R).
- Preuve : test de la règle `.test` ; geste en prévisualisation : invitation à une adresse de l'humain autre que celle
  du compte Resend → courriel reçu, expédié par `mail.valentinwalczak.com` ; invitation annulée ensuite.

## 14. R — récap du matin (plan validé le 17/10)

Branche `recap` (depuis `main`). Courriel en texte brut à l'agent (rôle `admin`), et à lui seul.

- **Contenu** : demandes reçues ; changements de statut (avec l'écart « le programmateur dit : confirmée » si la
  demande est déjà un engagement) ; messages à lire ; messages pour une demande inconnue, à part ; options qui
  expirent dans les 7 jours (ou déjà expirées, encore en option) ; cachets impayés (« joué » ou « facturé », concert
  passé depuis plus de 30 jours, cachet > 0 : le bénévole n'y est pas) ; bilan des nuits (reçus, doublons, mis de côté
  regroupés par raison, panne). Section vide → absente ; rien de neuf → « Rien de neuf cette nuit », le récap part.
- **Période** (décidé le 17/10) : tout ce qui a été importé depuis le récap précédent, pour qu'une nuit rattrapée
  après une panne ne manque à aucun récap. Chaque liste est limitée à 20 lignes (« … et N autres, voir le journal ») :
  le premier récap couvre les 28 nuits du rattrapage.
- **Une fois par jour** (jour de Paris) : table `recaps`, une ligne par jour, écrite **avant** l'envoi (cron et clic
  simultanés → un seul courriel). Envoi en échec → ligne retirée, on peut réessayer. Une ligne au journal toujours.
- Import en échec → le récap part quand même et le dit. L'alerte immédiate est dans S.
- **Adresse de l'agent** (décidé le 17/10) : l'humain met son adresse personnelle (celle du compte Resend) sur le
  compte agent, en SQL dans Neon. Le jeu de données ne touche pas au compte agent.
- Hors périmètre : courriel HTML, alerte de panne et Sentry (S), heure d'envoi réglable, récap aux musiciens.

| Tranche | Contenu | Preuve |
|---|---|---|
| R1 | `src/lib/recap.ts` (pur) : options qui expirent, impayés, rédaction du texte | tests (7 j et 30 j pile, bénévole, sections vides, panne, limite de 20) |
| R2 | migration 0012 (`recaps`, `engagements.option_expire_le`) ; échéances dans le jeu de données ; échéance saisie à la pose de l'option (J+14 proposé), affichée sur la fiche | migration jouée ; geste : poser une option → J+14 proposé puis affiché |
| R3 | `envoyerRecap` (lecture, réservation du jour, envoi), appelé après le rattrapage dans `/api/cron/nuit` ; bloc et bouton « Envoyer le récap du jour » sur `/nuit` | geste : récap reçu ; second clic → rien de renvoyé ; en production, récap reçu après le cron |

Présentation revue au geste (17/10) : « En bref », puis « À faire » (options et impayés avec artistes et salle, messages),
« Reçu du flux », l'import en une phrase et un lien vers `/nuit` pour les mis de côté. **Ordre changé le 17/10 : N5 avant
S**, pour que les demandes annoncées par le récap s'ouvrent sur le site.

## 15. N5 — demandes reçues (plan validé le 17/10)

Branche `demandes-recues` (depuis `main`). Pages réservées à l'agent ; un musicien est renvoyé, refus journalisé.

- **À traiter** = sans engagement, pas écartée, et statut du flux ni « annulée » ni « terminée » (décidé le 17/10 :
  plus rien à faire). Les autres restent dans « Toutes ».
- **`/demandes`** : « À traiter (n) / Toutes » ; date du concert (« date passée » si dépassée), programmateur, lieu
  indiqué, durée, statut du flux, nombre de messages ; la date la plus proche en tête. Bloc « Messages pour une
  demande inconnue » (quitte `/nuit`) ; « Dernier import : … — voir le journal ». Vide : « Aucune demande à traiter. »
  / « Aucune demande reçue : importez une nuit ».
- **`/demandes/[id]`** : référence, statut, catégorie, reçue le, historique (mises à jour et messages, texte brut,
  jamais exécutés) ; « Créer l'engagement », « Écarter » / « Remettre à traiter » (décidé le 17/10), ou « Engagement
  créé → ». Identifiant inconnu → « introuvable ».
- **Créer l'engagement** : formulaire existant, date précise et durée pré-remplies, lieu du flux affiché en indice ;
  programmateur de même nom exact présélectionné, sinon « + nouveau programmateur » pré-rempli avec le nom. Création et
  liaison en une seule écriture ; une demande déjà reliée ou écartée est refusée côté serveur. Date passée → refusée
  par le formulaire, comme toujours.
- Engagement supprimé → lien vidé, la demande redevient à traiter.
- Menu : « Demandes reçues » après « Engagements » ; « Journal des imports » sort du menu. Le récap renvoie vers
  `/demandes`.
- Hors périmètre : compteur dans le menu, réponse au programmateur, création automatique.

| Tranche | Contenu | Preuve |
|---|---|---|
| N5a | `src/lib/demandes.ts` (pur) : à traiter, tri, pré-remplissage ; menu | tests |
| N5b | page `/demandes` (liste, filtre, messages inconnus, lien vers le journal) | gestes |
| N5c | fiche `/demandes/[id]` avec historique | gestes |
| N5d | migration 0013 (`demandes_recues.ecartee_le`), « Écarter » / « Remettre à traiter ». Lignes existantes en production : vides = à traiter, rien à remplir | gestes |
| N5e | « Créer l'engagement » pré-rempli, liaison en une écriture | geste : demande → engagement ; seconde tentative refusée |
| N5f | « + nouveau programmateur » | gestes |
| N5g | récap : liens vers `/demandes` | test ; récap reçu |

Pushs groupés (décidé le 17/10) : N5a+N5b, N5c, N5d, N5e, N5f+N5g.

## 16. S — surveillance (plan validé le 18/10)

Branche `surveillance` (depuis `main`). Un seul paquet ajouté (`@sentry/nextjs`), une seule migration (0015).

- **Sentry** : erreurs du serveur (pages, actions, routes, cron, via `onRequestError`) et du navigateur, production et
  prévisualisation distinguées. Variable **`SENTRY_DSN`** (une seule ; `next.config.ts` la recopie dans le code du
  navigateur à la construction : un DSN n'est pas un secret, il ne permet que d'envoyer des erreurs). Sentry 11 collecte tout par défaut : cookies,
  en-têtes, corps des requêtes, variables locales, paramètres d'adresse sont coupés, et les jetons d'invitation et de
  réinitialisation (dans le chemin) remplacés par `[jeton]` avant envoi (`src/lib/sentry.ts`). Pas de
  `withSentryConfig` ni de `SENTRY_AUTH_TOKEN` (décidé le 18/10) : erreurs du navigateur moins lisibles, un secret de
  moins. Version fixée 11.7.0 (11.8.0 avait 3 jours).
- **Alerte de panne** : import en échec (flux muet, clé refusée, base absente) → courriel immédiat à l'agent + erreur
  Sentry, **une seule fois par panne** : seulement au passage de « réussi » à « en échec » (`executions.alerte_le`).
  La panne finit au premier import réussi ; pas de courriel « rétabli » (le récap le dit).
- Cas limites : « import déjà en cours » n'est pas une panne ; exécution interrompue (> 5 min) → Sentry seul ; récap
  impossible à envoyer (Resend en panne) → Sentry seul.
- **`/api/sante`**, publique : `ok` (200) ou `en panne` (503), rien d'autre. Sans paramètre, ne touche pas la base ;
  `?base=1` fait un `select 1`.
- **UptimeRobot, deux sondes** (décidé le 18/10) : `/api/sante` toutes les 5 min, `/api/sante?base=1` toutes les
  heures. Raison : Neon gratuit = 100 CU-h par mois et la base s'endort après 5 min ; une sonde de la base toutes les
  5 min la garderait allumée (~186 CU-h, quota dépassé vers le 17 du mois). Deux sondes : ~15 CU-h.
- Écran : `/nuit` affiche « alerte envoyée le … » sur l'exécution qui l'a déclenchée, et un bouton « Envoyer une erreur
  de test » (agent seulement, journalisé ; décidé le 18/10) pour refaire la preuve Sentry quand on veut.
- Hors périmètre : suivi des performances et relecture des sessions Sentry, page d'état publique, SMS, limite d'essais
  de connexion et anti-clickjacking (reportés à part).

| Tranche | Contenu | Preuve |
|---|---|---|
| S1 | `/api/sante` (avec et sans `?base=1`) | tests (200, 503) ; geste : l'adresse répond `ok` |
| S2 | `@sentry/nextjs` : `instrumentation.ts`, `instrumentation-client.ts`, `global-error.tsx` ; bouton d'erreur de test | erreur de test vue dans Sentry (prévisualisation, puis production) |
| S3 | `src/lib/alerte.ts` (règle « une par panne », pure), migration 0015 (`executions.alerte_le` ; lignes existantes vides = aucune alerte envoyée, rien à remplir), courriel + Sentry à l'échec | tests ; geste : fausse clé du flux sur la branche → un courriel et une erreur Sentry, second import → rien de plus ; vraie clé → import réussi |
| S4 | UptimeRobot (l'humain, sans code) : les deux sondes | alerte reçue via une sonde de test sur une adresse en 404, supprimée ensuite ; capture dans `docs/` |

Ce que l'humain fait : compte Sentry (projet Next.js, DSN dans `SENTRY_DSN`, Production et Preview) avant S2 ; fausse
`FLUX_DE_NUIT_CLE` réservée à la branche `surveillance` pour S3, retirée après ; compte UptimeRobot pour S4.
