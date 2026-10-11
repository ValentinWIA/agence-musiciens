import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { verifierSession } from "@/lib/session";
import { seDeconnecter } from "../actions";

export default function PageTableauDeBord() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Tableau de bord</CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<p>Chargement…</p>}>
            <ContenuTableauDeBord />
          </Suspense>
        </CardContent>
      </Card>
    </main>
  );
}

async function ContenuTableauDeBord() {
  const utilisateur = await verifierSession(); // sans session : renvoi vers la connexion
  return (
    <div className="grid gap-4">
      <p>
        Bonjour {utilisateur.nom} — rôle : <strong>{utilisateur.role}</strong>
      </p>
      {utilisateur.role === "admin" && (
        <Link href="/invitations" className="underline">
          Inviter un musicien
        </Link>
      )}
      <form action={seDeconnecter}>
        <Button type="submit" variant="outline">
          Se déconnecter
        </Button>
      </form>
    </div>
  );
}
