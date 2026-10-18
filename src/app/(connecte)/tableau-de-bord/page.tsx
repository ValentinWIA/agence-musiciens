import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { listerFichesMusiciens } from "@/lib/engagements";
import { initiales } from "@/lib/musiciens";
import { verifierSession } from "@/lib/session";
import { CalendrierMois } from "../calendrier/calendrier-mois";
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
  // Plus dense (retours de l'humain le 18/10) : à gauche « À faire » et le calendrier, à droite saison et musiciens.
  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-or/60 pb-3">
        <h1 className="font-logo text-4xl leading-tight">Bonjour {utilisateur.nom}</h1>
        <p className="text-sm text-muted-foreground first-letter:uppercase">{aujourdhui}</p>
      </div>
      {/* Deux colonnes qui s'empilent chacune (retour du 18/10) : pas de trou sous la carte la plus courte. */}
      <div className="grid items-start gap-6 lg:grid-cols-[1fr_17rem]">
        <div className="grid min-w-0 gap-6">
          <AFaire />
          <Card>
            <CardContent>
              <CalendrierMois lecteur={utilisateur} param={mois} adresse="/tableau-de-bord" titre="h2" />
            </CardContent>
          </Card>
        </div>
        <div className="grid gap-6">
          <Indicateurs />
          <Musiciens />
        </div>
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
          <ul className="grid gap-2">
            {musiciens.map((m) => (
              <li key={m.id}>
                <Link href={`/musiciens/${m.id}`} className="flex items-center gap-3 rounded-md p-1 hover:bg-muted">
                  <Vignette nom={m.nom} photo={m.photo} />
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

// Petite photo décorative : le nom est écrit à côté, donc texte de remplacement vide. Une photo qui ne se charge pas
// laisse une case neutre au lieu d'un « Portrait de … » coupé (retour du 18/10).
function Vignette({ nom, photo }: { nom: string; photo: string | null }) {
  if (photo) {
    // <img> plutôt que next/image : la photo est servie par une route protégée (voir Portrait).
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={photo} alt="" className="aspect-[4/5] w-14 shrink-0 rounded-sm bg-accent object-cover" />;
  }
  return (
    <span aria-hidden className="grid aspect-[4/5] w-14 shrink-0 place-items-center rounded-sm bg-accent font-logo text-lg text-primary">
      {initiales(nom)}
    </span>
  );
}
