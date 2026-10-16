import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BadgeStatut } from "@/components/badge-statut";
import { Button } from "@/components/ui/button";
import { formaterMontant } from "@/lib/argent";
import { formaterDebut } from "@/lib/dates";
import { LIBELLES_STATUT, lireMusicien, type Statut } from "@/lib/engagements";
import { lireTaux } from "@/lib/change";
import { cachetMoyenEnEuros, PASSES_AFFICHES, recapEngagements } from "@/lib/musiciens";
import { verifierSession } from "@/lib/session";
import { Portrait } from "../portrait";

export default function PageMusicien({ params, searchParams }: PageProps<"/musiciens/[id]">) {
  return (
    <main className="mx-auto grid w-full max-w-6xl content-start gap-6 p-4 pt-10">
      <Suspense fallback={<p className="text-muted-foreground">Chargement…</p>}>
        <FicheMusicien params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function FicheMusicien({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const utilisateur = await verifierSession();
  const musicien = await lireMusicien(utilisateur, (await params).id);
  if (!musicien) notFound();
  const modifiee = (await searchParams).modifie === "1";

  const estAgent = utilisateur.role === "admin";
  const recap = recapEngagements(musicien.engagements);
  // Taux lus seulement s'il y a un cachet en devise étrangère (même conversion que la fiche d'un engagement).
  const taux = musicien.engagements.some((e) => e.devise !== "EUR") ? await lireTaux() : null;
  const cachet = cachetMoyenEnEuros(musicien.engagements, taux);
  const repertoire = musicien.repertoire?.split("\n") ?? [];

  return (
    <>
      <Link href={estAgent ? "/musiciens" : "/tableau-de-bord"} className="text-sm underline">
        {estAgent ? "← Tous les musiciens" : "← Tableau de bord"}
      </Link>
      {modifiee && (
        <p role="status" className="rounded-md border px-3 py-2 text-sm">
          Fiche modifiée.
        </p>
      )}
      <div className="grid items-start gap-10 md:grid-cols-[280px_1fr]">
        <div className="grid max-w-[280px] gap-4">
          <Portrait nom={musicien.nom} photo={musicien.photo} className="rounded-xl border" />
          {estAgent && (
            <Button nativeButton={false} render={<Link href={`/engagements/nouveau?musicien=${musicien.id}`} />}>
              Nouvel engagement
            </Button>
          )}
          <Button variant="outline" nativeButton={false} render={<Link href={`/musiciens/${musicien.id}/modifier`} />}>
            Modifier la fiche
          </Button>
        </div>
        <div className="grid gap-6">
          <div className="grid gap-1">
            <p className="text-xs tracking-[0.25em] text-muted-foreground uppercase">{musicien.instrument}</p>
            <h1 className="font-logo text-5xl leading-none">{musicien.nom}</h1>
            <p className="mt-2 whitespace-pre-line text-muted-foreground">{musicien.biographie ?? "Pas encore de biographie."}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Chiffre valeur={String(recap.aVenir.length)} legende="engagements à venir" />
            <Chiffre valeur={String(recap.passes.length)} legende="engagements passés" />
            <Chiffre
              valeur={
                "parDevise" in cachet
                  ? cachet.parDevise.map((m) => formaterMontant(m.moyenne, m.devise)).join(" · ")
                  : cachet.enEuros
                    ? `${cachet.enEuros.converti ? "≈ " : ""}${formaterMontant(cachet.enEuros.moyenne, "EUR")}`
                    : "—"
              }
              legende={
                "enEuros" in cachet && cachet.enEuros?.converti && taux
                  ? `cachet moyen (part du musicien), converti au taux BCE du ${taux.date.split("-").reverse().join("/")}`
                  : "cachet moyen (part du musicien)"
              }
            />
          </div>

          {estAgent && (
            <Bloc titre="Notes de l'agent">
              <p className="text-xs text-muted-foreground">Visibles par l&apos;agent seulement.</p>
              <p className="mt-1 text-sm whitespace-pre-line">
                {musicien.notesAgent ?? <span className="text-muted-foreground italic">Aucune note.</span>}
              </p>
            </Bloc>
          )}

          {musicien.engagements.length === 0 ? (
            <Bloc titre="Engagements">
              <p className="text-muted-foreground italic">Aucun engagement pour l&apos;instant.</p>
            </Bloc>
          ) : (
            <>
              <Bloc titre="À venir">
                <ListeEngagements liste={recap.aVenir} vide="Aucun engagement à venir." />
              </Bloc>
              <Bloc titre="Passés">
                <ListeEngagements liste={recap.passes.slice(0, PASSES_AFFICHES)} vide="Aucun engagement passé." />
                {/* <details> se déplie au clic sans JavaScript ; tout l'historique est déjà dans la page. */}
                {recap.passes.length > PASSES_AFFICHES && (
                  <details className="group mt-2">
                    <summary className="cursor-pointer text-sm underline group-open:hidden">
                      Afficher plus ({recap.passes.length - PASSES_AFFICHES} autres)
                    </summary>
                    <ListeEngagements liste={recap.passes.slice(PASSES_AFFICHES)} vide="" />
                  </details>
                )}
              </Bloc>
              <Bloc titre="Par statut">
                <ul className="flex flex-wrap gap-2 text-sm">
                  {(Object.keys(LIBELLES_STATUT) as Statut[])
                    .filter((s) => recap.parStatut[s])
                    .map((s) => (
                      <li key={s} className="flex items-center gap-1.5">
                        <BadgeStatut statut={s} /> {recap.parStatut[s]}
                      </li>
                    ))}
                </ul>
              </Bloc>
              {!estAgent && (
                <Link href="/engagements" className="justify-self-start text-sm underline">
                  Rechercher dans mes engagements →
                </Link>
              )}
            </>
          )}

          <Bloc titre="Répertoire">
            {repertoire.length === 0 ? (
              <p className="text-muted-foreground italic">Pas encore de répertoire.</p>
            ) : (
              <ul className="divide-y divide-dashed text-sm">
                {repertoire.map((oeuvre, i) => (
                  <li key={i} className="py-1.5">
                    {oeuvre}
                  </li>
                ))}
              </ul>
            )}
          </Bloc>
        </div>
      </div>
    </>
  );
}

type LigneEngagement = {
  id: string;
  titre: string | null;
  debut: Date;
  precisionDate: "jour" | "mois" | "saison";
  statut: Statut;
  lieu: string;
  ville: string;
  pays: string;
};

function ListeEngagements({ liste, vide }: { liste: LigneEngagement[]; vide: string }) {
  if (liste.length === 0) return <p className="text-sm text-muted-foreground italic">{vide}</p>;
  return (
    <table className="w-full text-sm">
      <tbody>
        {liste.map((e) => (
          <tr key={e.id} className="border-t first:border-t-0">
            <td className="py-2 pr-3 whitespace-nowrap">{formaterDebut(e.debut, e.precisionDate, e.pays)}</td>
            <td className="py-2 pr-3">
              <Link href={`/engagements/${e.id}`} className="underline">
                {e.titre ? `${e.titre} — ` : ""}
                {e.lieu}, {e.ville}
              </Link>
            </td>
            <td className="py-2 text-right">
              <BadgeStatut statut={e.statut} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Chiffre({ valeur, legende }: { valeur: string; legende: string }) {
  return (
    <div className="rounded-lg border bg-card px-4 py-3">
      <b className="block font-logo text-2xl leading-tight">{valeur}</b>
      <span className="text-xs text-muted-foreground">{legende}</span>
    </div>
  );
}

function Bloc({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border bg-card px-5 py-4">
      <h2 className="mb-2 font-logo text-xl">{titre}</h2>
      {children}
    </section>
  );
}
