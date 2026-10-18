import { DEVISES, type Devise } from "./argent";
import { convertirEnEur, type Taux } from "./change";
import { STATUTS_TENUS } from "./conflit";
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

// Revenus de la saison : une ligne par musicien d'un engagement, avec le nombre de musiciens pour partager le cachet.
// Comptés comme le cachet moyen : engagements tenus, bénévole (0) compris, cachet « à définir » (null) exclu.
// Le total de l'agence est la somme des parts, donc la somme des cachets.
export type PartDeCachet = EngagementCompte & {
  musicienId: string;
  nombreMusiciens: number;
  cachet: number | null;
  devise: Devise;
};

export type Montant = { devise: Devise; unites: number };

export type Revenus = {
  total: Montant[];
  parMusicien: Record<string, Montant[]>;
  converti: boolean; // au moins un cachet en devise étrangère converti en euros : afficher « ≈ »
};

// Avec les taux, tout est converti en euros (taux du jour, comme sur les fiches) ; sans taux, un montant par devise :
// jamais des francs suisses comptés comme des euros. Arrondi à l'unité une seule fois, à la fin.
export function revenusDeLaSaison(liste: PartDeCachet[], saison: SaisonArtistique, taux: Taux | null): Revenus {
  const total = new Map<Devise, number>();
  const parMusicien = new Map<string, Map<Devise, number>>();
  let converti = false;
  for (const e of liste) {
    if (!STATUTS_TENUS.includes(e.statut) || e.cachet === null || e.nombreMusiciens < 1) continue;
    if (saisonDe(e.debut, e.pays).debut !== saison.debut) continue;
    let devise = e.devise;
    let unites = e.cachet;
    if (devise !== "EUR" && taux) {
      unites = convertirEnEur(unites, devise, taux);
      devise = "EUR";
      converti = true;
    }
    const part = unites / e.nombreMusiciens;
    total.set(devise, (total.get(devise) ?? 0) + part);
    const sienne = parMusicien.get(e.musicienId) ?? new Map<Devise, number>();
    sienne.set(devise, (sienne.get(devise) ?? 0) + part);
    parMusicien.set(e.musicienId, sienne);
  }
  const enListe = (m: Map<Devise, number>): Montant[] =>
    DEVISES.filter((d) => m.has(d)).map((devise) => ({ devise, unites: Math.round(m.get(devise)!) }));
  return {
    total: enListe(total),
    parMusicien: Object.fromEntries([...parMusicien].map(([id, m]) => [id, enListe(m)])),
    converti,
  };
}
