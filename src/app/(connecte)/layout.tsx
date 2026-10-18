import Link from "next/link";
import { Suspense } from "react";
import { Logo } from "@/components/logo";
import { MenuLateral, SqueletteMenu } from "./menu-lateral";
import { MenuTelephone } from "./menu-telephone";

// Pages après connexion : le menu à gauche. Chaque page revérifie quand même la session et les droits.
export default function LayoutConnecte({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1">
      <aside className="dark sticky top-0 hidden h-svh w-60 shrink-0 flex-col bg-background text-foreground md:flex">
        {/* « dark » : le cadre noir de la palette (globals.css), pas un mode sombre. */}
        <Link href="/tableau-de-bord" aria-label="CM Management, accueil" className="mx-3 mb-2 border-b border-or/35 px-2 py-5">
          <Logo />
        </Link>
        {/* Squelette à la même largeur pendant la lecture de la session : la page ne saute pas. */}
        <Suspense fallback={<SqueletteMenu />}>
          <MenuLateral />
        </Suspense>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Sur téléphone : ☰ et le logo ; ☰ ouvre le même menu par-dessus la page. */}
        <header className="dark sticky top-0 z-10 flex items-center gap-2 border-b border-or/35 bg-background px-2 py-2 text-foreground md:hidden">
          <MenuTelephone>
            <Link href="/tableau-de-bord" aria-label="CM Management, accueil" className="mx-3 mb-2 border-b border-or/35 px-2 py-5">
              <Logo />
            </Link>
            <Suspense fallback={<SqueletteMenu />}>
              <MenuLateral />
            </Suspense>
          </MenuTelephone>
          <Link href="/tableau-de-bord" aria-label="CM Management, accueil">
            <Logo />
          </Link>
        </header>
        {children}
      </div>
    </div>
  );
}
