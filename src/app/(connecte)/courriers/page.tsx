import { count, desc, isNull, sql } from "drizzle-orm";
import Link from "next/link";
import { Suspense } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { db } from "@/db";
import { courriels, courriers } from "@/db/schema";
import { formaterMontant } from "@/lib/argent";
import { LIBELLES_MODELE, type Modele } from "@/lib/couts-ia";
import { LIBELLES_CLASSEMENT, type Classement } from "@/lib/courrier";
import { verifierAdmin } from "@/lib/session";
import { LectureCourriel, SaisieManuelle } from "./depot";
import { ImportDossier } from "./import-dossier";
import { PAGE_LARGE } from "@/components/mise-en-page";

// Boîte de réception (variante A choisie sur planche le 26/10) : onglets « À traiter » (courriels importés) et
// « Enregistrés » (courriers) ; la liste à gauche, le courriel ouvert à droite (?id=…), la saisie à la main (?saisie=1).
export default function PageCourriers({ searchParams }: PageProps<"/courriers">) {
  return (
    <main className={`${PAGE_LARGE} grid gap-4 py-4`}>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-md bg-muted" aria-label="Chargement" />}>
        <ContenuCourriers searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function ContenuCourriers({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await verifierAdmin("/courriers"); // un musicien ne voit jamais cette page
  const parametres = await searchParams;
  const onglet = parametres.onglet === "enregistres" ? "enregistres" : "a-traiter";
  const saisie = parametres.saisie === "1";

  const [aTraiter, [{ enregistres }]] = await Promise.all([
    db
      .select()
      .from(courriels)
      .where(isNull(courriels.courrierId))
      .orderBy(sql`${courriels.dateEnvoi} desc nulls last`, desc(courriels.importeLe))
      .limit(100),
    db.select({ enregistres: count() }).from(courriers),
  ]);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-logo text-4xl leading-tight">Courriers</h1>
        <div className="flex flex-wrap items-center gap-4">
          <Link href="/courriers?saisie=1" className="text-sm underline">
            + Coller un texte ou un PDF
          </Link>
          <ImportDossier />
        </div>
      </div>

      <div className="rounded-xl border bg-card">
        <nav className="flex gap-1 border-b px-4 text-sm" aria-label="Onglets des courriers">
          <Onglet href="/courriers" actif={onglet === "a-traiter"} libelle="À traiter" nombre={aTraiter.length} />
          <Onglet href="/courriers?onglet=enregistres" actif={onglet === "enregistres"} libelle="Enregistrés" nombre={enregistres} />
        </nav>
        {onglet === "enregistres" ? (
          <Enregistres />
        ) : (
          <BoiteATraiter aTraiter={aTraiter} choisi={typeof parametres.id === "string" ? parametres.id : undefined} saisie={saisie} />
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Importer un dossier (ordinateur) : exportez vos courriels en fichiers .eml (Mail : glissez-les sur le bureau). Ils
        sont rangés ici sans IA, et un courriel déjà importé n&apos;est pas ajouté deux fois. Chaque lecture par l&apos;IA
        est comptée sur la page{" "}
        <Link href="/couts?depuis=courriers" className="underline">
          Coûts
        </Link>
        .
      </p>
    </>
  );
}

function Onglet({ href, actif, libelle, nombre }: { href: string; actif: boolean; libelle: string; nombre: number }) {
  return (
    <Link
      href={href}
      aria-current={actif ? "page" : undefined}
      className={`-mb-px border-b-2 px-3 py-2.5 ${actif ? "border-or font-semibold" : "border-transparent text-muted-foreground"}`}
    >
      {libelle}
      <span className="ml-1.5 rounded-full bg-muted px-1.5 text-xs font-normal">{nombre}</span>
    </Link>
  );
}

type Courriel = typeof courriels.$inferSelect;

function BoiteATraiter({ aTraiter, choisi, saisie }: { aTraiter: Courriel[]; choisi?: string; saisie: boolean }) {
  // Sur ordinateur, le premier courriel est ouvert d'office ; sur téléphone, on ouvre d'abord la liste.
  const ouvert = saisie ? undefined : (aTraiter.find((c) => c.id === choisi) ?? (choisi ? undefined : aTraiter[0]));
  const ouvertParClic = saisie || (choisi !== undefined && ouvert !== undefined);
  const dejaTraite = choisi !== undefined && !saisie && !ouvert;

  return (
    <div className="grid min-h-[28rem] md:grid-cols-[20rem_minmax(0,1fr)]">
      <ul className={`border-b md:border-r md:border-b-0 ${ouvertParClic ? "hidden md:block" : ""}`}>
        {aTraiter.length === 0 && <li className="p-4 text-sm text-muted-foreground">Rien à traiter.</li>}
        {aTraiter.map((c) => (
          <li key={c.id}>
            <Link
              href={`/courriers?id=${c.id}`}
              aria-current={c.id === ouvert?.id ? "true" : undefined}
              className={`grid gap-0.5 border-b px-4 py-2.5 text-sm ${c.id === ouvert?.id ? "bg-amber-100 dark:bg-amber-950" : "hover:bg-muted"}`}
            >
              <span className="flex items-baseline justify-between gap-2">
                <span className="flex min-w-0 items-center gap-1.5 font-semibold">
                  <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-or" />
                  <span className="truncate">{nomExpediteur(c.expediteur)}</span>
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">{dateCourte(c.dateEnvoi)}</span>
              </span>
              <span className="truncate">{c.objet}</span>
              <span className="truncate text-xs text-muted-foreground">{c.texte.slice(0, 90)}</span>
            </Link>
          </li>
        ))}
      </ul>

      <section className={`grid content-start gap-4 p-5 ${ouvertParClic ? "" : "hidden md:grid"}`}>
        {ouvertParClic && (
          <Link href="/courriers" className="text-sm underline md:hidden">
            ← Tous les courriels à traiter
          </Link>
        )}
        {saisie ? (
          <SaisieManuelle />
        ) : ouvert ? (
          <LectureCourriel
            key={ouvert.id}
            courriel={{ id: ouvert.id, objet: ouvert.objet, expediteur: ouvert.expediteur, date: dateLongue(ouvert.dateEnvoi), texte: ouvert.texte }}
          />
        ) : dejaTraite ? (
          <p className="text-sm">
            Ce courriel est traité : il est dans l&apos;onglet{" "}
            <Link href="/courriers?onglet=enregistres" className="underline">
              Enregistrés
            </Link>
            .
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">Aucun courriel à traiter : importez un dossier, ou collez un texte.</p>
        )}
      </section>
    </div>
  );
}

async function Enregistres() {
  const liste = await db.select().from(courriers).orderBy(desc(courriers.creeLe)).limit(100);
  if (liste.length === 0) return <p className="p-4 text-sm text-muted-foreground">Aucun courrier enregistré pour l&apos;instant.</p>;
  return (
    <div className="p-2">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Daté du</TableHead>
            <TableHead className="min-w-44">Expéditeur</TableHead>
            <TableHead>Référence</TableHead>
            <TableHead className="text-right">Montant</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Classement</TableHead>
            <TableHead>Lu par</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {liste.map((c) => (
            <TableRow key={c.id}>
              <TableCell>{c.dateCourrier ? new Date(`${c.dateCourrier}T12:00:00Z`).toLocaleDateString("fr-FR") : "—"}</TableCell>
              <TableCell className="whitespace-normal">
                <Link href={`/courriers/${c.id}`} className="underline">
                  {c.structure ?? "expéditeur inconnu"}
                </Link>
                {c.signataire && <span className="block text-xs text-muted-foreground">{c.signataire}</span>}
              </TableCell>
              <TableCell>{c.reference ?? "—"}</TableCell>
              <TableCell className="text-right">{c.montant === null ? "—" : formaterMontant(c.montant, "EUR")}</TableCell>
              <TableCell>{c.typeDossier ?? "—"}</TableCell>
              <TableCell className="whitespace-normal">
                {LIBELLES_CLASSEMENT[c.classement as Classement] ?? c.classement}
                {c.resume && <span className="block text-xs text-muted-foreground">{c.resume}</span>}
              </TableCell>
              <TableCell>{LIBELLES_MODELE[c.modele as Modele] ?? c.modele}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// « Salle Gaveau <p@gaveau.test> » → « Salle Gaveau » dans la liste ; l'adresse reste dans le courriel ouvert.
function nomExpediteur(expediteur: string): string {
  return expediteur.replace(/\s*<[^>]*>$/, "") || expediteur;
}

function dateCourte(d: Date | null): string {
  return d ? d.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "short" }) : "";
}

function dateLongue(d: Date | null): string | null {
  return d ? d.toLocaleString("fr-FR", { timeZone: "Europe/Paris", dateStyle: "long", timeStyle: "short" }) : null;
}
