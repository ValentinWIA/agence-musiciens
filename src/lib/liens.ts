// Les adresses de notre site dans un texte de l'assistant, pour les rendre cliquables (retour du 25/10). Une autre
// adresse reste du texte : une réponse de l'IA peut recopier un lien venu d'un message piégé.
export type Morceau = { texte: string; lien?: string };

export function decouperLiens(texte: string, origine: string): Morceau[] {
  const morceaux: Morceau[] = [];
  texte.split(/(https?:\/\/[^\s)»]+)/g).forEach((m, i) => {
    if (i % 2 === 0) return m && morceaux.push({ texte: m });
    const adresse = m.replace(/[.,;:!?]+$/, ""); // la ponctuation qui suit le lien n'en fait pas partie
    if (!adresse.startsWith(`${origine}/`)) return morceaux.push({ texte: m });
    // Un libellé court plutôt que l'adresse brute (retours des 25 et 26/10) ; « Fiche : » qui le précède devient inutile.
    const libelle = adresse.includes("/engagements/nouveau") ? "Formulaire →" : adresse.includes("/validations") ? "À valider →" : "Fiche →";
    const avant = morceaux.at(-1);
    if (avant && !avant.lien) avant.texte = avant.texte.replace(/(Fiche|Lien)\s*:\s*$/i, "");
    if (avant?.texte === "") morceaux.pop();
    morceaux.push({ texte: libelle, lien: adresse });
    if (m.length > adresse.length) morceaux.push({ texte: m.slice(adresse.length) });
  });
  return morceaux;
}
