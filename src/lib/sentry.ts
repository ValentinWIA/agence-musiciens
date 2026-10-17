// Réglages communs à Sentry côté serveur et côté navigateur.
// Sentry 11 collecte tout par défaut : cookies (le jeton de session), en-têtes, corps des requêtes (les mots de passe
// saisis), variables locales. On coupe tout : une erreur suffit avec son message, sa pile et son adresse.

// Les jetons d'invitation et de réinitialisation sont dans le chemin : ils valent un mot de passe.
const JETON_DANS_ADRESSE = /\/(invitation|reinitialisation)\/[^/?#"\\\s]+/g;

export function masquerJetons(texte: string): string {
  return texte.replace(JETON_DANS_ADRESSE, "/$1/[jeton]");
}

export function optionsSentry(environnement: string | undefined) {
  return {
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN, // absent sur la machine de développement : Sentry ne fait rien
    environment: environnement ?? "local",
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
      databaseQueryData: false,
      stackFrameVariables: false,
      genAI: { inputs: false, outputs: false },
    },
    // Passe sur tout l'événement (adresse, fil d'Ariane, titre) : un jeton ne part jamais, où qu'il se trouve.
    beforeSend<E>(evenement: E): E {
      return JSON.parse(masquerJetons(JSON.stringify(evenement)));
    },
  };
}
