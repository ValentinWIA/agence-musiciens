import Link from "next/link";
import { Portrait } from "./portrait";

// Grille des portraits de /musiciens (agent seulement), terminée par la tuile « + Inviter un musicien ».
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
      {/* Demandé le 18/10 : inviter depuis la grille, une tuile vide avec un « + », plutôt qu'un bouton à part. */}
      <li>
        <Link
          href="/invitations"
          className="grid h-full min-h-64 place-items-center content-center gap-2 rounded-xl border-2 border-dashed text-muted-foreground transition-colors hover:border-or hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <span aria-hidden className="font-logo text-6xl leading-none">
            +
          </span>
          <span className="font-medium">Inviter un musicien</span>
        </Link>
      </li>
    </ul>
  );
}
