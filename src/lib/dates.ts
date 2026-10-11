// Affichage des dates d'engagement, toujours à l'heure locale du lieu du concert.

const FUSEAUX: Record<string, string> = {
  France: "Europe/Paris",
  Suisse: "Europe/Zurich",
  "Royaume-Uni": "Europe/London",
  Japon: "Asia/Tokyo",
};

// Les seuls pays proposés pour un nouveau lieu : ceux dont on connaît le fuseau.
export const PAYS = ["France", "Suisse", "Royaume-Uni", "Japon"] as const;

export function fuseauDuPays(pays: string) {
  return FUSEAUX[pays] ?? "Europe/Paris";
}

const SAISONS = ["hiver", "hiver", "printemps", "printemps", "printemps", "été", "été", "été", "automne", "automne", "automne", "hiver"];

// jour → « sam. 24 oct. 2026, 20 h 00 » ; mois → « mai 2027 » ; saison → « automne 2027 »
export function formaterDebut(debut: Date, precision: "jour" | "mois" | "saison", pays: string): string {
  const timeZone = fuseauDuPays(pays);
  if (precision === "mois") {
    return new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone }).format(debut);
  }
  if (precision === "saison") {
    const mois = Number(new Intl.DateTimeFormat("fr-FR", { month: "numeric", timeZone }).format(debut));
    const annee = new Intl.DateTimeFormat("fr-FR", { year: "numeric", timeZone }).format(debut);
    return `${SAISONS[mois - 1]} ${annee}`;
  }
  const jour = new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone }).format(debut);
  const heure = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone }).format(debut).replace(":", " h ");
  return `${jour}, ${heure}`;
}

// Écart (en millisecondes) entre l'heure affichée dans ce fuseau et l'heure universelle, à cet instant.
function decalage(instant: number, timeZone: string) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric" })
      .formatToParts(instant)
      .map(({ type, value }) => [type, Number(value)]),
  );
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute) - instant;
}

// « 2026-11-16 » à « 11:00 », heure locale du lieu → l'instant correspondant.
// On corrige deux fois : le décalage peut changer entre l'estimation et le résultat (changement d'heure).
export function versInstant(jour: string, heure: string, pays: string): Date {
  const timeZone = fuseauDuPays(pays);
  const [a, m, j] = jour.split("-").map(Number);
  const [h, min] = heure.split(":").map(Number);
  const affiche = Date.UTC(a, m - 1, j, h, min);
  let instant = affiche - decalage(affiche, timeZone);
  instant = affiche - decalage(instant, timeZone);
  return new Date(instant);
}

export const SAISONS_SAISIE = { printemps: 3, ete: 6, automne: 9, hiver: 12 } as const;
export type Saison = keyof typeof SAISONS_SAISIE;

export type SaisieDate =
  | { precision: "jour"; jour: string; heure: string }
  | { precision: "mois"; mois: string } // « 2027-05 »
  | { precision: "saison"; saison: Saison; annee: number };

// Début de l'engagement, et fin de la période qu'il désigne (pour savoir si elle est déjà passée).
// Une date approximative commence le premier jour du mois ou de la saison, à minuit, heure du lieu.
export function lireSaisieDate(saisie: SaisieDate, pays: string): { debut: Date; finPeriode: Date } {
  if (saisie.precision === "jour") {
    const debut = versInstant(saisie.jour, saisie.heure, pays);
    return { debut, finPeriode: debut };
  }
  const [annee, mois, nbMois] =
    saisie.precision === "mois"
      ? [...saisie.mois.split("-").map(Number), 1]
      : [saisie.annee, SAISONS_SAISIE[saisie.saison], 3];
  const premierJour = (a: number, m: number) =>
    versInstant(`${a + Math.floor((m - 1) / 12)}-${String(((m - 1) % 12) + 1).padStart(2, "0")}-01`, "00:00", pays);
  return { debut: premierJour(annee, mois), finPeriode: premierJour(annee, mois + nbMois) };
}

export type ChampsDate = Record<"jour" | "heure" | "mois" | "saison" | "annee", string>;

// L'inverse de lireSaisieDate : un début enregistré → les champs du formulaire, à l'heure du lieu (pré-remplissage).
export function versChampsDate(debut: Date, precision: "jour" | "mois" | "saison", pays: string): ChampsDate {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: fuseauDuPays(pays), hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
      .formatToParts(debut)
      .map(({ type, value }) => [type, value]),
  );
  const champs: ChampsDate = { jour: "", heure: "", mois: "", saison: "printemps", annee: "" };
  if (precision === "jour") return { ...champs, jour: `${p.year}-${p.month}-${p.day}`, heure: `${p.hour}:${p.minute}` };
  if (precision === "mois") return { ...champs, mois: `${p.year}-${p.month}` };
  const saison = (Object.keys(SAISONS_SAISIE) as Saison[]).find((s) => SAISONS_SAISIE[s] === Number(p.month));
  return { ...champs, saison: saison ?? "printemps", annee: p.year };
}
