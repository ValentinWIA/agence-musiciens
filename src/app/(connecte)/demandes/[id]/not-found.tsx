import Link from "next/link";

export default function DemandeIntrouvable() {
  return (
    <main className="mx-auto grid w-full max-w-3xl gap-4 p-4">
      <p role="alert">Demande introuvable.</p>
      <Link href="/demandes" className="text-sm underline">
        ← Demandes reçues
      </Link>
    </main>
  );
}
