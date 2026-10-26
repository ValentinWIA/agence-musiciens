"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ReponseAssistant } from "@/components/reponse-assistant";
import { DEMANDE_MAX, LIBELLES_ETAT_AGENT, LIBELLES_PAGE, lirePageOuverte, type EtatAgent } from "@/lib/agent-regles";
import { formaterDollars } from "@/lib/couts-ia";
import { relireCompteurs } from "@/app/(connecte)/compteur";

type Resultat = { etat: EtatAgent; reponse: string | null; erreur: string | null; tours: number; cout: number; dureeMs: number };
type Message = { etape?: { outil: string; refus: boolean; alerte: boolean }; resultat?: Resultat; erreur?: string };

const EXEMPLES = [
  { court: "options à relancer", texte: "Quelles options faut-il relancer cette semaine ?" },
  { court: "cachets impayés", texte: "Quels cachets sont impayés ?" },
  { court: null, texte: "Inès est-elle libre le 8 mai 2027 ?" },
];

// Le formulaire de l'assistant, sur /assistant et dans la bulle de chaque page (compact : variante E du 26/10,
// docs/semaine-4.md section 11 : deux exemples courts, compteur près de la limite seulement, réponse allégée).
export function FormulaireAssistant({ origine, compact = false }: { origine: string; compact?: boolean }) {
  const router = useRouter();
  // Dans la bulle, la fiche ouverte accompagne la demande (T2) ; sur /assistant, aucune.
  const chemin = usePathname(); // toujours appelé : un hook ne se met pas sous condition
  const page = compact ? lirePageOuverte(chemin) : null;
  const [demande, setDemande] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [etapes, setEtapes] = useState<{ outil: string; refus: boolean; alerte: boolean }[]>([]);
  const [resultat, setResultat] = useState<Resultat | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  async function envoyer(e: React.FormEvent) {
    e.preventDefault();
    setEnCours(true);
    setEtapes([]);
    setResultat(null);
    setErreur(null);
    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ demande, page: page?.chemin }),
      });
      if (!res.ok || !res.body) {
        const corps = await res.json().catch(() => null);
        setErreur(corps?.erreur ?? "La demande n'a pas pu être envoyée.");
        return;
      }
      // Une ligne JSON par message : chaque outil appelé s'affiche dès qu'il arrive.
      const lecteur = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let reste = "";
      for (;;) {
        const { value, done } = await lecteur.read();
        if (done) break;
        reste += value;
        const lignes = reste.split("\n");
        reste = lignes.pop() ?? "";
        for (const ligne of lignes.filter(Boolean)) {
          const m = JSON.parse(ligne) as Message;
          if (m.etape) setEtapes((liste) => [...liste, m.etape!]);
          if (m.resultat) setResultat(m.resultat);
          if (m.erreur) setErreur(m.erreur);
        }
      }
    } catch {
      setErreur("La connexion a été coupée pendant la réponse.");
    } finally {
      setEnCours(false);
      router.refresh(); // le journal, lu côté serveur, montre la nouvelle demande
      relireCompteurs(); // une relance proposée s'ajoute à « À valider »
    }
  }

  return (
    <div className="grid gap-4">
      <form onSubmit={envoyer} className="grid gap-3">
        {page && (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <span aria-hidden className="size-1.5 rounded-full bg-or" />
            Page ouverte : {LIBELLES_PAGE[page.type]}
          </p>
        )}
        <Label htmlFor={compact ? "demande-bulle" : "demande"} className={compact ? "sr-only" : undefined}>
          Votre demande
        </Label>
        <textarea
          id={compact ? "demande-bulle" : "demande"}
          value={demande}
          onChange={(e) => setDemande(e.target.value)}
          maxLength={DEMANDE_MAX}
          rows={compact ? 2 : 3}
          required
          placeholder={compact ? "Votre demande…" : "Par exemple : quelles options faut-il relancer cette semaine ?"}
          className="rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        />
        <div className={compact ? "flex items-start justify-between gap-3" : "grid gap-3"}>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Exemples :{" "}
            {EXEMPLES.filter((x) => !compact || x.court).map((x, i) => (
              <span key={x.texte}>
                {i > 0 && " · "}
                <button type="button" className="underline" onClick={() => setDemande(x.texte)} disabled={enCours}>
                  {compact ? x.court : x.texte}
                </button>
              </span>
            ))}
          </p>
          <div className={compact ? "flex shrink-0 items-center gap-3" : "flex items-center gap-3"}>
            <Button type="submit" disabled={enCours || demande.trim().length === 0} className="w-fit">
              {enCours ? (compact ? "En cours…" : "L'assistant travaille…") : "Envoyer"}
            </Button>
            {(!compact || demande.length > DEMANDE_MAX - 100) && (
              <span className="text-xs text-muted-foreground">
                {demande.length} / {DEMANDE_MAX}
              </span>
            )}
          </div>
        </div>
      </form>

      {/* Dans la bulle, les étapes ne s'affichent que pendant le travail : la réponse les remplace. */}
      {(enCours || (etapes.length > 0 && !(compact && resultat))) && (
        <ul role="status" className="grid gap-1 text-sm text-muted-foreground">
          {etapes.map((e, i) => (
            <li key={i} className={e.refus ? "text-destructive" : undefined}>
              {e.refus ? "✗" : "✓"} {e.outil}
              {e.alerte && <span className="text-orange-700 dark:text-orange-400"> · ⚠ consigne possible dans les données (non suivie)</span>}
            </li>
          ))}
          {enCours && <li className="animate-pulse">L&apos;assistant travaille…</li>}
        </ul>
      )}
      {erreur && (
        <p role="alert" className="text-sm text-destructive">
          {erreur}
        </p>
      )}

      {resultat && (
        <div className={compact ? "grid gap-3 border-t pt-4" : "grid gap-4 rounded-lg border bg-card p-5"}>
          <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs text-muted-foreground">
            <span className="font-medium uppercase tracking-wide">{compact ? "Réponse" : "Réponse de l'assistant"} · IA, à relire</span>
            {!compact && (
              <span>
                {LIBELLES_ETAT_AGENT[resultat.etat]} · {Math.round(resultat.dureeMs / 1000)} s · {formaterDollars(resultat.cout)}
              </span>
            )}
          </div>
          {resultat.reponse && <ReponseAssistant texte={resultat.reponse} origine={origine} compacte={compact} />}
          {resultat.etat !== "terminee" && (
            <p role="alert" className="text-sm text-destructive">
              Demande {LIBELLES_ETAT_AGENT[resultat.etat]}
              {resultat.erreur && ` (${resultat.erreur})`}. Ce qu&apos;il a eu le temps de faire est dans l&apos;historique.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
