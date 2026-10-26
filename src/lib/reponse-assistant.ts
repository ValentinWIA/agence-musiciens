// Une réponse de l'assistant, lue pour l'écran (retour du 26/10 : les ** et tirets s'affichaient tels quels).
// Le modèle écrit un Markdown simple : paragraphes, listes à tirets, gras. On ne lit que cela ; le reste reste du texte.

export type Segment = { texte: string; gras?: true };
export type Bloc = { liste: false; texte: Segment[] } | { liste: true; elements: Segment[][] };
export type Bilan = { lu: string[]; fait: string[]; propose: string[] };

export function segments(ligne: string): Segment[] {
  return ligne
    .split(/\*\*(.+?)\*\*/g)
    .map((texte, i): Segment => (i % 2 === 1 ? { texte, gras: true } : { texte }))
    .filter((s) => s.texte !== "");
}

const TIRET = /^\s*[-*•]\s+/;

export function blocs(texte: string): Bloc[] {
  return texte
    .split(/\n\s*\n/)
    .map((paquet) => paquet.split("\n").filter((l) => l.trim() !== ""))
    .filter((lignes) => lignes.length > 0)
    .flatMap((lignes): Bloc[] => {
      if (!TIRET.test(lignes[0])) return [{ liste: false, texte: segments(lignes.map((l) => l.trim()).join(" ")) }];
      // Une ligne sans tiret prolonge l'élément précédent (le modèle passe parfois « Fiche : … » à la ligne).
      const elements: string[] = [];
      for (const l of lignes) {
        if (TIRET.test(l)) elements.push(l.replace(TIRET, ""));
        else elements[elements.length - 1] += ` ${l.trim()}`;
      }
      return [{ liste: true, elements: elements.map(segments) }];
    });
}

// Les trois listes de fin (consigne : « Lu », « Fait », « Proposé (à valider) »), mises à part pour l'écran.
const TITRES: [keyof Bilan, RegExp][] = [
  ["lu", /^\s*(\*\*)?\s*Lu\s*:?\s*(\*\*)?\s*:?\s*$/i],
  ["fait", /^\s*(\*\*)?\s*Fait\s*:?\s*(\*\*)?\s*:?\s*$/i],
  ["propose", /^\s*(\*\*)?\s*Propos[ée]\s*(\(à valider\))?\s*:?\s*(\*\*)?\s*:?\s*$/i],
];

export function separerBilan(texte: string): { corps: string; bilan: Bilan | null } {
  const lignes = texte.split("\n");
  const debut = lignes.findIndex((l) => TITRES[0][1].test(l));
  if (debut === -1) return { corps: texte, bilan: null };
  const bilan: Bilan = { lu: [], fait: [], propose: [] };
  let section: keyof Bilan = "lu";
  for (const l of lignes.slice(debut + 1)) {
    const titre = TITRES.find(([, motif]) => motif.test(l));
    if (titre) section = titre[0];
    else if (l.trim() !== "" && !/^\s*([-*•]\s+)?rien\.?\s*$/i.test(l)) bilan[section].push(l.replace(TIRET, "").trim());
  }
  return { corps: lignes.slice(0, debut).join("\n").trim(), bilan };
}
