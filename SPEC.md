# SPEC — Agence-musiciens

Outil de gestion pour une petite agence artistique de musiciens classiques.
Projet fil rouge des « cinq exercices en cinq semaines » (voir `../5 exercices.pdf`) :
un seul produit, qui grandit chaque semaine, en ligne dès le premier soir.

## Objectif

Permettre à un agent de suivre les engagements de concert de ses musiciens,
de la première demande d'un programmateur jusqu'au paiement du cachet,
et à chaque musicien de consulter ses propres engagements.

## Stack (commune à la formation, offres gratuites)

- **Next.js** hébergé sur **Vercel** (offre Hobby), relié au dépôt **GitHub**.
- **Postgres géré sur Neon** (offre gratuite), relié à Vercel par l'intégration Neon :
  chaque prévisualisation reçoit sa propre branche de base de données, la production
  garde la sienne. On ne teste jamais sur la base de production.
  Le schéma vit dans le dépôt Git sous forme de migrations.
- **Auth.js** pour l'authentification et les rôles (jamais d'authentification écrite à la main).
- **Resend** (courriels), **Vercel Blob** (pièces jointes), **shadcn/ui** (interface).
- Tests et vérifications à chaque push, **UptimeRobot** (sonde), **Sentry** (erreurs).
- API Anthropic à partir de la semaine 3 (dépense plafonnée), SDK d'agents en semaine 4.

## Personnes (jeu de données fictif : 10 personnes)

| Personne | Nombre | Compte ? | Rôle dans le produit |
|---|---|---|---|
| Agent principal | 1 | Oui | **Administrateur** : voit et modifie tout, invite les musiciens |
| Pianistes | 2 | Oui | **Musicien** : ne voit que ses propres engagements |
| Violonistes | 2 | Oui | **Musicien** : idem |
| Programmateurs (salles, festivals) | 5 | **Non** | Contacts : ce sont des données, ils échangent par courriel |

Deux rôles seulement : `admin` et `musicien`.
Les droits sont **vérifiés côté serveur** à chaque requête : un engagement
masqué à l'écran n'est pas une protection (cf. IDOR). Un musicien qui tape
l'adresse de l'engagement d'un autre reçoit un refus, journalisé.

Les identifiants de toutes les tables sont **aléatoires (UUID)**, décidés dès la
création du schéma : rien ne se devine dans les adresses. C'est une précaution
en plus de la vérification côté serveur, jamais à sa place.

Le rôle `musicien` est en **consultation seule** : il voit ses engagements,
leurs contrats et pièces jointes, mais ne modifie rien.

## Objet principal : l'engagement

Un concert (ou une série) proposé par un programmateur, pour un ou plusieurs
musiciens de l'agence (solo ou duo piano-violon).

### Cycle de vie

```
demande → option posée → contrat envoyé → confirmé → joué → facturé → payé
                ↘              ↘              ↘
                              annulé
```

| Transition | Qui |
|---|---|
| Créer une demande | admin |
| Poser une option, envoyer le contrat, confirmer | admin |
| Marquer joué, facturé, payé | admin |
| Annuler (avant « joué ») | admin |

## Données (tables reliées)

- `utilisateurs` : agent et musiciens (rôle, instrument)
- `programmateurs` : contacts sans compte
- `lieux` : salles et festivals (adresse, coordonnées géographiques)
- `engagements` : date, horaire, lieu, programmateur, cachet, devise, programme, durée prévue, statut
- `engagement_musiciens` : table de liaison (un engagement peut concerner deux musiciens)

Le schéma évolue uniquement par migrations.

## Règles métier

1. **Conflit d'agenda** *(règle principale de la semaine 1)* : refuser de confirmer
   un engagement si un musicien concerné a déjà un engagement trop proche
   compte tenu de la distance entre les lieux.
   - Cas normal : deux concerts à une semaine d'intervalle.
   - Cas vide : musicien sans aucun engagement.
   - Cas piégé : concert finissant à 22 h, puis le lendemain à 11 h à 800 km.
2. **Duo** : un engagement à deux musiciens n'est confirmable que si les deux sont libres.
3. **Durée du programme** : avertir si la durée des œuvres dépasse la durée prévue au contrat.

Calcul du délai minimal (règle 1) :

- Fin d'un concert = heure de début + durée prévue.
- Temps de trajet estimé = distance à vol d'oiseau entre les deux lieux × 1,3
  (les routes ne sont pas droites) ÷ 80 km/h. La distance vient des coordonnées
  fournies par le géocodage data.gouv.
- Délai minimal entre la fin d'un concert et le début du suivant =
  temps de trajet estimé + **4 h** de marge (repos, installation, raccord).
- Exemple du cas piégé : 800 km × 1,3 ÷ 80 = 13 h, + 4 h = 17 h exigées ;
  or il n'y a que 13 h entre 22 h et 11 h le lendemain → conflit, confirmation refusée.

Valeurs par défaut (1,3 ; 80 km/h ; 4 h) : réglables, à ajuster si besoin.

## Jeu de données

Script rejouable, généré par l'IA, données **entièrement fictives** :
50 engagements répartis sur tous les statuts, 10 personnes, avec des cas tordus :
conflit de distance, engagement sans cachet, cachet en devise étrangère,
annulation après confirmation, programme trop long, duo dont un musicien est indisponible.

## Application semaine par semaine

| Semaine | Dans Agence-musiciens |
|---|---|
| 1 — Socle | Comptes, invitations des musiciens, 2 rôles, cycle de vie, règle de conflit, API externe : géocodage data.gouv (distance entre lieux), jours fériés, Frankfurter (cachets en devise). Pièces jointes : contrats, fiches techniques des salles |
| 2 — Nuit | Le flux de nuit apporte demandes, confirmations, annulations, messages des programmateurs. Récapitulatif du matin à l'agent : options qui expirent, cachets impayés |
| 3 — IA | Lecture des courriers de proposition (date, lieu, cachet, programme) en sortie structurée ; résumé et brouillon de réponse au programmateur ; recherche dans les contrats et fiches techniques qui cite la page |
| 4 — Agent | Ex. : « relance les cachets impayés » (courriels préparés, envoi après validation), « propose trois dates libres » (bénin). Serveur MCP protégé par jeton |
| 5 — Reprise | API en lecture avec clé et quota : un festival consulte les disponibilités des musiciens |

## Hors périmètre

- Comptes pour les programmateurs (accès par l'API en semaine 5 uniquement).
- Déclaration de disponibilité par les musiciens : seul l'agent gère l'agenda.
- Paiement réel, comptabilité, déclarations sociales.
- Toute donnée de personne réelle.

## Règles de travail (rappel de la fiche)

- Aucune ligne de code écrite à la main : Claude Code produit, je cadre et je vérifie.
- Claude doit expliquer clairement ce qu'il fait, car le but d'exercice est aussi d'apprendre la programmation.
- En ligne dès le premier soir ; une fonctionnalité par branche ; jamais de test sur la production.
- Commit avant chaque génération ; l'IA raconte ensuite ce qu'elle a changé.
- Aucun secret dans le dépôt, le navigateur ou le chat : variables d'environnement Vercel.
- Trois correctifs sans progrès : retour à la dernière version qui marchait.
- Chaque session finit par un état de reprise : fait, reste, cassé.
- Le jour 1, la fiche est recopiée dans `AGENTS.md`.

## Flux de nuit (source externe, semaines 2 à 4)

- Adresse : https://flux-de-nuit.vercel.app (mode d'emploi sur la même page).
- **Sujet choisi : `reservations`** (aucun sujet « concerts » n'existe dans la liste du flux).
  Il est passé à chaque appel : `?sujet=reservations`.
- Clé obtenue en tapant son prénom, affichée une seule fois : rangée dans les
  variables d'environnement Vercel, envoyée dans l'en-tête `Authorization: Bearer …`.
- À l'import, les champs du flux sont **adaptés au vocabulaire du produit**
  (une réservation devient un engagement, etc.).
- Le flux envoie des doublons (ignorés), des événements mal formés (mis de côté)
  et des messages contenant des consignes (traités comme des données, jamais suivis).
- Les 20 documents et 10 courriers de la semaine 3 viennent aussi du sujet
  `reservations` : ils parlent de réservations en général, pas de concerts.
