import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BadgeStatut } from "@/components/badge-statut";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formaterMontant } from "@/lib/argent";
import { convertirEnEur, lireTaux } from "@/lib/change";
import { avertissementConflits, trouverConflits } from "@/lib/conflit";
import { jourLocal, libelleJour } from "@/lib/calendrier";
import { echeanceProposee, TRANSITIONS, transitionsProposees } from "@/lib/cycle-de-vie";
import { formaterDebut } from "@/lib/dates";
import { ferieDuConcert } from "@/lib/feries";
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
  const echeance = transitions.some((t) => t.cle === "poser_option")
    ? echeanceProposee(jourLocal(new Date(), "France"), jourLocal(engagement.debut, lieu.pays))
    : undefined;
  // Dès l'option, l'agent est prévenu d'un conflit qui ferait refuser la confirmation (rien n'est bloqué ici).
  const avertissement =
    estAgent && (engagement.statut === "option" || engagement.statut === "contrat_envoye")
      ? await avertissementAgenda(engagement.id)
      : null;
  const { devise, cachet } = engagement;
  const [pieces, ferie, taux] = await Promise.all([
    lirePiecesJointes(engagement.id),
    // Un jour férié n'a de sens que pour une date précise.
    engagement.precisionDate === "jour" ? ferieDuConcert(engagement.debut, lieu.pays) : null,
    cachet !== null && devise !== "EUR" ? lireTaux() : null,
  ]);
  const enEuros =
    taux && cachet !== null && devise !== "EUR"
      ? `≈ ${formaterMontant(convertirEnEur(cachet, devise, taux), "EUR")} (taux BCE du ${formaterJourIso(taux.date)})`
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
            {ferie && <span className="text-amber-700 dark:text-amber-300"> — jour férié : {ferie}</span>}
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
          <Ligne titre="Musiciens">
            {/* Un musicien n'ouvre que sa propre fiche : pas de lien vers celle de son partenaire de duo. */}
            {engagement.musiciens.map((m, i) => (
              <span key={m.id}>
                {i > 0 && ", "}
                {estAgent || m.id === utilisateur.id ? (
                  <Link href={`/musiciens/${m.id}`} className="underline">
                    {m.nom}
                  </Link>
                ) : (
                  m.nom
                )}{" "}
                ({m.instrument})
              </span>
            ))}
          </Ligne>
          <Ligne titre="Cachet">
            {cachet === null ? "à définir" : formaterMontant(cachet, devise)}
            {enEuros && <span className="text-muted-foreground"> {enEuros}</span>}
          </Ligne>
          <Ligne titre="Programme">{engagement.programme ?? "à définir"}</Ligne>
          {engagement.notes && <Ligne titre="Notes">{engagement.notes}</Ligne>}
          {estAgent && engagement.statut === "option" && engagement.optionExpireLe && (
            <Ligne titre="Option">{`jusqu'au ${libelleJour(engagement.optionExpireLe)} ${engagement.optionExpireLe.slice(0, 4)}`}</Ligne>
          )}
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
            {transitions.length > 0 && <BoutonsStatut id={engagement.id} transitions={transitions} echeance={echeance} />}
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

// « 2026-10-15 » → « 15/10/2026 »
function formaterJourIso(jour: string) {
  return jour.split("-").reverse().join("/");
}

function formaterJour(date: Date) {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "Europe/Paris" }).format(date);
}

function formaterDuree(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h} h${m ? ` ${String(m).padStart(2, "0")}` : ""}` : `${m} min`;
}
