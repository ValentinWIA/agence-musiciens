"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { estActif, type LienMenu } from "@/lib/menu";

// Composant du navigateur : lui seul connaît l'adresse en cours, pour surligner le bon lien.
export function LiensMenu({ liens }: { liens: LienMenu[] }) {
  const chemin = usePathname();
  return (
    <ul className="grid gap-1">
      {liens.map((lien) => {
        const actif = estActif(chemin, lien.href);
        return (
          <li key={lien.href}>
            <Link
              href={lien.href}
              aria-current={actif ? "page" : undefined}
              className={
                actif
                  ? "block rounded-r-md border-l-2 border-or bg-accent px-3 py-2 font-medium text-accent-foreground"
                  : "block rounded-r-md border-l-2 border-transparent px-3 py-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              }
            >
              {lien.libelle}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
