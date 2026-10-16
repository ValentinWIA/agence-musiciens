import Link from "next/link";
import { Suspense } from "react";
import { listerFichesMusiciens } from "@/lib/engagements";
import { verifierAdmin } from "@/lib/session";
import { Portrait } from "./portrait";

export default function PageMusiciens() {
  return (
    <main className="mx-auto grid w-full max-w-6xl content-start gap-8 p-4 pt-10">
      <div className="grid gap-1">
        <p className="text-xs tracking-[0.25em] text-muted-foreground uppercase">Agent</p>
        <h1 className="font-logo text-4xl">Musiciens</h1>
        <Link href="/tableau-de-bord" className="text-sm underline">
          ← Tableau de bord
        </Link>
      </div>
      <Suspense fallback={<p className="text-muted-foreground">Chargement…</p>}>
        <GrilleMusiciens />
      </Suspense>
    </main>
  );
}

async function GrilleMusiciens() {
  await verifierAdmin("/musiciens");
  const musiciens = await listerFichesMusiciens();
  if (musiciens.length === 0) {
    return (
      <p className="text-muted-foreground">
        Aucun musicien.{" "}
        <Link href="/invitations" className="underline">
          Invitez-en un.
        </Link>
      </p>
    );
  }
  return (
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-6">
      {musiciens.map((m) => (
        <li key={m.id}>
          <Link
            href={`/musiciens/${m.id}`}
            className="group block overflow-hidden rounded-xl border bg-card transition-[transform,box-shadow] hover:-translate-y-1 hover:shadow-lg focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <Portrait nom={m.nom} />
            <div className="grid gap-0.5 px-4 pt-3 pb-4">
              <h2 className="font-logo text-2xl leading-tight">{m.nom}</h2>
              <p className="text-sm text-muted-foreground">
                <span className="capitalize">{m.instrument}</span> · {m.aVenir} à venir
              </p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
