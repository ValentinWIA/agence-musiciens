"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

// Un nombre du menu relu à chaque changement de page, au retour sur l'onglet et sur signal (relireCompteurs) : le
// menu, lui, n'est pas redemandé au serveur d'une page à l'autre. Rien d'affiché à zéro, ni tant qu'il n'est pas lu.
const SIGNAL = "relire-compteurs";

// À appeler après une action qui change un nombre du menu sans changer de page (envoyer, refuser, l'assistant).
export function relireCompteurs() {
  window.dispatchEvent(new Event(SIGNAL));
}

export function Compteur({ adresse }: { adresse: string }) {
  const chemin = usePathname();
  const [n, setN] = useState<number | null>(null);

  useEffect(() => {
    let actif = true;
    const lire = () =>
      fetch(adresse, { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((corps) => actif && typeof corps?.n === "number" && setN(corps.n))
        .catch(() => {}); // sans réseau, le menu reste sans nombre
    lire();
    const auRetour = () => document.visibilityState === "visible" && lire();
    document.addEventListener("visibilitychange", auRetour);
    window.addEventListener(SIGNAL, lire);
    return () => {
      actif = false;
      document.removeEventListener("visibilitychange", auRetour);
      window.removeEventListener(SIGNAL, lire);
    };
  }, [adresse, chemin]);

  return n ? <span className="tabular-nums"> ({n})</span> : null;
}
