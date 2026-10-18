# L'IA dans Agence-musiciens — rendu de la semaine 3

Toutes les fonctions IA sont réservées à l'agent (vérifié côté serveur : un musicien est renvoyé, une route d'API
répond 403). Claude est appelé depuis le serveur seulement (`src/lib/ia.ts`), la clé vit dans les variables
d'environnement de Vercel. Aucune réponse du modèle ne déclenche d'action : l'agent relit, corrige, enregistre ou copie.

## 1. Les fonctions IA et ce que voit l'agent quand le modèle se trompe

| Fonction | Où | Ce qu'elle fait | Quand le modèle se trompe, l'agent voit… |
|---|---|---|---|
| **Lire un courrier** | `/courriers` | Remplit expéditeur, signataire, date, référence, montant, type de dossier, dans un format imposé (sortie structurée, revérifiée par zod). Pour chaque champ, le modèle doit citer l'extrait exact du courrier. | **« absent du courrier »** si l'information n'y est pas (COU-07 sans montant, COU-04 sans date précise) ; **« à relire »** en rouge si l'extrait cité n'est pas dans le courrier, ou si la date ou le montant n'y sont pas écrits (le code le vérifie : c'est là qu'une invention se voit), avec « l'IA a peut-être inventé » ; **« Réponse de l'IA illisible : rien n'est enregistré »** si la réponse sort du format. Tout est modifiable avant « Enregistrer ». |
| **Classer** | même appel | Une des 4 catégories, avec une phrase de raison. | La catégorie proposée, modifiable avant l'enregistrement. |
| **Résumer** | même appel | Une phrase. | « Résumé (proposé par l'IA, à relire) », modifiable avant l'enregistrement. |
| **Brouillon de réponse** | fiche courrier | Une réponse courtoise, en streaming, qui ne doit rien inventer ni promettre. | « Brouillon rédigé par l'IA, à relire : il ne doit rien promettre que l'agence n'a pas décidé. » Le texte reste modifiable, il n'est ni enregistré ni envoyé : l'agent le copie ou le jette. |
| **Question sur les documents** | « Documents » | Cherche les 5 pages les plus proches parmi les 20 documents indexés (Voyage AI, pgvector), puis répond en streaming en citant ses sources. | Les pages citées sous la réponse, dépliables, avec la phrase citée. La liste des 20 documents permet de vérifier une page. Une source ne peut pas être inventée : l'API ne cite que les pages fournies. Hors sujet : « aucune source citée ». Les étapes s'affichent pendant l'appel (« Recherche des passages… », « Rédaction de la réponse… »). |
| **Analyse de la nuit** | `/nuit` et récap du matin | 3 à 5 phrases sur ce que le flux a apporté, pour la dernière nuit importée à chaque passage. | « Analyse (IA, à relire) ». Si l'IA échoue : « indisponible (raison) », et la nuit est importée quand même. Un message du flux qui contient une consigne reste une donnée : il est balisé et ne peut pas sortir de sa balise. |

Dans tous les cas, si le plafond ou la limite du jour sont atteints, l'agent lit la raison (« Plafond de 5 $ atteint
ce mois-ci… », « Limite de 30 appels à l'IA par jour atteinte… ») et rien n'est appelé.

## 2. Coût par appel et par mois

Modèle : **Claude Haiku 5.5** pour toutes les fonctions (0,10 $ par million de jetons en entrée, 0,50 $ en sortie).
**Sonnet 5.5** au choix de l'agent pour un courrier complexe (2 $ / 10 $). Embeddings : **Voyage AI**, offre gratuite.

*Coûts estimés d'après la taille des appels. Les chiffres réels (coût moyen par appel, total du mois) sont sur
la page `/couts` du produit, qui enregistre chaque appel avec ses jetons.*

| Fonction | Coût par appel (estimé) |
|---|---|
| Lire, classer et résumer un courrier (Haiku) | ≈ 0,001 $ |
| Lire un courrier avec Sonnet | ≈ 0,01 $ |
| Question sur les documents | ≈ 0,001 $ (+ la recherche Voyage : 0 $) |
| Brouillon de réponse | ≈ 0,0005 $ |
| Analyse de la nuit | ≈ 0,0005 $ |
| Indexation des 20 documents (50 pages, une fois ; une page inchangée n'est jamais recalculée) | 0 $ |

**Par mois, pour une agence** (30 analyses de nuit, 50 courriers, 100 questions, 50 brouillons) : **≈ 0,15 $**.

**Garde-fous** : 30 appels par utilisateur et par jour ; courrier ≤ 10 000 caractères et PDF ≤ 2 Mo ; question
≤ 500 caractères ; **plafond de 5 $ par mois** dans le produit (au-delà, plus d'appel et une alerte Sentry), et un
plafond de dépense réglé dans la console Anthropic, au cas où le produit se tromperait.
Infrastructure : 0 € (offres gratuites de Vercel, Neon, Resend, Sentry, UptimeRobot et Voyage).

## 3. Un moment où l'IA a tourné en rond

**Le 19 octobre, la prévisualisation de la branche `brouillon` refusait de se construire.** Le journal de Vercel
disait : `Please provide required params for Postgres driver: url: undefined`.

- **1ᵉʳ essai.** L'IA a reconnu une panne déjà vue sur la branche `questions`, qui avait échoué puis réussi au
  second essai, sans qu'on cherche la cause. Hypothèse : sur une branche neuve, la construction démarre avant que
  Neon ait donné l'adresse de la nouvelle base. Remède proposé : « Redeploy ».
- **2ᵉ essai.** « Redeploy » sans cache : même erreur. Les mêmes symptômes pouvaient revenir à l'infini. L'IA
  aurait pu proposer un commit vide pour relancer encore, mais ça aurait caché la cause.
- **Comment on en est sorti.** On a arrêté de relancer et on a lu le journal ligne à ligne. Une adresse absente
  même après un second essai, ce n'est pas un retard : c'est une base qui n'a jamais été créée. Nouvelle hypothèse :
  **l'offre gratuite de Neon limite le nombre de branches de base**, et chaque fonctionnalité en avait créé une, sans
  jamais la supprimer. J'ai supprimé dans Neon les branches des fonctionnalités déjà fusionnées (jamais la
  principale), puis « Redeploy » : la construction a réussi.
- **Ce que j'en retiens.** La panne de `questions` était le même problème, laissé de côté parce qu'un second essai
  avait marché. Deux relances sans progrès, c'est le signal pour s'arrêter et lire, pas pour relancer une troisième
  fois. Le remède est noté dans `SUIVI.md` : faire le ménage dans Neon après chaque fusion.
