# Revue de sécurité — semaine 1 (12/10/2026)

Revue faite sur la branche `engagements` avant sa fusion dans `main` (étape H1, `docs/engagements.md` section 12).
Règle : corriger avant fusion ce qui peut exposer des données ; noter le reste pour la semaine 2.

## Vérifié, correct

| Sujet | Constat |
|---|---|
| Droits | Chaque page et action protégée commence par `verifierSession()` ou `verifierAdmin()` (`src/lib/session.ts`). Sans contrôle, et c'est voulu : installation, invitation, mot de passe oublié, réinitialisation. |
| IDOR — fiche | Un musicien qui n'est pas sur l'engagement voit « introuvable » ; la tentative est journalisée (`src/lib/engagements.ts`). |
| IDOR — pièce jointe | La pièce doit être rattachée à cet engagement et le lecteur y avoir droit, sinon « Pièce introuvable. » en 404. |
| IDOR — modification, création, lieux, statuts | Réservées à l'agent, revérifié côté serveur. |
| Données saisies | Revérifiées côté serveur par chaque action (zod ou règles testées dans `src/lib`). |
| Secrets | Aucun dans le dépôt ni dans l'historique des commits ; `.env*` ignoré par git. |
| Pièces jointes | Stockage Blob **privé** ; type vérifié d'après le contenu (`%PDF-`), 4 Mo au plus. |
| Liens à jeton | Seule l'empreinte SHA-256 est stockée ; liens à durée limitée et à usage unique. |
| Mot de passe oublié | Même réponse que le compte existe ou non. |
| Invitation acceptée deux fois en même temps | L'unicité de l'e-mail en base empêche un second compte. |
| Installation | Refusée dès qu'un compte existe (revérifié à l'envoi). |
| Journaux | Ni mot de passe ni jeton. |

## Trouvé

| # | Point | Gravité | Suite |
|---|---|---|---|
| 1 | Les liens des courriels (invitation, réinitialisation) étaient fabriqués avec l'en-tête `Host` de la demande, falsifiable : un pirate pouvait faire envoyer à la victime un vrai jeton dans un lien vers son propre site. Probablement bloqué par Vercel (qui aiguille d'après ce même en-tête), mais protection non choisie. | Faible ici, grave ailleurs | **Corrigé** : adresse fournie par Vercel (`VERCEL_PROJECT_PRODUCTION_URL`, `VERCEL_BRANCH_URL`), `src/lib/origine.ts`. |
| 2 | Aucune limite au nombre d'essais de connexion. | Moyenne | Semaine 2 |
| 3 | Connexion plus rapide quand l'adresse n'existe pas (pas de calcul bcrypt) : on peut deviner qu'un compte existe en mesurant le temps. | Faible | Semaine 2 |
| 4 | Changer le mot de passe ne ferme pas les sessions déjà ouvertes (elles expirent seules). | Faible | Semaine 2 |
| 5 | Le site peut être affiché dans un cadre d'un autre site (clickjacking). | Faible | Semaine 2 : en-tête `frame-ancestors 'none'` |
| 6 | `npm audit` : 7 failles « élevées », toutes dans l'outil `shadcn` (construction des styles), jamais exécuté sur le serveur. | Sans effet | Noté |

## Non couvert par cette revue

- Tests automatiques des contrôles d'accès sur une vraie base (aujourd'hui : gestes à la main).
- Revue des réglages Vercel, Neon et Resend (droits des clés, accès au tableau de bord).
