import { decouperLiens } from "@/lib/liens";

// Un texte de l'assistant où seules les adresses de notre site sont cliquables (règle dans src/lib/liens.ts).
export function TexteAvecLiens({ texte, origine }: { texte: string; origine: string }) {
  return (
    <>
      {decouperLiens(texte, origine).map((m, i) =>
        m.lien ? (
          <a key={i} href={m.lien} className="font-medium underline">
            {m.texte}
          </a>
        ) : (
          <span key={i}>{m.texte}</span>
        ),
      )}
    </>
  );
}
