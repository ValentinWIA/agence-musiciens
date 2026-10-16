import Link from "next/link";
import { Portrait } from "./portrait";

// Grille des portraits, partagée par /musiciens et le tableau de bord de l'agent.
export function GrilleMusiciens({
  musiciens,
}: {
  musiciens: { id: string; nom: string; instrument: string | null; photo: string | null; aVenir: number }[];
}) {
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
            <Portrait nom={m.nom} photo={m.photo} />
            <div className="grid gap-0.5 px-4 pt-3 pb-4">
              <h3 className="font-logo text-2xl leading-tight">{m.nom}</h3>
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
