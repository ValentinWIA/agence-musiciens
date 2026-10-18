import { and, count, desc, eq, like } from "drizzle-orm";
import Link from "next/link";
import { Suspense } from "react";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { db } from "@/db";
import { demandesRecues, evenementsFlux, executions } from "@/db/schema";
import { jourLocal } from "@/lib/calendrier";
import { formaterDuree } from "@/lib/dates";
import { LIBELLES_DEMANDE, dateDemandePassee, estATraiter, formaterJourCourt as formaterJour, trierDemandes } from "@/lib/demandes";
import { verifierAdmin } from "@/lib/session";
import { DefilerVers } from "@/components/defiler-vers";
import { PAGE_LARGE } from "@/components/mise-en-page";

const LIMITE_MESSAGES = 100;

// ?vue=toutes ; toute autre valeur revient à « À traiter ». ?ici=<id> : la demande dont on revient.
// ?cree=<id> : l'engagement qui vient d'être créé depuis une demande (l'agent enchaîne sur la suivante).
const schemaVue = z.object({
  vue: z.enum(["a-traiter", "toutes"]).catch("a-traiter"),
  ici: z.uuid().optional().catch(undefined),
  cree: z.uuid().optional().catch(undefined),
});

export default function PageDemandes({ searchParams }: PageProps<"/demandes">) {
  return (
    <main className={`${PAGE_LARGE} grid gap-6 py-4`}>
      <div className="grid gap-1">
        <h1 className="font-logo text-4xl leading-tight">Demandes reçues</h1>
        <p className="text-sm text-muted-foreground">
          Chaque nuit, les demandes des programmateurs arrivent ici. Ouvrez-en une pour lire ses messages, puis créez
          l&apos;engagement ou écartez-la.
        </p>
      </div>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-md bg-muted" aria-label="Chargement" />}>
        <ContenuDemandes searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function ContenuDemandes({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await verifierAdmin("/demandes"); // un musicien ne voit jamais cette page
  const { vue, ici, cree } = schemaVue.parse(await searchParams);

  const [demandes, nbMessages, messagesInconnus, [dernierImport]] = await Promise.all([
    db.select().from(demandesRecues),
    db
      .select({ reference: evenementsFlux.reference, total: count() })
      .from(evenementsFlux)
      .where(and(eq(evenementsFlux.type, "message"), eq(evenementsFlux.etat, "traite")))
      .groupBy(evenementsFlux.reference),
    db
      .select({ id: evenementsFlux.id, nuitDu: executions.nuitDu, reference: evenementsFlux.reference, brut: evenementsFlux.brut })
      .from(evenementsFlux)
      .innerJoin(executions, eq(evenementsFlux.executionId, executions.id))
      .where(
        and(
          eq(evenementsFlux.etat, "mis_de_cote"),
          eq(evenementsFlux.type, "message"),
          like(evenementsFlux.raison, "référence inconnue%"),
        ),
      )
      .orderBy(desc(evenementsFlux.horodatage))
      .limit(LIMITE_MESSAGES),
    db.select().from(executions).orderBy(desc(executions.debutLe)).limit(1),
  ]);

  const messagesPar = new Map(nbMessages.map((m) => [m.reference, m.total]));
  const aTraiter = demandes.filter(estATraiter);
  // Retour après « Créer l'engagement » : la demande traitée reste une fois à sa place, surlignée, pour que l'agent
  // reprenne la file là où il était (décidé le 18/10). Elle n'est plus comptée dans « À traiter ».
  const traitee = cree ? demandes.find((d) => d.engagementId === cree) : undefined;
  const liste = trierDemandes(vue === "toutes" ? demandes : traitee ? [...aTraiter, traitee] : aTraiter);
  const surlignee = traitee?.id ?? ici;
  const aujourdhui = jourLocal(new Date(), "France");
  // La fiche saura revenir sur cet onglet.
  const suite = vue === "toutes" ? "?vue=toutes" : "";

  return (
    <>
      <p className="text-sm text-muted-foreground">
        {dernierImport
          ? `Dernier import : nuit du ${formaterJour(dernierImport.nuitDu)}, ${dernierImport.etat === "en_echec" ? "en échec" : dernierImport.etat === "en_cours" ? "en cours" : "réussi"} — `
          : "Aucun import pour l'instant — "}
        <Link href="/nuit" className="underline">
          voir le journal
        </Link>
      </p>

      <nav className="flex gap-4 text-sm" aria-label="Vue">
        <LienVue href="/demandes" actif={vue === "a-traiter"}>
          À traiter ({aTraiter.length})
        </LienVue>
        <LienVue href="/demandes?vue=toutes" actif={vue === "toutes"}>
          Toutes ({demandes.length})
        </LienVue>
      </nav>

      {liste.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {demandes.length === 0 ? "Aucune demande reçue : importez une nuit depuis le journal." : "Aucune demande à traiter."}
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Concert le</TableHead>
              <TableHead>Programmateur</TableHead>
              <TableHead>Lieu indiqué</TableHead>
              <TableHead>Durée</TableHead>
              <TableHead>Côté programmateur</TableHead>
              <TableHead>Messages</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {liste.map((d) => (
              <TableRow key={d.id} id={`demande-${d.id}`} className={d.id === surlignee ? "bg-amber-100! shadow-[inset_4px_0_0_var(--color-amber-500)]" : undefined}>
                <TableCell>
                  <Link href={`/demandes/${d.id}${suite}`} className="underline">
                    {formaterJour(d.dateConcert)}
                  </Link>
                  {dateDemandePassee(d.dateConcert, aujourdhui) && (
                    <span className="block text-xs text-muted-foreground">date passée</span>
                  )}
                </TableCell>
                <TableCell>{d.programmateur}</TableCell>
                <TableCell>{d.lieu}</TableCell>
                <TableCell>{formaterDuree(d.dureeMinutes)}</TableCell>
                <TableCell>
                  <Badge variant="outline">{LIBELLES_DEMANDE[d.statut]}</Badge>
                  {d.engagementId && d.id === traitee?.id ? (
                    <span role="status" className="block text-xs">
                      engagement créé ·{" "}
                      <Link href={`/engagements/${d.engagementId}`} className="underline">
                        Voir l&apos;engagement →
                      </Link>
                    </span>
                  ) : (
                    d.engagementId && <span className="block text-xs text-muted-foreground">engagement créé</span>
                  )}
                  {d.ecarteeLe && <span className="block text-xs text-muted-foreground">écartée</span>}
                </TableCell>
                <TableCell>
                  <NombreMessages href={`/demandes/${d.id}${suite}`} nombre={messagesPar.get(d.reference) ?? 0} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      {surlignee && <DefilerVers ids={[`demande-${surlignee}`]} />}

      <Card>
        <CardHeader>
          <CardTitle>Messages pour une demande inconnue</CardTitle>
          <CardDescription>
            Le programmateur écrit au sujet d&apos;une réservation que le flux ne nous a jamais transmise. À lire : rien
            n&apos;est fait automatiquement.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {messagesInconnus.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun message de ce genre.</p>
          ) : (
            <ul className="grid gap-3">
              {messagesInconnus.map((m) => {
                const donnees = (m.brut as { donnees?: { de?: unknown; texte?: unknown } }).donnees;
                return (
                  <li key={m.id} className="grid gap-1 text-sm">
                    <p className="text-muted-foreground">
                      Nuit du {formaterJour(m.nuitDu)} — {String(donnees?.de ?? "?")} — réf. {m.reference}
                    </p>
                    {/* Texte brut : React l'échappe, rien n'est interprété. */}
                    <p className="whitespace-pre-wrap">{String(donnees?.texte ?? "")}</p>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function NombreMessages({ href, nombre }: { href: string; nombre: number }) {
  if (nombre === 0) return <span className="text-muted-foreground">—</span>;
  return (
    <Link href={href} className="underline">
      {nombre} message{nombre > 1 ? "s" : ""}
    </Link>
  );
}

function LienVue({ href, actif, children }: { href: string; actif: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} aria-current={actif ? "page" : undefined} className={actif ? "font-semibold underline" : "text-muted-foreground hover:underline"}>
      {children}
    </Link>
  );
}
