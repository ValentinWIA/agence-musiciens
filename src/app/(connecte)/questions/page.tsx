import { count, countDistinct, max } from "drizzle-orm";
import Link from "next/link";
import { Suspense } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/db";
import { passages } from "@/db/schema";
import { NB_PASSAGES } from "@/lib/questions";
import { verifierAdmin } from "@/lib/session";
import { FormulaireIndexation } from "./formulaire-indexation";
import { FormulaireQuestion } from "./formulaire-question";

export default function PageQuestions() {
  return (
    <main className="mx-auto grid w-full max-w-5xl gap-6 p-4">
      <h1 className="font-logo text-4xl leading-tight">Documents</h1>
      <Suspense fallback={<div className="h-48 animate-pulse rounded-md bg-muted" aria-label="Chargement" />}>
        <ContenuQuestions />
      </Suspense>
    </main>
  );
}

async function ContenuQuestions() {
  await verifierAdmin("/questions"); // un musicien ne voit jamais cette page
  const [[etat], pages] = await Promise.all([
    db
      .select({ passages: count(), documents: countDistinct(passages.documentId), dernier: max(passages.indexeLe) })
      .from(passages),
    db
      .select({ documentId: passages.documentId, titre: passages.titre, page: passages.page, texte: passages.texte })
      .from(passages)
      .orderBy(passages.documentId, passages.page),
  ]);
  // Les pages regroupées par document, pour vérifier à la main une page citée par une réponse.
  const documents = new Map<string, typeof pages>();
  for (const p of pages) documents.set(p.documentId, [...(documents.get(p.documentId) ?? []), p]);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Poser une question sur les documents</CardTitle>
          <CardDescription>
            L&apos;IA cherche les {NB_PASSAGES} pages les plus proches de la question, puis rédige une réponse qui ne
            peut citer que ces pages. Elle peut se tromper : relisez les sources citées. Chaque question est un appel
            à l&apos;IA, compté sur la page{" "}
            <Link href="/couts" className="underline">
              Coûts
            </Link>
            .
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FormulaireQuestion />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Documents de l&apos;agence</CardTitle>
          <CardDescription>
            Les 20 documents du flux (procédures, contrats, comptes rendus), une page par passage. Indexer calcule
            l&apos;empreinte de sens de chaque page ; une page dont le texte n&apos;a pas changé n&apos;est jamais
            recalculée. Ce calcul est fait par une IA (Voyage AI, gratuite à ce volume) ; chaque indexation qui
            recalcule au moins une page est un appel compté sur la page{" "}
            <Link href="/couts" className="underline">
              Coûts
            </Link>
            .
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
          {documents.size > 0 && (
            <div className="grid gap-2">
              {[...documents].map(([id, pagesDuDocument]) => (
                <details key={id} className="rounded-md border px-3 py-2 text-sm">
                  <summary className="cursor-pointer">
                    <span className="font-medium">{pagesDuDocument[0].titre}</span>{" "}
                    <span className="text-muted-foreground">
                      — {id}, {pagesDuDocument.length} page{pagesDuDocument.length > 1 ? "s" : ""}
                    </span>
                  </summary>
                  <div className="mt-3 grid gap-3">
                    {pagesDuDocument.map((p) => (
                      <div key={p.page} className="grid gap-1">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Page {p.page}</p>
                        <p className="whitespace-pre-line">{p.texte}</p>
                      </div>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
