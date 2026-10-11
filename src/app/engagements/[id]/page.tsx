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
import { lireAgendaPourConfirmer, lireEngagement, lirePiecesJointes } from "@/lib/engagements";
import { formaterTaille, LIBELLES_TYPE_PIECE } from "@/lib/pieces-jointes";
import { verifierSession } from "@/lib/session";
import { BoutonsStatut } from "./boutons-statut";
import { AjoutPiece } from "./pieces/ajout-piece";
import { SupprimerPiece } from "./pieces/supprimer-piece";

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
  const pieces = await lirePiecesJointes(engagement.id);

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
          {/* Visible aussi du musicien : c'est lui qui voyage (docs/engagements.md, section 11). */}
          {engagement.raisonConflit && (
            <Ligne titre="Conflit d'agenda">{`Confirmé malgré un conflit d'agenda : ${engagement.raisonConflit}`}</Ligne>
          )}
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
        <section className="mt-8 grid gap-3" aria-labelledby="titre-pieces">
          <h2 id="titre-pieces" className="font-medium">
            Pièces jointes
          </h2>
          {pieces.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune pièce jointe.</p>
          ) : (
            <ul className="grid gap-2 text-sm">
              {pieces.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="font-medium">{LIBELLES_TYPE_PIECE[p.type]}</span>
                  {/* Lien simple (pas <Link>) : c'est un fichier servi par une route, pas une page. */}
                  <a href={`/engagements/${engagement.id}/pieces/${p.id}`} target="_blank" rel="noopener" className="break-all underline">
                    {p.nomFichier}
                  </a>
                  <span className="text-muted-foreground">
                    {formaterTaille(p.taille)} · ajoutée le {formaterJour(p.ajouteeLe)}
                  </span>
                  {estAgent && <SupprimerPiece id={engagement.id} pieceId={p.id} nom={p.nomFichier} />}
                </li>
              ))}
            </ul>
          )}
          {/* Ajout permis à tout statut (le contrat signé arrive après « confirmé ») ; agent seulement. */}
          {estAgent && <AjoutPiece id={engagement.id} />}
        </section>
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

function formaterJour(date: Date) {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "Europe/Paris" }).format(date);
}

function formaterDuree(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h} h${m ? ` ${String(m).padStart(2, "0")}` : ""}` : `${m} min`;
}
