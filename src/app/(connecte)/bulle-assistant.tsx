"use client";

import { MessageCircle, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { FormulaireAssistant } from "@/components/formulaire-assistant";
import { Embleme } from "@/components/logo";

// L'assistant sur chaque page (variante E, docs/semaine-4.md section 11) : bulle or en bas à droite ; panneau de
// 400 px sur ordinateur, volet qui monte du bas sur téléphone. Le formulaire reste monté quand le panneau est fermé :
// une demande en cours continue et la réponse reste affichée d'une page à l'autre (le cadre ne se recharge pas).
export function BulleAssistant({ origine }: { origine: string }) {
  const chemin = usePathname();
  const [ouvert, setOuvert] = useState(false);
  const panneau = useRef<HTMLDivElement>(null);
  const ordinateur = () => window.matchMedia("(min-width: 768px)").matches; // md:, comme le menu

  useEffect(() => {
    if (!ouvert) return;
    if (ordinateur()) panneau.current?.querySelector("textarea")?.focus(); // sur téléphone, pas de clavier d'office
    const echap = (e: KeyboardEvent) => e.key === "Escape" && setOuvert(false);
    document.addEventListener("keydown", echap);
    return () => document.removeEventListener("keydown", echap);
  }, [ouvert]);

  if (chemin.startsWith("/assistant")) return null; // la page elle-même a le formulaire

  return (
    <>
      {!ouvert && (
        <button
          type="button"
          aria-label="Ouvrir l'assistant"
          onClick={() => setOuvert(true)}
          className="fixed right-4 bottom-4 z-40 grid size-12 place-items-center rounded-full bg-or text-[oklch(0.17_0.005_260)] shadow-lg ring-1 ring-black/5 transition hover:brightness-105 md:right-5 md:bottom-5 md:size-14"
        >
          <MessageCircle className="size-6" />
        </button>
      )}
      {/* Voile du téléphone : la page reste visible au-dessus du volet ; le toucher ferme. */}
      {ouvert && <div aria-hidden onClick={() => setOuvert(false)} className="fixed inset-0 z-40 bg-black/35 md:hidden" />}
      <div
        ref={panneau}
        role="dialog"
        aria-label="Assistant"
        hidden={!ouvert}
        // Sur téléphone, suivre un lien ferme le volet pour montrer la page ; sur ordinateur, le panneau reste.
        onClick={(e) => (e.target as HTMLElement).closest("a") && !ordinateur() && setOuvert(false)}
        className="volet-assistant fixed inset-x-0 bottom-0 z-50 flex max-h-[85dvh] flex-col overflow-hidden rounded-t-2xl bg-card text-card-foreground shadow-2xl md:inset-x-auto md:right-5 md:bottom-5 md:max-h-[calc(100dvh-2.5rem)] md:w-[400px] md:rounded-xl"
      >
        <div className="dark flex shrink-0 items-center justify-between border-b border-or/35 bg-background px-4 py-2.5 text-foreground">
          <span className="flex items-center gap-2">
            {/* 34 px et 2 px plus bas : C|M de la hauteur du « A » d'« Assistant », sur la même ligne (mesuré le 26/10). */}
            <Embleme className="size-[34px] translate-y-0.5" />
            <span className="font-logo text-lg">Assistant</span>
          </span>
          <button type="button" aria-label="Fermer l'assistant" onClick={() => setOuvert(false)} className="rounded-md p-1.5 opacity-80 hover:opacity-100">
            <X className="size-5" />
          </button>
        </div>
        <div className="grid gap-3 overflow-y-auto overscroll-contain p-4">
          <FormulaireAssistant origine={origine} compact />
          <Link href="/assistant" className="w-fit text-xs text-muted-foreground underline decoration-or underline-offset-4">
            Détail dans l&apos;historique →
          </Link>
        </div>
      </div>
    </>
  );
}
