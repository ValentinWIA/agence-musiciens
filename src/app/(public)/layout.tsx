import Link from "next/link";
import { Logo } from "@/components/logo";

// Pages sans session (connexion, invitation…) : pas de menu, le logo seul en haut.
export default function LayoutPublic({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="border-b border-foreground/10 bg-card/60 backdrop-blur-sm">
        <div className="mx-auto w-full max-w-6xl px-4 py-3">
          <Link href="/tableau-de-bord" aria-label="AM Management, tableau de bord">
            <Logo />
          </Link>
        </div>
      </header>
      {children}
    </>
  );
}
