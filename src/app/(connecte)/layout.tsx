import Link from "next/link";
import { Suspense } from "react";
import { Logo } from "@/components/logo";
import { MenuLateral, SqueletteMenu } from "./menu-lateral";

// Pages après connexion : le menu à gauche. Chaque page revérifie quand même la session et les droits.
export default function LayoutConnecte({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1">
      <aside className="sticky top-0 hidden h-svh w-60 shrink-0 flex-col border-r border-foreground/10 bg-card/60 md:flex">
        <Link href="/tableau-de-bord" aria-label="AM Management, accueil" className="px-5 py-4">
          <Logo />
        </Link>
        {/* Squelette à la même largeur pendant la lecture de la session : la page ne saute pas. */}
        <Suspense fallback={<SqueletteMenu />}>
          <MenuLateral />
        </Suspense>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Sur téléphone, en attendant le menu repliable (T4) : le logo seul. */}
        <header className="border-b border-foreground/10 bg-card/60 px-4 py-3 md:hidden">
          <Link href="/tableau-de-bord" aria-label="AM Management, accueil">
            <Logo />
          </Link>
        </header>
        {children}
      </div>
    </div>
  );
}
