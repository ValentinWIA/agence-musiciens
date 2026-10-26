import { decouperLiens } from "@/lib/liens";
import { blocs, segments, separerBilan, type Segment } from "@/lib/reponse-assistant";

// La réponse de l'assistant mise en forme (variante A, choisie le 26/10) : gras et listes rendus, liens courts, et le
// bilan Lu / Fait / Proposé en trois cases. Seules les adresses de notre site sont cliquables (src/lib/liens.ts).
export function ReponseAssistant({ texte, origine }: { texte: string; origine: string }) {
  const { corps, bilan } = separerBilan(texte);
  return (
    <div className="grid gap-4">
      <div className="grid max-w-prose gap-3 text-[15px] leading-relaxed">
        {blocs(corps).map((b, i) =>
          b.liste ? (
            <ul key={i} className="grid list-disc gap-2 pl-5 marker:text-or">
              {b.elements.map((e, j) => (
                <li key={j}>
                  <Ligne morceaux={e} origine={origine} />
                </li>
              ))}
            </ul>
          ) : (
            <p key={i}>
              <Ligne morceaux={b.texte} origine={origine} />
            </p>
          ),
        )}
      </div>
      {bilan && (
        <div className="grid gap-2 border-t pt-4 sm:grid-cols-3">
          {(
            [
              ["Lu", bilan.lu],
              ["Fait", bilan.fait],
              ["Proposé (à valider)", bilan.propose],
            ] as const
          ).map(([titre, elements]) => (
            <div key={titre} className="rounded-md bg-muted px-3 py-2 text-xs leading-relaxed">
              {/* Liste vide : titre et « rien » sur une ligne (empilées sur téléphone, les cases vides prenaient la place). */}
              <p className={`font-medium uppercase tracking-wide text-muted-foreground ${elements.length > 0 ? "mb-1" : ""}`}>
                {titre}
                {elements.length === 0 && <span className="font-normal normal-case tracking-normal"> · rien</span>}
              </p>
              {elements.length === 0 ? null : (
                elements.map((e, j) => (
                  <p key={j}>
                    <Ligne morceaux={segments(e)} origine={origine} />
                  </p>
                ))
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Ligne({ morceaux, origine }: { morceaux: Segment[]; origine: string }) {
  return (
    <>
      {morceaux.map((s, i) => {
        const contenu = decouperLiens(s.texte, origine).map((m, j) =>
          m.lien ? (
            <a key={j} href={m.lien} className="whitespace-nowrap font-medium underline decoration-or underline-offset-4 hover:bg-or/15">
              {m.texte}
            </a>
          ) : (
            <span key={j}>{m.texte}</span>
          ),
        );
        return s.gras ? <strong key={i} className="font-semibold">{contenu}</strong> : <span key={i}>{contenu}</span>;
      })}
    </>
  );
}
