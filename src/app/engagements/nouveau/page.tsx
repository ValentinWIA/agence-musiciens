import Link from "next/link";
import { Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listerLieux, listerMusiciens, listerProgrammateurs } from "@/lib/engagements";
import { verifierAdmin } from "@/lib/session";
import { FormulaireEngagement } from "./formulaire";

export default function PageNouvelEngagement() {
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
            <ContenuFormulaire />
          </Suspense>
        </CardContent>
      </Card>
    </main>
  );
}

async function ContenuFormulaire() {
  await verifierAdmin("/engagements/nouveau");
  const [lieux, programmateurs, musiciens] = await Promise.all([listerLieux(), listerProgrammateurs(), listerMusiciens()]);
  return <FormulaireEngagement lieux={lieux} programmateurs={programmateurs} musiciens={musiciens} />;
}
