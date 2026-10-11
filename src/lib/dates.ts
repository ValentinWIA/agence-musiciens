// Affichage des dates d'engagement, toujours à l'heure locale du lieu du concert.

const FUSEAUX: Record<string, string> = {
  France: "Europe/Paris",
  Suisse: "Europe/Zurich",
  "Royaume-Uni": "Europe/London",
  Japon: "Asia/Tokyo",
};

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
