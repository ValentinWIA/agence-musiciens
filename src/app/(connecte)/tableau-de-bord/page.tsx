import { redirect } from "next/navigation";
import { Suspense } from "react";
import { listerFichesMusiciens } from "@/lib/engagements";
import { verifierSession } from "@/lib/session";
import { CalendrierMois } from "../calendrier/calendrier-mois";
import { GrilleMusiciens } from "../musiciens/grille-musiciens";
import { Indicateurs } from "./indicateurs";

export default function PageTableauDeBord({ searchParams }: PageProps<"/tableau-de-bord">) {
  return (
    <main className="mx-auto grid w-full max-w-6xl content-start gap-8 p-4 pt-10">
      <Suspense fallback={<p className="text-muted-foreground">Chargement…</p>}>
        <ContenuTableauDeBord searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function ContenuTableauDeBord({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const utilisateur = await verifierSession(); // sans session : renvoi vers la connexion
  // Le musicien n'a pas de tableau de bord : sa fiche est sa page d'accueil.
  if (utilisateur.role !== "admin") redirect(`/musiciens/${utilisateur.id}`);
  const { mois } = await searchParams;
  // Pas de tuiles de navigation : les pages sont dans le menu latéral.
  return (
    <>
      <div className="grid gap-1">
        <p className="text-xs tracking-[0.25em] text-muted-foreground uppercase">Agent</p>
        <h1 className="font-logo text-4xl">Bonjour {utilisateur.nom}</h1>
      </div>
      <Indicateurs />
      <CalendrierMois lecteur={utilisateur} param={mois} adresse="/tableau-de-bord" titre="h2" />
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
