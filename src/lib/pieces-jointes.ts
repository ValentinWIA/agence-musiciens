// Vérification d'une pièce jointe avant son envoi au stockage (séparée de l'action serveur pour être testée).
// On ne fait confiance ni à l'extension ni au type annoncé par le navigateur : seul le début du contenu compte.

export const TYPES_PIECE = ["contrat", "fiche_technique", "autre"] as const;
export type TypePiece = (typeof TYPES_PIECE)[number];

export const LIBELLES_TYPE_PIECE: Record<TypePiece, string> = {
  contrat: "Contrat",
  fiche_technique: "Fiche technique",
  autre: "Autre",
};

// 4 Mo : une requête vers le serveur Vercel ne dépasse pas 4,5 Mo, formulaire compris.
export const TAILLE_MAX_OCTETS = 4 * 1024 * 1024;

// Tout fichier PDF commence par ces 5 octets (« signature »). Un .exe renommé en .pdf ne les a pas.
const SIGNATURE_PDF = [0x25, 0x50, 0x44, 0x46, 0x2d]; // « %PDF- »
export const OCTETS_A_LIRE = SIGNATURE_PDF.length;

export type PieceProposee = {
  type: string;
  nom: string; // nom du fichier choisi ("" si aucun : le navigateur envoie alors un fichier vide sans nom)
  taille: number; // en octets
  debut: Uint8Array; // les premiers octets du contenu (au moins OCTETS_A_LIRE s'il y en a)
};

export type ErreursPiece = { type?: string[]; fichier?: string[] };

export function verifierPiece(
  piece: PieceProposee,
): { erreurs: ErreursPiece } | { piece: { type: TypePiece; nom: string; taille: number } } {
  const erreurs: ErreursPiece = {};
  const nom = piece.nom.trim();

  if (!(TYPES_PIECE as readonly string[]).includes(piece.type)) erreurs.type = ["Choisissez le type de la pièce."];

  if (nom === "" && piece.taille === 0) erreurs.fichier = ["Choisissez un fichier."];
  else if (piece.taille === 0) erreurs.fichier = ["Ce fichier est vide."];
  else if (piece.taille > TAILLE_MAX_OCTETS) erreurs.fichier = ["Ce fichier dépasse 4 Mo."];
  else if (!estUnPdf(piece.debut)) erreurs.fichier = ["Ce fichier n'est pas un PDF (seuls les PDF sont acceptés)."];

  if (erreurs.type || erreurs.fichier) return { erreurs };
  return { piece: { type: piece.type as TypePiece, nom, taille: piece.taille } };
}

export function estUnPdf(debut: Uint8Array): boolean {
  return SIGNATURE_PDF.every((octet, i) => debut[i] === octet);
}

// 1536 → « 1,5 Ko » ; 2 500 000 → « 2,4 Mo »
export function formaterTaille(octets: number): string {
  const format = (n: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(n);
  if (octets < 1024) return `${octets} o`;
  if (octets < 1024 * 1024) return `${format(octets / 1024)} Ko`;
  return `${format(octets / (1024 * 1024))} Mo`;
}
