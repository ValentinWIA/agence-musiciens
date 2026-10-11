import { and, asc, gt, isNull } from "drizzle-orm";
import Link from "next/link";
import { Suspense } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/db";
import { invitations } from "@/db/schema";
import { verifierAdmin } from "@/lib/session";
import { FormulaireInvitation } from "./formulaire";

export default function PageInvitations() {
  return (
    <main className="mx-auto grid w-full max-w-2xl gap-6 p-4">
      <Link href="/tableau-de-bord" className="text-sm underline">
        ← Tableau de bord
      </Link>
      <Suspense fallback={<p>Chargement…</p>}>
        <ContenuInvitations />
      </Suspense>
    </main>
  );
}

async function ContenuInvitations() {
  await verifierAdmin("/invitations"); // un musicien ne voit jamais cette page
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Inviter un musicien</CardTitle>
          <CardDescription>Le musicien choisira son mot de passe en ouvrant le lien.</CardDescription>
        </CardHeader>
        <CardContent>
          <FormulaireInvitation />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Invitations en attente</CardTitle>
        </CardHeader>
        <CardContent>
          <InvitationsEnAttente />
        </CardContent>
      </Card>
    </>
  );
}

async function InvitationsEnAttente() {
  const liste = await db
    .select()
    .from(invitations)
    .where(and(isNull(invitations.accepteeLe), gt(invitations.expireLe, new Date())))
    .orderBy(asc(invitations.expireLe));

  if (liste.length === 0) return <p className="text-sm text-muted-foreground">Aucune invitation en attente.</p>;

  return (
    <ul className="grid gap-2">
      {liste.map((i) => (
        <li key={i.id} className="flex flex-wrap justify-between gap-2 text-sm">
          <span>
            {i.nom} — {i.instrument} — {i.email}
          </span>
          <span className="text-muted-foreground">expire le {i.expireLe.toLocaleDateString("fr-FR")}</span>
        </li>
      ))}
    </ul>
  );
}
