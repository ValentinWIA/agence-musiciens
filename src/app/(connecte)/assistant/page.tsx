import { desc, sql } from "drizzle-orm";
import Link from "next/link";
import { Suspense } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PAGE_LARGE } from "@/components/mise-en-page";
import { db } from "@/db";
import { executionsAgent } from "@/db/schema";
import { MAX_DOLLARS, MAX_SECONDES, MAX_TOURS, OUTILS_D_ACTION } from "@/lib/agent-regles";
import { verifierAdmin } from "@/lib/session";
import { FormulaireAssistant } from "@/components/formulaire-assistant";
import { HistoriqueDemandes } from "./historique-demandes";
import { origineDuSite } from "@/lib/origine";

const LIMITE_JOURNAL = 50; // 20 jusqu'au 26/10 : une rafale de 24 appels par MCP cachait ses premières actions

export default function PageAssistant({ searchParams }: PageProps<"/assistant">) {
  return (
    <main className={`${PAGE_LARGE} grid gap-6 py-4`}>
      <h1 className="font-logo text-4xl leading-tight">Assistant</h1>
      <Suspense fallback={<div className="h-48 animate-pulse rounded-md bg-muted" aria-label="Chargement" />}>
        <ContenuAssistant searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function ContenuAssistant({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await verifierAdmin("/assistant"); // un musicien ne voit jamais cette page
  // « Actions seulement » : les demandes où un outil d'action a été appelé (retour du 26/10).
  const actionsSeulement = (await searchParams).vue === "actions";
  const executions = await db
    .select()
    .from(executionsAgent)
    .where(
      actionsSeulement
        ? sql`exists (select 1 from jsonb_array_elements(${executionsAgent.etapes}) e where e->>'outil' in (${sql.join(
            OUTILS_D_ACTION.map((o) => sql`${o}`),
            sql`, `,
          )}))`
        : undefined,
    )
    .orderBy(desc(executionsAgent.debutLe))
    .limit(LIMITE_JOURNAL);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Demander à l&apos;assistant</CardTitle>
          <CardDescription>
            L&apos;assistant (une IA) lit les engagements, les demandes reçues et les courriers pour répondre ou
            préparer. Si vous le lui demandez, il ajoute une note sur la fiche d&apos;un musicien ou crée l&apos;engagement
            d&apos;une demande reçue (heure et musiciens écrits dans votre demande). Il n&apos;envoie rien et ne supprime
            rien. Il peut se tromper : relisez sa réponse. Chaque
            demande s&apos;arrête après {MAX_TOURS} tours, {MAX_DOLLARS.toLocaleString("fr-FR")} $ ou {MAX_SECONDES} s,
            et compte sur la page{" "}
            <Link href="/couts?depuis=assistant" className="underline">
              Coûts
            </Link>
            .
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FormulaireAssistant origine={origineDuSite()} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Historique des demandes</CardTitle>
          <CardDescription>
            Vos {LIMITE_JOURNAL} dernières demandes à l&apos;assistant, ce qu&apos;il a fait et sa réponse (cliquez pour la
            lire). Par MCP, chaque appel d&apos;outil est une ligne.
          </CardDescription>
          <p className="text-sm">
            {actionsSeulement ? (
              <Link href="/assistant" className="underline">
                Toutes les demandes
              </Link>
            ) : (
              <span className="font-medium">Toutes les demandes</span>
            )}
            {" · "}
            {actionsSeulement ? (
              <span className="font-medium">Actions seulement</span>
            ) : (
              <Link href="/assistant?vue=actions" className="underline">
                Actions seulement
              </Link>
            )}
          </p>
        </CardHeader>
        <CardContent className="grid">
          {executions.length === 0 && (
            <p className="text-sm text-muted-foreground">{actionsSeulement ? "Aucune action pour l'instant." : "Aucune demande pour l'instant."}</p>
          )}
          <HistoriqueDemandes executions={executions} origine={origineDuSite()} />
        </CardContent>
      </Card>
    </>
  );
}
