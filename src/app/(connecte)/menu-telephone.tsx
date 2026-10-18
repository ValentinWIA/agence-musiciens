"use client";

import { Menu, X } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";

// Menu repliable du téléphone. <dialog> ouvert par showModal() gère déjà Échap, le voile,
// le clavier (qui reste dans le menu) et le retour du clavier sur ☰ à la fermeture.
export function MenuTelephone({ children }: { children: React.ReactNode }) {
  const dialogue = useRef<HTMLDialogElement>(null);
  const [ouvert, setOuvert] = useState(false);

  function fermerSiBesoin(evenement: React.MouseEvent<HTMLDialogElement>) {
    const cible = evenement.target as HTMLElement;
    // Clic sur le voile (hors du contenu) ou sur un lien : on ferme.
    if (cible === dialogue.current || cible.closest("a")) dialogue.current?.close();
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Ouvrir le menu"
        aria-expanded={ouvert}
        aria-controls="menu-telephone"
        onClick={() => {
          dialogue.current?.showModal();
          setOuvert(true);
        }}
      >
        <Menu />
      </Button>
      <dialog
        id="menu-telephone"
        ref={dialogue}
        aria-label="Menu"
        onClick={fermerSiBesoin}
        onClose={() => setOuvert(false)}
        // h-dvh et non h-svh : la hauteur suit la barre d'adresse repliée (vide en bas sur iPhone, 19/10).
        className="menu-telephone dark m-0 h-dvh max-h-none w-72 max-w-[85vw] bg-background p-0 text-foreground shadow-xl"
      >
        <div className="flex h-full flex-col">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Fermer le menu"
            className="absolute top-3 right-3"
            onClick={() => dialogue.current?.close()}
          >
            <X />
          </Button>
          {children}
        </div>
      </dialog>
    </>
  );
}
