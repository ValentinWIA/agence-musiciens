import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BadgeStatut } from "@/components/badge-statut";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formaterMontant } from "@/lib/argent";
import { formaterDebut } from "@/lib/dates";
import { lireEngagement } from "@/lib/engagements";
import { verifierSession } from "@/lib/session";

export default function PageEngagement({ params }: PageProps<"/engagements/[id]">) {
  return (
    <main className="mx-auto grid w-full max-w-3xl gap-6 p-4">
      <Link href="/engagements" className="text-sm underline">
        ← Engagements
      </Link>
      <Suspense fallback={<div className="h-64 animate-pulse rounded-md bg-muted" aria-label="Chargement" />}>
        <FicheEngagement params={params} />
      </Suspense>
    </main>
  );
}

async function FicheEngagement({ params }: { params: Promise<{ id: string }> }) {
  const utilisateur = await verifierSession();
  const engagement = await lireEngagement(utilisateur, (await params).id);
  if (!engagement) notFound();

  const estAgent = utilisateur.role === "admin";
  const { lieu, programmateur } = engagement;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center justify-between gap-2">
          <span>
            {engagement.titre ? `${engagement.titre} — ` : ""}
            {lieu.nom}, {lieu.ville}
          </span>
          <BadgeStatut statut={engagement.statut} />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-3 text-sm">
          <Ligne titre="Date">
            {formaterDebut(engagement.debut, engagement.precisionDate, lieu.pays)}
            {engagement.dureeMinutes && ` (durée ${formaterDuree(engagement.dureeMinutes)})`}
          </Ligne>
          <Ligne titre="Lieu">
            {lieu.nom}, {lieu.adresse}, {lieu.ville} ({lieu.pays})
          </Ligne>
          <Ligne titre="Programmateur">
            {programmateur.nom} — {programmateur.structure}
            {estAgent && (
              <div className="text-muted-foreground">
                {programmateur.email}
                {programmateur.telephone && ` · ${programmateur.telephone}`}
              </div>
            )}
          </Ligne>
          <Ligne titre="Musiciens">{engagement.musiciens.map((m) => `${m.nom} (${m.instrument})`).join(", ")}</Ligne>
          <Ligne titre="Cachet">
            {engagement.cachet === null ? "à définir" : formaterMontant(engagement.cachet, engagement.devise)}
          </Ligne>
          <Ligne titre="Programme">{engagement.programme ?? "à définir"}</Ligne>
          {engagement.notes && <Ligne titre="Notes">{engagement.notes}</Ligne>}
        </dl>
      </CardContent>
    </Card>
  );
}

function Ligne({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="text-muted-foreground">{titre}</dt>
      <dd>{children}</dd>
    </>
  );
}

function formaterDuree(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h} h${m ? ` ${String(m).padStart(2, "0")}` : ""}` : `${m} min`;
}
