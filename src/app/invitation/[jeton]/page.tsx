import { Suspense } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormulaireAcceptation } from "./formulaire";
import { trouverInvitation } from "./trouver-invitation";

const MESSAGES = {
  invalide: "Ce lien d'invitation n'est pas valide.",
  utilisee: "Cette invitation a déjà été utilisée. Connectez-vous avec votre compte.",
  expiree: "Ce lien a expiré. Demandez une nouvelle invitation à l'agent.",
};

export default function PageAcceptation({ params }: PageProps<"/invitation/[jeton]">) {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <Suspense fallback={<CardContent>Chargement…</CardContent>}>
          <ContenuAcceptation params={params} />
        </Suspense>
      </Card>
    </main>
  );
}

async function ContenuAcceptation({ params }: { params: Promise<{ jeton: string }> }) {
  const { jeton } = await params;
  const resultat = await trouverInvitation(jeton);

  if (resultat.etat !== "valide") {
    return (
      <CardHeader>
        <CardTitle>Invitation</CardTitle>
        <CardDescription role="alert">{MESSAGES[resultat.etat]}</CardDescription>
      </CardHeader>
    );
  }

  const { invitation } = resultat;
  return (
    <>
      <CardHeader>
        <CardTitle>Bienvenue, {invitation.nom}</CardTitle>
        <CardDescription>Vous êtes invité comme musicien ({invitation.instrument}) à rejoindre l&apos;agence.</CardDescription>
      </CardHeader>
      <CardContent>
        <FormulaireAcceptation jeton={jeton} email={invitation.email} />
      </CardContent>
    </>
  );
}
