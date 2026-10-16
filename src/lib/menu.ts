// Liens du menu latéral. Ils ne protègent rien : chaque page revérifie les droits côté serveur.

export type LienMenu = { href: string; libelle: string };

export function liensDuMenu(utilisateur: { id: string; role: "admin" | "musicien" }): LienMenu[] {
  if (utilisateur.role === "admin") {
    return [
      { href: "/tableau-de-bord", libelle: "Tableau de bord" },
      { href: "/engagements", libelle: "Engagements" },
      { href: "/calendrier", libelle: "Calendrier" },
      { href: "/musiciens", libelle: "Musiciens" },
      { href: "/invitations", libelle: "Invitations" },
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
