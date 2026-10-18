import Link from "next/link";

export default function CourrierIntrouvable() {
  return (
    <main className="mx-auto grid w-full max-w-3xl gap-4 p-4">
      <p role="alert">Courrier introuvable.</p>
      <Link href="/courriers" className="text-sm underline">
        ← Courriers
      </Link>
    </main>
  );
}
