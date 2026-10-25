import "server-only";
import { tool } from "@anthropic-ai/claude-agent-sdk";
import { and, asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { courriers, demandesRecues, evenementsFlux } from "@/db/schema";
import { enDonnees, resumeSortie } from "./agent-regles";
import { formaterMontant, type Devise } from "./argent";
import { ajouterJours, jourLocal } from "./calendrier";
import { formaterDebut } from "./dates";
import { estATraiter, ligneHistorique, trierDemandes } from "./demandes";
import { LIBELLES_STATUT, lireEngagement, listerEngagements, listerMusiciens, type Statut } from "./engagements";
import { lireEngagementsASuivre } from "./lecture-a-faire";
import { cachetsImpayes, optionsQuiExpirent } from "./recap";

// Les outils de lecture de l'agent (docs/semaine-4.md, section 3). Écrits une fois : la page /assistant et le
// serveur MCP s'en servent. Chaque appel revérifie le rôle et s'inscrit au journal de l'exécution.

export type Utilisateur = { id: string; nom: string; role: "admin" | "musicien" };
export type Etape = { outil: string; entree: unknown; sortie: string };

type Resultat = { content: { type: "text"; text: string }[]; isError?: boolean };
const texte = (t: string): Resultat => ({ content: [{ type: "text", text: t }] });
const refus = (t: string): Resultat => ({ content: [{ type: "text", text: t }], isError: true });

const STATUTS = Object.keys(LIBELLES_STATUT) as [Statut, ...Statut[]];
const quand = (e: { debut: Date; precisionDate?: "jour" | "mois" | "saison"; pays: string }) =>
  formaterDebut(e.debut, e.precisionDate ?? "jour", e.pays);
const montant = (cachet: number | null, devise: string) =>
  cachet === null ? "cachet à définir" : formaterMontant(cachet, devise as Devise);

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

export function outilsDeLecture(utilisateur: Utilisateur, journal: Etape[]) {
  // Chaque outil passe par ici : le rôle est revérifié (le modèle ne choisit pas ses droits) et l'appel est noté.
  const garde =
    <A,>(nom: string, faire: (args: A) => Promise<Resultat>) =>
    async (args: A): Promise<Resultat> => {
      let resultat: Resultat;
      if (utilisateur.role !== "admin") {
        console.warn(`Accès refusé : ${utilisateur.nom} (musicien) sur l'outil ${nom} de l'agent`);
        resultat = refus("Refusé : réservé à l'agent de l'agence.");
      } else {
        try {
          resultat = await faire(args);
        } catch (e) {
          console.error(`Outil ${nom} de l'agent en échec : ${e instanceof Error ? e.message : e}`);
          resultat = refus("L'outil a échoué (base indisponible ?). Réessayez plus tard.");
        }
      }
      journal.push({ outil: nom, entree: args, sortie: (resultat.isError ? "refus : " : "") + resumeSortie(resultat.content[0].text) });
      return resultat;
    };
  const lecture = { annotations: { readOnlyHint: true } };

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
            .map((o) => `- ${o.titre ?? "sans titre"} — ${o.salle}, ${o.ville}, ${quand(o)} — ${o.musiciens.join(", ")} — échéance ${o.expireLe} (id ${o.id})`)
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
            .map((c) => `- ${c.titre ?? "sans titre"} — ${c.salle}, ${c.ville}, ${quand(c)} — ${c.musiciens.join(", ")} — ${montant(c.cachet, c.devise)}, ${LIBELLES_STATUT[c.statut]} (id ${c.id})`)
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
          .map((e) => `- ${e.titre ?? "sans titre"} — ${e.lieu}, ${e.ville}, ${quand(e)} — ${e.musiciens.map((m) => m.nom).join(", ")} — ${LIBELLES_STATUT[e.statut]}, ${montant(e.cachet, e.devise)} (id ${e.id})`);
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
            `${e.titre ?? "sans titre"} — ${LIBELLES_STATUT[e.statut]}`,
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
            proches.map((e) => `- ${quand(e)} — ${e.titre ?? "sans titre"}, ${e.lieu}, ${e.ville} — ${LIBELLES_STATUT[e.statut]} (id ${e.id})`).join("\n"),
        );
      }),
      lecture,
    ),
    tool(
      "demandes_a_traiter",
      "Demandes reçues du flux de nuit qui attendent l'agent, avec l'historique et les messages des programmateurs.",
      {},
      garde("demandes_a_traiter", async () => {
        const demandes = trierDemandes((await db.select().from(demandesRecues)).filter(estATraiter)).slice(0, 20);
        if (demandes.length === 0) return texte("Aucune demande à traiter.");
        const blocs = await Promise.all(
          demandes.map(async (d) => {
            const evenements = await db
              .select({ type: evenementsFlux.type, brut: evenementsFlux.brut })
              .from(evenementsFlux)
              .where(and(eq(evenementsFlux.reference, d.reference), eq(evenementsFlux.etat, "traite")))
              .orderBy(asc(evenementsFlux.horodatage));
            const historique = evenements
              .map((e) => ligneHistorique(e.type, e.brut))
              .filter((l) => l !== null)
              .map((l) => `${l.titre}${l.texte ? ` ${l.texte}` : ""}`);
            // Tout vient du flux, nom du programmateur compris : rendu comme une donnée.
            return `Demande (id ${d.id}) :\n` + enDonnees(
              `${d.reference} : ${d.programmateur}, ${d.lieu}, le ${d.dateConcert}, ${d.dureeMinutes} min, ${d.categorie}\n` +
                (historique.join("\n") || "aucun message"),
            );
          }),
        );
        return texte(blocs.join("\n"));
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
            enDonnees(derniers.map((c) => `- ${c.dateCourrier ?? "sans date"} — ${c.structure ?? "expéditeur inconnu"} — ${c.classement} (id ${c.id})`).join("\n")),
          );
        }
        const [c] = await db.select().from(courriers).where(eq(courriers.id, id));
        if (!c) return refus(`Courrier introuvable (id ${id}).`);
        // Les champs ont été lus dans le courrier : tout est rendu comme une donnée.
        return texte(
          `Courrier (id ${c.id}) :\n` +
            enDonnees(
              `De ${c.structure ?? "?"} (${c.signataire ?? "?"}), daté du ${c.dateCourrier ?? "?"}, classé « ${c.classement} »\n` +
                `Résumé : ${c.resume ?? "aucun"}\n${c.texte}`,
            ),
        );
      }),
      lecture,
    ),
  ];
}
