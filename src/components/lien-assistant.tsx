import Link from "next/link";

// Retour d'une fiche ouverte depuis une réponse de l'assistant (?depuis=assistant, retour du 25/10).
export function LienAssistant() {
  return (
    <Link href="/assistant" className="text-sm underline">
      ← Assistant
    </Link>
  );
}
