import Link from "next/link";
import { Suspense } from "react";
import { COULEURS_STATUT } from "@/components/badge-statut";
import { Button } from "@/components/ui/button";
import {
  bornesDuMois,
  casesDuMois,
  heureLocale,
  jourLocal,
  libelleMois,
  lireMois,
  moisVoisin,
  rangerPourMois,
  versParamMois,
} from "@/lib/calendrier";
import { formaterDebut } from "@/lib/dates";
import { LIBELLES_STATUT, listerPourCalendrier } from "@/lib/engagements";
import { verifierSession } from "@/lib/session";

const JOURS_SEMAINE = ["lun.", "mar.", "mer.", "jeu.", "ven.", "sam.", "dim."];

export default function PageCalendrier({ searchParams }: PageProps<"/calendrier">) {
  return (
    <main className="mx-auto grid w-full max-w-6xl gap-6 p-4">
      <Suspense fallback={<p className="text-muted-foreground">Chargement…</p>}>
        <ContenuCalendrier searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

type EngagementAffiche = Awaited<ReturnType<typeof listerPourCalendrier>>[number];

async function ContenuCalendrier({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const utilisateur = await verifierSession(); // le musicien ne reçoit que ses engagements (listerPourCalendrier)
  const { mois: param } = await searchParams;
  // « Aujourd'hui » est celui de l'agence, à Paris.
  const aujourdhui = jourLocal(new Date(), "France");
  const mois = lireMois(typeof param === "string" ? param : undefined, aujourdhui);
  const { depuis, jusqua } = bornesDuMois(mois);
  const { parJour, aPreciser } = rangerPourMois(await listerPourCalendrier(utilisateur, depuis, jusqua), mois);
  const vide = parJour.size === 0 && aPreciser.length === 0;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold first-letter:uppercase">{libelleMois(mois)}</h1>
        <nav className="flex flex-wrap gap-2" aria-label="Changer de mois">
          <Button variant="outline" nativeButton={false} render={<Link href={`/calendrier?mois=${versParamMois(moisVoisin(mois, -1))}`} />}>
            ← Mois précédent
          </Button>
          <Button variant="outline" nativeButton={false} render={<Link href="/calendrier" />}>
            Aujourd&apos;hui
          </Button>
          <Button variant="outline" nativeButton={false} render={<Link href={`/calendrier?mois=${versParamMois(moisVoisin(mois, 1))}`} />}>
            Mois suivant →
          </Button>
        </nav>
      </div>

      {aPreciser.length > 0 && (
        <section className="grid gap-2 rounded-lg border border-dashed p-3" aria-labelledby="titre-a-preciser">
          <h2 id="titre-a-preciser" className="text-sm font-medium">
            Date à préciser
          </h2>
          <ul className="flex flex-wrap gap-2">
            {aPreciser.map((e) => (
              <li key={e.id}>
                <Pastille engagement={e} detail={formaterDebut(e.debut, e.precisionDate, e.pays)} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {vide && <p className="text-muted-foreground">Aucun engagement en {libelleMois(mois)}.</p>}

      {/* Le défilement horizontal sur téléphone est provisoire : la tranche L4 y affichera une liste. */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[48rem] table-fixed border-collapse text-sm">
          <thead>
            <tr>
              {JOURS_SEMAINE.map((j) => (
                <th key={j} scope="col" className="p-2 text-left font-medium text-muted-foreground">
                  {j}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {casesDuMois(mois).map((semaine) => (
              <tr key={semaine[0].jour}>
                {semaine.map((c) => (
                  <td
                    key={c.jour}
                    className={`h-24 border p-1 align-top ${c.dansLeMois ? "bg-card" : "bg-muted/40 text-muted-foreground"}`}
                  >
                    <span
                      className={`mb-1 inline-flex size-6 items-center justify-center rounded-full text-xs ${
                        c.jour === aujourdhui ? "bg-primary font-semibold text-primary-foreground" : ""
                      }`}
                      aria-current={c.jour === aujourdhui ? "date" : undefined}
                    >
                      {Number(c.jour.slice(8))}
                    </span>
                    {c.dansLeMois && (
                      <ul className="grid gap-1">
                        {(parJour.get(c.jour) ?? []).map((e) => (
                          <li key={e.id}>
                            <Pastille engagement={e} detail={heureLocale(e.debut, e.pays)} />
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// Un engagement dans le calendrier : couleur du statut, et le statut écrit en toutes lettres pour qui ne voit pas
// les couleurs (la couleur ne porte jamais seule l'information).
function Pastille({ engagement: e, detail }: { engagement: EngagementAffiche; detail: string }) {
  return (
    <Link
      href={`/engagements/${e.id}`}
      className={`block rounded-md border px-1.5 py-1 text-xs leading-tight hover:underline ${COULEURS_STATUT[e.statut]}`}
      title={`${e.titre} — ${e.musiciens.join(", ")} — ${e.lieu}, ${e.ville} (${LIBELLES_STATUT[e.statut]})`}
    >
      <span className="font-medium">{detail}</span> {e.titre}
      <span className="block truncate opacity-80">
        {e.musiciens.join(", ")} · {e.ville}
      </span>
      <span className="sr-only"> ({LIBELLES_STATUT[e.statut]})</span>
    </Link>
  );
}
