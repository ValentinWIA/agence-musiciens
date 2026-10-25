// Prix, coût d'un appel et limites de l'IA. Logique pure : la base et l'API sont dans ia.ts.
// Les coûts sont comptés en millionièmes de dollar (entiers) : Anthropic facture en dollars, au million de jetons,
// donc un prix « 4 $ par million de jetons » vaut exactement 4 millionièmes de dollar par jeton.

export const MODELES = ["claude-haiku-5-5", "claude-sonnet-5-5", "claude-opus-5-5"] as const;
export type Modele = (typeof MODELES)[number];

// Dollars par million de jetons (tarifs Anthropic relevés le 18/10/2026).
export const PRIX: Record<Modele, { entree: number; sortie: number }> = {
  "claude-haiku-5-5": { entree: 0.1, sortie: 0.5 },
  "claude-sonnet-5-5": { entree: 2, sortie: 10 },
  "claude-opus-5-5": { entree: 4, sortie: 20 },
};

export const LIBELLES_MODELE: Record<Modele, string> = {
  "claude-haiku-5-5": "Haiku 5.5",
  "claude-sonnet-5-5": "Sonnet 5.5",
  "claude-opus-5-5": "Opus 5.5",
};

export const APPELS_PAR_JOUR = 100; // par utilisateur : coupe une boucle ou un abus (30 jusqu'au 25/10 : trop bas pour l'agent et ses scénarios)
export const PLAFOND_MENSUEL = 5_000_000; // 5 $, en millionièmes : protège la dépense

export function coutAppel(modele: Modele, jetonsEntree: number, jetonsSortie: number): number {
  const prix = PRIX[modele];
  return Math.ceil(jetonsEntree * prix.entree + jetonsSortie * prix.sortie);
}

// null = l'appel est permis ; sinon, la raison du refus, telle qu'on la montre à l'agent.
export function refusAppel({ appelsDuJour, depenseDuMois }: { appelsDuJour: number; depenseDuMois: number }) {
  if (depenseDuMois >= PLAFOND_MENSUEL) {
    return `Plafond de ${formaterDollars(PLAFOND_MENSUEL)} atteint ce mois-ci : plus d'appel à l'IA jusqu'au mois prochain.`;
  }
  if (appelsDuJour >= APPELS_PAR_JOUR) {
    return `Limite de ${APPELS_PAR_JOUR} appels à l'IA par jour atteinte : réessayez demain.`;
  }
  return null;
}

// « 0,0012 $ » : quatre décimales, car un appel coûte souvent moins d'un centime.
export function formaterDollars(millioniemes: number): string {
  return `${(millioniemes / 1_000_000).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 4 })} $`;
}
