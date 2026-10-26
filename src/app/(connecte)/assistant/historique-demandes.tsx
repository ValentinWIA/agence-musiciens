import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ReponseAssistant } from "@/components/reponse-assistant";
import type { executionsAgent } from "@/db/schema";
import { LIBELLES_ETAT_AGENT, resumeActions } from "@/lib/agent-regles";
import { formaterDollars } from "@/lib/couts-ia";

// Couleur de la pastille « ce qui a été fait » : une relance attend une décision (or), une action faite (vert).
const TEINTES = {
  attente: "border-or bg-or/15",
  fait: "border-emerald-600/40 text-emerald-700 dark:text-emerald-400",
  refus: "border-destructive/40 text-destructive",
  lecture: "text-muted-foreground",
};
function teinte(resume: string): keyof typeof TEINTES {
  if (resume === "lecture seule") return "lecture";
  if (resume.includes("relance")) return "attente";
  if (/créé|ajouté/.test(resume)) return "fait";
  return "refus";
}

// L'historique de /assistant (variante A, 26/10) : une ligne par demande, ce qu'elle a fait, la réponse au clic.
export function HistoriqueDemandes({ executions, origine }: { executions: (typeof executionsAgent.$inferSelect)[]; origine: string }) {
  return (
    <>
    {executions.map((x) => {
      const resume = resumeActions(x.etapes);
      return (
        <details key={x.id} className="group border-t first-of-type:border-t-0">
          <summary className="grid cursor-pointer list-none grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 py-3 text-sm sm:grid-cols-[7.5rem_1fr_auto_1rem] [&::-webkit-details-marker]:hidden">
            <span className="col-span-2 text-xs text-muted-foreground sm:col-span-1">
              {x.debutLe.toLocaleString("fr-FR", { timeZone: "Europe/Paris", dateStyle: "short", timeStyle: "short" })}
              {x.porte === "mcp" && " · MCP"}
            </span>
            <span className="truncate font-medium">{x.demande}</span>
            <span className="flex flex-wrap justify-end gap-1">
              {x.etat !== "terminee" && (
                <Badge variant={x.etat === "en_cours" ? "outline" : "destructive"}>{LIBELLES_ETAT_AGENT[x.etat]}</Badge>
              )}
              {x.etapes.some((e) => e.alerte) && (
                <Badge variant="outline" className="border-orange-400 text-orange-700 dark:text-orange-400">
                  ⚠ consigne signalée
                </Badge>
              )}
              <Badge variant="outline" className={TEINTES[teinte(resume)]}>
                {resume}
              </Badge>
            </span>
            <span aria-hidden className="hidden text-muted-foreground transition-transform group-open:rotate-90 sm:block">
              ›
            </span>
          </summary>
          <div className="mb-4 grid gap-4 border-l-2 border-or pl-4">
            {x.reponse && <ReponseAssistant texte={x.reponse} origine={origine} />}
            {x.erreur && <p className="text-sm text-destructive">{x.erreur}</p>}
            {x.etapes.some((e) => e.outil === "proposer_relance" && !e.sortie.startsWith("refus")) && (
              <p className="text-sm">
                <Link href="/validations" className="font-medium underline decoration-or underline-offset-4">
                  Décider des relances sur « À valider » →
                </Link>
              </p>
            )}
            {x.etapes.length > 0 && (
              <details className="text-xs text-muted-foreground">
                <summary className="cursor-pointer">
                  Détail technique : {x.etapes.length} outil{x.etapes.length > 1 ? "s" : ""} appelé{x.etapes.length > 1 ? "s" : ""}
                  {x.cout !== null && ` · ${formaterDollars(x.cout)}`}
                  {x.finLe && ` · ${Math.round((x.finLe.getTime() - x.debutLe.getTime()) / 1000)} s`}
                </summary>
                <div className="mt-2 grid gap-3">
                  {x.etapes.map((e, i) => (
                    <div key={i} className="grid gap-1">
                      <p className="font-mono">
                        {i + 1}. {e.outil} {JSON.stringify(e.entree)}
                      </p>
                      {e.alerte && (
                        <p className="font-medium text-orange-700 dark:text-orange-400">
                          ⚠ Consigne possible dans les données : à ne pas suivre (voir la réponse et les outils appelés ensuite).
                        </p>
                      )}
                      <p className="whitespace-pre-line">{e.sortie}</p>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        </details>
      );
    })}
    </>
  );
}
