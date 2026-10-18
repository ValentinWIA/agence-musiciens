import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { listerFichesMusiciens } from "@/lib/engagements";
import { verifierSession } from "@/lib/session";
import { CalendrierMois } from "../calendrier/calendrier-mois";
import { Portrait } from "../musiciens/portrait";
import { AFaire } from "./a-faire";
import { Indicateurs } from "./indicateurs";

export default function PageTableauDeBord({ searchParams }: PageProps<"/tableau-de-bord">) {
  return (
    <main className="mx-auto grid w-full max-w-7xl content-start gap-6 p-4 pt-6 md:px-8">
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
  const aujourdhui = new Intl.DateTimeFormat("fr-FR", { dateStyle: "full", timeZone: "Europe/Paris" }).format(new Date());
  // Plus dense (retour de l'humain le 18/10) : à faire et saison côte à côte, puis calendrier et musiciens.
  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-or/60 pb-3">
        <h1 className="font-logo text-4xl leading-tight">Bonjour {utilisateur.nom}</h1>
        <p className="text-sm text-muted-foreground first-letter:uppercase">{aujourdhui}</p>
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-[1fr_17rem]">
        <AFaire />
        <Indicateurs />
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-[1fr_17rem]">
        <Card>
          <CardContent>
            <CalendrierMois lecteur={utilisateur} param={mois} adresse="/tableau-de-bord" titre="h2" />
          </CardContent>
        </Card>
        <Musiciens />
      </div>
    </>
  );
}

// Liste compacte : les grands portraits restent sur /musiciens.
async function Musiciens() {
  const musiciens = await listerFichesMusiciens();
  return (
    <Card>
      <CardContent className="grid gap-3">
        <h2 className="font-logo text-2xl">
          <Link href="/musiciens" className="hover:underline">
            Musiciens
          </Link>
        </h2>
        {musiciens.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucun musicien.{" "}
            <Link href="/invitations" className="underline">
              Invitez-en un.
            </Link>
          </p>
        ) : (
          <ul className="grid gap-1">
            {musiciens.map((m) => (
              <li key={m.id}>
                <Link href={`/musiciens/${m.id}`} className="flex items-center gap-3 rounded-md p-1 hover:bg-muted">
                  <Portrait nom={m.nom} photo={m.photo} className="w-10 shrink-0 overflow-hidden rounded-sm [&_span]:text-base" />
                  <span className="grid leading-tight">
                    <span className="font-medium">{m.nom}</span>
                    <span className="text-xs text-muted-foreground">
                      <span className="capitalize">{m.instrument}</span> · {m.aVenir} à venir
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
