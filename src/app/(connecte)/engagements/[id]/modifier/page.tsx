import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { versSaisie } from "@/lib/argent";
import { estVerrouille } from "@/lib/cycle-de-vie";
import { versChampsDate } from "@/lib/dates";
import { LIBELLES_STATUT, lireEngagement, listerLieux, listerMusiciens, listerProgrammateurs } from "@/lib/engagements";
import { verifierAdmin } from "@/lib/session";
import { FormulaireEngagement } from "../../formulaire-engagement";
import { modifierEngagement } from "./actions";

export default function PageModifierEngagement({ params }: PageProps<"/engagements/[id]/modifier">) {
  return (
    <main className="mx-auto grid w-full max-w-3xl gap-6 p-4">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-md bg-muted" aria-label="Chargement" />}>
        <ContenuFormulaire params={params} />
      </Suspense>
    </main>
  );
}

async function ContenuFormulaire({ params }: { params: Promise<{ id: string }> }) {
  const agent = await verifierAdmin("/engagements/[id]/modifier");
  const [engagement, lieux, programmateurs, musiciens] = await Promise.all([
    lireEngagement(agent, (await params).id),
    listerLieux(),
    listerProgrammateurs(),
    listerMusiciens(),
  ]);
  if (!engagement) notFound();

  const e = engagement;
  const verrouille = !estVerrouille(e.statut)
    ? undefined
    : e.statut === "annule"
      ? "Engagement annulé : seuls le titre, le programme et les notes se modifient. Rétablissez-le pour changer le reste."
      : `Engagement « ${LIBELLES_STATUT[e.statut]} » : date, lieu, programmateur, musiciens, durée et cachet sont au contrat. Seuls le titre, le programme et les notes se modifient.`;

  return (
    <>
      <Link href={`/engagements/${e.id}`} className="text-sm underline">
        ← Retour à la fiche
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>Modifier l&apos;engagement</CardTitle>
        </CardHeader>
        <CardContent>
          <FormulaireEngagement
            action={modifierEngagement}
            lieux={lieux}
            programmateurs={programmateurs}
            musiciens={musiciens}
            id={e.id}
            verrouille={verrouille}
            valeurs={{
              titre: e.titre ?? "",
              precision: e.precisionDate,
              ...versChampsDate(e.debut, e.precisionDate, e.lieu.pays),
              duree: e.dureeMinutes ? String(e.dureeMinutes) : "",
              lieuId: e.lieuId,
              programmateurId: e.programmateurId,
              musiciens: e.musiciens.map((m) => m.id),
              cachet: e.cachet === null ? "" : versSaisie(e.cachet, e.devise),
              devise: e.devise,
              programme: e.programme ?? "",
              notes: e.notes ?? "",
            }}
          />
        </CardContent>
      </Card>
    </>
  );
}
