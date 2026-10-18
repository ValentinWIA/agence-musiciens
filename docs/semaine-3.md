# Semaine 3 — le produit devient intelligent (cadrage)

*Cadrage validé par l'humain le 18/10/2026 (décisions en section 8). Plan en tranches I1 → I7 (section 7) ; chaque
tranche est détaillée et validée avant d'être codée.*

Source : la fiche « Vos cinq exercices », semaine 3. Matière : le flux de nuit, sujet `reservations`
(`/api/courriers?sujet=reservations` et `/api/documents?sujet=reservations&id=DOC-reservations-NN`), lue le 18/10.

## 1. Ce qu'on veut, en dix lignes

1. Le modèle est appelé **depuis le serveur seulement** ; la clé `ANTHROPIC_API_KEY` vit dans Vercel, jamais dans le
   navigateur ni dans le dépôt.
2. L'agent **dépose un courrier** (texte collé, fichier `.txt` ou `.pdf` avec du texte) ; ses champs se remplissent
   seuls, dans un **format fixé** que le produit vérifie (zod) : ce qui n'y entre pas est refusé, rien n'est enregistré.
3. Chaque champ rempli vient avec **l'extrait exact** du courrier qui le justifie ; le produit vérifie que cet extrait
   existe mot pour mot. Sinon le champ est marqué **« à relire »** (le modèle a peut-être inventé).
4. Un champ absent du courrier reste **vide** (« absent du courrier »), jamais deviné : montant, date précise.
5. Le courrier est **classé** (ce que veut l'expéditeur) et l'agent peut demander un **brouillon de réponse**, affiché
   en streaming, qu'il copie lui-même. Rien n'est envoyé.
6. Les **20 documents** sont découpés par page, indexés une fois (embeddings dans Postgres avec pgvector) et
   **réindexés seulement s'ils changent**.
7. L'agent pose une **question en français** ; la réponse arrive en streaming et **cite la page** (« DOC-03, p. 2 »),
   avec le passage cité affiché ; une réponse sans source le dit.
8. Chaque nuit, après l'import, le modèle **analyse ce que la nuit a rapporté** (quelques phrases, à relire) : sur
   `/nuit` et dans le récap. Les messages du flux restent des données, jamais des consignes.
9. **Aucune action automatique** sur une réponse du modèle : l'agent valide chaque enregistrement.
10. Chaque appel est **compté** (jetons, coût) : limite par utilisateur et par jour, taille maximale, **plafond
    mensuel** ; le coût de l'IA s'ajoute à la page des coûts.

**Hors périmètre** : questions sur les engagements ou la base (l'agent qui lit le produit, c'est la semaine 4) ;
envoi de courriels de réponse ; création ou modification d'un engagement à partir d'un courrier ; PDF scannés (images
sans texte) ; fonctions IA pour les musiciens.

## 2. Ce que contient la matière (lue le 18/10)

**10 courriers**, tous sur le même modèle : expéditeur (structure), adresse et ville, date, « Objet : réservation
RES-AAAA-NNN », une demande en une phrase, un montant, un « type de dossier », un signataire et sa fonction.
Quatre demandes seulement : annuler (« la réunion est reportée »), « nous serons douze au lieu de six », décaler d'une
heure, et leurs variantes. Pièges confirmés :
- **COU-07 sans montant** : le champ doit rester vide.
- **COU-04 daté « la semaine dernière »** : pas de date précise ; le modèle ne doit pas en calculer une.
- **Références `RES-2024-589`** : format différent des nuits (`RES-20261017-05`), aucune ne correspond à une demande
  reçue. On le dit (« aucune demande liée »), sans chercher plus loin.
- Pas de date de concert ni de programme : ce sont des réservations de salles et de réunions.

**20 documents, 50 pages** (2 ou 3 pages de quelques lignes chacune), 4 de chaque type : procédure, contrat, compte
rendu, note de service, FAQ. Pièges relevés :
- **Mêmes titres, chiffres différents** : 4 « Procédure de traitement d'une réservation » (versions 2.1, 2.5, 3.0,
  9.3), chacune avec son seuil de double validation (1 067,23 €, 3 538,33 €, 4 139,80 €, 3 828,02 €). Une question sur
  « le seuil » a quatre réponses : la bonne réponse cite la version et la page, ou signale la contradiction.
- **Titre et contenu qui ne concordent pas** : « Compte rendu de réunion du 2025-10-18 » daté 2026-07-28 dans le texte ;
  « Contrat de service avec SAS Lumen » signé entre Imprimerie Belval et « notre société ».
- Quelques fautes de génération (« l'responsable », « 1 jours ») : à laisser telles quelles, on cite le texte.

## 3. Correspondance avec notre vocabulaire

| Courrier | Produit |
|---|---|
| expéditeur (structure) et signataire | **programmateur** : rapproché par le nom de structure, proposé à l'agent, jamais créé seul |
| « réservation RES-… » | référence ; rapprochée d'une **demande reçue** si elle existe (aucune aujourd'hui) |
| montant | montant en euros (comme un cachet), vide si absent |
| type de dossier | gardé tel quel (`permanence`, `intervention`, `salle`, `rendez_vous`), comme la catégorie du flux |
| ce qui est demandé | **classement** : annulation, changement (effectif, horaire, date), question, autre |

Les documents gardent leur vocabulaire : ce sont les procédures internes de l'agence, on les cite tels quels.

## 4. Les fonctions IA

| Fonction | Entrée | Sortie | Quand le modèle se trompe, l'agent voit… |
|---|---|---|---|
| **Lire un courrier** | texte du courrier (10 000 caractères au plus) | champs + extrait par champ, format fixé | un champ « à relire » (extrait introuvable), « absent du courrier », ou un refus « réponse illisible, rien n'est enregistré » ; il corrige avant de valider |
| **Classer** | dans le même appel | une des 4 catégories + une phrase de raison | la catégorie proposée, modifiable avant validation |
| **Brouillon de réponse** | courrier validé | texte en streaming | un brouillon marqué « rédigé par l'IA, à relire », qu'il copie ou jette |
| **Question sur les documents** | question (500 caractères au plus) + 5 passages les plus proches | réponse en streaming, citations natives de l'API | les passages cités sous la réponse ; « aucune source trouvée » si rien ne répond ; une citation est toujours un vrai passage fourni (l'API ne peut pas citer autre chose) |
| **Analyse de la nuit** | chiffres de l'import + textes des messages, balisés comme données | 3 à 5 phrases | un paragraphe « Analyse (IA, à relire) » ; s'il échoue, la nuit est importée quand même |

Choix techniques (référence de l'API Anthropic, lue le 18/10) :
- **Format fixé** : sorties structurées de l'API (`output_config.format`, schéma zod), puis zod côté produit.
- **Citations** : l'API cite nativement les documents fournis (chaque page = un document) ; on ne demande pas au
  modèle d'écrire lui-même « DOC-03 p. 2 », ce qui empêche d'inventer une source. Les citations et le format fixé ne
  se combinent pas : la question utilise les citations, le courrier le format fixé.
- **PDF** : texte extrait côté serveur (paquet `unpdf`), puis traité comme un texte collé : un seul chemin, et la
  vérification des extraits marche aussi pour un PDF.
- **Embeddings** : Anthropic n'en fournit pas ; **Voyage AI** (partenaire conseillé par Anthropic, offre gratuite
  largement suffisante pour 50 pages). Extension `vector` de Postgres sur Neon.
- **Empreinte** de chaque page (SHA-256) : une page dont le texte n'a pas changé n'est jamais recalculée.

## 5. Garde-fous et coûts

- **Modèle** : **choisi sur mesure en I2** (décision 1). Les 10 courriers sont lus par Claude Haiku 5.5
  (`claude-haiku-5-5`, 0,10 $ / 0,50 $ par million de jetons en entrée / sortie, ≈ 0,001 $ par courrier) et par
  Claude Opus 5.5 (`claude-opus-5-5`, 4 $ / 20 $, effort `low`, ≈ 0,03 $ par courrier) ; on compte juste / faux /
  inventé, l'humain choisit. Le modèle est écrit à un seul endroit (`src/lib/ia.ts`), une ligne par fonction.
  Pressenti : Haiku pour courrier, classement et analyse ; les questions (versions contradictoires) méritent peut-être
  Opus. Analyse de nuit ≈ 0,03 $ au plus (≈ 1 $ / mois). Indexation des 50 pages (≈ 10 000 jetons) : 0 $ si l'offre
  gratuite Voyage se confirme.
- **Table `appels_ia`** : qui, quelle fonction, modèle, jetons entrée / sortie, coût, durée, réussi ou non. Elle sert à
  la fois aux limites et à la page des coûts.
- **Limites** (vérifiées côté serveur avant l'appel) : 30 appels par utilisateur et par jour ; courrier ≤ 10 000
  caractères, PDF ≤ 2 Mo ; question ≤ 500 caractères ; **plafond de 5 $ par mois** dans le produit (au-delà : « plafond
  atteint », plus d'appel jusqu'au mois suivant, alerte à l'agent) ; plus le plafond de dépense réglé par l'humain dans
  la console Anthropic (filet si le produit se trompe).
- **Page des coûts** `/couts` : coût du mois par fonction, coût moyen par appel, derniers appels, plafond restant, et la
  ligne d'infrastructure (0 € sur les offres gratuites) aujourd'hui sur `/nuit`.
- Journaux : une ligne par appel (fonction, jetons, coût, durée), jamais le texte du courrier ni la clé.

## 6. Les écrans et leurs états

- **`/courriers`** (agent) : liste des courriers validés ; « Déposer un courrier » (coller ou fichier) et les 10
  courriers du flux à lire d'un clic. États : vide, lecture en cours (« Lecture du courrier… », puis « Vérification
  des extraits… »), champs remplis à relire, erreur (refus du format, plafond atteint, fichier sans texte).
- **Fiche courrier** : champs validés, classement, « Proposer une réponse » (streaming, bouton « Copier »).
- **`/questions`** (agent) : une case, la réponse qui s'écrit, les étapes (« Recherche des passages… »,
  « Rédaction… »), puis les sources citées dépliables ; états vide, documents pas encore indexés (bouton « Indexer »),
  erreur, plafond.
- **`/nuit`** : paragraphe d'analyse sous chaque exécution ; **`/couts`** : section 5.

## 7. Plan en tranches (à corriger)

Ordre : ce que la démo exige d'abord (courrier, question, coût), puis le reste.

| Tranche | Contenu | Preuve |
|---|---|---|
| **I1 socle** | SDK Anthropic, `src/lib/ia.ts` (serveur seulement), migration `appels_ia`, `src/lib/couts-ia.ts` (prix, coût, quota, plafond), page `/couts`, bouton « Tester l'IA » | tests du calcul et des limites ; geste : un appel de test apparaît sur `/couts` avec son coût |
| **I2 lecture d'un courrier** | `src/lib/courrier.ts` (schéma, vérification des extraits), dépôt, champs à relire, validation, migration `courriers` | tests sur les 10 courriers avec des réponses de modèle fabriquées (dont une inventée) ; geste : COU-07 sans montant, COU-04 sans date, un courrier inconnu |
| **I3 résumé** (remplace le brouillon, décidé le 18/10) | une phrase de résumé dans l'appel de lecture, relue et enregistrée avec le courrier | geste : résumé affiché, modifiable, enregistré |
| **I4 indexation** | extension `vector`, table `passages`, Voyage, découpage par page, empreintes, bouton « Indexer les documents » | tests du découpage et des empreintes ; geste : 50 passages, second clic → « 0 recalculé » |
| **I5 questions** | recherche des 5 passages, route en streaming avec citations, page `/questions` | geste : question sur le seuil de double validation → versions et pages citées ; question hors sujet → « aucune source » |
| **I6 analyse de la nuit** | appel après l'import (cron et bouton), colonne `executions.analyse`, paragraphe sur `/nuit` et dans le récap | geste : nuit rattrapée → analyse affichée ; panne de l'IA simulée → nuit importée quand même |
| **I7 rendu** | `docs/ia.md` : fonctions et erreurs visibles, coût par appel et par mois, récit d'un moment où l'IA a tourné en rond | relu par l'humain |

Une branche `ia` pour I1 à I3, puis une branche par bloc (indexation et questions ; analyse), chacune fusionnée et
vérifiée en production avant la suivante.

## 8. Décisions du 18/10

1. **Modèle mesuré, pas deviné** : Haiku 5.5 et Opus 5.5 lisent les 10 courriers en I2 (moins de 0,50 $ au total),
   l'humain choisit sur le décompte juste / faux / inventé.
2. **Embeddings : Voyage AI**, à condition que ce soit gratuit pour notre volume ; vérifié sur leur site avant I4
   (carte bancaire exigée → on en reparle avant d'agir).
3. **Fonctions IA réservées à l'agent** ; les musiciens n'y ont pas accès (vérifié côté serveur).
4. **Classer + résumer**, dans le même appel que la lecture. *(Décidé d'abord : classer + brouillon ; changé le
   18/10 pour gagner du temps : le résumé remplit l'exigence « deux sur trois » sans appel, page ni route de plus.
   Le streaming exigé par la fiche est fait en I5.)*
5. **Courrier enregistré après validation** par l'agent (table `courriers`, liste et fiche sur `/courriers`).
6. **Limites** : 30 appels par utilisateur et par jour (coupe une boucle ou un abus) ; **plafond de 5 $ par mois**
   dans le produit (protège la dépense), plus le plafond réglé dans la console Anthropic.
7. **Analyse de la nuit aux deux endroits** : sur `/nuit` et dans le récap du matin, faite une seule fois par nuit,
   titrée « Analyse (IA, à relire) ».

## 9. Ce que l'humain fait

- Créer la clé API Anthropic et **régler un plafond de dépense** dans la console (console.anthropic.com), mettre la clé
  dans Vercel (`ANTHROPIC_API_KEY`, Production et Preview), au moment de I1.
- Créer un compte Voyage AI et ranger sa clé (`VOYAGE_API_KEY`) au moment de I4.
- Faire chaque geste sur la prévisualisation et compter, pour la démo, ce qui est juste, faux ou inventé.
