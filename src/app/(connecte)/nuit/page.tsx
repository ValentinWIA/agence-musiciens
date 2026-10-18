import { and, count, desc, eq, like, not } from "drizzle-orm";
import Link from "next/link";
import { Suspense } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { db } from "@/db";
import { evenementsFlux, executions, recaps } from "@/db/schema";
import { jourLocal } from "@/lib/calendrier";
import { nuitAProposer } from "@/lib/import-nuit";
import { verifierAdmin } from "@/lib/session";
import { FormulaireErreurTest, FormulaireImport, FormulaireRattrapage, FormulaireRecap } from "./formulaire";

const LIMITE = 100;

// Le rattrapage (action de cette page) enchaîne les nuits : jusqu'à la limite d'une fonction Hobby.
export const maxDuration = 300;

export default function PageNuit() {
  return (
    <main className="mx-auto grid w-full max-w-5xl gap-6 p-4">
      <Link href="/demandes" className="text-sm underline">
        ← Demandes reçues
      </Link>
      <h1 className="font-logo text-4xl leading-tight">Journal des imports</h1>
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

  const [nuitProposee, liste, autresMisDeCote, [{ total }], [dernierRecap]] = await Promise.all([
    nuitAProposer(),
    db.select().from(executions).orderBy(desc(executions.debutLe)).limit(LIMITE),
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
    db.select().from(recaps).orderBy(desc(recaps.jour)).limit(1),
  ]);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Importer</CardTitle>
          <CardDescription>
            Le rattrapage importe dans l&apos;ordre les nuits manquantes depuis le 20/09, jusqu&apos;à celle de ce matin
            (environ 3 minutes au plus par passage). Pour rejouer une nuit précise, choisissez-la ci-dessous : cela ne
            crée rien en double.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
          <FormulaireRattrapage />
          <FormulaireImport nuitProposee={nuitProposee} aujourdhui={jourLocal(new Date(), "France")} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Récap du matin</CardTitle>
          <CardDescription>
            Envoyé à l&apos;agent une fois par jour, après l&apos;import du matin : tout ce qui a été importé depuis le
            récap précédent, les options qui expirent et les cachets impayés.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <p className="text-sm">
            {!dernierRecap
              ? "Aucun récap envoyé."
              : dernierRecap.envoyeLe
                ? `Dernier récap : envoyé le ${dernierRecap.envoyeLe.toLocaleString("fr-FR", { timeZone: "Europe/Paris", dateStyle: "short", timeStyle: "short" })} à ${dernierRecap.destinataire}.`
                : "Récap du jour en cours d'envoi."}
          </p>
          <FormulaireRecap />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Exécutions</CardTitle>
          <CardDescription>
            Chaque passage coûte sa durée et ses appels au flux ; le détail des coûts, IA comprise, est sur la page{" "}
            <Link href="/couts?depuis=nuit" className="underline">Coûts</Link>.
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
                {liste.map((x) => [
                  <TableRow key={x.id} className={x.analyse || x.analyseErreur ? "border-b-0" : undefined}>
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
                      {x.alerteLe && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          alerte envoyée le{" "}
                          {x.alerteLe.toLocaleString("fr-FR", { timeZone: "Europe/Paris", dateStyle: "short", timeStyle: "short" })}
                        </p>
                      )}
                    </TableCell>
                  </TableRow>,
                  (x.analyse || x.analyseErreur) && (
                    <TableRow key={`${x.id}-analyse`}>
                      <TableCell colSpan={10} className="whitespace-normal pt-0 text-sm">
                        <span className="font-medium">Analyse (IA, à relire) : </span>
                        {x.analyse ?? <span className="text-muted-foreground">indisponible ({x.analyseErreur}).</span>}
                      </TableCell>
                    </TableRow>
                  ),
                ])}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Surveillance</CardTitle>
          <CardDescription>
            Les erreurs du site partent à Sentry, qui prévient par courriel. Ce bouton en envoie une fausse, pour
            vérifier que la chaîne marche.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FormulaireErreurTest />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Autres événements mis de côté</CardTitle>
          <CardDescription>
            {total} événement{total > 1 ? "s" : ""} mis de côté en tout, les {LIMITE} plus récents ci-dessous. Les
            messages pour une demande inconnue se lisent sur <Link href="/demandes" className="underline">Demandes reçues</Link>.
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
