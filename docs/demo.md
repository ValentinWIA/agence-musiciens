# Déroulé de la démo — Agence-musiciens

Durée visée : 10 minutes. Toutes les personnes et adresses sont **fictives**.
Le même déroulé sert pour la répétition (prévisualisation de la branche `engagements`) et pour la démo (production).

## Avant de commencer (15 minutes avant)

- [ ] Deux fenêtres : une normale (l'agent), une **privée** (le musicien invité, puis Louis).
- [ ] Mot de passe de Louis : valeur de `MOT_DE_PASSE_DEMO` (variable d'environnement Vercel), jamais montrée à l'écran.
- [ ] Un **PDF fictif** prêt sur le bureau (par exemple `contrat-fictif.pdf`), moins de 4 Mo.
- [ ] Onglets ouverts : Vercel (projet → **Logs**), Resend (**API Keys**), le `README.md` sur GitHub (schémas).
- [ ] Vercel Hobby ne garde les journaux qu'environ une heure : les essais de la démo doivent être faits **pendant** la démo.
- [ ] Rappel : en prévisualisation, chaque push recharge le jeu de données (les essais précédents disparaissent).

## 1. Invitation → compte (2 min)

1. Agent connecté → **Invitations** → adresse fictive (ex. `chloe.martin@agence-musiciens.test`), instrument → « Créer l'invitation ».
2. Dire : sans nom de domaine, Resend n'écrit qu'au propriétaire du compte ; le lien est donc **affiché à l'agent**
   pour être transmis à la main. Le lien contient un jeton secret ; la base n'en garde que l'empreinte (SHA-256).
3. Copier le lien → fenêtre privée → choisir un mot de passe → le compte est créé, la musicienne arrive sur son tableau de bord (vide).
4. Montrer : le même lien ne marche plus une seconde fois.

## 2. Lieu enrichi par le géocodage IGN (2 min)

1. Agent → **Engagements** → « Nouvel engagement » → « + nouveau lieu » (à côté du champ Lieu).
2. Taper une adresse française (ex. « 78 rue Cardinet Paris ») → le service IGN propose des adresses → en choisir une.
3. Dire : les coordonnées viennent de l'IGN ; elles servent à la règle de conflit (distance entre deux concerts).
   Montrer le refus d'un doublon si on recrée le même lieu.

## 3. Engagement créé, avec un PDF (2 min)

1. Remplir le formulaire avec le nouveau lieu, un programmateur, un ou deux musiciens, une date future → « Enregistrer ».
2. Sur la fiche : **Pièces jointes** → choisir `contrat-fictif.pdf` → « Ajouter la pièce » → il apparaît dans la liste.
3. Si le temps le permet : un faux PDF (fichier renommé) est refusé, le contenu est vérifié et pas seulement l'extension.
4. Bonus cycle de vie : « Récital piano » à Lyon (12/12, Anna) → **Confirmer** passe ; « Duo piano-violon » à Genève
   (21/11) → **Confirmer** est refusé (Louis joue à Londres la veille : trajet impossible).

## 4. Louis tente d'ouvrir un engagement d'Anna (2 min)

1. Fenêtre privée → se connecter en Louis (`louis.roy@agence-musiciens.test`).
2. Montrer sa liste : seulement ses engagements, sans les coordonnées des programmateurs, aucun bouton.
3. Coller dans la barre d'adresse la fiche du récital d'Anna à Lyon (identifiant fixe du jeu de données) :
   `/engagements/7f33cfdb-4527-5821-83d4-db54f20e4d24` → page **« introuvable »**.
4. Vercel → **Logs** → chercher `Accès refusé` → ligne
   `Accès refusé : Louis Roy (musicien) sur l'engagement 7f33cfdb-…`.
5. Dire : la page dit « introuvable » pour ne pas révéler que l'engagement existe ; c'est le **serveur** qui
   vérifie, à chaque requête, pas un bouton caché.

## 5. Rotation de la clé Resend (2 min — production seulement, répétée en H5)

1. Resend → **API Keys** → créer une nouvelle clé (droit « envoi » seulement). La clé ne s'affiche qu'une fois : ne pas la montrer.
2. Vercel → **Settings → Environment Variables** → remplacer `RESEND_API_KEY` → **Redeploy**.
3. Resend → révoquer l'ancienne clé.
4. Prouver que ça marche : envoyer une invitation (ou une demande de mot de passe oublié) à l'adresse du propriétaire
   du compte Resend → courriel reçu, ligne `Courriel envoyé : …` dans les journaux.
5. Dire : la clé n'est jamais dans le code ni dans le dépôt ; la changer ne demande aucune modification du code.

## 6. Explication sur le schéma (1 min)

Ouvrir le `README.md` sur GitHub et raconter le trajet d'une création d'engagement : le navigateur envoie le
formulaire → l'action serveur vérifie les droits (`verifierAdmin`) → relit en base ce que le navigateur a envoyé
(lieu, programmateur, musiciens) → en cas de refus, message sous le champ et saisie gardée → sinon écriture en une
seule opération (tout ou rien).

## Ce qui manque (à annoncer si non fait)

- Jours fériés et conversion de devises (Frankfurter) : prévus après H, sur une branche à part.
- Reportés en semaine 2 (voir `docs/securite.md`) : limite d'essais de connexion, sessions non fermées après un
  changement de mot de passe, protection contre l'affichage dans un cadre (clickjacking).
