import { redirect } from "next/navigation";
import { Suspense } from "react";
import { auth } from "@/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormulaireConnexion } from "./formulaire-connexion";

export default function PageConnexion() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Agence-musiciens</CardTitle>
          <CardDescription>Connectez-vous pour accéder aux engagements.</CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<p>Chargement…</p>}>
            <ContenuConnexion />
          </Suspense>
        </CardContent>
      </Card>
    </main>
  );
}

async function ContenuConnexion() {
  // Déjà connecté : inutile de revoir le formulaire.
  if (await auth()) redirect("/tableau-de-bord");
  return <FormulaireConnexion />;
}
