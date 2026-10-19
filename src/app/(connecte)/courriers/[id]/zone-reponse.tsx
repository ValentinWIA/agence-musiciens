"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type Message = { texte?: string; fin?: boolean; erreur?: string };

// La réponse : écrite à la main ou proposée par l'IA (en streaming), toujours modifiable, jamais enregistrée.
export function ZoneReponse({ courrierId }: { courrierId: string }) {
  const [reponse, setReponse] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [parIa, setParIa] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [copie, setCopie] = useState(false);

  async function proposer() {
    setEnCours(true);
    setReponse("");
    setParIa(true);
    setErreur(null);
    setCopie(false);
    try {
      const res = await fetch(`/api/courriers/${courrierId}/brouillon`, { method: "POST" });
      if (!res.ok || !res.body) {
        const corps = await res.json().catch(() => null);
        setErreur(corps?.erreur ?? "Le brouillon n'a pas pu être demandé.");
        return;
      }
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
          if (m.texte) setReponse((r) => r + m.texte);
          if (m.erreur) setErreur(m.erreur);
        }
      }
    } catch {
      setErreur("La connexion a été coupée pendant la rédaction.");
    } finally {
      setEnCours(false);
    }
  }

  async function copier() {
    await navigator.clipboard.writeText(reponse);
    setCopie(true);
  }

  return (
    <div className="grid gap-3">
      <textarea
        aria-label="Réponse"
        value={reponse}
        onChange={(e) => {
          setReponse(e.target.value);
          setCopie(false);
        }}
        readOnly={enCours}
        placeholder="Rédigez votre réponse ici, ou demandez un brouillon à l'IA, puis copiez-la dans votre messagerie (elle n'est pas enregistrée)."
        className="min-h-48 w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      />
      {parIa && !erreur && (
        <p className="text-xs text-muted-foreground">
          {enCours ? "Rédaction du brouillon…" : "Brouillon rédigé par l'IA, à relire : il ne doit rien promettre que l'agence n'a pas décidé."}
        </p>
      )}
      {erreur && <p className="text-sm text-destructive">{erreur}</p>}
      <div className="flex flex-wrap gap-3">
        <Button type="button" variant="outline" onClick={proposer} disabled={enCours}>
          {enCours ? "Rédaction…" : reponse ? "Proposer un autre brouillon" : "Proposer un brouillon (IA)"}
        </Button>
        <Button type="button" onClick={copier} disabled={enCours || !reponse}>
          {copie ? "Copié" : "Copier"}
        </Button>
        {/* Bouton fictif (décidé le 19/10) : l'envoi par courriel n'est pas branché. */}
        <Button type="button" disabled title="En développement">
          Envoyer au destinataire
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">Envoi au destinataire : en développement.</p>
    </div>
  );
}
