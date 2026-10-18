import Link from "next/link";
import { Logo } from "@/components/logo";

// Pages sans session (connexion, invitation…) : pas de menu, le logo seul en haut.
export default function LayoutPublic({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* « dark » : le cadre noir de la palette (globals.css), pas un mode sombre. */}
      <header className="dark border-b border-or/35 bg-background text-foreground">
        <div className="mx-auto w-full max-w-6xl px-4 py-3">
          <Link href="/tableau-de-bord" aria-label="CM Management, tableau de bord">
            <Logo />
          </Link>
        </div>
      </header>
      {children}
    </>
  );
}
