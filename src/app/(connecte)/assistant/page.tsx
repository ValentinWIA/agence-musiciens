import { desc } from "drizzle-orm";
import Link from "next/link";
import { Suspense } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PAGE_LARGE } from "@/components/mise-en-page";
import { db } from "@/db";
import { executionsAgent } from "@/db/schema";
import { LIBELLES_ETAT_AGENT, MAX_DOLLARS, MAX_SECONDES, MAX_TOURS } from "@/lib/agent-regles";
import { formaterDollars } from "@/lib/couts-ia";
import { verifierAdmin } from "@/lib/session";
import { FormulaireAssistant } from "./formulaire-assistant";

const LIMITE_JOURNAL = 20;

export default function PageAssistant() {
  return (
    <main className={`${PAGE_LARGE} grid gap-6 py-4`}>
      <h1 className="font-logo text-4xl leading-tight">Assistant</h1>
      <Suspense fallback={<div className="h-48 animate-pulse rounded-md bg-muted" aria-label="Chargement" />}>
        <ContenuAssistant />
      </Suspense>
    </main>
  );
}

async function ContenuAssistant() {
  await verifierAdmin("/assistant"); // un musicien ne voit jamais cette page
  const executions = await db.select().from(executionsAgent).orderBy(desc(executionsAgent.debutLe)).limit(LIMITE_JOURNAL);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Demander à l&apos;assistant</CardTitle>
          <CardDescription>
            L&apos;assistant (une IA) lit les engagements, les demandes reçues et les courriers pour répondre ou
            préparer. Il n&apos;envoie rien et ne supprime rien. Il peut se tromper : relisez sa réponse. Chaque
            demande s&apos;arrête après {MAX_TOURS} tours, {MAX_DOLLARS.toLocaleString("fr-FR")} $ ou {MAX_SECONDES} s,
            et compte sur la page{" "}
            <Link href="/couts?depuis=assistant" className="underline">
              Coûts
            </Link>
            .
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FormulaireAssistant />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Journal</CardTitle>
          <CardDescription>
            Les {LIMITE_JOURNAL} dernières demandes et, pour chacune, les outils appelés et ce qu&apos;ils ont renvoyé.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2">
          {executions.length === 0 && <p className="text-sm text-muted-foreground">Aucune demande pour l&apos;instant.</p>}
          {executions.map((x) => (
            <details key={x.id} className="rounded-md border px-3 py-2 text-sm">
              <summary className="cursor-pointer">
                <span className="text-muted-foreground">
                  {x.debutLe.toLocaleString("fr-FR", { timeZone: "Europe/Paris", dateStyle: "short", timeStyle: "short" })}
                  {x.porte === "mcp" && " · MCP"}
                </span>{" "}
                « {x.demande.length > 80 ? `${x.demande.slice(0, 80)}…` : x.demande} »{" "}
                <Badge variant={x.etat === "terminee" ? "secondary" : x.etat === "en_cours" ? "outline" : "destructive"}>
                  {LIBELLES_ETAT_AGENT[x.etat]}
                </Badge>{" "}
                <span className="text-muted-foreground">
                  {x.etapes.length} outil{x.etapes.length > 1 ? "s" : ""}
                  {x.cout !== null && ` · ${formaterDollars(x.cout)}`}
                  {x.finLe && ` · ${Math.round((x.finLe.getTime() - x.debutLe.getTime()) / 1000)} s`}
                </span>
              </summary>
              <div className="mt-3 grid gap-3">
                {x.etapes.map((e, i) => (
                  <div key={i} className="grid gap-1">
                    <p className="font-mono text-xs">
                      {i + 1}. {e.outil} {JSON.stringify(e.entree)}
                    </p>
                    <p className="whitespace-pre-line text-xs text-muted-foreground">{e.sortie}</p>
                  </div>
                ))}
                {x.reponse && <p className="whitespace-pre-line border-l-2 border-primary pl-3">{x.reponse}</p>}
                {x.erreur && <p className="text-destructive">{x.erreur}</p>}
              </div>
            </details>
          ))}
        </CardContent>
      </Card>
    </>
  );
}
