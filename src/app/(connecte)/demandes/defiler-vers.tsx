"use client";

import { useEffect } from "react";

// Au retour d'une fiche, amène la demande au milieu de l'écran. Next garde la liste en mémoire et la réaffiche :
// l'effet est rejoué à chaque réaffichage, une ancre (#…) ne l'est pas.
export function DefilerVers({ id }: { id: string }) {
  useEffect(() => {
    document.getElementById(id)?.scrollIntoView({ block: "center" });
  }, [id]);
  return null;
}
