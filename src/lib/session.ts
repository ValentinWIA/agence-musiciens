import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@/auth";

// Point de contrôle unique, côté serveur : toute page ou action protégée commence par là.
export const verifierSession = cache(async () => {
  const session = await auth();
  if (!session?.user) redirect("/");
  return session.user;
});
