import { z } from "zod";

// Service de géocodage de l'IGN (data.gouv) : couvre la France seulement.
const ADRESSE_API = "https://data.geopf.fr/geocodage/search";
const DELAI_MAX_MS = 5000;
const NOMBRE_PROPOSITIONS = 5;

export type Proposition = { libelle: string; latitude: number; longitude: number };

export type ResultatGeocodage =
  | { ok: true; propositions: Proposition[] }
  | { ok: false; raison: "saisie-trop-courte" | "indisponible" | "reponse-invalide" };

// Seuls les champs utilisés sont vérifiés. GeoJSON range les coordonnées en [longitude, latitude].
const reponseApi = z.object({
  features: z.array(
    z.object({
      geometry: z.object({
        coordinates: z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]),
      }),
      properties: z.object({ label: z.string() }),
    }),
  ),
});

// `appeler` est remplaçable pour que les tests n'interrogent pas le vrai service.
export async function chercherAdresse(
  texte: string,
  appeler: typeof fetch = fetch,
): Promise<ResultatGeocodage> {
  const q = texte.trim();
  // L'API refuse les recherches de moins de 3 caractères.
  if (q.length < 3) return { ok: false, raison: "saisie-trop-courte" };

  const adresse = `${ADRESSE_API}?${new URLSearchParams({ q, limit: String(NOMBRE_PROPOSITIONS) })}`;

  let donnees: unknown;
  try {
    const reponse = await appeler(adresse, { signal: AbortSignal.timeout(DELAI_MAX_MS) });
    if (!reponse.ok) {
      console.warn(`Géocodage indisponible : statut ${reponse.status} pour « ${q} »`);
      return { ok: false, raison: "indisponible" };
    }
    donnees = await reponse.json();
  } catch (erreur) {
    console.warn(`Géocodage indisponible pour « ${q} » : ${(erreur as Error).name}`);
    return { ok: false, raison: "indisponible" };
  }

  const lecture = reponseApi.safeParse(donnees);
  if (!lecture.success) {
    console.warn(`Géocodage : réponse mal formée pour « ${q} »`);
    return { ok: false, raison: "reponse-invalide" };
  }

  const propositions = lecture.data.features.slice(0, NOMBRE_PROPOSITIONS).map((f) => ({
    libelle: f.properties.label,
    longitude: f.geometry.coordinates[0],
    latitude: f.geometry.coordinates[1],
  }));
  console.log(`Géocodage : ${propositions.length} proposition(s) pour « ${q} »`);
  return { ok: true, propositions };
}
