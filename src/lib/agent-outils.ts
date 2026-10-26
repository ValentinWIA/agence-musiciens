import "server-only";
import { tool } from "@anthropic-ai/claude-agent-sdk";
import { and, asc, count, desc, eq, gt, ilike, inArray, like, not, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { courriers, demandesRecues, evenementsFlux, executionsAgent, lieux, programmateurs, propositions, utilisateurs } from "@/db/schema";
import { lireFormulaire } from "@/app/(connecte)/engagements/saisie";
import {
  ACTIONS_MCP_MAX,
  ajouterALaNote,
  APPELS_PAR_DEMANDE_MAX,
  appelsAtteints,
  budgetActionsAtteint,
  consignePossible,
  correspondDemande,
  deNom,
  enDonnees,
  FENETRE_ACTIONS_MINUTES,
  heureDansDemande,
  musicienNomme,
  NOTE_MAX,
  OUTILS_D_ACTION,
  resumeSortie,
} from "./agent-regles";
import { formaterMontant, type Devise } from "./argent";
import { ajouterJours, jourLocal } from "./calendrier";
import { formaterDebut } from "./dates";
import { DEJA_TRAITEE, ecrireEngagement } from "./creation-engagement";
import { estATraiter, LIBELLES_DEMANDE, ligneHistorique, programmateursDeMemeNom, trierDemandes } from "./demandes";
import { LIBELLES_STATUT, lireEngagement, listerEngagements, listerMusiciens, type Statut } from "./engagements";
import { lireEngagementsASuivre } from "./lecture-a-faire";
import { NOTES_AGENT_MAX } from "./musiciens";
import { origineDuSite } from "./origine";
import { motifRelance, SUJET_MAX, TEXTE_MAX, verifierCourriel } from "./propositions";
import { cachetsImpayes, optionsQuiExpirent } from "./recap";

// Les outils de l'agent (docs/semaine-4.md, section 3) : lecture, et deux actions sans risque. Écrits une fois : la
// page /assistant et le serveur MCP s'en servent. Chaque appel revérifie le rôle et s'inscrit au journal.

export type Utilisateur = { id: string; nom: string; role: "admin" | "musicien" };
// alerte : une tournure de consigne dans ce que l'outil a renvoyé (A6), signalée au journal.
export type Etape = { outil: string; entree: unknown; sortie: string; alerte?: true };

type Resultat = { content: { type: "text"; text: string }[]; isError?: boolean };
const texte = (t: string): Resultat => ({ content: [{ type: "text", text: t }] });
const refus = (t: string): Resultat => ({ content: [{ type: "text", text: t }], isError: true });

// Adresse complète, à copier telle quelle dans la barre d'adresse (retour du 25/10).
const lien = (chemin: string) => `${origineDuSite()}${chemin}`;
// Une fiche ouverte depuis l'assistant y ramène (« ← Assistant », retour du 25/10).
const fiche = (chemin: string) => lien(`${chemin}?depuis=assistant`);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STATUTS = Object.keys(LIBELLES_STATUT) as [Statut, ...Statut[]];
const quand = (e: { debut: Date; precisionDate?: "jour" | "mois" | "saison"; pays: string }) =>
  formaterDebut(e.debut, e.precisionDate ?? "jour", e.pays);
const montant = (cachet: number | null, devise: string) =>
  cachet === null ? "cachet à définir" : formaterMontant(cachet, devise as Devise);

const estAction = (nom: string) => (OUTILS_D_ACTION as readonly string[]).includes(nom);

// Actions réussies par MCP dans la fenêtre (une ligne du journal par appel ; les refus ne comptent pas).
async function actionsMcpRecentes(): Promise<number> {
  const [{ n }] = await db
    .select({ n: count() })
    .from(executionsAgent)
    .where(
      and(
        eq(executionsAgent.porte, "mcp"),
        gt(executionsAgent.debutLe, sql`now() - make_interval(mins => ${FENETRE_ACTIONS_MINUTES})`),
        inArray(sql`${executionsAgent.etapes}->0->>'outil'`, [...OUTILS_D_ACTION]),
        not(like(sql`${executionsAgent.etapes}->0->>'sortie'`, "refus%")),
      ),
    );
  return n;
}

// Un musicien désigné par son nom, comme l'écrit l'agent (« Inès », « louis martin ») : un seul doit correspondre.
async function trouverMusicien(nom: string): Promise<{ id: string; nom: string } | string> {
  const simple = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();
  const musiciens = await listerMusiciens();
  const trouves = musiciens.filter((m) => simple(m.nom).includes(simple(nom)));
  if (trouves.length === 1) return trouves[0];
  const tous = musiciens.map((m) => m.nom).join(", ");
  return trouves.length === 0
    ? `Aucun musicien ne s'appelle « ${nom} ». Musiciens de l'agence : ${tous}.`
    : `Plusieurs musiciens correspondent à « ${nom} » : ${trouves.map((m) => m.nom).join(", ")}. Précisez.`;
}

// demande : ce qu'a écrit l'agente ; les actions y vérifient l'heure et les musiciens (le modèle ne les invente pas).
// null par le serveur MCP, qui ne voit pas ce qu'on a tapé dans Claude Code : c'est alors Claude Code qui montre les
// paramètres de chaque action et demande l'autorisation (docs/semaine-4.md, A5). Les autres garde-fous restent.
// surEtape : prévient la page à chaque outil appelé (ce qui se passe pendant l'appel).
// executionId : l'exécution en cours, à laquelle une relance proposée est rattachée.
export function outilsDeLAgent(
  utilisateur: Utilisateur,
  demande: string | null,
  executionId: string | null,
  journal: Etape[],
  surEtape?: (etape: Etape) => void,
) {
  // Compté au départ de chaque appel, avant toute attente : des appels lancés en parallèle sont tous comptés.
  let appelsLances = 0;
  // Chaque outil passe par ici : le rôle est revérifié (le modèle ne choisit pas ses droits) et l'appel est noté.
  const garde =
    <A,>(nom: string, faire: (args: A) => Promise<Resultat>) =>
    async (args: A): Promise<Resultat> => {
      let resultat: Resultat;
      const dejaLances = appelsLances++;
      if (utilisateur.role !== "admin") {
        console.warn(`Accès refusé : ${utilisateur.nom} (musicien) sur l'outil ${nom} de l'agent`);
        resultat = refus("Refusé : réservé à l'agent de l'agence.");
      } else if (executionId !== null && appelsAtteints(dejaLances)) {
        // Dérive n° 3 : sur la page, une seule demande ne lance pas plus de 20 appels, en parallèle ou non.
        console.warn(`Assistant : outil ${nom} refusé (plus de ${APPELS_PAR_DEMANDE_MAX} appels pour une seule demande)`);
        resultat = refus(
          `Refusé : plus de ${APPELS_PAR_DEMANDE_MAX} appels d'outils pour une seule demande. ` +
            "Réponds avec ce que tu as déjà lu et propose de continuer par une demande plus précise.",
        );
      } else if (demande === null && estAction(nom) && budgetActionsAtteint(await actionsMcpRecentes())) {
        // Dérive n° 2 : par MCP, une rafale d'actions est coupée ici, quelle que soit l'IA qui appelle.
        console.warn(`Assistant : action ${nom} refusée par MCP (budget de ${ACTIONS_MCP_MAX} actions en ${FENETRE_ACTIONS_MINUTES} min atteint)`);
        resultat = refus(
          `Refusé : trop d'actions d'affilée par MCP (${ACTIONS_MCP_MAX} en ${FENETRE_ACTIONS_MINUTES} minutes). ` +
            "Faites les suivantes depuis le site, ou réessayez plus tard.",
        );
      } else {
        try {
          resultat = await faire(args);
        } catch (e) {
          console.error(`Outil ${nom} de l'agent en échec : ${e instanceof Error ? e.message : e}`);
          resultat = refus("L'outil a échoué (base indisponible ?). Réessayez plus tard.");
        }
      }
      const etape: Etape = { outil: nom, entree: args, sortie: (resultat.isError ? "refus : " : "") + resumeSortie(resultat.content[0].text) };
      if (consignePossible(resultat.content[0].text)) {
        etape.alerte = true;
        console.warn(`Assistant : consigne possible dans le résultat de ${nom} (signalée au journal)`);
      }
      journal.push(etape);
      surEtape?.(etape);
      return resultat;
    };
  const lecture = { annotations: { readOnlyHint: true } };
  const action = { annotations: { readOnlyHint: false, destructiveHint: false } };

  return [
    tool(
      "options_qui_expirent",
      "Options dont l'échéance tombe dans les 7 jours ou est déjà passée : à relancer auprès du programmateur.",
      {},
      garde("options_qui_expirent", async () => {
        const aSuivre = await lireEngagementsASuivre();
        const options = optionsQuiExpirent(
          aSuivre.filter((e) => e.statut === "option" && e.expireLe !== null).map((e) => ({ ...e, expireLe: e.expireLe! })),
          jourLocal(new Date(), "France"),
        );
        if (options.length === 0) return texte("Aucune option à relancer.");
        return texte(
          options
            .map((o) => `- ${o.titre ?? "sans titre"} — ${o.salle}, ${o.ville}, ${quand(o)} — ${o.musiciens.join(", ")} — échéance ${o.expireLe} (id ${o.id}, fiche ${fiche(`/engagements/${o.id}`)})`)
            .join("\n"),
        );
      }),
      lecture,
    ),
    tool(
      "cachets_impayes",
      "Concerts joués ou facturés dont le cachet n'est pas payé plus de 30 jours après : facture à relancer.",
      {},
      garde("cachets_impayes", async () => {
        const impayes = cachetsImpayes(await lireEngagementsASuivre(), jourLocal(new Date(), "France"));
        if (impayes.length === 0) return texte("Aucun cachet impayé depuis plus de 30 jours.");
        return texte(
          impayes
            .map((c) => `- ${c.titre ?? "sans titre"} — ${c.salle}, ${c.ville}, ${quand(c)} — ${c.musiciens.join(", ")} — ${montant(c.cachet, c.devise)}, ${LIBELLES_STATUT[c.statut]} (id ${c.id}, fiche ${fiche(`/engagements/${c.id}`)})`)
            .join("\n"),
        );
      }),
      lecture,
    ),
    tool(
      "chercher_engagements",
      "Liste des engagements (30 au plus), filtrée par statut, musicien (nom) ou mot cherché dans le titre, la salle ou la ville. " +
        "periode « en-cours » : ceux qui attendent encore quelque chose ; « tous » : y compris passés, payés ou annulés.",
      {
        statut: z.enum(STATUTS).optional(),
        musicien: z.string().max(100).optional(),
        recherche: z.string().max(100).optional(),
        periode: z.enum(["en-cours", "tous"]).default("en-cours"),
      },
      garde("chercher_engagements", async ({ statut, musicien, recherche, periode }) => {
        let musicienId: string | undefined;
        if (musicien) {
          const m = await trouverMusicien(musicien);
          if (typeof m === "string") return refus(m);
          musicienId = m.id;
        }
        const liste = await listerEngagements(utilisateur, { statut, musicien: musicienId, recherche, periode });
        if (liste.length === 0) return texte("Aucun engagement ne correspond.");
        const lignes = liste
          .slice(0, 30)
          .map((e) => `- ${e.titre ?? "sans titre"} — ${e.lieu}, ${e.ville}, ${quand(e)} — ${e.musiciens.map((m) => m.nom).join(", ")} — ${LIBELLES_STATUT[e.statut]}, ${montant(e.cachet, e.devise)} (id ${e.id}, fiche ${fiche(`/engagements/${e.id}`)})`);
        return texte(lignes.join("\n") + (liste.length > 30 ? `\n… et ${liste.length - 30} autres : précisez la recherche.` : ""));
      }),
      lecture,
    ),
    tool(
      "lire_engagement",
      "Fiche complète d'un engagement par son id : date, lieu, musiciens, programmateur et son e-mail, cachet, statut, échéance.",
      { id: z.string() },
      garde("lire_engagement", async ({ id }) => {
        const e = await lireEngagement(utilisateur, id);
        if (!e) return refus(`Engagement introuvable (id ${id}).`);
        const p = e.programmateur;
        return texte(
          [
            `${e.titre ?? "sans titre"} — ${LIBELLES_STATUT[e.statut]} — fiche ${fiche(`/engagements/${e.id}`)}`,
            `Date : ${quand({ ...e, pays: e.lieu.pays })}${e.dureeMinutes ? `, ${e.dureeMinutes} min` : ""}`,
            `Lieu : ${e.lieu.nom}, ${e.lieu.ville} (${e.lieu.pays})`,
            `Musiciens : ${e.musiciens.map((m) => `${m.nom} (${m.instrument})`).join(", ")}`,
            `Programmateur : ${p.nom}${p.structure ? `, ${p.structure}` : ""} — ${p.email}`,
            `Cachet : ${montant(e.cachet, e.devise)}`,
            e.optionExpireLe ? `Échéance de l'option : ${e.optionExpireLe}` : null,
            e.programme ? `Programme : ${e.programme}` : null,
            e.notes ? `Notes : ${e.notes}` : null,
          ]
            .filter(Boolean)
            .join("\n"),
        );
      }),
      lecture,
    ),
    tool(
      "disponibilite",
      "Engagements d'un musicien (nom) entre deux jours avant et deux jours après une date (AAAA-MM-JJ), annulés exclus. " +
        "Un concert confirmé, joué, facturé ou payé tient la date ; une demande ou une option ne la tient pas encore.",
      { musicien: z.string().max(100), jour: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) },
      garde("disponibilite", async ({ musicien, jour }) => {
        const m = await trouverMusicien(musicien);
        if (typeof m === "string") return refus(m);
        const [du, au] = [ajouterJours(jour, -2), ajouterJours(jour, 2)];
        const proches = (await listerEngagements(utilisateur, { musicien: m.id, periode: "tous" })).filter((e) => {
          const j = jourLocal(e.debut, e.pays);
          return e.statut !== "annule" && j >= du && j <= au;
        });
        if (proches.length === 0) return texte(`${m.nom} n'a aucun engagement du ${du} au ${au}.`);
        return texte(
          `${m.nom}, du ${du} au ${au} :\n` +
            proches.map((e) => `- ${quand(e)} — ${e.titre ?? "sans titre"}, ${e.lieu}, ${e.ville} — ${LIBELLES_STATUT[e.statut]} (id ${e.id}, fiche ${fiche(`/engagements/${e.id}`)})`).join("\n"),
        );
      }),
      lecture,
    ),
    tool(
      "lister_musiciens",
      "Les musiciens de l'agence (les artistes qu'elle représente), avec leur instrument. Les demandeurs et " +
        "programmateurs ne sont pas des musiciens de l'agence : ce sont ses clients.",
      {},
      garde("lister_musiciens", async () => {
        const musiciens = await listerMusiciens();
        return texte(musiciens.map((m) => `- ${m.nom} (${m.instrument}) (id ${m.id})`).join("\n") || "Aucun musicien.");
      }),
      lecture,
    ),
    tool(
      "demandes_a_traiter",
      "Demandes reçues du flux de nuit qui attendent l'agente (30 au plus, le concert le plus proche d'abord), sans " +
        "leurs messages. recherche : un mot de la référence, du demandeur ou du lieu, ou une date (AAAA-MM-JJ ou JJ/MM/AAAA). " +
        "Pour l'historique et les messages d'une demande : lire_demande.",
      { recherche: z.string().max(100).optional() },
      garde("demandes_a_traiter", async ({ recherche }) => {
        const toutes = trierDemandes((await db.select().from(demandesRecues)).filter(estATraiter));
        const trouvees = recherche ? toutes.filter((d) => correspondDemande(d, recherche)) : toutes;
        if (trouvees.length === 0) {
          return texte(recherche ? `Aucune demande à traiter ne correspond à « ${recherche} » (${toutes.length} à traiter en tout).` : "Aucune demande à traiter.");
        }
        const lignes = trouvees.slice(0, 30).map((d) => `- ${d.reference} : ${d.programmateur}, ${d.lieu}, le ${d.dateConcert} (id ${d.id}, fiche ${fiche(`/demandes/${d.id}`)})`);
        const total = `${trouvees.length} demande(s)${recherche ? ` correspondent à « ${recherche} »` : " à traiter"}` +
          (trouvees.length > 30 ? ", 30 affichées : précisez la recherche." : ".");
        // Tout vient du flux, noms des demandeurs compris : rendu comme une donnée.
        return texte(`${total}\n${enDonnees(lignes.join("\n"))}`);
      }),
      lecture,
    ),
    tool(
      "lire_demande",
      "Une demande reçue complète, par son id ou sa référence (RES-…) : demandeur, lieu, date, durée, état, historique " +
        "et messages du programmateur.",
      { idOuReference: z.string().max(100) },
      garde("lire_demande", async ({ idOuReference }) => {
        const cle = idOuReference.trim();
        const [d] = await db
          .select()
          .from(demandesRecues)
          .where(UUID.test(cle) ? eq(demandesRecues.id, cle) : ilike(demandesRecues.reference, cle));
        if (!d) return refus(`Demande reçue introuvable (« ${cle} »).`);
        const evenements = await db
          .select({ type: evenementsFlux.type, brut: evenementsFlux.brut })
          .from(evenementsFlux)
          .where(and(eq(evenementsFlux.reference, d.reference), eq(evenementsFlux.etat, "traite")))
          .orderBy(asc(evenementsFlux.horodatage));
        const historique = evenements
          .map((e) => ligneHistorique(e.type, e.brut))
          .filter((l) => l !== null)
          .map((l) => `${l.titre}${l.texte ? ` ${l.texte}` : ""}`);
        const etat = d.engagementId ? `déjà reliée à l'engagement ${fiche(`/engagements/${d.engagementId}`)}` : d.ecarteeLe ? "écartée" : estATraiter(d) ? "à traiter" : LIBELLES_DEMANDE[d.statut];
        return texte(
          `Demande (id ${d.id}, fiche ${fiche(`/demandes/${d.id}`)}), ${etat} :\n` +
            enDonnees(
              `${d.reference} : demandeur ${d.programmateur}, lieu ${d.lieu}, le ${d.dateConcert}, ${d.dureeMinutes} min, ${d.categorie}\n` +
                (historique.join("\n") || "aucun message"),
            ),
        );
      }),
      lecture,
    ),
    tool(
      "lire_courrier",
      "Sans id : les 10 derniers courriers déposés (date, expéditeur, classement). Avec un id : le courrier complet et son texte.",
      { id: z.string().uuid().optional() },
      garde("lire_courrier", async ({ id }) => {
        if (!id) {
          const derniers = await db.select().from(courriers).orderBy(desc(courriers.creeLe)).limit(10);
          if (derniers.length === 0) return texte("Aucun courrier déposé.");
          return texte(
            enDonnees(derniers.map((c) => `- ${c.dateCourrier ?? "sans date"} — ${c.structure ?? "expéditeur inconnu"} — ${c.classement} (id ${c.id}, fiche ${fiche(`/courriers/${c.id}`)})`).join("\n")),
          );
        }
        const [c] = await db.select().from(courriers).where(eq(courriers.id, id));
        if (!c) return refus(`Courrier introuvable (id ${id}).`);
        // Les champs ont été lus dans le courrier : tout est rendu comme une donnée.
        return texte(
          `Courrier (id ${c.id}, fiche ${fiche(`/courriers/${c.id}`)}) :\n` +
            enDonnees(
              `De ${c.structure ?? "?"} (${c.signataire ?? "?"}), daté du ${c.dateCourrier ?? "?"}, classé « ${c.classement} »\n` +
                `Résumé : ${c.resume ?? "aucun"}\n${c.texte}`,
            ),
        );
      }),
      lecture,
    ),
    tool(
      "ajouter_note",
      "Action : ajoute une remarque datée aux notes privées de l'agente sur la fiche d'un musicien (nom). " +
        "Seulement si l'agente le demande.",
      { musicien: z.string().max(100), note: z.string().max(NOTE_MAX) },
      garde("ajouter_note", async ({ musicien, note }) => {
        const m = await trouverMusicien(musicien);
        if (typeof m === "string") return refus(m);
        if (demande !== null && !musicienNomme(m.nom, demande)) return refus(`Refusé : votre demande ne nomme pas ${m.nom}.`);
        const [fiche] = await db.select({ notes: utilisateurs.notesAgent }).from(utilisateurs).where(eq(utilisateurs.id, m.id));
        const suite = ajouterALaNote(fiche?.notes ?? null, note, jourLocal(new Date(), "France"), NOTES_AGENT_MAX);
        if ("erreur" in suite) return refus(suite.erreur);
        await db.update(utilisateurs).set({ notesAgent: suite.notes }).where(eq(utilisateurs.id, m.id));
        console.log(`Assistant : note ajoutée sur la fiche ${deNom(m.nom)} pour ${utilisateur.nom}`);
        return texte(`Note ajoutée sur la fiche ${deNom(m.nom)} : ${lien(`/musiciens/${m.id}`)}`);
      }),
      action,
    ),
    tool(
      "creer_engagement_depuis_demande",
      "Action : crée l'engagement (statut « demande ») d'une demande reçue, par son id. Exige l'heure (HH:MM) et les " +
        "musiciens (noms, un ou deux), tels que l'agente les a écrits dans sa demande : ne les devine jamais, demande-les. " +
        "La date, la durée, le lieu et le programmateur viennent de la demande reçue.",
      {
        demandeId: z.string().uuid(),
        heure: z.string().regex(/^\d{2}:\d{2}$/),
        musiciens: z.array(z.string().max(100)).min(1).max(2),
      },
      garde("creer_engagement_depuis_demande", async ({ demandeId, heure, musiciens }) => {
        // Garde-fous : l'heure et chaque musicien doivent figurer dans ce qu'a écrit l'agente.
        if (demande !== null && !heureDansDemande(heure, demande)) {
          return refus(`Refusé : l'heure ${heure} n'est pas écrite dans votre demande. Précisez l'heure du concert.`);
        }
        const ids: string[] = [];
        for (const nom of musiciens) {
          const m = await trouverMusicien(nom);
          if (typeof m === "string") return refus(m);
          if (demande !== null && !musicienNomme(m.nom, demande)) return refus(`Refusé : votre demande ne nomme pas ${m.nom}.`);
          ids.push(m.id);
        }

        const [d] = await db.select().from(demandesRecues).where(eq(demandesRecues.id, demandeId));
        if (!d) return refus(`Demande reçue introuvable (id ${demandeId}).`);
        if (!estATraiter(d)) return refus(DEJA_TRAITEE);
        const formulaire = lien(`/engagements/nouveau?demande=${d.id}`);
        // Le flux ne donne que des noms : on ne crée ni lieu ni programmateur, on les retrouve ou on renvoie au formulaire.
        const [lieuxConnus, programmateursConnus] = await Promise.all([
          db.select({ id: lieux.id, nom: lieux.nom }).from(lieux),
          db.select({ id: programmateurs.id, nom: programmateurs.nom }).from(programmateurs),
        ]);
        const lieu = programmateursDeMemeNom(d.lieu, lieuxConnus);
        const programmateur = programmateursDeMemeNom(d.programmateur, programmateursConnus);
        if (lieu.length !== 1 || programmateur.length !== 1) {
          const manque = lieu.length !== 1 ? `le lieu « ${d.lieu} »` : `le programmateur « ${d.programmateur} »`;
          return refus(`Refusé : ${manque} n'est pas (ou pas une seule fois) dans le produit. Créez l'engagement depuis le formulaire : ${formulaire}`);
        }

        // Même lecture que le formulaire : date passée, durée, musiciens, tout est revérifié de la même façon.
        const champs = new FormData();
        for (const [cle, valeur] of Object.entries({
          titre: "", precision: "jour", jour: d.dateConcert, heure, mois: "", saison: "", annee: "",
          duree: String(d.dureeMinutes), lieuId: lieu[0].id, programmateurId: programmateur[0].id,
          cachet: "", devise: "EUR", programme: "", notes: `Créé par l'assistant depuis la demande ${d.reference}.`,
        })) champs.set(cle, valeur);
        for (const id of ids) champs.append("musiciens", id);
        const lu = await lireFormulaire(champs);
        if (!lu.saisie) {
          const raisons = Object.values(lu.erreurs).flat().join(" ");
          return refus(`Refusé : ${raisons} Créez l'engagement depuis le formulaire : ${formulaire}`);
        }
        const ecrit = await ecrireEngagement(lu.saisie, { id: d.id });
        if ("erreur" in ecrit) return refus(ecrit.erreur);
        console.log(`Engagement créé : ${ecrit.id} (depuis la demande ${d.reference}, par l'assistant) pour ${utilisateur.nom}`);
        return texte(`Engagement créé au statut « demande » : ${fiche(`/engagements/${ecrit.id}`)}`);
      }),
      action,
    ),
    tool(
      "proposer_relance",
      "Action : prépare un courriel de relance au programmateur d'un engagement (id), pour une option à confirmer ou " +
        "un cachet impayé. N'envoie rien : le courriel attend la validation de l'agente sur la page À valider. " +
        "Le destinataire est lu dans le produit. Un courriel par engagement.",
      { engagementId: z.string().uuid(), sujet: z.string().max(SUJET_MAX), texte: z.string().max(TEXTE_MAX) },
      garde("proposer_relance", async ({ engagementId, sujet, texte: corps }) => {
        const e = await lireEngagement(utilisateur, engagementId);
        if (!e) return refus(`Engagement introuvable (id ${engagementId}).`);
        const motif = motifRelance(e.statut);
        if (!motif) return refus(`Refusé : un engagement « ${LIBELLES_STATUT[e.statut]} » n'appelle pas de relance.`);
        const courriel = verifierCourriel({ sujet, texte: corps });
        if ("erreur" in courriel) return refus(courriel.erreur);
        const objet = `${motif} — ${e.titre ?? "sans titre"}, ${e.lieu.nom}, ${quand({ ...e, pays: e.lieu.pays })}`;
        try {
          await db.insert(propositions).values({
            executionId,
            engagementId: e.id,
            objet,
            destinataire: e.programmateur.email,
            destinataireNom: e.programmateur.nom,
            ...courriel,
          });
        } catch (erreur) {
          // 23505 : l'index « une relance en attente par engagement » refuse la seconde (dérive n° 2).
          if ((erreur as { cause?: { code?: string } })?.cause?.code !== "23505") throw erreur;
          return refus(`Refusé : une relance attend déjà pour cet engagement sur ${lien("/validations")} ; décidez-la d'abord.`);
        }
        console.log(`Assistant : relance proposée (${objet}) pour ${utilisateur.nom}`);
        return texte(`Relance proposée à ${e.programmateur.nom}, rien n'est parti : à valider sur ${lien("/validations")}`);
      }),
      action,
    ),
  ];
}
