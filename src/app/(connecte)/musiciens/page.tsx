import { Suspense } from "react";
import { listerFichesMusiciens } from "@/lib/engagements";
import { verifierAdmin } from "@/lib/session";
import { GrilleMusiciens } from "./grille-musiciens";
import { PAGE_LARGE } from "@/components/mise-en-page";

export default function PageMusiciens() {
  return (
    <main className={`${PAGE_LARGE} grid content-start gap-6 pt-6 pb-4`}>
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
