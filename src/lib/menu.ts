// Liens du menu latéral. Ils ne protègent rien : chaque page revérifie les droits côté serveur.
// Pas de lien « Invitations » (retiré le 18/10) : on invite depuis la tuile « + » de /musiciens.

// sousLiens : la liste dépliable sous « Musiciens » (demandée le 18/10), une fiche par musicien.
// toujoursOuvert : sous-liens toujours visibles, sans flèche (« À valider » sous « Assistant », choisi le 25/10).
export type LienMenu = { href: string; libelle: string; sousLiens?: LienMenu[]; toujoursOuvert?: boolean };

export function liensDuMenu(
  utilisateur: { id: string; role: "admin" | "musicien" },
  musiciens: { id: string; nom: string }[] = [],
  aValider = 0, // relances proposées par l'assistant, en attente de décision
): LienMenu[] {
  if (utilisateur.role === "admin") {
    return [
      { href: "/tableau-de-bord", libelle: "Tableau de bord" },
      { href: "/engagements", libelle: "Engagements" },
      { href: "/demandes", libelle: "Demandes reçues" },
      {
        href: "/musiciens",
        libelle: "Musiciens",
        ...(musiciens.length > 0 && { sousLiens: musiciens.map((m) => ({ href: `/musiciens/${m.id}`, libelle: m.nom })) }),
      },
      { href: "/courriers", libelle: "Courriers" },
      { href: "/questions", libelle: "Documents" },
      {
        href: "/assistant",
        libelle: "Assistant",
        toujoursOuvert: true,
        sousLiens: [{ href: "/validations", libelle: aValider > 0 ? `À valider (${aValider})` : "À valider" }],
      },
      // Pas de « Calendrier » pour l'agent (retiré le 19/10) : le mois est sur son tableau de bord.
    ];
  }
  // Le musicien n'a pas de tableau de bord : sa fiche est sa page d'accueil.
  return [
    { href: `/musiciens/${utilisateur.id}`, libelle: "Ma fiche" },
    { href: "/engagements", libelle: "Mes engagements" },
    { href: "/calendrier", libelle: "Calendrier" },
  ];
}

// Un lien est actif sur sa page et ses sous-pages, mais « /musiciens » ne s'allume pas sur « /musiciens-x ».
export function estActif(chemin: string, href: string): boolean {
  return chemin === href || chemin.startsWith(`${href}/`);
}
