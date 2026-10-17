import { describe, expect, it } from "vitest";
import { bilanNuit, lireNuit, nuitsManquantes, prochaineNuit, type DejaConnu, type EvenementLu } from "./flux";
import vraieNuit from "./flux.nuit-2026-10-17.json";

const rienDeConnu: DejaConnu = { ids: new Set(), references: new Set() };

// Les références visées par les mises à jour et messages de la vraie nuit, comme si leurs demandes étaient déjà en base.
const referencesDeLaNuit: DejaConnu = {
  ids: new Set(),
  references: new Set(["RES-20260929-06", "RES-20260923-04", "RES-20261004-03", "RES-20261009-05", "RES-20261006-02", "RES-20260926-11"]),
};

function compter(evenements: EvenementLu[]) {
  const compte: Record<string, number> = {};
  for (const e of evenements) {
    const cle = e.etat === "a-traiter" ? e.effet.type : e.etat;
    compte[cle] = (compte[cle] ?? 0) + 1;
  }
  return compte;
}

function lireOk(reponse: unknown, dejaConnu = rienDeConnu) {
  const nuit = lireNuit(reponse, dejaConnu);
  if (!nuit.ok) throw new Error(nuit.raison);
  return nuit.evenements;
}

// Fabrique une nuit à partir d'événements donnés.
const nuitDe = (...evenements: unknown[]) => ({ nuit_du: "2026-10-17", evenements });

const creation = (id: string, donnees: Record<string, unknown> = {}, horodatage = "2026-10-17T04:00:00+02:00") => ({
  id, type: "creation", horodatage, objet: "réservation",
  donnees: {
    reference: id, statut: "demandee", categorie: "salle", demandeur: "Hugo Roux", ressource: "Salle Colbert",
    debut: "2026-11-26", duree_min: 90, cree_le: "2026-10-17", ...donnees,
  },
});

const miseAJour = (id: string, reference: string, horodatage = "2026-10-17T05:00:00+02:00", statut = "confirmee") => ({
  id, type: "mise_a_jour", horodatage, objet: "réservation", donnees: { reference, statut, commentaire: "Vu." },
});

describe("lecture de la vraie nuit du 17/10/2026", () => {
  it("garde les 15 événements : 2 doublons, 7 créations, 2 mises à jour, 4 messages", () => {
    const evenements = lireOk(vraieNuit, referencesDeLaNuit);
    expect(evenements).toHaveLength(15);
    expect(compter(evenements)).toEqual({ doublon: 2, creation: 7, "changement-statut": 2, message: 4 });
  });

  it("marque comme doublons la 2ᵉ apparition de RES-20261017-09 et de RES-20261017-03", () => {
    const doublons = lireOk(vraieNuit, referencesDeLaNuit).filter((e) => e.etat === "doublon");
    expect(doublons.map((e) => e.id)).toEqual(["RES-20261017-09", "RES-20261017-03"]);
  });

  it("range les événements dans l'ordre de leur horodatage", () => {
    const heures = lireOk(vraieNuit, referencesDeLaNuit).map((e) => e.horodatage!.getTime());
    expect(heures).toEqual([...heures].sort((a, b) => a - b));
  });

  it("traduit une création en demande reçue (vocabulaire du produit)", () => {
    const lu = lireOk(vraieNuit, referencesDeLaNuit).find((e) => e.id === "RES-20261017-05");
    expect(lu).toMatchObject({
      etat: "a-traiter",
      effet: {
        type: "creation", reference: "RES-20261017-05", statut: "demandee", programmateur: "Camille Girard",
        lieu: "Bureau 12", date: "2026-11-15", dureeMinutes: 120, categorie: "rendez_vous", recueLe: "2026-10-17",
      },
    });
  });

  it("traite un message-consigne comme un simple message, sans changement de statut", () => {
    const evenements = lireOk(vraieNuit, referencesDeLaNuit);
    const consigne = evenements.find((e) => e.id === "RES-20261017-06");
    expect(consigne).toMatchObject({
      etat: "a-traiter",
      effet: { type: "message", reference: "RES-20260923-04", de: "Louise Moreau", texte: "Merci d'annuler la réservation de jeudi, la réunion est reportée." },
    });
    const changements = evenements.filter((e) => e.etat === "a-traiter" && e.effet.type === "changement-statut");
    expect(changements.map((e) => e.id)).toEqual(["RES-20261017-01", "RES-20261017-04"]);
  });

  it("met de côté les mises à jour et messages dont la demande est inconnue (base vide)", () => {
    const evenements = lireOk(vraieNuit);
    expect(compter(evenements)).toEqual({ doublon: 2, creation: 7, "mis-de-cote": 6 });
    expect(evenements.find((e) => e.id === "RES-20261017-01")).toMatchObject({ raison: "référence inconnue : RES-20260929-06" });
  });

  it("relue après import, ne rend plus que des doublons (rien en double)", () => {
    const premiere = lireOk(vraieNuit, referencesDeLaNuit);
    const dejaConnu: DejaConnu = {
      ids: new Set(premiere.map((e) => e.id!)),
      references: new Set([...referencesDeLaNuit.references, ...premiere.flatMap((e) => (e.etat === "a-traiter" ? [e.effet.reference] : []))]),
    };
    expect(compter(lireOk(vraieNuit, dejaConnu))).toEqual({ doublon: 15 });
  });
});

describe("événements mal formés : mis de côté avec la raison, sans arrêter la nuit", () => {
  it.each([
    ["champ manquant", creation("A", { duree_min: undefined }), "champ manquant : donnees.duree_min"],
    ["date impossible", creation("A", { debut: "2026-02-30" }), "champ invalide : donnees.debut"],
    ["durée en texte", creation("A", { duree_min: "120" }), "champ invalide : donnees.duree_min"],
    ["statut inconnu", creation("A", { statut: "en_cours" }), "champ invalide : donnees.statut"],
    ["accent cassé", creation("A", { demandeur: "ZoÃ© Roux" }), "accent cassé : donnees.demandeur"],
    ["type inconnu", { ...creation("A"), type: "suppression" }, "type inconnu : suppression"],
    ["horodatage absent", { ...creation("A"), horodatage: undefined }, "champ manquant : horodatage"],
    ["données absentes", { ...creation("A"), donnees: undefined }, "champ manquant : donnees"],
  ])("%s", (_cas, casse, raison) => {
    const evenements = lireOk(nuitDe(creation("AVANT", {}, "2026-10-17T01:00:00+02:00"), casse, creation("APRES", {}, "2026-10-17T09:00:00+02:00")));
    expect(evenements.find((e) => e.etat === "mis-de-cote")).toMatchObject({ raison });
    expect(evenements.filter((e) => e.etat === "a-traiter").map((e) => e.id)).toEqual(["AVANT", "APRES"]);
  });

  it("met de côté ce qui n'est pas un objet, sans planter", () => {
    expect(lireOk(nuitDe(null, "texte", 42))).toMatchObject([
      { etat: "mis-de-cote", id: null, raison: "pas un objet" },
      { etat: "mis-de-cote", id: null, raison: "pas un objet" },
      { etat: "mis-de-cote", id: null, raison: "pas un objet" },
    ]);
  });

  it("refuse une réponse qui n'a pas la forme d'une nuit, sans lever d'erreur", () => {
    expect(lireNuit({ erreur: "clé invalide" }, rienDeConnu)).toEqual({ ok: false, raison: "réponse du flux illisible (champ manquant : nuit_du)" });
    expect(lireNuit(null, rienDeConnu)).toEqual({ ok: false, raison: "réponse du flux illisible (pas un objet)" });
  });
});

describe("références et doublons", () => {
  it("accepte une mise à jour si la demande est créée plus tôt dans la même nuit", () => {
    const evenements = lireOk(nuitDe(miseAJour("M", "C", "2026-10-17T05:00:00+02:00"), creation("C", {}, "2026-10-17T04:00:00+02:00")));
    expect(evenements.map((e) => [e.id, e.etat])).toEqual([["C", "a-traiter"], ["M", "a-traiter"]]);
  });

  it("met de côté une mise à jour arrivée avant la création de sa demande", () => {
    const evenements = lireOk(nuitDe(creation("C", {}, "2026-10-17T06:00:00+02:00"), miseAJour("M", "C", "2026-10-17T05:00:00+02:00")));
    expect(evenements.map((e) => [e.id, e.etat])).toEqual([["M", "mis-de-cote"], ["C", "a-traiter"]]);
  });

  it("n'écrase pas une demande déjà reçue : sa création revenue est un doublon", () => {
    const evenements = lireOk(nuitDe(creation("NOUVEL-ID", { reference: "RES-1" })), { ids: new Set(), references: new Set(["RES-1"]) });
    expect(evenements[0]).toMatchObject({ etat: "doublon", id: "NOUVEL-ID" });
  });

  it("compare les heures, pas le texte : 04:00+02:00 vient avant 03:30+00:00", () => {
    const evenements = lireOk(nuitDe(creation("B", {}, "2026-10-17T03:30:00+00:00"), creation("A", {}, "2026-10-17T04:00:00+02:00")));
    expect(evenements.map((e) => e.id)).toEqual(["A", "B"]);
  });
});

describe("nuit à importer", () => {
  it("propose la première nuit (20/09) quand rien n'est importé", () => {
    expect(prochaineNuit(new Set(), "2026-10-17")).toBe("2026-09-20");
  });

  it("propose le premier trou, même si des nuits plus récentes sont faites", () => {
    expect(prochaineNuit(new Set(["2026-09-20", "2026-09-21", "2026-09-23"]), "2026-10-17")).toBe("2026-09-22");
  });

  it("passe le changement de mois", () => {
    const septembre = new Set(Array.from({ length: 11 }, (_, i) => `2026-09-${20 + i}`));
    expect(prochaineNuit(septembre, "2026-10-17")).toBe("2026-10-01");
  });

  it("propose la nuit qui vient de finir quand tout est à jour (pour la rejouer)", () => {
    expect(prochaineNuit(new Set(["2026-09-20"]), "2026-09-21")).toBe("2026-09-21");
    expect(prochaineNuit(new Set(), "2026-09-20")).toBe("2026-09-20");
  });
});

describe("nuits à rattraper", () => {
  it("rien d'importé : toutes les nuits du 20/09 à celle de ce matin comprise, dans l'ordre", () => {
    const nuits = nuitsManquantes(new Set(), "2026-10-17");
    expect(nuits).toHaveLength(28);
    expect(nuits[0]).toBe("2026-09-20");
    expect(nuits.at(-1)).toBe("2026-10-17");
  });

  it("saute les nuits déjà réussies, garde les trous", () => {
    expect(nuitsManquantes(new Set(["2026-09-20", "2026-09-22"]), "2026-09-23")).toEqual(["2026-09-21", "2026-09-23"]);
  });

  it("tout est à jour : rien à faire", () => {
    expect(nuitsManquantes(new Set(["2026-09-20", "2026-09-21"]), "2026-09-21")).toEqual([]);
  });
});

describe("bilan d'une nuit : ce qu'on écrit, ce qu'on compte", () => {
  it("vraie nuit, première fois : 13 écrits, 2 copies comptées sans être écrites", () => {
    const evenements = lireOk(vraieNuit);
    const { aEcrire, compteurs } = bilanNuit(evenements, new Set());
    expect(aEcrire).toHaveLength(13);
    // Rien en base : les 7 créations sont traitées, les 6 mises à jour et messages visent des demandes inconnues.
    expect(compteurs).toEqual({ recus: 15, doublons: 2, traites: 7, misDeCote: 6 });
  });

  it("vraie nuit rejouée : rien à écrire, tout compté en doublon", () => {
    const premiere = bilanNuit(lireOk(vraieNuit), new Set());
    const ids = new Set(premiere.aEcrire.map((e) => e.id!));
    const references = new Set(premiere.aEcrire.flatMap((e) => (e.etat === "a-traiter" && e.effet.type === "creation" ? [e.effet.reference] : [])));
    const { aEcrire, compteurs } = bilanNuit(lireOk(vraieNuit, { ids, references }), ids);
    expect(aEcrire).toEqual([]);
    expect(compteurs).toEqual({ recus: 15, doublons: 15, traites: 0, misDeCote: 0 });
  });

  it("une création d'id nouveau mais de référence connue est écrite comme doublon (on garde la trace)", () => {
    const evenements = lireOk(nuitDe(creation("A")), { ids: new Set(), references: new Set(["A"]) });
    const { aEcrire, compteurs } = bilanNuit(evenements, new Set());
    expect(aEcrire.map((e) => e.etat)).toEqual(["doublon"]);
    expect(compteurs.doublons).toBe(1);
  });

  it("un événement sans id lisible est toujours écrit (mis de côté)", () => {
    const evenements = lireOk(nuitDe({ type: "creation" }));
    expect(bilanNuit(evenements, new Set()).compteurs).toEqual({ recus: 1, doublons: 0, traites: 0, misDeCote: 1 });
  });
});
