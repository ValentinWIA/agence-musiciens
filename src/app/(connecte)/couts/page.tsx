import { avg, count, desc, sum } from "drizzle-orm";
import Link from "next/link";
import { Suspense } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { db } from "@/db";
import { appelsIa } from "@/db/schema";
import { APPELS_PAR_JOUR, formaterDollars, PLAFOND_MENSUEL } from "@/lib/couts-ia";
import { MOIS_EN_COURS } from "@/lib/ia";
import { verifierAdmin } from "@/lib/session";
import { FormulaireTest } from "./formulaire";
import { PAGE_LARGE } from "@/components/mise-en-page";

const LIMITE = 20;

// Pages qui mènent ici (?depuis=…) : le lien de retour y ramène. Une valeur inconnue n'affiche aucun lien.
const RETOURS: Record<string, { href: string; libelle: string }> = {
  nuit: { href: "/nuit", libelle: "Journal des imports" },
  courriers: { href: "/courriers", libelle: "Courriers" },
  questions: { href: "/questions", libelle: "Documents" },
  assistant: { href: "/assistant", libelle: "Assistant" },
};

export default function PageCouts({ searchParams }: PageProps<"/couts">) {
  return (
    <main className={`${PAGE_LARGE} grid gap-6 py-4`}>
      <Suspense fallback={null}>
        <Retour searchParams={searchParams} />
      </Suspense>
      <h1 className="font-logo text-4xl leading-tight">Coûts</h1>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-md bg-muted" aria-label="Chargement" />}>
        <ContenuCouts />
      </Suspense>
    </main>
  );
}

async function Retour({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { depuis } = await searchParams;
  const retour = typeof depuis === "string" && Object.hasOwn(RETOURS, depuis) ? RETOURS[depuis] : undefined;
  if (!retour) return null;
  return (
    <Link href={retour.href} className="text-sm underline">
      ← {retour.libelle}
    </Link>
  );
}

async function ContenuCouts() {
  await verifierAdmin("/couts"); // un musicien ne voit jamais cette page

  const [parFonction, derniers] = await Promise.all([
    db
      .select({
        fonction: appelsIa.fonction,
        appels: count(),
        total: sum(appelsIa.cout),
        moyenne: avg(appelsIa.cout),
      })
      .from(appelsIa)
      .where(MOIS_EN_COURS)
      .groupBy(appelsIa.fonction)
      .orderBy(appelsIa.fonction),
    db.select().from(appelsIa).orderBy(desc(appelsIa.creeLe)).limit(LIMITE),
  ]);
  const totalMois = parFonction.reduce((somme, f) => somme + Number(f.total ?? 0), 0);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Ce mois-ci</CardTitle>
          <CardDescription>
            Infrastructure : 0 € (offres gratuites de Vercel, Neon, Resend, Sentry et UptimeRobot). IA : facturée par
            Anthropic au nombre de jetons lus et écrits. Plafond de {formaterDollars(PLAFOND_MENSUEL)} par mois et{" "}
            {APPELS_PAR_JOUR} appels par jour et par personne, vérifiés avant chaque appel.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <p className="text-sm">
            IA : <strong>{formaterDollars(totalMois)}</strong> dépensés, {formaterDollars(Math.max(0, PLAFOND_MENSUEL - totalMois))}{" "}
            restants avant le plafond.
          </p>
          {parFonction.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fonction</TableHead>
                  <TableHead className="text-right">Appels</TableHead>
                  <TableHead className="text-right">Coût moyen par appel</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parFonction.map((f) => (
                  <TableRow key={f.fonction}>
                    <TableCell>{f.fonction}</TableCell>
                    <TableCell className="text-right">{f.appels}</TableCell>
                    <TableCell className="text-right">{formaterDollars(Math.round(Number(f.moyenne ?? 0)))}</TableCell>
                    <TableCell className="text-right">{formaterDollars(Number(f.total ?? 0))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <FormulaireTest />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Derniers appels à l&apos;IA</CardTitle>
          <CardDescription>Les {LIMITE} plus récents. Seul ce qui se compte est gardé, jamais le texte envoyé.</CardDescription>
        </CardHeader>
        <CardContent>
          {derniers.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun appel à l&apos;IA pour l&apos;instant.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Le</TableHead>
                  <TableHead>Fonction</TableHead>
                  <TableHead>Modèle</TableHead>
                  <TableHead className="text-right">Jetons lus</TableHead>
                  <TableHead className="text-right">Jetons écrits</TableHead>
                  <TableHead className="text-right">Durée</TableHead>
                  <TableHead className="text-right">Coût</TableHead>
                  <TableHead>État</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {derniers.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      {a.creeLe.toLocaleString("fr-FR", { timeZone: "Europe/Paris", dateStyle: "short", timeStyle: "medium" })}
                    </TableCell>
                    <TableCell>{a.fonction}</TableCell>
                    <TableCell>{a.modele}</TableCell>
                    <TableCell className="text-right">{a.jetonsEntree}</TableCell>
                    <TableCell className="text-right">{a.jetonsSortie}</TableCell>
                    <TableCell className="text-right">{(a.dureeMs / 1000).toFixed(1)} s</TableCell>
                    <TableCell className="text-right">{formaterDollars(a.cout)}</TableCell>
                    <TableCell>
                      {a.reussi ? <Badge variant="secondary">réussi</Badge> : <Badge variant="destructive">en échec</Badge>}
                    </TableCell>
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
