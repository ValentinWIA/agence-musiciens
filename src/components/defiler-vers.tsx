"use client";

import { useEffect } from "react";

// Au retour d'une fiche, amène l'élément au milieu de l'écran. Next garde la liste en mémoire et la réaffiche :
// l'effet est rejoué à chaque réaffichage, une ancre (#…) ne l'est pas.
// Plusieurs identifiants quand la liste existe en deux versions (cartes sur téléphone, tableau sur ordinateur) :
// on vise celle qui est affichée.
export function DefilerVers({ ids }: { ids: string[] }) {
  const cle = ids.join(" ");
  useEffect(() => {
    const visible = cle
      .split(" ")
      .map((id) => document.getElementById(id))
      .find((el) => el && el.getClientRects().length > 0);
    visible?.scrollIntoView({ block: "center" });
  }, [cle]);
  return null;
}
