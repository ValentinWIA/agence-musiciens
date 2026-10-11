import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BadgeStatut } from "@/components/badge-statut";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formaterMontant } from "@/lib/argent";
import { avertissementConflits, trouverConflits } from "@/lib/conflit";
import { TRANSITIONS, transitionsProposees } from "@/lib/cycle-de-vie";
import { formaterDebut } from "@/lib/dates";
import { lireAgendaPourConfirmer, lireEngagement } from "@/lib/engagements";
import { verifierSession } from "@/lib/session";
import { BoutonsStatut } from "./boutons-statut";

export default function PageEngagement({ params, searchParams }: PageProps<"/engagements/[id]">) {
  return (
    <main className="mx-auto grid w-full max-w-3xl gap-6 p-4">
      <Link href="/engagements" className="text-sm underline">
        ← Engagements
      </Link>
      <Suspense fallback={<div className="h-64 animate-pulse rounded-md bg-muted" aria-label="Chargement" />}>
        <FicheEngagement params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function FicheEngagement({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const utilisateur = await verifierSession();
  const engagement = await lireEngagement(utilisateur, (await params).id);
  if (!engagement) notFound();
  // Posés par la création et la modification, qui renvoient ici : ?cree=1, ?modifie=1
  const recherche = await searchParams;
  const confirmation = recherche.cree === "1" ? "Engagement créé." : recherche.modifie === "1" ? "Engagement modifié." : null;

  const estAgent = utilisateur.role === "admin";
  const { lieu, programmateur } = engagement;
  const transitions = transitionsProposees(engagement).map((cle) => ({ cle, libelle: TRANSITIONS[cle].libelle }));
  // Dès l'option, l'agent est prévenu d'un conflit qui ferait refuser la confirmation (rien n'est bloqué ici).
  const avertissement =
    estAgent && (engagement.statut === "option" || engagement.statut === "contrat_envoye")
      ? await avertissementAgenda(engagement.id)
      : null;

  return (
    <Card>
      {confirmation && (
        <p role="status" className="mx-4 rounded-md border px-3 py-2 text-sm">
          {confirmation}
        </p>
      )}
      {avertissement && (
        <p role="alert" className="mx-4 rounded-md border border-amber-500 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">
          {avertissement}
        </p>
      )}
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
        {estAgent && (
          <div className="mt-6 grid gap-3">
            {/* Toujours proposé : même verrouillé, titre, programme et notes restent modifiables. */}
            <Link href={`/engagements/${engagement.id}/modifier`} className={buttonVariants({ variant: "outline", className: "w-fit" })}>
              Modifier
            </Link>
            {transitions.length > 0 && <BoutonsStatut id={engagement.id} transitions={transitions} />}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

async function avertissementAgenda(id: string) {
  const { aConfirmer, autres, noms } = await lireAgendaPourConfirmer(id);
  const conflits = aConfirmer ? trouverConflits(aConfirmer, autres) : [];
  return aConfirmer && conflits.length ? avertissementConflits(aConfirmer, conflits, noms) : null;
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
