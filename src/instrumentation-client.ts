import * as Sentry from "@sentry/nextjs";
import { optionsSentry } from "@/lib/sentry";

// Erreurs du navigateur, mêmes réglages que le serveur.
Sentry.init(optionsSentry());
