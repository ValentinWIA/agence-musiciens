import Link from "next/link";
import { BadgeStatut, COULEURS_STATUT } from "@/components/badge-statut";
import { Button } from "@/components/ui/button";
import {
  bornesDuMois,
  casesDuMois,
  heureLocale,
  jourLocal,
  libelleJour,
  libelleMois,
  lireMois,
  moisVoisin,
  rangerPourMois,
  versParamMois,
} from "@/lib/calendrier";
import { formaterDebut } from "@/lib/dates";
import { LIBELLES_STATUT, listerPourCalendrier } from "@/lib/engagements";

const JOURS_SEMAINE = ["lun.", "mar.", "mer.", "jeu.", "ven.", "sam.", "dim."];

type Lecteur = Parameters<typeof listerPourCalendrier>[0];
type EngagementAffiche = Awaited<ReturnType<typeof listerPourCalendrier>>[number];

// Le mois en grille, partagé par /calendrier et le tableau de bord : `adresse` est la page où l'on change de mois.
// Le lecteur vient de verifierSession() dans la page : le musicien ne reçoit que ses engagements.
export async function CalendrierMois({
  lecteur,
  param,
  adresse,
  titre: Titre,
}: {
  lecteur: Lecteur;
  param: string | string[] | undefined;
  adresse: "/calendrier" | "/tableau-de-bord";
  titre: "h1" | "h2";
}) {
  // « Aujourd'hui » est celui de l'agence, à Paris.
  const aujourdhui = jourLocal(new Date(), "France");
  const mois = lireMois(typeof param === "string" ? param : undefined, aujourdhui);
  const { depuis, jusqua } = bornesDuMois(mois);
  const { parJour, aPreciser } = rangerPourMois(await listerPourCalendrier(lecteur, depuis, jusqua), mois);
  const vide = parJour.size === 0 && aPreciser.length === 0;
  const vers = (m: typeof mois) => `${adresse}?mois=${versParamMois(m)}`;

  return (
    <section className="grid gap-4" aria-label="Calendrier">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Titre className={Titre === "h1" ? "text-2xl font-semibold first-letter:uppercase" : "font-logo text-3xl first-letter:uppercase"}>
          {libelleMois(mois)}
        </Titre>
        <nav className="flex flex-wrap gap-2" aria-label="Changer de mois">
          <Button variant="outline" nativeButton={false} render={<Link href={vers(moisVoisin(mois, -1))} scroll={false} />}>
            ← Mois précédent
          </Button>
          <Button variant="outline" nativeButton={false} render={<Link href={adresse} scroll={false} />}>
            Aujourd&apos;hui
          </Button>
          <Button variant="outline" nativeButton={false} render={<Link href={vers(moisVoisin(mois, 1))} scroll={false} />}>
            Mois suivant →
          </Button>
        </nav>
      </div>

      {aPreciser.length > 0 && (
        <div className="grid gap-2 rounded-lg border border-dashed p-3">
          <p className="text-sm font-medium">Date à préciser</p>
          <ul className="flex flex-wrap gap-2">
            {aPreciser.map((e) => (
              <li key={e.id}>
                <Pastille engagement={e} detail={formaterDebut(e.debut, e.precisionDate, e.pays)} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {vide && <p className="text-muted-foreground">Aucun engagement en {libelleMois(mois)}.</p>}

      {/* Téléphone : le mois en liste, seulement les jours occupés. Le serveur envoie les deux vues, le CSS choisit. */}
      {!vide && (
        <ul className="grid gap-3 md:hidden" aria-label={`Engagements de ${libelleMois(mois)}`}>
          {[...parJour.keys()].sort().map((jour) => (
            <li key={jour}>
              <p
                className={`text-sm font-medium first-letter:uppercase ${jour === aujourdhui ? "text-primary" : ""}`}
                aria-current={jour === aujourdhui ? "date" : undefined}
              >
                {jour === aujourdhui ? `Aujourd'hui, ${libelleJour(jour)}` : libelleJour(jour)}
              </p>
              <ul className="divide-y divide-dashed text-sm">
                {parJour.get(jour)!.map((e) => (
                  <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 py-1.5">
                    <Link href={`/engagements/${e.id}`} className="underline">
                      <span className="font-medium">{heureLocale(e.debut, e.pays)}</span> {e.titre}
                      <span className="block text-xs text-muted-foreground">
                        {e.musiciens.join(", ")} · {e.ville}
                      </span>
                    </Link>
                    <BadgeStatut statut={e.statut} />
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}

      <div className="hidden md:block">
        <table className="w-full table-fixed border-collapse text-sm">
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
    </section>
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
