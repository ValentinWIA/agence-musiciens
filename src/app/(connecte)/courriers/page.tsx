import { desc } from "drizzle-orm";
import Link from "next/link";
import { Suspense } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { db } from "@/db";
import { courriers } from "@/db/schema";
import { formaterMontant } from "@/lib/argent";
import { LIBELLES_MODELE, type Modele } from "@/lib/couts-ia";
import { LIBELLES_CLASSEMENT, type Classement } from "@/lib/courrier";
import { verifierAdmin } from "@/lib/session";
import { DepotCourrier } from "./depot";

export default function PageCourriers() {
  return (
    <main className="mx-auto grid w-full max-w-5xl gap-6 p-4">
      <h1 className="font-logo text-4xl leading-tight">Courriers</h1>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-md bg-muted" aria-label="Chargement" />}>
        <ContenuCourriers />
      </Suspense>
    </main>
  );
}

async function ContenuCourriers() {
  await verifierAdmin("/courriers"); // un musicien ne voit jamais cette page
  const liste = await db.select().from(courriers).orderBy(desc(courriers.creeLe)).limit(100);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Déposer un courrier</CardTitle>
          <CardDescription>
            L&apos;IA lit le courrier et remplit les champs ; un champ absent du courrier reste vide. Vous relisez,
            corrigez, puis enregistrez : rien n&apos;est enregistré ni envoyé sans vous. Chaque lecture est un appel
            à l&apos;IA, compté sur la page{" "}
            <Link href="/couts" className="underline">
              Coûts
            </Link>
            .
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DepotCourrier />
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
