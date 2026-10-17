// Alerte de panne du flux (docs/flux-de-nuit.md, section 16) : règles pures, sans base ni envoi.

export type ExecutionPassee = { etat: "en_cours" | "reussie" | "en_echec"; alerteLe: Date | null };

// Une seule alerte par panne : la panne commence après la dernière exécution réussie et finit à la suivante.
// L'historique va de la plus récente à la plus ancienne. On alerte si aucune exécution de la panne n'a déjà alerté :
// une exécution en échec sans alerte (interrompue, courriel non parti) n'empêche donc pas l'alerte suivante.
export function alerteDue(historique: ExecutionPassee[]): boolean {
  for (const execution of historique) {
    if (execution.etat === "reussie") return true;
    if (execution.alerteLe) return false;
  }
  return true;
}

export function composerAlerte({
  nuitDu,
  erreur,
  declencheur,
  nomAgent,
  lienSite,
}: {
  nuitDu: string;
  erreur: string;
  declencheur: "cron" | "bouton";
  nomAgent: string;
  lienSite: string;
}): { sujet: string; texte: string } {
  const nuit = new Date(`${nuitDu}T12:00:00Z`).toLocaleDateString("fr-FR");
  return {
    sujet: `Panne du flux de nuit : la nuit du ${nuit} n'est pas importée`,
    texte: [
      `Bonjour ${nomAgent},`,
      "",
      `L'import de la nuit du ${nuit} (lancé par ${declencheur === "cron" ? "le passage automatique" : "le bouton"}) a échoué :`,
      erreur,
      "",
      "Les nuits manquantes seront reprises au prochain passage réussi. Vous ne recevrez pas d'autre alerte pour " +
        "cette panne ; le récap du matin dira quand elle est finie.",
      "",
      `Journal des imports : ${lienSite}/nuit`,
    ].join("\n"),
  };
}
