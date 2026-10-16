import Link from "next/link";
import { Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listerLieux, listerMusiciens, listerProgrammateurs } from "@/lib/engagements";
import { verifierAdmin } from "@/lib/session";
import { FormulaireEngagement, VIDE } from "../formulaire-engagement";
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
  const { musicien } = await searchParams;
  const coche = musiciens.find((m) => m.id === musicien);
  return (
    <FormulaireEngagement
      action={creerEngagement}
      lieux={lieux}
      programmateurs={programmateurs}
      musiciens={musiciens}
      valeurs={coche ? { ...VIDE, musiciens: [coche.id] } : VIDE}
    />
  );
}
