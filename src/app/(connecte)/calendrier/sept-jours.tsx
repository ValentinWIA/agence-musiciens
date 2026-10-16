import Link from "next/link";
import { BadgeStatut } from "@/components/badge-statut";
import { bornesSeptJours, heureLocale, jourLocal, libelleJour, rangerSeptJours } from "@/lib/calendrier";
import { listerPourCalendrier } from "@/lib/engagements";

type Lecteur = Parameters<typeof listerPourCalendrier>[0];

// Les 7 prochains jours, en tête de la fiche du musicien. Le lecteur vient de verifierSession() :
// listerPourCalendrier ne rend au musicien que ses engagements. Seuls les jours occupés sont affichés.
export async function SeptJours({ lecteur }: { lecteur: Lecteur }) {
  const aujourdhui = jourLocal(new Date(), "France");
  const { depuis, jusqua } = bornesSeptJours(aujourdhui);
  const jours = rangerSeptJours(await listerPourCalendrier(lecteur, depuis, jusqua), aujourdhui).filter(
    (j) => j.engagements.length > 0,
  );

  return (
    <section className="rounded-lg border bg-card px-5 py-4" aria-label="7 prochains jours">
      <h2 className="mb-2 font-logo text-xl">7 prochains jours</h2>
      {jours.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">Aucun engagement dans les 7 prochains jours.</p>
      ) : (
        <ul className="grid gap-3">
          {jours.map(({ jour, engagements }) => (
            <li key={jour}>
              <p className="text-sm font-medium first-letter:uppercase">
                {jour === aujourdhui ? "Aujourd'hui" : libelleJour(jour)}
              </p>
              <ul className="divide-y divide-dashed text-sm">
                {engagements.map((e) => (
                  <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 py-1.5">
                    <Link href={`/engagements/${e.id}`} className="underline">
                      <span className="font-medium">{heureLocale(e.debut, e.pays)}</span> {e.titre ? `${e.titre} — ` : ""}
                      {e.lieu}, {e.ville}
                      <span className="block text-xs text-muted-foreground no-underline">{e.musiciens.join(", ")}</span>
                    </Link>
                    <BadgeStatut statut={e.statut} />
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
