import Link from "next/link";
import { decouperLiens } from "@/lib/liens";
import { blocs, segments, separerBilan, type Segment } from "@/lib/reponse-assistant";

// La réponse de l'assistant mise en forme (variante A, choisie le 26/10) : gras et listes rendus, liens courts, et le
// bilan Lu / Fait / Proposé en trois cases. Seules les adresses de notre site sont cliquables (src/lib/liens.ts).
// Compacte (bulle de chaque page) : seulement ce qui demande l'attention, « Fait » et « À valider », s'ils ne sont pas vides.
export function ReponseAssistant({ texte, origine, compacte = false }: { texte: string; origine: string; compacte?: boolean }) {
  const { corps, bilan } = separerBilan(texte);
  return (
    <div className="grid gap-4">
      <div className="grid gap-3 text-[15px] leading-relaxed">
        {blocs(corps).map((b, i) =>
          b.liste ? (
            <Liste key={i} numerotee={b.numerotee}>
              {b.elements.map((e, j) => (
                <li key={j}>
                  <Ligne morceaux={e} origine={origine} />
                </li>
              ))}
            </Liste>
          ) : (
            <p key={i} className="whitespace-pre-line">
              <Ligne morceaux={b.texte} origine={origine} />
            </p>
          ),
        )}
      </div>
      {bilan && compacte && (bilan.fait.length > 0 || bilan.propose.length > 0) && (
        <div className="grid gap-1.5 border-t pt-3 text-sm leading-relaxed">
          {bilan.fait.length > 0 && (
            <div className="rounded-md bg-muted px-3 py-1.5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Fait</p>
              {bilan.fait.map((e, j) => (
                <p key={j}>
                  <Ligne morceaux={segments(e)} origine={origine} />
                </p>
              ))}
            </div>
          )}
          {bilan.propose.length > 0 && (
            <div className="rounded-md bg-amber-100 px-3 py-1.5">
              <p className="text-xs font-medium uppercase tracking-wide">
                À valider
                {/* Un lien seulement si l'agent n'en a pas déjà écrit un vers « À valider ». */}
                {!bilan.propose.some((e) => e.includes("/validations")) && (
                  <>
                    {" · "}
                    <Link href="/validations" className="font-medium normal-case tracking-normal underline decoration-or underline-offset-4">
                      Voir →
                    </Link>
                  </>
                )}
              </p>
              {bilan.propose.map((e, j) => (
                <p key={j}>
                  <Ligne morceaux={segments(e)} origine={origine} />
                </p>
              ))}
            </div>
          )}
        </div>
      )}
      {bilan && !compacte && (
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

function Liste({ numerotee, children }: { numerotee: boolean; children: React.ReactNode }) {
  const classes = "grid gap-2 pl-5 marker:text-or";
  return numerotee ? <ol className={`${classes} list-decimal`}>{children}</ol> : <ul className={`${classes} list-disc`}>{children}</ul>;
}

function Ligne({ morceaux, origine }: { morceaux: Segment[]; origine: string }) {
  return (
    <>
      {morceaux.map((s, i) => {
        const contenu = decouperLiens(s.texte, origine).map((m, j) =>
          m.lien ? (
            // Le chemin seul, par Link : on change de page sans recharger, la bulle garde sa réponse.
            <Link key={j} href={m.lien.slice(origine.length)} className="whitespace-nowrap font-medium underline decoration-or underline-offset-4 hover:bg-or/15">
              {m.texte}
            </Link>
          ) : (
            <span key={j}>{m.texte}</span>
          ),
        );
        return s.gras ? <strong key={i} className="font-semibold">{contenu}</strong> : <span key={i}>{contenu}</span>;
      })}
    </>
  );
}
