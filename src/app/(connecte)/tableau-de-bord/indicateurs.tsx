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
  return (
    <section className="grid gap-4" aria-labelledby="titre-indicateurs">
      <h2 id="titre-indicateurs" className="font-logo text-3xl">
        Saison {libelleSaison(saison)}
      </h2>
      <Card>
        <CardContent className="grid gap-4">
          <p className="flex items-baseline gap-2">
            <span className="font-logo text-5xl">{contrats}</span>
            <span className="text-muted-foreground">{contrats > 1 ? "contrats" : "contrat"} cette saison</span>
          </p>
          {total === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun engagement cette saison.</p>
          ) : (
            <ol className="flex flex-wrap items-center gap-x-2 gap-y-3" aria-label="Engagements de la saison par statut">
              {FRISE.map((statut, i) => (
                <Fragment key={statut}>
                  {i > 0 && (
                    <li aria-hidden className="text-muted-foreground">
                      →
                    </li>
                  )}
                  <li>
                    <PastilleStatut statut={statut} nombre={parStatut[statut]} />
                  </li>
                </Fragment>
              ))}
              <li className="ml-auto">
                <PastilleStatut statut="annule" nombre={parStatut.annule} />
              </li>
            </ol>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

function PastilleStatut({ statut, nombre }: { statut: Statut; nombre: number }) {
  return (
    <Link
      href={lienStatut(statut)}
      className="flex items-center gap-1.5 rounded-md px-1 py-0.5 hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <span className="font-medium tabular-nums">{nombre}</span>
      <BadgeStatut statut={statut} />
    </Link>
  );
}
