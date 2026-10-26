import { asc, desc, eq, ne } from "drizzle-orm";
import Link from "next/link";
import { Suspense } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PAGE_LARGE } from "@/components/mise-en-page";
import { db } from "@/db";
import { propositions } from "@/db/schema";
import { LIBELLES_PROPOSITION } from "@/lib/propositions";
import { verifierAdmin } from "@/lib/session";
import { CartePropositionFormulaire } from "./carte-proposition";

const LIMITE_DECIDEES = 20;
const heure = (d: Date) => d.toLocaleString("fr-FR", { timeZone: "Europe/Paris", dateStyle: "short", timeStyle: "short" });

export default function PageValidations() {
  return (
    <main className={`${PAGE_LARGE} grid gap-6 py-4`}>
      <h1 className="font-logo text-4xl leading-tight">À valider</h1>
      <Suspense fallback={<div className="h-48 animate-pulse rounded-md bg-muted" aria-label="Chargement" />}>
        <ContenuValidations />
      </Suspense>
    </main>
  );
}

async function ContenuValidations() {
  await verifierAdmin("/validations"); // un musicien ne voit jamais cette page
  const [enAttente, decidees] = await Promise.all([
    db.select().from(propositions).where(eq(propositions.etat, "en_attente")).orderBy(asc(propositions.creeLe)),
    db.select().from(propositions).where(ne(propositions.etat, "en_attente")).orderBy(desc(propositions.decideLe)).limit(LIMITE_DECIDEES),
  ]);

  return (
    <>
      <p className="text-sm text-muted-foreground">
        Les courriels préparés par l&apos;{" "}
        <Link href="/assistant" className="underline">
          assistant
        </Link>{" "}
        attendent ici votre décision : rien ne part sans « Envoyer ». Le texte modifié est celui qui part.
      </p>
      {enAttente.length === 0 && (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            Rien à valider. Demandez à l&apos;assistant de préparer des relances.
          </CardContent>
        </Card>
      )}
      {enAttente.map((p) => (
        <Card key={p.id}>
          <CardHeader>
            <CardTitle className="text-base">
              Relance · {p.objet}
              {p.engagementId && (
                <>
                  {" · "}
                  <Link href={`/engagements/${p.engagementId}`} className="font-normal underline">
                    Accéder à la fiche
                  </Link>
                </>
              )}
            </CardTitle>
            <CardDescription>
              À : {p.destinataireNom} &lt;{p.destinataire}&gt; · proposée le {heure(p.creeLe)}
              {p.erreur && <span className="text-destructive"> · {p.erreur}</span>}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CartePropositionFormulaire proposition={p} />
          </CardContent>
        </Card>
      ))}
      {decidees.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Décidées récemment</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            {decidees.map((p) => (
              <details key={p.id} className="rounded-md border px-3 py-2 text-sm">
                <summary className="cursor-pointer">
                  <span className="text-muted-foreground">{p.decideLe && heure(p.decideLe)}</span> · {p.objet}{" "}
                  <Badge variant={p.etat === "envoyee" ? "secondary" : p.etat === "refusee" ? "outline" : "destructive"}>
                    {LIBELLES_PROPOSITION[p.etat]}
                  </Badge>
                </summary>
                <div className="mt-2 grid gap-1">
                  <p className="text-muted-foreground">
                    À : {p.destinataireNom} &lt;{p.destinataire}&gt; · {p.sujet}
                  </p>
                  <p className="whitespace-pre-line">{p.texte}</p>
                </div>
              </details>
            ))}
          </CardContent>
        </Card>
      )}
    </>
  );
}
