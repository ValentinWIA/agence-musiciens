import Link from "next/link";

// Affiché si l'engagement n'existe pas, ou si un musicien n'en fait pas partie (sans dire lequel des deux).
export default function EngagementIntrouvable() {
  return (
    <main className="mx-auto grid w-full max-w-3xl gap-4 p-4">
      <p role="alert">Engagement introuvable.</p>
      <Link href="/engagements" className="text-sm underline">
        ← Engagements
      </Link>
    </main>
  );
}
