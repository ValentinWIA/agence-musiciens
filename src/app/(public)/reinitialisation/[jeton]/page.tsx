import Link from "next/link";
import { Suspense } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormulaireNouveauMotDePasse } from "./formulaire";
import { trouverReinitialisation } from "./trouver-reinitialisation";

export default function PageReinitialisation({ params }: PageProps<"/reinitialisation/[jeton]">) {
  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Nouveau mot de passe</CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<p>Chargement…</p>}>
            <ContenuReinitialisation params={params} />
          </Suspense>
        </CardContent>
      </Card>
    </main>
  );
}

async function ContenuReinitialisation({ params }: { params: Promise<{ jeton: string }> }) {
  const { jeton } = await params;
  if (!(await trouverReinitialisation(jeton))) {
    return (
      <CardDescription role="alert">
        Ce lien n&apos;est pas valide, a expiré ou a déjà servi.{" "}
        <Link href="/mot-de-passe-oublie" className="underline">
          Faire une nouvelle demande
        </Link>
      </CardDescription>
    );
  }
  return <FormulaireNouveauMotDePasse jeton={jeton} />;
}
