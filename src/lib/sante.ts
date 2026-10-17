// Réponse de /api/sante : sans la base, le site répond donc il va bien ; avec, la base doit répondre à temps.
// La base est passée en paramètre pour que les tests n'en aient pas besoin.
export const DELAI_BASE_MS = 5_000;

export async function verifierSante(avecBase: boolean, interrogerBase: () => Promise<unknown>): Promise<boolean> {
  if (!avecBase) return true;
  let minuteur: ReturnType<typeof setTimeout> | undefined;
  const delai = new Promise<never>((_, refuser) => {
    minuteur = setTimeout(() => refuser(new Error(`pas de réponse en ${DELAI_BASE_MS / 1000} s`)), DELAI_BASE_MS);
  });
  try {
    await Promise.race([interrogerBase(), delai]);
    return true;
  } catch (e) {
    console.warn(`Santé : la base ne répond pas (${e instanceof Error ? e.message : String(e)})`);
    return false;
  } finally {
    clearTimeout(minuteur);
  }
}
