import { eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/db";
import { courriers } from "@/db/schema";
import { formaterMontant } from "@/lib/argent";
import { LIBELLES_MODELE, type Modele } from "@/lib/couts-ia";
import { LIBELLES_CLASSEMENT, type Classement } from "@/lib/courrier";
import { verifierAdmin } from "@/lib/session";

export default function PageCourrier({ params }: PageProps<"/courriers/[id]">) {
  return (
    <main className="mx-auto grid w-full max-w-3xl gap-6 p-4">
      <Suspense fallback={<div className="h-64 animate-pulse rounded-md bg-muted" aria-label="Chargement" />}>
        <FicheCourrier params={params} />
      </Suspense>
    </main>
  );
}

async function FicheCourrier({ params }: { params: Promise<{ id: string }> }) {
  await verifierAdmin("/courriers"); // un musicien ne voit jamais un courrier
  const id = z.uuid().safeParse((await params).id);
  if (!id.success) notFound();
  const [courrier] = await db.select().from(courriers).where(eq(courriers.id, id.data));
  if (!courrier) notFound();

  const lignes: [string, string][] = [
    ["Daté du", courrier.dateCourrier ? new Date(`${courrier.dateCourrier}T12:00:00Z`).toLocaleDateString("fr-FR") : "—"],
    ["Signataire", courrier.signataire ?? "—"],
    ["Référence", courrier.reference ?? "—"],
    ["Montant", courrier.montant === null ? "—" : formaterMontant(courrier.montant, "EUR")],
    ["Type de dossier", courrier.typeDossier ?? "—"],
    ["Classement", LIBELLES_CLASSEMENT[courrier.classement as Classement] ?? courrier.classement],
    ["Résumé", courrier.resume ?? "—"],
    ["Lu par", LIBELLES_MODELE[courrier.modele as Modele] ?? courrier.modele],
  ];

  return (
    <>
      <Link href="/courriers" className="text-sm underline">
        ← Courriers
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>Courrier de {courrier.structure ?? "expéditeur inconnu"}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            {lignes.map(([titre, valeur]) => (
              <div key={titre} className="contents">
                <dt className="text-muted-foreground">{titre}</dt>
                <dd>{valeur}</dd>
              </div>
            ))}
          </dl>
          <pre className="whitespace-pre-wrap rounded-md bg-muted p-3 font-sans text-sm">{courrier.texte}</pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Réponse</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted-foreground">À</dt>
            <dd>
              {courrier.structure ?? "—"}
              {courrier.signataire && `, à l'attention de ${courrier.signataire}`}
            </dd>
            <dt className="text-muted-foreground">Objet</dt>
            <dd>{courrier.reference ? `Votre réservation ${courrier.reference}` : "Votre courrier"}</dd>
          </dl>
          {/* Le brouillon proposé par l'IA viendra remplir cette zone (docs/semaine-3.md, I3). Rien n'est enregistré. */}
          <textarea
            aria-label="Réponse"
            placeholder="Rédigez votre réponse ici, puis copiez-la dans votre messagerie (elle n'est pas enregistrée)."
            className="min-h-48 w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
          <p className="text-xs text-muted-foreground">Rédaction d&apos;un brouillon par l&apos;IA : en développement.</p>
        </CardContent>
      </Card>
    </>
  );
}
