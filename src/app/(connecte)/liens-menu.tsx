"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { estActif, type LienMenu } from "@/lib/menu";
import { Compteur } from "./compteur";

const CLASSE_ACTIF = "block rounded-r-md border-l-2 border-or bg-accent px-3 py-2 font-medium text-accent-foreground";
const CLASSE_INACTIF =
  "block rounded-r-md border-l-2 border-transparent px-3 py-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground";

// Composant du navigateur : lui seul connaît l'adresse en cours, pour surligner le bon lien.
export function LiensMenu({ liens }: { liens: LienMenu[] }) {
  const chemin = usePathname();
  return (
    <ul className="grid gap-1">
      {liens.map((lien) =>
        lien.sousLiens ? (
          <LienDepliable key={lien.href} lien={lien} sousLiens={lien.sousLiens} chemin={chemin} />
        ) : (
          <li key={lien.href}>
            <LienSimple lien={lien} actif={estActif(chemin, lien.href)} />
          </li>
        ),
      )}
    </ul>
  );
}

function LienSimple({ lien, actif }: { lien: LienMenu; actif: boolean }) {
  return (
    <Link href={lien.href} aria-current={actif ? "page" : undefined} className={actif ? CLASSE_ACTIF : CLASSE_INACTIF}>
      {lien.libelle}
    </Link>
  );
}

// « Musiciens » mène toujours à la page générale ; la flèche déplie les fiches (demandé le 18/10).
// Dépliée d'office sur une page de musicien, pour voir où l'on est.
function LienDepliable({ lien, sousLiens, chemin }: { lien: LienMenu; sousLiens: LienMenu[]; chemin: string }) {
  const [deplie, setOuvert] = useState(() => chemin.startsWith(`${lien.href}/`));
  const ouvert = lien.toujoursOuvert || deplie;
  const idListe = `sous-liens-${lien.href.slice(1)}`;
  return (
    <li>
      <div className="flex items-stretch">
        <div className="min-w-0 flex-1">
          <LienSimple lien={lien} actif={chemin === lien.href} />
        </div>
        {!lien.toujoursOuvert && (
          <button
            type="button"
            aria-expanded={ouvert}
            aria-controls={idListe}
            aria-label={ouvert ? `Replier la liste des ${lien.libelle.toLowerCase()}` : `Déplier la liste des ${lien.libelle.toLowerCase()}`}
            onClick={() => setOuvert(!ouvert)}
            className="grid w-9 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <ChevronDown aria-hidden className={`size-4 transition-transform ${ouvert ? "rotate-180" : ""}`} />
          </button>
        )}
      </div>
      {ouvert && (
        <ul id={idListe} className="mt-1 ml-3 grid gap-0.5 border-l border-or/35 pl-2 text-sm">
          {sousLiens.map((s) => {
            const actif = estActif(chemin, s.href);
            return (
              <li key={s.href}>
                <Link
                  href={s.href}
                  aria-current={actif ? "page" : undefined}
                  className={`block truncate rounded-md px-2 py-1 ${actif ? "bg-accent font-medium text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
                >
                  {s.libelle}
                  {s.compteur && <Compteur adresse={s.compteur} />}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}
