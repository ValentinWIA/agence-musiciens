import * as Sentry from "@sentry/nextjs";
import { optionsSentry } from "@/lib/sentry";

// Erreurs du serveur. Seulement les erreurs : ni traces de performance (offre gratuite) ni données personnelles.
Sentry.init(optionsSentry());
