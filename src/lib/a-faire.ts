// Panneau « À faire » du tableau de bord (docs/design.md, passe « envoi »). Logique pure : la lecture en base est
// dans lecture-a-faire.ts. Factures à relancer et options qui expirent suivent les règles du récap (recap.ts).

// 10 lignes : la liste remplit le cadre (retour du 18/10, « Voir les 6 » sur un cadre à moitié vide).
export const LIMITE_A_FAIRE = 10;

// Une option attend son contrat : le geste suivant du cycle de vie. Le concert le plus proche d'abord.
export function contratsAEnvoyer<T extends { statut: string; debut: Date }>(engagements: T[]): T[] {
  return engagements.filter((e) => e.statut === "option").sort((a, b) => a.debut.getTime() - b.debut.getTime());
}

// Les premières lignes d'une liste, et combien restent cachées (« et N autres »).
export function premieres<T>(liste: T[], limite = LIMITE_A_FAIRE): { lignes: T[]; reste: number } {
  return { lignes: liste.slice(0, limite), reste: Math.max(0, liste.length - limite) };
}

// Range les listes en deux colonnes de hauteurs proches (retour du 18/10) : la plus lourde d'abord, chacune dans la
// colonne la plus courte ; dans une colonne, l'ordre d'origine est gardé. poids = nombre de lignes affichées.
export function repartirEnDeuxColonnes<T>(blocs: T[], poids: (b: T) => number): [T[], T[]] {
  const hauteurs = [0, 0];
  const colonneDe = new Map<number, number>();
  const parPoids = blocs.map((b, i) => ({ i, p: poids(b) })).sort((a, b) => b.p - a.p || a.i - b.i);
  for (const { i, p } of parPoids) {
    const c = hauteurs[0] <= hauteurs[1] ? 0 : 1;
    colonneDe.set(i, c);
    hauteurs[c] += p;
  }
  return [blocs.filter((_, i) => colonneDe.get(i) === 0), blocs.filter((_, i) => colonneDe.get(i) === 1)];
}
