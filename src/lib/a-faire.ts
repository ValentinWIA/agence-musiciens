// Panneau « À faire » du tableau de bord (docs/design.md, passe « envoi »). Logique pure : la lecture en base est
// dans lecture-a-faire.ts. Factures à relancer et options qui expirent suivent les règles du récap (recap.ts).

export const LIMITE_A_FAIRE = 5;

// Une option attend son contrat : le geste suivant du cycle de vie. Le concert le plus proche d'abord.
export function contratsAEnvoyer<T extends { statut: string; debut: Date }>(engagements: T[]): T[] {
  return engagements.filter((e) => e.statut === "option").sort((a, b) => a.debut.getTime() - b.debut.getTime());
}

// Les premières lignes d'une liste, et combien restent cachées (« et N autres »).
export function premieres<T>(liste: T[], limite = LIMITE_A_FAIRE): { lignes: T[]; reste: number } {
  return { lignes: liste.slice(0, limite), reste: Math.max(0, liste.length - limite) };
}
