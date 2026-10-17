import { eq } from "drizzle-orm";
import Link from "next/link";
import { Suspense } from "react";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/db";
import { demandesRecues } from "@/db/schema";
import { jourLocal } from "@/lib/calendrier";
import { dateDemandePassee, formaterJourCourt, preRemplissage } from "@/lib/demandes";
import { listerLieux, listerMusiciens, listerProgrammateurs } from "@/lib/engagements";
import { verifierAdmin } from "@/lib/session";
import { FormulaireEngagement } from "../formulaire-engagement";
import { creerEngagement } from "./actions";

export default function PageNouvelEngagement({ searchParams }: PageProps<"/engagements/nouveau">) {
  return (
    <main className="mx-auto grid w-full max-w-3xl gap-6 p-4">
      <Link href="/engagements" className="text-sm underline">
        ← Engagements
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>Nouvel engagement</CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div className="h-96 animate-pulse rounded-md bg-muted" aria-label="Chargement" />}>
            <ContenuFormulaire searchParams={searchParams} />
          </Suspense>
        </CardContent>
      </Card>
    </main>
  );
}

async function ContenuFormulaire({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await verifierAdmin("/engagements/nouveau");
  const [lieux, programmateurs, musiciens] = await Promise.all([listerLieux(), listerProgrammateurs(), listerMusiciens()]);
  // Venu de la fiche d'un musicien (?musicien=…) : il est déjà coché, s'il fait bien partie de la liste.
  const { musicien, demande: demandeId } = await searchParams;
  const coche = musiciens.find((m) => m.id === musicien);

  // Venu d'une demande reçue (?demande=…) : date et durée reprises, programmateur s'il porte exactement ce nom.
  if (demandeId !== undefined) {
    const id = z.uuid().safeParse(demandeId);
    const [demande] = id.success ? await db.select().from(demandesRecues).where(eq(demandesRecues.id, id.data)) : [];
    if (!demande) return <p className="text-sm">Demande introuvable.</p>;
    if (demande.engagementId || demande.ecarteeLe) {
      return (
        <p className="text-sm">
          Cette demande {demande.engagementId ? "a déjà son engagement" : "a été écartée"} : rien à créer.{" "}
          <Link href={`/demandes/${demande.id}`} className="underline">
            Revenir à la demande
          </Link>
        </p>
      );
    }
    return (
      <div className="grid gap-5">
        <p role="note" className="rounded-md border px-3 py-2 text-sm text-muted-foreground">
          D&apos;après la demande de {demande.programmateur} pour le {formaterJourCourt(demande.dateConcert)} : date et durée
          reprises. Choisissez l&apos;heure, le lieu, les musiciens et le cachet.
          {dateDemandePassee(demande.dateConcert, jourLocal(new Date(), "France")) && (
            <span className="mt-1 block font-medium text-foreground">
              Cette date est passée : l&apos;engagement sera refusé tant que vous n&apos;en choisissez pas une autre.
            </span>
          )}
        </p>
        <FormulaireEngagement
          action={creerEngagement}
          lieux={lieux}
          programmateurs={programmateurs}
          musiciens={musiciens}
          valeurs={preRemplissage(demande, programmateurs)}
          demande={{ id: demande.id, lieu: demande.lieu }}
        />
      </div>
    );
  }

  return (
    <FormulaireEngagement
      action={creerEngagement}
      lieux={lieux}
      programmateurs={programmateurs}
      musiciens={musiciens}
      valeurs={coche ? { musiciens: [coche.id] } : undefined}
    />
  );
}
