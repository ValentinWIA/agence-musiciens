import type { Jour } from "./calendrier";
import type { StatutDemande } from "./flux";

// Boîte « Demandes reçues » (docs/flux-de-nuit.md, section 15). Logique pure : la lecture en base est ailleurs.

export const LIBELLES_DEMANDE: Record<StatutDemande, string> = {
  demandee: "demandée",
  confirmee: "confirmée",
  terminee: "terminée",
  annulee: "annulée",
};

type Demande = { reference: string; statut: StatutDemande; dateConcert: Jour; engagementId: string | null; ecarteeLe: Date | null };

// Écartée par l'agent, ou annulée / terminée par le programmateur : plus rien à faire, la demande reste visible
// dans « Toutes ».
export function estATraiter(demande: Demande): boolean {
  return (
    demande.engagementId === null && demande.ecarteeLe === null && demande.statut !== "annulee" && demande.statut !== "terminee"
  );
}

// Le concert le plus proche en tête ; à date égale, l'ordre des références reste stable d'une visite à l'autre.
export function trierDemandes<T extends Demande>(demandes: T[]): T[] {
  return [...demandes].sort((a, b) => a.dateConcert.localeCompare(b.dateConcert) || a.reference.localeCompare(b.reference));
}

export function dateDemandePassee(dateConcert: Jour, aujourdhui: Jour): boolean {
  return dateConcert < aujourdhui;
}

const normaliser = (nom: string) => nom.trim().replace(/\s+/g, " ").toLocaleLowerCase("fr");

// Programmateurs portant exactement le nom du demandeur (casse et espaces mis à part) : un seul → présélectionné.
export function programmateursDeMemeNom<T extends { nom: string }>(nom: string, programmateurs: T[]): T[] {
  return programmateurs.filter((p) => normaliser(p.nom) === normaliser(nom));
}

// Ce que le formulaire d'engagement reçoit d'une demande : date précise sans heure (le flux n'en donne pas), durée,
// et le programmateur s'il est le seul à porter exactement ce nom (casse et espaces mis à part).
// Date passée : laissée vide, l'agent saisit celle convenue par message (le flux ne change jamais la date).
export function preRemplissage(
  demande: { dateConcert: Jour; dureeMinutes: number; programmateur: string },
  programmateurs: { id: string; nom: string }[],
  aujourdhui: Jour,
): { precision: "jour"; jour: Jour; heure: ""; duree: string; programmateurId: string } {
  const memeNom = programmateursDeMemeNom(demande.programmateur, programmateurs);
  return {
    precision: "jour",
    jour: dateDemandePassee(demande.dateConcert, aujourdhui) ? "" : demande.dateConcert,
    heure: "",
    duree: String(demande.dureeMinutes),
    programmateurId: memeNom.length === 1 ? memeNom[0].id : "",
  };
}

export function formaterJourCourt(jour: Jour): string {
  return new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })
    .format(new Date(`${jour}T12:00:00Z`));
}

// Un événement du flux (tel que reçu, déjà validé à l'import), raconté pour l'agent. Le texte d'un message est
// recopié tel quel : c'est une donnée, jamais une consigne.
export type LigneHistorique = { genre: "creation" | "statut" | "message"; titre: string; texte: string | null };

const CHANGEMENTS: Record<StatutDemande, string> = {
  demandee: "Le programmateur remet la demande en attente",
  confirmee: "Le programmateur a confirmé la demande",
  terminee: "Le programmateur a clos la demande",
  annulee: "Le programmateur a annulé la demande",
};

export function ligneHistorique(type: string | null, brut: unknown): LigneHistorique | null {
  const d = ((brut as { donnees?: Record<string, unknown> })?.donnees ?? {}) as Record<string, unknown>;
  const texte = (v: unknown) => (typeof v === "string" && v.trim() ? v : null);
  if (type === "creation") return { genre: "creation", titre: `Demande reçue de ${texte(d.demandeur) ?? "?"}`, texte: null };
  if (type === "mise_a_jour") {
    const titre = CHANGEMENTS[d.statut as StatutDemande] ?? `Le programmateur indique « ${String(d.statut)} »`;
    return { genre: "statut", titre, texte: texte(d.commentaire) };
  }
  if (type === "message") return { genre: "message", titre: `${texte(d.de) ?? "?"} écrit :`, texte: texte(d.texte) };
  return null;
}
