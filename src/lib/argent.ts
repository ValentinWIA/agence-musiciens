// Les montants sont rangés en nombre entier, dans la plus petite unité de la devise
// (centimes, ou yens qui n'ont pas de centimes) : jamais de nombre à virgule pour de l'argent.

export const DEVISES = ["EUR", "CHF", "USD", "GBP", "JPY"] as const;
export type Devise = (typeof DEVISES)[number];

const DECIMALES: Record<Devise, number> = { EUR: 2, CHF: 2, USD: 2, GBP: 2, JPY: 0 };

// « 1250,10 » ou « 1 250.10 » (saisie de l'utilisateur) → 125010. Renvoie null si la saisie n'est pas un montant
// valide pour cette devise (lettres, nombre négatif, trop de décimales, centimes en yens…).
export function versUniteMinimale(saisie: string, devise: Devise): number | null {
  const texte = saisie.replace(/[\s  ]/g, "").replace(",", ".");
  const decimales = DECIMALES[devise];
  const forme = decimales === 0 ? /^\d+$/ : new RegExp(`^\\d+(\\.\\d{1,${decimales}})?$`);
  if (!forme.test(texte)) return null;
  const [entier, fraction = ""] = texte.split(".");
  // Calcul sur du texte puis des entiers : aucun arrondi de nombre à virgule.
  return Number(entier) * 10 ** decimales + Number(fraction.padEnd(decimales, "0") || 0);
}

// 125010, "EUR" → « 1 250,10 € »
export function formaterMontant(unites: number, devise: Devise): string {
  const decimales = DECIMALES[devise];
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: devise,
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  }).format(unites / 10 ** decimales);
}
