import "server-only"; // la clé Voyage et celle du flux ne doivent jamais partir vers le navigateur
import { cosineDistance, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { appelsIa, passages } from "@/db/schema";
import type { PassageTrouve } from "./questions";
import { clePassage, documentFlux, listeDocuments, passagesACalculer, passagesDe, texteAIndexer, type Passage } from "./documents";

// Indexation des documents du flux (docs/semaine-3.md, I4) : lancée au bouton, jamais la nuit.
const ADRESSE_DOCUMENTS = "https://flux-de-nuit.vercel.app/api/documents?sujet=reservations";
const ADRESSE_VOYAGE = "https://api.voyageai.com/v1/embeddings";
export const MODELE_EMBEDDING = "voyage-4"; // offre gratuite ; sans carte : 3 requêtes et 10 000 jetons par minute

export type ResultatIndexation =
  | { ok: true; documents: number; passages: number; calcules: number }
  | { ok: false; erreur: string };

async function lireFlux(adresse: string, cle: string): Promise<unknown> {
  const res = await fetch(adresse, {
    headers: { Authorization: `Bearer ${cle}` },
    signal: AbortSignal.timeout(10_000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`flux : réponse ${res.status}`);
  return res.json();
}

const reponseVoyage = z.object({
  data: z.array(z.object({ index: z.number(), embedding: z.array(z.number()).length(1024) })),
  usage: z.object({ total_tokens: z.number() }),
});

async function appelerVoyage(textes: string[], type: "document" | "query", cle: string) {
  const res = await fetch(ADRESSE_VOYAGE, {
    method: "POST",
    headers: { Authorization: `Bearer ${cle}`, "Content-Type": "application/json" },
    body: JSON.stringify({ input: textes, model: MODELE_EMBEDDING, input_type: type, output_dimension: 1024 }),
    signal: AbortSignal.timeout(60_000),
  });
  if (res.status === 429) throw new Error("Voyage : trop de demandes, réessayez dans une minute");
  if (!res.ok) throw new Error(`Voyage : réponse ${res.status}`);
  const corps = reponseVoyage.parse(await res.json());
  if (corps.data.length !== textes.length) throw new Error("Voyage : nombre de vecteurs inattendu");
  return { vecteurs: [...corps.data].sort((a, b) => a.index - b.index).map((d) => d.embedding), jetons: corps.usage.total_tokens };
}

// Un seul appel pour toutes les pages à calculer : les 50 pages font ≈ 6 000 jetons, sous la limite par minute.
async function calculerVecteurs(textes: string[], cle: string, utilisateurId: string): Promise<number[][]> {
  const debut = Date.now();
  let jetons = 0;
  let reussi = false;
  try {
    const resultat = await appelerVoyage(textes, "document", cle);
    jetons = resultat.jetons;
    reussi = true;
    return resultat.vecteurs;
  } finally {
    // Compté sur /couts comme les appels à Claude ; 0 $ dans l'offre gratuite de Voyage.
    await db.insert(appelsIa).values({
      utilisateurId,
      fonction: "indexation",
      modele: MODELE_EMBEDDING,
      jetonsEntree: jetons,
      jetonsSortie: 0,
      cout: 0,
      dureeMs: Date.now() - debut,
      reussi,
    });
  }
}

// Les pages les plus proches d'une question. Le vecteur de la question n'est pas compté à part sur /couts
// (gratuit, quelques jetons) : l'appel à Claude qui suit est compté, lui, et c'est lui que limite le quota.
export async function chercherPassages(texte: string, nombre: number): Promise<PassageTrouve[]> {
  const cle = process.env.VOYAGE_API_KEY;
  if (!cle) throw new Error("clé de Voyage absente");
  const {
    vecteurs: [vecteur],
  } = await appelerVoyage([texte], "query", cle);
  return db
    .select({ documentId: passages.documentId, titre: passages.titre, page: passages.page, texte: passages.texte })
    .from(passages)
    .orderBy(cosineDistance(passages.vecteur, vecteur))
    .limit(nombre);
}

export async function indexerDocuments(utilisateurId: string): Promise<ResultatIndexation> {
  const cleFlux = process.env.FLUX_DE_NUIT_CLE;
  const cleVoyage = process.env.VOYAGE_API_KEY;
  if (!cleFlux || !cleVoyage) return { ok: false, erreur: "clé du flux ou de Voyage absente" };

  let tous: Passage[];
  let nbDocuments: number;
  try {
    const liste = listeDocuments.parse(await lireFlux(ADRESSE_DOCUMENTS, cleFlux));
    const documents = await Promise.all(
      liste.documents.map(async (d) =>
        documentFlux.parse(await lireFlux(`${ADRESSE_DOCUMENTS}&id=${encodeURIComponent(d.id)}`, cleFlux)),
      ),
    );
    nbDocuments = documents.length;
    tous = documents.flatMap(passagesDe);
  } catch (e) {
    console.warn(`Indexation : documents illisibles (${e instanceof Error ? e.message : e})`);
    return { ok: false, erreur: "documents du flux illisibles ou flux injoignable, rien n'a changé" };
  }

  const connus = await db.select({ documentId: passages.documentId, page: passages.page, empreinte: passages.empreinte }).from(passages);
  const aCalculer = passagesACalculer(tous, new Map(connus.map((p) => [clePassage(p), p.empreinte])));

  if (aCalculer.length > 0) {
    let vecteurs: number[][];
    try {
      vecteurs = await calculerVecteurs(aCalculer.map(texteAIndexer), cleVoyage, utilisateurId);
    } catch (e) {
      const erreur = e instanceof Error ? e.message : "Voyage injoignable";
      console.warn(`Indexation en échec : ${erreur}`);
      return { ok: false, erreur };
    }
    await db
      .insert(passages)
      .values(aCalculer.map((p, i) => ({ ...p, vecteur: vecteurs[i] })))
      .onConflictDoUpdate({
        target: [passages.documentId, passages.page],
        set: {
          titre: sql`excluded.titre`,
          texte: sql`excluded.texte`,
          empreinte: sql`excluded.empreinte`,
          vecteur: sql`excluded.vecteur`,
          indexeLe: sql`now()`,
        },
      });
  }

  console.log(`Indexation : ${nbDocuments} documents, ${tous.length} passages, ${aCalculer.length} recalculé(s)`);
  return { ok: true, documents: nbDocuments, passages: tous.length, calcules: aCalculer.length };
}
