import { Suspense } from "react";
import { verifierSession } from "@/lib/session";
import { CalendrierMois } from "./calendrier-mois";
import { PAGE_LARGE } from "@/components/mise-en-page";

export default function PageCalendrier({ searchParams }: PageProps<"/calendrier">) {
  return (
    <main className={`${PAGE_LARGE} grid gap-6 py-4`}>
      <Suspense fallback={<p className="text-muted-foreground">Chargement…</p>}>
        <ContenuCalendrier searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function ContenuCalendrier({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const utilisateur = await verifierSession(); // le musicien ne reçoit que ses engagements (listerPourCalendrier)
  const { mois } = await searchParams;
  return <CalendrierMois lecteur={utilisateur} param={mois} adresse="/calendrier" titre="h1" />;
}
