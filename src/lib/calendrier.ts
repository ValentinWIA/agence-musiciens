import { fuseauDuPays } from "./dates";
import type { Statut } from "./engagements";

// Calendrier : à quel jour, à quel mois appartient un engagement, toujours à l'heure du lieu.
// Fonctions pures : la page lit la base, ces fonctions rangent.

export type Jour = string; // « 2026-11-16 »
export type Mois = { annee: number; mois: number }; // mois de 1 à 12

export type EngagementCalendrier = {
  statut: Statut;
  debut: Date;
  precisionDate: "jour" | "mois" | "saison";
  pays: string;
};

// Un concert à Tokyo le 3 à 1 h (encore le 2 en UTC) est le 3.
export function jourLocal(date: Date, pays: string): Jour {
  // Le format suédois écrit les dates « 2026-11-16 ».
  return new Intl.DateTimeFormat("sv-SE", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: fuseauDuPays(pays) })
    .format(date);
}

// « 20 h 00 », à l'heure du lieu.
export function heureLocale(date: Date, pays: string): string {
  return new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: fuseauDuPays(pays) })
    .format(date)
    .replace(":", " h ");
}

// « novembre 2026 »
export function libelleMois(m: Mois): string {
  return new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" })
    .format(new Date(Date.UTC(m.annee, m.mois - 1, 15)));
}

function moisDuJour(jour: Jour): Mois {
  const [annee, mois] = jour.split("-").map(Number);
  return { annee, mois };
}

// Rang du mois depuis l'an 0 : permet de comparer et d'avancer de n mois, même d'une année à l'autre.
const rang = (m: Mois) => m.annee * 12 + m.mois - 1;
const depuisRang = (r: number): Mois => ({ annee: Math.floor(r / 12), mois: (r % 12) + 1 });

export function moisVoisin(m: Mois, ecart: number): Mois {
  return depuisRang(rang(m) + ecart);
}

export function versParamMois(m: Mois): string {
  return `${m.annee}-${String(m.mois).padStart(2, "0")}`;
}

// « ?mois=2026-11 » ; absent ou faux → le mois d'aujourd'hui.
export function lireMois(param: string | undefined, aujourdhui: Jour): Mois {
  const trouve = /^(\d{4})-(\d{2})$/.exec(param ?? "");
  if (trouve) {
    const annee = Number(trouve[1]);
    const mois = Number(trouve[2]);
    if (annee >= 2000 && annee <= 2100 && mois >= 1 && mois <= 12) return { annee, mois };
  }
  return moisDuJour(aujourdhui);
}

function ajouterJours(jour: Jour, n: number): Jour {
  const [a, m, j] = jour.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, j + n)).toISOString().slice(0, 10);
}

export type Case = { jour: Jour; dansLeMois: boolean };

// Semaines complètes du lundi au dimanche ; les jours des mois voisins remplissent la première et la dernière.
export function casesDuMois(m: Mois): Case[][] {
  const premier = `${versParamMois(m)}-01`;
  const joursAvant = (new Date(`${premier}T00:00:00Z`).getUTCDay() + 6) % 7; // lundi → 0
  const nbJours = new Date(Date.UTC(m.annee, m.mois, 0)).getUTCDate();
  const nbSemaines = Math.ceil((joursAvant + nbJours) / 7);
  const debut = ajouterJours(premier, -joursAvant);
  return Array.from({ length: nbSemaines }, (_, s) =>
    Array.from({ length: 7 }, (_, j) => {
      const jour = ajouterJours(debut, s * 7 + j);
      return { jour, dansLeMois: jour.startsWith(versParamMois(m)) };
    }),
  );
}

// « samedi 17 octobre »
export function libelleJour(jour: Jour): string {
  return new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" })
    .format(new Date(`${jour}T12:00:00Z`));
}

// Aujourd'hui et les 7 jours suivants : de samedi au samedi suivant (décidé le 17/10).
export function septJours(aujourdhui: Jour): Jour[] {
  return Array.from({ length: 8 }, (_, i) => ajouterJours(aujourdhui, i));
}

// Bornes de la requête des 7 prochains jours : un jour de marge de chaque côté absorbe les fuseaux (Tokyo, Amériques).
export function bornesSeptJours(aujourdhui: Jour): { depuis: Date; jusqua: Date } {
  return {
    depuis: new Date(`${ajouterJours(aujourdhui, -1)}T00:00:00Z`),
    jusqua: new Date(`${ajouterJours(aujourdhui, 9)}T00:00:00Z`),
  };
}

// Bornes larges pour la requête en base d'un mois : une saison commencée deux mois plus tôt le couvre encore,
// et un jour de marge de chaque côté absorbe les fuseaux. Le rangement précis se fait ensuite.
export function bornesDuMois(m: Mois): { depuis: Date; jusqua: Date } {
  const debut = moisVoisin(m, -2);
  const fin = moisVoisin(m, 1);
  return {
    depuis: new Date(Date.UTC(debut.annee, debut.mois - 1, 0)),
    jusqua: new Date(Date.UTC(fin.annee, fin.mois - 1, 2)),
  };
}

const parDebut = <T extends EngagementCalendrier>(a: T, b: T) => a.debut.getTime() - b.debut.getTime();

// Un mois : les engagements à date précise rangés par jour, les dates approximatives à part (« Date à préciser »),
// dans chaque mois de leur période. Les annulés n'y sont pas.
export function rangerPourMois<T extends EngagementCalendrier>(liste: T[], m: Mois) {
  const parJour = new Map<Jour, T[]>();
  const aPreciser: T[] = [];
  for (const e of [...liste].sort(parDebut)) {
    if (e.statut === "annule") continue;
    const jour = jourLocal(e.debut, e.pays);
    if (e.precisionDate === "jour") {
      if (!jour.startsWith(versParamMois(m))) continue;
      parJour.set(jour, [...(parJour.get(jour) ?? []), e]);
    } else {
      const ecart = rang(m) - rang(moisDuJour(jour));
      if (ecart >= 0 && ecart < (e.precisionDate === "mois" ? 1 : 3)) aPreciser.push(e);
    }
  }
  return { parJour, aPreciser };
}

// Aujourd'hui et les 7 prochains jours, chacun avec ses engagements (liste vide s'il n'y en a pas). Dates précises seulement.
export function rangerSeptJours<T extends EngagementCalendrier>(liste: T[], aujourdhui: Jour) {
  const jours = septJours(aujourdhui);
  const tries = [...liste].sort(parDebut);
  return jours.map((jour) => ({
    jour,
    engagements: tries.filter((e) => e.statut !== "annule" && e.precisionDate === "jour" && jourLocal(e.debut, e.pays) === jour),
  }));
}
