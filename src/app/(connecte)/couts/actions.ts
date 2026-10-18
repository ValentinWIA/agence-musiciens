"use server";

import { refresh } from "next/cache";
import { appelerModele, texteDe } from "@/lib/ia";
import { verifierAdmin } from "@/lib/session";

export type EtatTest = { message?: string; reussi?: boolean };

// Un appel minuscule, pour vérifier la clé, les limites et l'enregistrement du coût.
export async function testerIa(): Promise<EtatTest> {
  const agent = await verifierAdmin("/couts (test de l'IA)");
  console.log(`Test de l'IA demandé par ${agent.nom}`);
  const resultat = await appelerModele("test", agent.id, {
    max_tokens: 1024,
    output_config: { effort: "low" },
    messages: [{ role: "user", content: "Réponds seulement : OK" }],
  });
  refresh();
  if (!resultat.ok) return { message: `Test non fait : ${resultat.erreur}` };
  return { reussi: true, message: `L'IA a répondu « ${texteDe(resultat.reponse)} ». L'appel est compté ci-dessous.` };
}
