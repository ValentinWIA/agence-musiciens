import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormulaireDemande } from "./formulaire";

export default function PageMotDePasseOublie() {
  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Mot de passe oublié</CardTitle>
          <CardDescription>Indiquez l&apos;adresse de votre compte pour recevoir un lien.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <FormulaireDemande />
          <Link href="/" className="text-sm underline">
            ← Retour à la connexion
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
