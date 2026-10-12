import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { verifierSession } from "@/lib/session";
import { seDeconnecter } from "../actions";

export default function PageTableauDeBord() {
  return (
    <main className="mx-auto grid w-full max-w-6xl content-start gap-8 p-4 pt-10">
      <Suspense fallback={<p className="text-muted-foreground">Chargement…</p>}>
        <ContenuTableauDeBord />
      </Suspense>
    </main>
  );
}

async function ContenuTableauDeBord() {
  const utilisateur = await verifierSession(); // sans session : renvoi vers la connexion
  const agent = utilisateur.role === "admin";
  const tuiles = [
    {
      href: "/engagements",
      titre: agent ? "Engagements" : "Mes engagements",
      texte: agent ? "Tous les concerts, filtrés par statut, musicien ou date." : "Les concerts auxquels vous participez.",
    },
    ...(agent
      ? [
          { href: "/engagements/nouveau", titre: "Nouvel engagement", texte: "Saisir une demande de concert." },
          { href: "/invitations", titre: "Inviter un musicien", texte: "Créer un lien d'accès pour un nouveau musicien." },
        ]
      : []),
  ];
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="grid gap-1">
          <p className="text-xs tracking-[0.25em] text-muted-foreground uppercase">{agent ? "Agent" : "Musicien"}</p>
          <h1 className="font-logo text-4xl">Bonjour {utilisateur.nom}</h1>
        </div>
        <form action={seDeconnecter}>
          <Button type="submit" variant="outline">
            Se déconnecter
          </Button>
        </form>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tuiles.map((t) => (
          <Link key={t.href} href={t.href} className="group">
            <Card className="h-full transition-shadow group-hover:shadow-md group-focus-visible:ring-3 group-focus-visible:ring-ring/50">
              <CardHeader>
                <CardTitle className="flex items-center justify-between font-logo text-2xl">
                  {t.titre}
                  <span aria-hidden className="text-muted-foreground transition-transform group-hover:translate-x-1">
                    →
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">{t.texte}</CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
