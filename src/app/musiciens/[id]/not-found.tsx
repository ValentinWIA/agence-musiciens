import Link from "next/link";

// Affiché si la fiche n'existe pas, ou si un musicien ouvre celle d'un autre (sans dire lequel des deux).
export default function MusicienIntrouvable() {
  return (
    <main className="mx-auto grid w-full max-w-3xl gap-4 p-4">
      <p role="alert">Musicien introuvable.</p>
      <Link href="/tableau-de-bord" className="text-sm underline">
        ← Tableau de bord
      </Link>
    </main>
  );
}
