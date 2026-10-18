import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BadgeStatut } from "@/components/badge-statut";
import { Button } from "@/components/ui/button";
import { formaterMontantArrondi } from "@/lib/argent";
import { formaterDebut } from "@/lib/dates";
import { LIBELLES_STATUT, lireMusicien, type Statut } from "@/lib/engagements";
import { lireTaux } from "@/lib/change";
import { formaterRevenus, periodeSaison, revenusDeLaSaison, saisonDe } from "@/lib/indicateurs";
import { cachetMoyenEnEuros, PASSES_AFFICHES, recapEngagements } from "@/lib/musiciens";
import { verifierSession } from "@/lib/session";
import { SeptJours } from "../../calendrier/sept-jours";
import { Portrait } from "../portrait";
import { PAGE_LARGE } from "@/components/mise-en-page";

export default function PageMusicien({ params, searchParams }: PageProps<"/musiciens/[id]">) {
  // grid-cols-1 : la colonne ne s'élargit pas à son contenu le plus large (débordement sur téléphone, 19/10).
  return (
    <main className={`${PAGE_LARGE} grid grid-cols-1 content-start gap-6 pt-10 pb-4`}>
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
  // Même calcul que la carte du tableau de bord, limité à ce musicien.
  const saison = saisonDe(new Date(), "France");
  const revenus = revenusDeLaSaison(
    musicien.engagements.map((e) => ({ ...e, musicienId: musicien.id })),
    saison,
    taux,
  );
  const repertoire = musicien.repertoire?.split("\n") ?? [];
  // Écrit une fois, affiché à deux places selon la largeur de l'écran (une seule visible à la fois).
  const blocRepertoire = (
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
  );

  return (
    <>
      {estAgent && (
        <Link href="/musiciens" className="text-sm underline">
          ← Tous les musiciens
        </Link>
      )}
      {modifiee && (
        <p role="status" className="rounded-md border px-3 py-2 text-sm">
          Fiche modifiée.
        </p>
      )}
      {/* Pour le musicien seulement : l'agent a le mois entier sur son tableau de bord. */}
      {!estAgent && <SeptJours lecteur={utilisateur} />}
      <div className="grid grid-cols-1 items-start gap-10 md:grid-cols-[280px_minmax(0,1fr)]">
        <div className="grid w-full max-w-[280px] gap-4 justify-self-center md:justify-self-start">
          <Portrait nom={musicien.nom} photo={musicien.photo} className="rounded-xl border" />
          {estAgent && (
            <Button nativeButton={false} render={<Link href={`/engagements/nouveau?musicien=${musicien.id}`} />}>
              Nouvel engagement
            </Button>
          )}
          <Button variant="outline" nativeButton={false} render={<Link href={`/musiciens/${musicien.id}/modifier`} />}>
            Modifier la fiche
          </Button>
          {/* Sur ordinateur, le répertoire sous la photo (19/10) ; sur téléphone, il reste en bas de la fiche. */}
          <div className="hidden md:block">{blocRepertoire}</div>
        </div>
        <div className="grid min-w-0 grid-cols-1 gap-6">
          <div className="grid gap-1">
            <p className="text-xs tracking-[0.25em] text-muted-foreground uppercase">{musicien.instrument}</p>
            <h1 className="font-logo text-5xl leading-none">{musicien.nom}</h1>
            <p className="mt-2 whitespace-pre-line text-muted-foreground">{musicien.biographie ?? "Pas encore de biographie."}</p>
          </div>

          {/* Légendes courtes et de même longueur, précisions dans la note dessous : les cartes restent équilibrées. */}
          <div className="grid gap-2">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Chiffre valeur={String(recap.aVenir.length)} legende="engagements à venir" />
              <Chiffre valeur={String(recap.passes.length)} legende="engagements passés" />
              <Chiffre
                valeur={formaterRevenus(revenus.total, revenus.converti)}
                legende="revenus de la saison"
              />
              <Chiffre
                valeur={
                  "parDevise" in cachet
                    ? cachet.parDevise.map((m) => formaterMontantArrondi(m.moyenne, m.devise)).join(" · ")
                    : cachet.enEuros
                      ? `${cachet.enEuros.converti ? "≈ " : ""}${formaterMontantArrondi(cachet.enEuros.moyenne, "EUR")}`
                      : "—"
                }
                legende="cachet moyen"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Saison : {periodeSaison(saison)}. Revenus et cachet moyen : part du musicien, un cachet à plusieurs étant
              partagé à parts égales.
              {(revenus.converti || ("enEuros" in cachet && cachet.enEuros?.converti)) &&
                taux &&
                ` Converti au taux BCE du ${taux.date.split("-").reverse().join("/")}.`}
            </p>
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
                <ul className="flex flex-wrap justify-center gap-2 text-sm">
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

          <div className="md:hidden">{blocRepertoire}</div>
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
    // Une ligne par engagement sur ordinateur ; sur téléphone, date et statut en haut, lieu dessous
    // (un tableau ne rétrécit pas : les pastilles débordaient, 19/10).
    <ul className="text-sm">
      {liste.map((e) => (
        <li key={e.id} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-0.5 border-t py-2 first:border-t-0 sm:grid-cols-[auto_1fr_auto]">
          <span className="whitespace-nowrap">{formaterDebut(e.debut, e.precisionDate, e.pays)}</span>
          <Link href={`/engagements/${e.id}`} className="col-span-2 row-start-2 min-w-0 break-words underline sm:col-span-1 sm:row-start-auto">
            {e.titre ? `${e.titre} — ` : ""}
            {e.lieu}, {e.ville}
          </Link>
          <span className="col-start-2 row-start-1 justify-self-end sm:col-start-3">
            <BadgeStatut statut={e.statut} />
          </span>
        </li>
      ))}
    </ul>
  );
}

function Chiffre({ valeur, legende }: { valeur: string; legende: string }) {
  return (
    // Sous-grille : les cartes partagent les lignes de la grille parente (chiffres sur une même ligne, légendes sur
    // la suivante), donc chiffres et légendes restent alignés d'une carte à l'autre quelle que soit la longueur du texte.
    <div className="row-span-2 grid grid-rows-subgrid justify-items-center gap-y-1 rounded-lg border bg-card px-4 py-3 text-center">
      {/* Chiffres « de titrage » : Playfair dessine par défaut des chiffres elzéviriens (3 et 5 descendent, 1 et 2
          restent petits), qui ne s'alignent jamais d'une carte à l'autre. */}
      <b className="self-end font-logo text-2xl leading-tight lining-nums tabular-nums">{valeur}</b>
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
