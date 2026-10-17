import { eq } from "drizzle-orm";
import Link from "next/link";
import { Suspense } from "react";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/db";
import { demandesRecues } from "@/db/schema";
import { jourLocal } from "@/lib/calendrier";
import { formaterDuree } from "@/lib/dates";
import { LIBELLES_DEMANDE, dateDemandePassee, formaterJourCourt, preRemplissage } from "@/lib/demandes";
import { listerLieux, listerMusiciens, listerProgrammateurs } from "@/lib/engagements";
import { verifierAdmin } from "@/lib/session";
import { lireHistorique, ListeHistorique } from "../../demandes/historique";
import { FormulaireEngagement } from "../formulaire-engagement";
import { creerEngagement } from "./actions";

export default function PageNouvelEngagement({ searchParams }: PageProps<"/engagements/nouveau">) {
  return (
    <main className="mx-auto grid w-full max-w-3xl gap-6 p-4">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-md bg-muted" aria-label="Chargement" />}>
        <ContenuFormulaire searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

function AvecRetour({ retour, children }: { retour: { href: string; libelle: string }; children: React.ReactNode }) {
  return (
    <>
      <Link href={retour.href} className="text-sm underline">
        ← {retour.libelle}
      </Link>
      {children}
    </>
  );
}

async function ContenuFormulaire({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await verifierAdmin("/engagements/nouveau");
  const [lieux, programmateurs, musiciens] = await Promise.all([listerLieux(), listerProgrammateurs(), listerMusiciens()]);
  // Venu de la fiche d'un musicien (?musicien=…) : il est déjà coché, s'il fait bien partie de la liste.
  const { musicien, demande: demandeId } = await searchParams;
  const coche = musiciens.find((m) => m.id === musicien);

  // Next garde la page précédente avec sa saisie ; la clé donne un formulaire neuf à chaque origine différente
  // (sinon le brouillon d'une autre demande reste affiché et le pré-remplissage est ignoré).
  if (demandeId === undefined) {
    return (
      <AvecRetour retour={{ href: "/engagements", libelle: "Engagements" }}>
        <Card>
          <CardHeader>
            <CardTitle>Nouvel engagement</CardTitle>
          </CardHeader>
          <CardContent>
            <FormulaireEngagement
              key={coche?.id ?? "vide"}
              action={creerEngagement}
              lieux={lieux}
              programmateurs={programmateurs}
              musiciens={musiciens}
              valeurs={coche ? { musiciens: [coche.id] } : undefined}
            />
          </CardContent>
        </Card>
      </AvecRetour>
    );
  }

  // Venu d'une demande reçue (?demande=…) : date et durée reprises, programmateur s'il porte exactement ce nom.
  const id = z.uuid().safeParse(demandeId);
  const [demande] = id.success ? await db.select().from(demandesRecues).where(eq(demandesRecues.id, id.data)) : [];
  if (!demande) {
    return (
      <AvecRetour retour={{ href: "/demandes", libelle: "Demandes reçues" }}>
        <p className="text-sm">Demande introuvable.</p>
      </AvecRetour>
    );
  }
  const retour = { href: `/demandes/${demande.id}`, libelle: "Demande" };
  if (demande.engagementId || demande.ecarteeLe) {
    return (
      <AvecRetour retour={retour}>
        <p className="text-sm">Cette demande {demande.engagementId ? "a déjà son engagement" : "a été écartée"} : rien à créer.</p>
      </AvecRetour>
    );
  }

  const aujourdhui = jourLocal(new Date(), "France");
  const passee = dateDemandePassee(demande.dateConcert, aujourdhui);
  const historique = await lireHistorique(demande.reference);
  const messages = historique.filter((h) => h.genre === "message").length;

  return (
    <AvecRetour retour={retour}>
      <Card>
        <CardHeader>
          <CardTitle>Demande de {demande.programmateur}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Concert le</dt>
            <dd>
              {formaterJourCourt(demande.dateConcert)} <span className="text-muted-foreground">(heure non précisée)</span>
            </dd>
            <dt className="text-muted-foreground">Lieu indiqué</dt>
            <dd>{demande.lieu}</dd>
            <dt className="text-muted-foreground">Durée</dt>
            <dd>{formaterDuree(demande.dureeMinutes)}</dd>
            <dt className="text-muted-foreground">Côté programmateur</dt>
            <dd>
              <Badge variant="outline">{LIBELLES_DEMANDE[demande.statut]}</Badge>
            </dd>
          </dl>
          <details className="text-sm" open={messages > 0}>
            <summary className="cursor-pointer underline">
              Historique ({historique.length} événement{historique.length > 1 ? "s" : ""}, dont {messages} message
              {messages > 1 ? "s" : ""})
            </summary>
            <div className="mt-3">
              <ListeHistorique historique={historique} />
            </div>
          </details>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Nouvel engagement</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5">
          <p role="note" className="rounded-md border px-3 py-2 text-sm">
            {passee ? (
              <>
                <span className="font-medium">
                  La date demandée ({formaterJourCourt(demande.dateConcert)}) est passée : saisissez la date convenue avec
                  le programmateur.
                </span>{" "}
                <span className="text-muted-foreground">Durée reprise de la demande.</span>
              </>
            ) : (
              <span className="text-muted-foreground">Date et durée reprises de la demande (modifiables).</span>
            )}{" "}
            <span className="text-muted-foreground">Choisissez l&apos;heure, le lieu, les musiciens et le cachet.</span>
          </p>
          <FormulaireEngagement
            key={demande.id}
            action={creerEngagement}
            lieux={lieux}
            programmateurs={programmateurs}
            musiciens={musiciens}
            valeurs={preRemplissage(demande, programmateurs, aujourdhui)}
            demande={{ id: demande.id, lieu: demande.lieu }}
          />
        </CardContent>
      </Card>
    </AvecRetour>
  );
}
