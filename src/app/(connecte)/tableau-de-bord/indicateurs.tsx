import Link from "next/link";
import { Fragment } from "react";
import { BadgeStatut } from "@/components/badge-statut";
import { Card, CardContent } from "@/components/ui/card";
import { listerPourIndicateurs, type Statut } from "@/lib/engagements";
import { compterIndicateurs, libelleSaison, saisonDe } from "@/lib/indicateurs";

// L'ordre du cycle de vie ; « annulé » est à part, hors de la frise.
const FRISE: Statut[] = ["demande", "option", "contrat_envoye", "confirme", "joue", "facture", "paye"];

// Lien vers la liste filtrée : « periode=tous », sinon payé et annulé (hors « en cours ») n'apparaîtraient pas.
// La liste n'a pas de filtre de saison : elle montre tous les engagements de ce statut.
function lienStatut(statut: Statut) {
  return `/engagements?statut=${statut}&periode=tous`;
}

export async function Indicateurs() {
  const saison = saisonDe(new Date(), "France"); // la saison en cours, à l'heure de l'agence
  const { contrats, parStatut, total } = compterIndicateurs(await listerPourIndicateurs(), saison);
  // À la verticale (retour de l'humain le 18/10) : une colonne étroite à côté du panneau « À faire ».
  return (
    <Card>
      <CardContent className="grid content-start justify-items-center gap-4 text-center">
        <h2 className="font-logo text-2xl">Saison {libelleSaison(saison)}</h2>
        <p className="grid justify-items-center gap-1">
          <span className="font-logo text-5xl leading-none">{contrats}</span>
          <span className="text-muted-foreground">{contrats > 1 ? "contrats" : "contrat"} cette saison</span>
        </p>
        {total === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun engagement cette saison.</p>
        ) : (
          <ol className="grid justify-items-center gap-0.5" aria-label="Engagements de la saison par statut">
            {FRISE.map((statut, i) => (
              <Fragment key={statut}>
                {i > 0 && (
                  <li aria-hidden className="text-xs leading-none text-muted-foreground">
                    ↓
                  </li>
                )}
                <li>
                  <PastilleStatut statut={statut} nombre={parStatut[statut]} />
                </li>
              </Fragment>
            ))}
            <li className="mt-3 border-t px-6 pt-3">
              <PastilleStatut statut="annule" nombre={parStatut.annule} />
            </li>
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

function PastilleStatut({ statut, nombre }: { statut: Statut; nombre: number }) {
  return (
    <Link
      href={lienStatut(statut)}
      className="flex items-center gap-1.5 rounded-md px-1 py-0.5 hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <BadgeStatut statut={statut} />
      <span className="font-medium tabular-nums">{nombre}</span>
    </Link>
  );
}
