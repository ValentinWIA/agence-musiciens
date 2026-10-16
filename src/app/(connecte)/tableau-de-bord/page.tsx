import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listerFichesMusiciens } from "@/lib/engagements";
import { verifierSession } from "@/lib/session";
import { GrilleMusiciens } from "../musiciens/grille-musiciens";

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
  // Le musicien n'a pas de tableau de bord : sa fiche est sa page d'accueil.
  if (utilisateur.role !== "admin") redirect(`/musiciens/${utilisateur.id}`);
  // « Nouvel engagement » n'a pas de tuile : le bouton est sur la page des engagements.
  const tuiles = [
    { href: "/engagements", titre: "Engagements", texte: "Tous les concerts, filtrés par statut, musicien ou date." },
    { href: "/musiciens", titre: "Musiciens", texte: "Les fiches des musiciens : biographie, répertoire, engagements." },
    { href: "/invitations", titre: "Inviter un musicien", texte: "Créer un lien d'accès pour un nouveau musicien." },
  ];
  return (
    <>
      {/* La déconnexion est dans le menu latéral. */}
      <div className="grid gap-1">
        <p className="text-xs tracking-[0.25em] text-muted-foreground uppercase">Agent</p>
        <h1 className="font-logo text-4xl">Bonjour {utilisateur.nom}</h1>
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
      {/* L'agent voit ses musiciens dès l'arrivée, sans passer par la page « Musiciens ». */}
      <section className="grid gap-4" aria-labelledby="titre-musiciens">
        <h2 id="titre-musiciens" className="font-logo text-3xl">
          Musiciens
        </h2>
        <GrilleMusiciens musiciens={await listerFichesMusiciens()} />
      </section>
    </>
  );
}
