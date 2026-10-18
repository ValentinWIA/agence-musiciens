import { Suspense } from "react";
import { listerFichesMusiciens } from "@/lib/engagements";
import { verifierAdmin } from "@/lib/session";
import { GrilleMusiciens } from "./grille-musiciens";

export default function PageMusiciens() {
  return (
    <main className="mx-auto grid w-full max-w-6xl content-start gap-6 p-4 pt-6 md:px-8">
      <h1 className="font-logo text-4xl leading-tight">Musiciens</h1>
      <Suspense fallback={<p className="text-muted-foreground">Chargement…</p>}>
        <ContenuMusiciens />
      </Suspense>
    </main>
  );
}

async function ContenuMusiciens() {
  await verifierAdmin("/musiciens");
  return <GrilleMusiciens musiciens={await listerFichesMusiciens()} />;
}
