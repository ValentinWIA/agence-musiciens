// Une réponse de l'assistant, lue pour l'écran (retour du 26/10 : les ** et tirets s'affichaient tels quels).
// Le modèle écrit un Markdown simple : paragraphes, listes (tirets ou numéros), gras. On ne lit que cela ; le reste reste du texte.

export type Segment = { texte: string; gras?: true };
export type Bloc = { liste: false; texte: Segment[] } | { liste: true; numerotee: boolean; elements: Segment[][] };
export type Bilan = { lu: string[]; fait: string[]; propose: string[] };

// « 2 200,00 € », « 20 h 00 », « 450 000 JPY » ne se coupent pas en fin de ligne (espace insécable).
export function insecables(texte: string): string {
  return texte.replace(/(\d) (?=\d{3}\b)/g, "$1\u00a0").replace(/(\d) h (?=\d)/g, "$1\u00a0h\u00a0").replace(/(\d) (?=(€|\$|[A-Z]{3}\b))/g, "$1\u00a0");
}

export function segments(ligne: string): Segment[] {
  return insecables(ligne)
    .split(/\*\*(.+?)\*\*/g)
    .map((texte, i): Segment => (i % 2 === 1 ? { texte, gras: true } : { texte }))
    .filter((s) => s.texte !== "");
}

const TIRET = /^\s*[-*•]\s+/;
const NUMERO = /^\s*\d+[.)]\s+/;

// Lu ligne par ligne (retour du 26/10) : le modèle colle souvent une liste à la phrase qui l'annonce, sans ligne vide.
export function blocs(texte: string): Bloc[] {
  const sortie: ({ liste: false; lignes: string[] } | { liste: true; numerotee: boolean; elements: string[] })[] = [];
  let nouveau = true; // une ligne vide ferme le bloc en cours
  for (const ligne of texte.split("\n")) {
    const dernier = nouveau ? undefined : sortie.at(-1);
    if (ligne.trim() === "") nouveau = true;
    else if (TIRET.test(ligne) || NUMERO.test(ligne)) {
      const numerotee = NUMERO.test(ligne);
      const element = ligne.replace(TIRET, "").replace(NUMERO, "");
      if (dernier?.liste && dernier.numerotee === numerotee) dernier.elements.push(element);
      else sortie.push({ liste: true, numerotee, elements: [element] });
      nouveau = false;
    } else if (dernier?.liste && /^\s/.test(ligne)) {
      // Ligne en retrait : suite de l'élément précédent (le modèle passe parfois « Fiche : … » à la ligne).
      dernier.elements[dernier.elements.length - 1] += ` ${ligne.trim()}`;
    } else if (dernier && !dernier.liste) dernier.lignes.push(ligne.trim());
    else {
      sortie.push({ liste: false, lignes: [ligne.trim()] });
      nouveau = false;
    }
  }
  return sortie.map((b) =>
    b.liste ? { liste: true, numerotee: b.numerotee, elements: b.elements.map(segments) } : { liste: false, texte: segments(b.lignes.join("\n")) },
  );
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
