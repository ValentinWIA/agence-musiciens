import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";
import { auth } from "@/auth";

// Lit la session de la visite en cours. connection() prévient Next.js que la page
// dépend de la visite, avant qu'Auth.js n'utilise du hasard (crypto).
export const lireSession = cache(async () => {
  await connection();
  return auth();
});

// Point de contrôle unique, côté serveur : toute page ou action protégée commence par là.
export const verifierSession = cache(async () => {
  const session = await lireSession();
  if (!session?.user) redirect("/");
  return session.user;
});
