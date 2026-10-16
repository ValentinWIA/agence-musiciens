import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { lireMusicien } from "@/lib/engagements";
import { verifierSession } from "@/lib/session";
import { FormulaireFiche } from "./formulaire-fiche";
import { FormulairePhoto } from "./formulaire-photo";

export default function PageModifierFiche({ params }: PageProps<"/musiciens/[id]/modifier">) {
  return (
    <main className="mx-auto grid w-full max-w-3xl gap-6 p-4">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-md bg-muted" aria-label="Chargement" />}>
        <ContenuFormulaire params={params} />
      </Suspense>
    </main>
  );
}

async function ContenuFormulaire({ params }: { params: Promise<{ id: string }> }) {
  const utilisateur = await verifierSession();
  // Même contrôle que la fiche : un musicien n'ouvre que la sienne, sinon « introuvable » et une ligne au journal.
  const musicien = await lireMusicien(utilisateur, (await params).id);
  if (!musicien) notFound();

  return (
    <>
      <Link href={`/musiciens/${musicien.id}`} className="text-sm underline">
        ← Retour à la fiche
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>Modifier la fiche de {musicien.nom}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-8">
          <FormulairePhoto id={musicien.id} nom={musicien.nom} photo={musicien.photo} />
          <FormulaireFiche
            id={musicien.id}
            agent={utilisateur.role === "admin"}
            valeurs={{
              biographie: musicien.biographie ?? "",
              repertoire: musicien.repertoire ?? "",
              notesAgent: musicien.notesAgent ?? "",
            }}
          />
        </CardContent>
      </Card>
    </>
  );
}
