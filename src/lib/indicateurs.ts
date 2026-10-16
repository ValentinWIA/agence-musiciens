import { fuseauDuPays } from "./dates";
import { LIBELLES_STATUT, type Statut } from "./engagements";

// Indicateurs du tableau de bord de l'agent, par saison (septembre → août), rangés par date du concert.
// Fonctions pures : la page lit la base, ces fonctions comptent.

export type SaisonArtistique = { debut: number }; // la saison 2026-2027 a pour début 2026

export function libelleSaison(s: SaisonArtistique) {
  return `${s.debut}-${s.debut + 1}`;
}

// À l'heure du lieu : « automne 2026 » est enregistré le 1er septembre à minuit à Paris, soit le 31 août en UTC.
export function saisonDe(date: Date, pays: string): SaisonArtistique {
  const morceaux = new Intl.DateTimeFormat("en-US", { year: "numeric", month: "numeric", timeZone: fuseauDuPays(pays) })
    .formatToParts(date);
  const annee = Number(morceaux.find((m) => m.type === "year")!.value);
  const mois = Number(morceaux.find((m) => m.type === "month")!.value);
  return { debut: mois >= 9 ? annee : annee - 1 };
}

export type EngagementCompte = { statut: Statut; debut: Date; pays: string };

export type Indicateurs = { contrats: number; parStatut: Record<Statut, number>; total: number };

// Un contrat : arrivé au moins à « contrat envoyé », et pas annulé. Le cachet n'entre pas en compte : un bénévole compte.
const STATUTS_CONTRAT: readonly Statut[] = ["contrat_envoye", "confirme", "joue", "facture", "paye"];

export function compterIndicateurs(liste: EngagementCompte[], saison: SaisonArtistique): Indicateurs {
  const parStatut = Object.fromEntries(Object.keys(LIBELLES_STATUT).map((s) => [s, 0])) as Record<Statut, number>;
  let contrats = 0;
  let total = 0;
  for (const e of liste) {
    if (saisonDe(e.debut, e.pays).debut !== saison.debut) continue;
    total++;
    parStatut[e.statut]++;
    if (STATUTS_CONTRAT.includes(e.statut)) contrats++;
  }
  return { contrats, parStatut, total };
}
