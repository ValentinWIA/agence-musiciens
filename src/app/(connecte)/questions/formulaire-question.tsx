"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { TAILLE_QUESTION, type Source } from "@/lib/questions";

type Message = { etape?: string; texte?: string; sources?: Source[]; erreur?: string };

export function FormulaireQuestion() {
  const [question, setQuestion] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [etape, setEtape] = useState<string | null>(null);
  const [reponse, setReponse] = useState("");
  const [sources, setSources] = useState<Source[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  async function poser(e: React.FormEvent) {
    e.preventDefault();
    setEnCours(true);
    setEtape("Envoi de la question…");
    setReponse("");
    setSources(null);
    setErreur(null);
    try {
      const res = await fetch("/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      if (!res.ok || !res.body) {
        const corps = await res.json().catch(() => null);
        setErreur(corps?.erreur ?? "La question n'a pas pu être envoyée.");
        return;
      }
      // Une ligne JSON par message : on lit au fil de l'eau et on affiche chaque morceau dès qu'il arrive.
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
          if (m.etape) setEtape(m.etape);
          if (m.texte) setReponse((r) => r + m.texte);
          if (m.sources) setSources(m.sources);
          if (m.erreur) setErreur(m.erreur);
        }
      }
    } catch {
      setErreur("La connexion a été coupée pendant la réponse.");
    } finally {
      setEnCours(false);
      setEtape(null);
    }
  }

  return (
    <div className="grid gap-4">
      <form onSubmit={poser} className="grid gap-3">
        <Label htmlFor="question">Votre question</Label>
        <textarea
          id="question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          maxLength={TAILLE_QUESTION}
          rows={3}
          required
          placeholder="Par exemple : à partir de quel montant faut-il une double validation ?"
          className="rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        />
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={enCours || question.trim().length < 3} className="w-fit">
            {enCours ? "Réponse en cours…" : "Poser la question"}
          </Button>
          <span className="text-xs text-muted-foreground">
            {question.length} / {TAILLE_QUESTION}
          </span>
        </div>
      </form>

      {etape && (
        <p role="status" className="animate-pulse text-sm text-muted-foreground">
          {etape}
        </p>
      )}
      {erreur && (
        <p role="alert" className="text-sm text-destructive">
          {erreur}
        </p>
      )}

      {reponse && (
        <div className="grid gap-3 rounded-md border p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Réponse (IA, à relire)</p>
          <p className="whitespace-pre-line text-sm">{reponse}</p>
          {sources && sources.length === 0 && (
            <p className="text-sm text-orange-700 dark:text-orange-400">
              Aucune source citée : cette réponse ne s&apos;appuie sur aucun passage des documents, ne vous y fiez pas.
            </p>
          )}
          {sources && sources.length > 0 && (
            <div className="grid gap-2">
              <p className="text-sm font-medium">Sources citées — vérifiez-les avant de vous y fier :</p>
              {sources.map((s) => (
                <details key={`${s.documentId}#${s.page}`} className="rounded-md bg-muted/50 px-3 py-2 text-sm">
                  <summary className="cursor-pointer">
                    {s.titre} — {s.documentId}, page {s.page}
                  </summary>
                  <div className="mt-2 grid gap-2">
                    {s.extraits.map((x) => (
                      <blockquote key={x} className="border-l-2 border-primary pl-3 italic">
                        {x}
                      </blockquote>
                    ))}
                    <p className="whitespace-pre-line text-xs text-muted-foreground">{s.texte}</p>
                  </div>
                </details>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
