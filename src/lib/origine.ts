import { headers } from "next/headers";

// Adresse du site pour la visite en cours (production, prévisualisation ou local) : sert à fabriquer les liens.
export async function origineDuSite() {
  const h = await headers();
  return `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
}
