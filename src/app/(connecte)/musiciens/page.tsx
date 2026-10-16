import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { listerFichesMusiciens } from "@/lib/engagements";
import { verifierAdmin } from "@/lib/session";
import { GrilleMusiciens } from "./grille-musiciens";

export default function PageMusiciens() {
  return (
    <main className="mx-auto grid w-full max-w-6xl content-start gap-8 p-4 pt-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="grid gap-1">
          <p className="text-xs tracking-[0.25em] text-muted-foreground uppercase">Agent</p>
          <h1 className="font-logo text-4xl">Musiciens</h1>
          <Link href="/tableau-de-bord" className="text-sm underline">
            ← Tableau de bord
          </Link>
        </div>
        <Button nativeButton={false} render={<Link href="/invitations" />}>
          Inviter un musicien
        </Button>
      </div>
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
