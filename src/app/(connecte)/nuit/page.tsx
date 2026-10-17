import { and, count, desc, eq, like, not } from "drizzle-orm";
import { Suspense } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { db } from "@/db";
import { evenementsFlux, executions } from "@/db/schema";
import { jourLocal } from "@/lib/calendrier";
import { nuitAProposer } from "@/lib/import-nuit";
import { verifierAdmin } from "@/lib/session";
import { FormulaireImport } from "./formulaire";

const LIMITE = 100;

export default function PageNuit() {
  return (
    <main className="mx-auto grid w-full max-w-5xl gap-6 p-4">
      <h1 className="text-2xl font-semibold">Journal des imports</h1>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-md bg-muted" aria-label="Chargement" />}>
        <ContenuNuit />
      </Suspense>
    </main>
  );
}

async function ContenuNuit() {
  await verifierAdmin("/nuit"); // un musicien ne voit jamais cette page
  const misDeCote = eq(evenementsFlux.etat, "mis_de_cote");
  const messageInconnu = and(eq(evenementsFlux.type, "message"), like(evenementsFlux.raison, "référence inconnue%"))!;

  const [nuitProposee, liste, messages, autresMisDeCote, [{ total }]] = await Promise.all([
    nuitAProposer(),
    db.select().from(executions).orderBy(desc(executions.debutLe)).limit(LIMITE),
    db
      .select({ id: evenementsFlux.id, nuitDu: executions.nuitDu, reference: evenementsFlux.reference, brut: evenementsFlux.brut })
      .from(evenementsFlux)
      .innerJoin(executions, eq(evenementsFlux.executionId, executions.id))
      .where(and(misDeCote, messageInconnu))
      .orderBy(desc(evenementsFlux.horodatage))
      .limit(LIMITE),
    db
      .select({
        id: evenementsFlux.id,
        nuitDu: executions.nuitDu,
        fluxId: evenementsFlux.fluxId,
        type: evenementsFlux.type,
        raison: evenementsFlux.raison,
      })
      .from(evenementsFlux)
      .innerJoin(executions, eq(evenementsFlux.executionId, executions.id))
      .where(and(misDeCote, not(messageInconnu)))
      .orderBy(desc(evenementsFlux.horodatage))
      .limit(LIMITE),
    db.select({ total: count() }).from(evenementsFlux).where(misDeCote),
  ]);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Importer une nuit</CardTitle>
          <CardDescription>
            Proposée : la plus ancienne nuit pas encore importée depuis le 20/09. Rejouer une nuit déjà importée ne crée
            rien en double.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FormulaireImport nuitProposee={nuitProposee} aujourdhui={jourLocal(new Date(), "France")} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Exécutions</CardTitle>
          <CardDescription>
            Coût : 0 € (offres gratuites de Vercel et Neon), aucun courriel envoyé pour l&apos;instant. Chaque passage
            coûte sa durée et ses appels au flux.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {liste.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune exécution : importez la première nuit.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lancée le</TableHead>
                  <TableHead>Nuit du</TableHead>
                  <TableHead>Par</TableHead>
                  <TableHead className="text-right">Durée</TableHead>
                  <TableHead className="text-right">Appels</TableHead>
                  <TableHead className="text-right">Reçus</TableHead>
                  <TableHead className="text-right">Doublons</TableHead>
                  <TableHead className="text-right">Traités</TableHead>
                  <TableHead className="text-right">Mis de côté</TableHead>
                  <TableHead>État</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {liste.map((x) => (
                  <TableRow key={x.id}>
                    <TableCell>
                      {x.debutLe.toLocaleString("fr-FR", { timeZone: "Europe/Paris", dateStyle: "short", timeStyle: "medium" })}
                    </TableCell>
                    <TableCell>{formaterJour(x.nuitDu)}</TableCell>
                    <TableCell>{x.declencheur === "cron" ? "cron" : "bouton"}</TableCell>
                    <TableCell className="text-right">
                      {x.finLe ? `${((x.finLe.getTime() - x.debutLe.getTime()) / 1000).toFixed(1)} s` : "—"}
                    </TableCell>
                    <TableCell className="text-right">{x.appels}</TableCell>
                    <TableCell className="text-right">{x.recus}</TableCell>
                    <TableCell className="text-right">{x.doublons}</TableCell>
                    <TableCell className="text-right">{x.traites}</TableCell>
                    <TableCell className="text-right">{x.misDeCote}</TableCell>
                    <TableCell className="whitespace-normal">
                      <Etat etat={x.etat} />
                      {x.erreur && <p className="mt-1 text-xs text-destructive">{x.erreur}</p>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Messages pour une demande inconnue</CardTitle>
          <CardDescription>
            Le programmateur écrit au sujet d&apos;une réservation que le flux ne nous a jamais transmise. À lire : rien
            n&apos;est fait automatiquement.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {messages.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun message de ce genre.</p>
          ) : (
            <ul className="grid gap-3">
              {messages.map((m) => {
                const donnees = (m.brut as { donnees?: { de?: unknown; texte?: unknown } }).donnees;
                return (
                  <li key={m.id} className="grid gap-1 text-sm">
                    <p className="text-muted-foreground">
                      Nuit du {formaterJour(m.nuitDu)} — {String(donnees?.de ?? "?")} — réf. {m.reference}
                    </p>
                    {/* Texte brut : React l'échappe, rien n'est interprété. */}
                    <p className="whitespace-pre-wrap">{String(donnees?.texte ?? "")}</p>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Autres événements mis de côté</CardTitle>
          <CardDescription>
            {total} événement{total > 1 ? "s" : ""} mis de côté en tout (messages compris), les {LIMITE} plus récents
            ci-dessous.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {autresMisDeCote.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun événement mis de côté.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nuit du</TableHead>
                  <TableHead>Événement</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Raison</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {autresMisDeCote.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>{formaterJour(e.nuitDu)}</TableCell>
                    <TableCell>{e.fluxId ?? "(sans id)"}</TableCell>
                    <TableCell>{e.type ?? "—"}</TableCell>
                    <TableCell className="whitespace-normal">{e.raison}</TableCell>
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

function formaterJour(jour: string) {
  return new Date(`${jour}T12:00:00Z`).toLocaleDateString("fr-FR");
}

function Etat({ etat }: { etat: "en_cours" | "reussie" | "en_echec" }) {
  if (etat === "reussie") return <Badge variant="secondary">réussie</Badge>;
  if (etat === "en_echec") return <Badge variant="destructive">en échec</Badge>;
  return <Badge variant="outline">en cours</Badge>;
}
