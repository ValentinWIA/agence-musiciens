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
depuis le 20/09** : avec la règle « référence inconnue → mis de côté », environ 70 % seraient mis de côté (à décider
avant N3).

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
| N5 | boîte `/demandes` + « Créer l'engagement » pré-rempli | geste : une demande devient un engagement ; un musicien n'y a pas accès |
| D | domaine Resend `mail.valentinwalczak.com` (branche `domaine`) | courriel reçu à une autre adresse que celle du compte |
| R | récap du matin + `option_expire_le` (migration 0011), une fois par jour (branche `recap`) | geste : relancer → récap non renvoyé |
| S | Sentry, `/api/sante`, UptimeRobot, alerte de panne (branche `surveillance`) | **alertes déclenchées en vrai**, capture gardée |

Reportés de la revue de sécurité (`docs/securite.md`), à placer après : limite d'essais de connexion, anti-clickjacking.

## 10. Décisions du 17/10 (anciennes questions)

1. **Programmateur inconnu** : l'application ne sait pas créer de programmateur, et la table exige structure et
   e-mail, que le flux ne donne pas. **Oui** : un « + nouveau programmateur » dans le formulaire (comme
   « + nouveau lieu »), pré-rempli avec le nom du demandeur ; l'agent complète structure et e-mail.
2. **Demande sans suite** : **oui**, un bouton « Écarter » (la demande sort de « à traiter ») ; sinon la boîte se
   remplit à chaque nuit. Les deux vont dans N5.

## 11. Ce que l'humain fait

1. ✅ Clé obtenue (17/10), rangée dans `.env.local` (ignoré par git). À recopier dans Vercel → `FLUX_DE_NUIT_CLE`
   (Production et Preview) avant N3.
2. Créer `CRON_SECRET` dans Vercel (une longue chaîne aléatoire : `openssl rand -hex 32`) avant N4.
3. Resend + zone DNS OVH pour `mail.valentinwalczak.com` (tranche D).
4. Comptes Sentry (projet Next.js, DSN dans `SENTRY_DSN`) et UptimeRobot (tranche S).
