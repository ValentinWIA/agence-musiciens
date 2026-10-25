import { count, eq } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { db } from "@/db";
import { propositions } from "@/db/schema";
import { listerMusiciens } from "@/lib/engagements";
import { liensDuMenu } from "@/lib/menu";
import { verifierSession } from "@/lib/session";
import { seDeconnecter } from "../actions";
import { LiensMenu } from "./liens-menu";

export async function MenuLateral() {
  const utilisateur = await verifierSession();
  // Seul l'agent a la liste dépliable des musiciens ; le musicien n'a que « Ma fiche ».
  const [musiciens, [{ aValider }]] =
    utilisateur.role === "admin"
      ? await Promise.all([
          listerMusiciens(),
          db.select({ aValider: count() }).from(propositions).where(eq(propositions.etat, "en_attente")),
        ])
      : [[], [{ aValider: 0 }]];
  return (
    <>
      <nav aria-label="Menu principal" className="flex-1 px-3 py-2">
        <LiensMenu liens={liensDuMenu(utilisateur, musiciens, aValider)} />
      </nav>
      <div className="grid gap-3 border-t border-or/35 px-5 py-4">
        <div className="grid min-w-0">
          <p className="truncate font-medium" title={utilisateur.nom}>
            {utilisateur.nom}
          </p>
          <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">
            {utilisateur.role === "admin" ? "Agent" : "Musicien"}
          </p>
        </div>
        <form action={seDeconnecter}>
          <Button type="submit" variant="outline" size="sm" className="w-full">
            Se déconnecter
          </Button>
        </form>
      </div>
    </>
  );
}

export function SqueletteMenu() {
  return (
    <div aria-hidden className="grid flex-1 content-start gap-2 px-5 py-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-5 animate-pulse rounded bg-muted" />
      ))}
    </div>
  );
}
