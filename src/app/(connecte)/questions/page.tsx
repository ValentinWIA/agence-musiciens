import { count, countDistinct, max } from "drizzle-orm";
import { Suspense } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/db";
import { passages } from "@/db/schema";
import { verifierAdmin } from "@/lib/session";
import { FormulaireIndexation } from "./formulaire-indexation";

export default function PageQuestions() {
  return (
    <main className="mx-auto grid w-full max-w-5xl gap-6 p-4">
      <h1 className="font-logo text-4xl leading-tight">Questions</h1>
      <Suspense fallback={<div className="h-48 animate-pulse rounded-md bg-muted" aria-label="Chargement" />}>
        <ContenuQuestions />
      </Suspense>
    </main>
  );
}

async function ContenuQuestions() {
  await verifierAdmin("/questions"); // un musicien ne voit jamais cette page
  const [etat] = await db
    .select({ passages: count(), documents: countDistinct(passages.documentId), dernier: max(passages.indexeLe) })
    .from(passages);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Documents de l&apos;agence</CardTitle>
        <CardDescription>
          Les 20 documents du flux (procédures, contrats, comptes rendus), une page par passage. Indexer calcule
          l&apos;empreinte de sens de chaque page ; une page dont le texte n&apos;a pas changé n&apos;est jamais
          recalculée.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <p className="text-sm">
          {etat.passages === 0 ? (
            "Aucun document indexé pour l'instant."
          ) : (
            <>
              <strong>{etat.passages}</strong> passages de <strong>{etat.documents}</strong> documents, indexés pour la
              dernière fois le{" "}
              {etat.dernier?.toLocaleString("fr-FR", { timeZone: "Europe/Paris", dateStyle: "long", timeStyle: "short" })}.
            </>
          )}
        </p>
        <FormulaireIndexation />
      </CardContent>
    </Card>
  );
}
