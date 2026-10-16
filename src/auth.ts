import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { db } from "@/db";
import { utilisateurs } from "@/db/schema";

type Role = "admin" | "musicien";

declare module "next-auth" {
  interface User {
    role: Role;
  }
  interface Session {
    user: { id: string; nom: string; role: Role };
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    nom: string;
    role: Role;
  }
}

const identifiants = z.object({
  email: z.email(),
  motDePasse: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" }, // la session vit dans un cookie signé avec AUTH_SECRET
  pages: { signIn: "/" },
  // Un mauvais mot de passe n'est pas une erreur du serveur : notre ligne « Connexion refusée » suffit.
  // Sans ce filtre, Auth.js l'écrit en erreur et Sentry (semaine 2) le remonterait à chaque faute de frappe.
  logger: {
    error(erreur) {
      // `type` et non `name` : la construction raccourcit les noms de classes (`name` y devient « z »).
      if ("type" in erreur && erreur.type === "CredentialsSignin") return;
      console.error(erreur);
    },
  },
  providers: [
    Credentials({
      credentials: { email: {}, motDePasse: {} },
      async authorize(saisie) {
        const donnees = identifiants.safeParse(saisie);
        if (!donnees.success) return null;

        const email = donnees.data.email.toLowerCase();
        const utilisateur = await db.query.utilisateurs.findFirst({
          where: eq(utilisateurs.email, email),
        });
        const valide =
          utilisateur && (await bcrypt.compare(donnees.data.motDePasse, utilisateur.motDePasseHash));

        if (!valide) {
          console.warn(`Connexion refusée : ${email}`);
          return null;
        }
        console.log(`Connexion réussie : ${email} (${utilisateur.role})`);
        return { id: utilisateur.id, name: utilisateur.nom, role: utilisateur.role };
      },
    }),
  ],
  callbacks: {
    // À la connexion, on range l'identifiant, le nom et le rôle dans le cookie de session.
    jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.nom = user.name!;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      session.user = { ...session.user, id: token.id, nom: token.nom, role: token.role };
      return session;
    },
  },
});
