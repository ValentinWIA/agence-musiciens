import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { lireSession } from "@/lib/session";
import { FormulaireConnexion } from "./formulaire-connexion";

// Adresse fictive (.test) : rien n'y part, comme pour le jeu de données.
const CONTACT = "assistance@cm-management.test";

export default function PageConnexion() {
  return (
    <main className="flex flex-1 items-center justify-center p-4 md:p-8">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-lg border shadow-sm md:grid-cols-[5fr_6fr]">
        {/* « dark » : le cadre noir de la palette (globals.css), pas un mode sombre. */}
        <section className="dark grid content-center gap-4 bg-background p-8 text-foreground md:p-10">
          <p className="text-xs tracking-[0.28em] text-or uppercase">Espace de connexion</p>
          <h1 className="font-logo text-4xl leading-tight md:text-5xl">
            Bienvenue dans l&apos;espace de CM Management
          </h1>
          <p className="hidden text-muted-foreground md:block">
            L&apos;agence et ses musiciens y retrouvent leurs concerts, leurs contrats et leurs cachets, au même
            endroit.
          </p>
        </section>
        <section className="grid content-center gap-6 bg-card p-8 md:p-10">
          <div className="grid gap-1">
            <h2 className="font-logo text-3xl">Connexion à votre espace</h2>
            <p className="text-sm text-muted-foreground">Saisissez l&apos;e-mail et le mot de passe de votre compte.</p>
          </div>
          <Suspense fallback={<p>Chargement…</p>}>
            <ContenuConnexion />
          </Suspense>
          <p className="border-t pt-4 text-sm text-muted-foreground">
            Un problème pour vous connecter ? Écrivez à{" "}
            <span className="font-medium text-foreground">{CONTACT}</span>.
          </p>
        </section>
      </div>
    </main>
  );
}

async function ContenuConnexion() {
  // Déjà connecté : inutile de revoir le formulaire.
  if (await lireSession()) redirect("/tableau-de-bord");
  return (
    <div className="grid gap-4">
      <FormulaireConnexion />
      <Link href="/mot-de-passe-oublie" className="text-sm underline">
        Mot de passe oublié ?
      </Link>
    </div>
  );
}
