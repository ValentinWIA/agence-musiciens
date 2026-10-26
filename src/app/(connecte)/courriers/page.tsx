import { desc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import Link from "next/link";
import { Suspense } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { db } from "@/db";
import { courriels, courriers } from "@/db/schema";
import { formaterMontant } from "@/lib/argent";
import { LIBELLES_MODELE, type Modele } from "@/lib/couts-ia";
import { LIBELLES_CLASSEMENT, type Classement } from "@/lib/courrier";
import { verifierAdmin } from "@/lib/session";
import { DepotCourrier } from "./depot";
import { ImportDossier } from "./import-dossier";
import { PAGE_LARGE } from "@/components/mise-en-page";

export default function PageCourriers({ searchParams }: PageProps<"/courriers">) {
  return (
    <main className={`${PAGE_LARGE} grid gap-6 py-4`}>
      <h1 className="font-logo text-4xl leading-tight">Courriers</h1>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-md bg-muted" aria-label="Chargement" />}>
        <ContenuCourriers searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function ContenuCourriers({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await verifierAdmin("/courriers"); // un musicien ne voit jamais cette page
  const liste = await db.select().from(courriers).orderBy(desc(courriers.creeLe)).limit(100);
  // À traiter d'abord, puis du plus récent au plus ancien.
  const importes = await db
    .select()
    .from(courriels)
    .orderBy(desc(isNull(courriels.courrierId)), desc(courriels.dateEnvoi), desc(courriels.importeLe))
    .limit(100);
  // « Traiter » : ?courriel=<id> ; le texte du courriel remplit le dépôt, précédé de son en-tête (l'IA y lit l'expéditeur et la date).
  const idChoisi = z.uuid().safeParse((await searchParams).courriel).data;
  const choisi = idChoisi ? (await db.select().from(courriels).where(eq(courriels.id, idChoisi)))[0] : undefined;
  const aDeposer = choisi && {
    id: choisi.id,
    objet: choisi.objet,
    texte: [`De : ${choisi.expediteur}`, choisi.dateEnvoi && `Date : ${dateCourriel(choisi.dateEnvoi)}`, `Objet : ${choisi.objet}`, "", choisi.texte]
      .filter((l) => l !== null)
      .join("\n"),
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Déposer un courrier</CardTitle>
          <CardDescription>
            L&apos;IA lit le courrier et remplit les champs ; un champ absent du courrier reste vide. Vous relisez,
            corrigez, puis enregistrez : rien n&apos;est enregistré ni envoyé sans vous. Chaque lecture est un appel
            à l&apos;IA, compté sur la page{" "}
            <Link href="/couts?depuis=courriers" className="underline">
              Coûts
            </Link>
            .
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DepotCourrier key={aDeposer?.id} courriel={aDeposer} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Courriels importés</CardTitle>
          <CardDescription>
            Exportez vos courriels en fichiers .eml dans un dossier (Mail : glissez-les sur le bureau), puis importez le
            dossier : ils sont rangés ici tels quels, sans IA, et un courriel déjà importé n&apos;est pas ajouté deux fois.
            « Traiter » le passe au dépôt ci-dessus.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <ImportDossier />
          {importes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun courriel importé.</p>
          ) : (
            <ul className="text-sm">
              {importes.map((c) => (
                <li
                  key={c.id}
                  className={`grid grid-cols-[7rem_minmax(0,1fr)_auto] items-baseline gap-x-4 border-t py-2 first:border-t-0 ${c.courrierId ? "text-muted-foreground" : ""}`}
                >
                  <span className="whitespace-nowrap">{c.dateEnvoi ? c.dateEnvoi.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" }) : "—"}</span>
                  <details className="min-w-0">
                    <summary className="cursor-pointer">
                      <span className="font-medium">{c.objet}</span> · {c.expediteur}
                    </summary>
                    <p className="mt-2 max-h-64 overflow-y-auto whitespace-pre-line rounded-md bg-muted p-3 text-xs">{c.texte}</p>
                  </details>
                  {c.courrierId ? (
                    <Link href={`/courriers/${c.courrierId}`} className="whitespace-nowrap underline">
                      traité · voir le courrier →
                    </Link>
                  ) : (
                    <Link href={`/courriers?courriel=${c.id}`} className="whitespace-nowrap font-medium underline">
                      Traiter →
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Courriers enregistrés</CardTitle>
        </CardHeader>
        <CardContent>
          {liste.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun courrier enregistré pour l&apos;instant.</p>
          ) : (
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
          )}
        </CardContent>
      </Card>
    </>
  );
}

function dateCourriel(d: Date): string {
  return d.toLocaleString("fr-FR", { timeZone: "Europe/Paris", dateStyle: "long", timeStyle: "short" });
}
