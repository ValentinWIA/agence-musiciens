"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { TexteAvecLiens } from "@/components/texte-avec-liens";
import { DEMANDE_MAX, LIBELLES_ETAT_AGENT, type EtatAgent } from "@/lib/agent-regles";
import { formaterDollars } from "@/lib/couts-ia";
import { relireCompteurs } from "../compteur";

type Resultat = { etat: EtatAgent; reponse: string | null; erreur: string | null; tours: number; cout: number; dureeMs: number };
type Message = { etape?: { outil: string; refus: boolean }; resultat?: Resultat; erreur?: string };

const EXEMPLES = ["Quelles options faut-il relancer cette semaine ?", "Quels cachets sont impayés ?", "Inès est-elle libre le 8 mai 2027 ?"];

export function FormulaireAssistant({ origine }: { origine: string }) {
  const router = useRouter();
  const [demande, setDemande] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [etapes, setEtapes] = useState<{ outil: string; refus: boolean }[]>([]);
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
        body: JSON.stringify({ demande }),
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
        <Label htmlFor="demande">Votre demande</Label>
        <textarea
          id="demande"
          value={demande}
          onChange={(e) => setDemande(e.target.value)}
          maxLength={DEMANDE_MAX}
          rows={3}
          required
          placeholder="Par exemple : quelles options faut-il relancer cette semaine ?"
          className="rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        />
        <p className="text-xs text-muted-foreground">
          Exemples :{" "}
          {EXEMPLES.map((x, i) => (
            <span key={x}>
              {i > 0 && " · "}
              <button type="button" className="underline" onClick={() => setDemande(x)} disabled={enCours}>
                {x}
              </button>
            </span>
          ))}
        </p>
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={enCours || demande.trim().length === 0} className="w-fit">
            {enCours ? "L'assistant travaille…" : "Envoyer"}
          </Button>
          <span className="text-xs text-muted-foreground">
            {demande.length} / {DEMANDE_MAX}
          </span>
        </div>
      </form>

      {(enCours || etapes.length > 0) && (
        <ul role="status" className="grid gap-1 text-sm text-muted-foreground">
          {etapes.map((e, i) => (
            <li key={i} className={e.refus ? "text-destructive" : undefined}>
              {e.refus ? "✗" : "✓"} {e.outil}
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
        <div className="grid gap-3 rounded-md border p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Réponse (IA, à relire)</p>
          {resultat.reponse && (
            <p className="whitespace-pre-line text-sm">
              <TexteAvecLiens texte={resultat.reponse} origine={origine} />
            </p>
          )}
          {resultat.etat !== "terminee" && (
            <p role="alert" className="text-sm text-destructive">
              Demande {LIBELLES_ETAT_AGENT[resultat.etat]}
              {resultat.erreur && ` (${resultat.erreur})`}. Ce qu&apos;il a eu le temps de faire est dans le journal.
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            {LIBELLES_ETAT_AGENT[resultat.etat]} · {resultat.tours} tour{resultat.tours > 1 ? "s" : ""} ·{" "}
            {formaterDollars(resultat.cout)} · {Math.round(resultat.dureeMs / 1000)} s
          </p>
        </div>
      )}
    </div>
  );
}
