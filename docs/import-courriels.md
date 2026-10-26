# Import d'un dossier de courriels (.eml)

*Cadrage validé par l'humain le 26/10/2026, branche `import-courriels`. Remplace le bouton factice « Importer les mails ».*

1. **Ordinateur seulement** : « Importer un dossier » (sélecteur de dossier du navigateur) ; seuls les `.eml` sont pris.
2. Les courriels sont lus **dans le navigateur** (`postal-mime`) ; le serveur enregistre expéditeur, objet, date et texte
   **tels quels, sans IA**, dans la table `courriels` (migration 0024), par lots de 20.
3. **Doublons** : identifiant unique = `Message-ID`, sinon empreinte SHA-256 (expéditeur, date, objet, texte) ; la base
   refuse le second. Bilan : « 12 importés, 3 déjà présents, 1 fichier illisible ».
4. Liste sur `/courriers` (à traiter d'abord) ; un clic déplie le texte. **« Traiter »** remplit le dépôt actuel
   (en-tête De / Date / Objet + texte) : lecture par l'IA, relecture, validation ; le courriel passe à « traité ».
5. « Envoyer au destinataire » (factice) retiré : « Copier » reste.

**Hors périmètre** : pièces jointes, téléphone, supprimer ou écarter un courriel importé, traiter plusieurs d'un coup.
