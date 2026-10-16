import { lireSaisieDate, versChampsDate, type Saison } from "./dates";
import { LIBELLES_STATUT, type Statut } from "./engagements";

// Le cycle de vie d'un engagement (voir docs/engagements.md, section 2).
// Fonctions pures : elles ne lisent ni n'écrivent la base, pour être testées sans elle
// et servir partout (boutons de la fiche, action serveur, formulaire de modification).

export const TRANSITIONS = {
  poser_option: { libelle: "Poser une option", depuis: ["demande"], vers: "option" },
  envoyer_contrat: { libelle: "Envoyer le contrat", depuis: ["option"], vers: "contrat_envoye" },
  confirmer: { libelle: "Confirmer", depuis: ["contrat_envoye"], vers: "confirme" },
  marquer_joue: { libelle: "Marquer joué", depuis: ["confirme"], vers: "joue" },
  facturer: { libelle: "Facturer", depuis: ["joue"], vers: "facture" },
  encaisser: { libelle: "Encaisser", depuis: ["facture"], vers: "paye" },
  annuler: {
    libelle: "Annuler l'engagement",
    depuis: ["demande", "option", "contrat_envoye", "confirme"],
    vers: "annule",
  },
  // Le statut d'arrivée dépend de l'engagement : voir statutApres().
  retablir: { libelle: "Rétablir", depuis: ["annule"] },
} as const satisfies Record<string, { libelle: string; depuis: readonly Statut[]; vers?: Statut }>;

export type Transition = keyof typeof TRANSITIONS;

// Ce que la règle a besoin de savoir d'un engagement.
export type EtatEngagement = {
  statut: Statut;
  debut: Date;
  precisionDate: "jour" | "mois" | "saison";
  dureeMinutes: number | null;
  cachet: number | null;
  statutAvantAnnulation: Statut | null;
};

export type Verdict = { permis: true } | { permis: false; raison: string };

const refus = (raison: string): Verdict => ({ permis: false, raison });

// Un cachet de 0 est une décision (concert bénévole), pas un oubli : seul le vide (null) est « pas encore défini ».
export function estBenevole(e: Pick<EtatEngagement, "cachet">) {
  return e.cachet === 0;
}

// Les boutons à montrer à l'agent : ceux que permet le statut. Une condition non remplie (cachet manquant…)
// n'enlève pas le bouton : le clic donne un refus expliqué. Seul le concert bénévole s'arrête à « joué ».
export function transitionsProposees(e: EtatEngagement): Transition[] {
  return (Object.keys(TRANSITIONS) as Transition[]).filter(
    (t) =>
      (TRANSITIONS[t].depuis as readonly Statut[]).includes(e.statut) &&
      !(t === "facturer" && estBenevole(e)),
  );
}

export function jugerTransition(e: EtatEngagement, transition: Transition, maintenant = new Date()): Verdict {
  const { libelle, depuis } = TRANSITIONS[transition];
  if (!(depuis as readonly Statut[]).includes(e.statut)) {
    return refus(`« ${libelle} » est impossible au statut « ${LIBELLES_STATUT[e.statut]} ».`);
  }

  switch (transition) {
    case "poser_option":
      // La règle de conflit a besoin d'horaires exacts : début précis et fin (début + durée).
      if (e.precisionDate !== "jour") {
        return refus("Pour poser une option, la date doit être précise (jour et heure), pas seulement un mois ou une saison.");
      }
      if (!e.dureeMinutes) {
        return refus("Pour poser une option, la durée prévue du concert doit être renseignée.");
      }
      return { permis: true };
    case "envoyer_contrat":
      if (e.cachet === null) {
        return refus("Envoi du contrat impossible : le cachet n'est pas encore défini (saisissez 0 pour un concert bénévole).");
      }
      return { permis: true };
    case "confirmer":
      // La règle de conflit d'agenda s'ajoutera ici (étape F).
      return { permis: true };
    case "marquer_joue":
      if (e.debut > maintenant) return refus("Le concert n'a pas encore eu lieu.");
      return { permis: true };
    case "facturer":
      if (estBenevole(e)) return refus("Concert bénévole : il n'y a rien à facturer.");
      return { permis: true };
    case "encaisser":
    case "annuler":
      return { permis: true };
    case "retablir":
      if (e.debut < maintenant) return refus("La date du concert est passée : l'annulation est définitive.");
      if (!e.statutAvantAnnulation) return refus("Le statut d'avant l'annulation est inconnu : rétablissement impossible.");
      return { permis: true };
  }
}

// Le statut après une transition permise. Rétablir un engagement qui était confirmé le ramène à « contrat envoyé » :
// pendant l'annulation, la date a pu être prise ailleurs, la confirmation (et sa règle de conflit) est à refaire.
export function statutApres(e: EtatEngagement, transition: Transition): Statut {
  if (transition === "retablir") {
    return e.statutAvantAnnulation === "confirme" ? "contrat_envoye" : e.statutAvantAnnulation!;
  }
  return TRANSITIONS[transition].vers;
}

// --- Modification (étape D4) ---

// Jusqu'à « contrat envoyé », tout se modifie. Ensuite, date, lieu, musiciens, programmateur, durée et cachet sont
// au contrat ; les changer contournerait aussi la règle de conflit. Un engagement annulé se rétablit d'abord.
const STATUTS_MODIFIABLES: readonly Statut[] = ["demande", "option", "contrat_envoye"];

export function estVerrouille(statut: Statut) {
  return !STATUTS_MODIFIABLES.includes(statut);
}

export type ErreursModification = Partial<Record<"date" | "duree" | "cachet", string>>;

// Une modification ne doit pas défaire une étape déjà franchie : on rejoue les conditions des transitions passées.
export function controlerModification(
  statut: Statut,
  nouveau: Pick<EtatEngagement, "precisionDate" | "dureeMinutes" | "cachet">,
): ErreursModification {
  const erreurs: ErreursModification = {};
  if (statut === "option" || statut === "contrat_envoye") {
    if (nouveau.precisionDate !== "jour") erreurs.date = "Une option est posée : la date doit rester précise (jour et heure).";
    if (!nouveau.dureeMinutes) erreurs.duree = "Une option est posée : la durée prévue doit rester renseignée.";
  }
  if (statut === "contrat_envoye" && nouveau.cachet === null) {
    erreurs.cachet = "Le contrat est envoyé : le cachet ne peut plus être vidé (0 pour un concert bénévole).";
  }
  return erreurs;
}

// --- Suivi : « En cours » (voir SUIVI.md, cadrage du 16/10) ---

// En cours = il reste quelque chose à faire, quelle que soit la date (l'agent suit les impayés des concerts passés).
// Payé et annulé sont finis ; un concert bénévole joué aussi, puisqu'il n'y a rien à facturer.
export function estEnCours(e: Pick<EtatEngagement, "statut" | "cachet">) {
  if (e.statut === "paye" || e.statut === "annule") return false;
  return !(e.statut === "joue" && estBenevole(e));
}

// Une date au mois ou à la saison n'est passée qu'à la fin de sa période (« mai 2027 » l'est le 1er juin),
// calculée à l'heure du lieu comme à la saisie.
export function dateDepassee(
  e: Pick<EtatEngagement, "debut" | "precisionDate">,
  pays: string,
  maintenant = new Date(),
) {
  if (e.precisionDate === "jour") return e.debut < maintenant;
  const champs = versChampsDate(e.debut, e.precisionDate, pays);
  const { finPeriode } = lireSaisieDate(
    e.precisionDate === "mois"
      ? { precision: "mois", mois: champs.mois }
      : { precision: "saison", saison: champs.saison as Saison, annee: Number(champs.annee) },
    pays,
  );
  return finPeriode <= maintenant;
}
