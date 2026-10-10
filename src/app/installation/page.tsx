import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { aucunCompte } from "./aucun-compte";
import { FormulaireInstallation } from "./formulaire";

export default function PageInstallation() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Installation</CardTitle>
          <CardDescription>Créez le compte de l&apos;agent, administrateur de l&apos;agence.</CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<p>Chargement…</p>}>
            <ContenuInstallation />
          </Suspense>
        </CardContent>
      </Card>
    </main>
  );
}

async function ContenuInstallation() {
  await connection(); // lu à chaque visite, jamais préparé à l'avance
  // Premier contrôle : la page n'existe plus dès qu'un compte a été créé.
  if (!(await aucunCompte())) redirect("/");
  return <FormulaireInstallation />;
}
