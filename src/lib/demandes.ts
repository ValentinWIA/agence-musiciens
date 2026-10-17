import type { Jour } from "./calendrier";
import type { StatutDemande } from "./flux";

// Boîte « Demandes reçues » (docs/flux-de-nuit.md, section 15). Logique pure : la lecture en base est ailleurs.

type Demande = { reference: string; statut: StatutDemande; dateConcert: Jour; engagementId: string | null };

// Annulée ou terminée par le programmateur : plus rien à faire, la demande reste visible dans « Toutes ».
export function estATraiter(demande: Demande): boolean {
  return demande.engagementId === null && demande.statut !== "annulee" && demande.statut !== "terminee";
}

// Le concert le plus proche en tête ; à date égale, l'ordre des références reste stable d'une visite à l'autre.
export function trierDemandes<T extends Demande>(demandes: T[]): T[] {
  return [...demandes].sort((a, b) => a.dateConcert.localeCompare(b.dateConcert) || a.reference.localeCompare(b.reference));
}

export function dateDemandePassee(dateConcert: Jour, aujourdhui: Jour): boolean {
  return dateConcert < aujourdhui;
}

const normaliser = (nom: string) => nom.trim().replace(/\s+/g, " ").toLocaleLowerCase("fr");

// Ce que le formulaire d'engagement reçoit d'une demande : date précise sans heure (le flux n'en donne pas), durée,
// et le programmateur s'il est le seul à porter exactement ce nom (casse et espaces mis à part).
export function preRemplissage(
  demande: { dateConcert: Jour; dureeMinutes: number; programmateur: string },
  programmateurs: { id: string; nom: string }[],
): { precision: "jour"; jour: Jour; heure: ""; duree: string; programmateurId: string } {
  const memeNom = programmateurs.filter((p) => normaliser(p.nom) === normaliser(demande.programmateur));
  return {
    precision: "jour",
    jour: demande.dateConcert,
    heure: "",
    duree: String(demande.dureeMinutes),
    programmateurId: memeNom.length === 1 ? memeNom[0].id : "",
  };
}
