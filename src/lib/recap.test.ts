import { describe, expect, it } from "vitest";
import {
  cachetsImpayes,
  composerRecap,
  optionsQuiExpirent,
  regrouperRaisons,
  type ConcertPasse,
  type DonneesRecap,
  type OptionPosee,
} from "./recap";

const aujourdhui = "2026-10-18";

function option(expireLe: string): OptionPosee {
  return { titre: "Duo", debut: new Date("2026-12-19T18:30:00Z"), pays: "Suisse", ville: "Zurich", expireLe };
}

function concert(modif: Partial<ConcertPasse> = {}): ConcertPasse {
  return {
    titre: "Récital",
    debut: new Date("2026-09-01T18:00:00Z"),
    pays: "France",
    ville: "Metz",
    statut: "facture",
    cachet: 150000,
    devise: "EUR",
    ...modif,
  };
}

function donnees(modif: Partial<DonneesRecap> = {}): DonneesRecap {
  return {
    aujourdhui,
    nomAgent: "Claire Morel",
    lienSite: "https://agence-musiciens.vercel.app",
    demandes: [],
    changements: [],
    messages: [],
    messagesInconnus: [],
    options: [],
    impayes: [],
    nuits: [{ nuitDu: aujourdhui, etat: "reussie", recus: 15, doublons: 2, misDeCote: 0, erreur: null }],
    raisons: [],
    ...modif,
  };
}

describe("optionsQuiExpirent", () => {
  it("garde l'échéance à 7 jours pile, pas à 8", () => {
    expect(optionsQuiExpirent([option("2026-10-25"), option("2026-10-26")], aujourdhui).map((o) => o.expireLe)).toEqual([
      "2026-10-25",
    ]);
  });

  it("garde une option déjà expirée, encore en option, et range par échéance", () => {
    const liste = optionsQuiExpirent([option("2026-10-20"), option("2026-10-10")], aujourdhui);
    expect(liste.map((o) => o.expireLe)).toEqual(["2026-10-10", "2026-10-20"]);
  });
});

describe("cachetsImpayes", () => {
  it("un concert d'il y a 30 jours pile n'est pas encore impayé ; à 31 jours, il l'est", () => {
    const trente = concert({ debut: new Date("2026-09-18T18:00:00Z") });
    const trenteEtUn = concert({ debut: new Date("2026-09-17T18:00:00Z") });
    expect(cachetsImpayes([trente, trenteEtUn], aujourdhui)).toEqual([trenteEtUn]);
  });

  it("compte au jour du lieu : à Tokyo le 18/09 à 2 h (encore le 17/09 à Paris), c'est 30 jours pile", () => {
    const tokyo = concert({ debut: new Date("2026-09-17T17:00:00Z"), pays: "Japon" });
    expect(cachetsImpayes([tokyo], aujourdhui)).toEqual([]);
  });

  it("ni le bénévole (cachet 0), ni un cachet vide, ni un concert payé ou annulé", () => {
    const liste = [
      concert({ cachet: 0, statut: "joue" }),
      concert({ cachet: null, statut: "joue" }),
      concert({ statut: "paye" }),
      concert({ statut: "annule" }),
    ];
    expect(cachetsImpayes(liste, aujourdhui)).toEqual([]);
  });

  it("garde « joué » et « facturé », du plus ancien au plus récent", () => {
    const juin = concert({ statut: "joue", debut: new Date("2026-06-20T19:00:00Z") });
    const aout = concert({ statut: "facture", debut: new Date("2026-08-08T19:00:00Z") });
    expect(cachetsImpayes([aout, juin], aujourdhui)).toEqual([juin, aout]);
  });
});

describe("regrouperRaisons", () => {
  it("regroupe par famille, la plus fréquente d'abord", () => {
    expect(
      regrouperRaisons(["référence inconnue : RES-1", "champ invalide : donnees.debut", "référence inconnue : RES-2"]),
    ).toEqual([
      { raison: "référence inconnue", nombre: 2 },
      { raison: "champ invalide", nombre: 1 },
    ]);
  });
});

describe("composerRecap", () => {
  it("rien de neuf : le récap part quand même, sans section vide, avec le bilan de la nuit", () => {
    const { sujet, texte } = composerRecap(donnees());
    expect(sujet).toBe("Récap du matin — dimanche 18 octobre");
    expect(texte).toContain("Rien de neuf cette nuit.");
    expect(texte).toContain("Nuit du 18/10/2026 : 15 reçu(s), 2 doublon(s), 0 mis de côté");
    expect(texte).not.toContain("DEMANDES REÇUES");
    expect(texte).toContain("https://agence-musiciens.vercel.app");
  });

  it("une panne est dans le sujet et dans le bilan", () => {
    const { sujet, texte } = composerRecap(
      donnees({ nuits: [{ nuitDu: aujourdhui, etat: "en_echec", recus: 0, doublons: 0, misDeCote: 0, erreur: "délai dépassé" }] }),
    );
    expect(sujet).toContain("(import en échec)");
    expect(texte).toContain("import en échec (délai dépassé), il sera réessayé");
  });

  it("chaque section est comptée ; l'écart avec un engagement existant est signalé, pas appliqué", () => {
    const { texte } = composerRecap(
      donnees({
        demandes: [{ reference: "RES-5", programmateur: "Camille Girard", lieu: "Bureau 12", date: "2026-11-15" }],
        changements: [
          { reference: "RES-6", statut: "terminee", commentaire: "Vu avec le responsable.", engagementCree: false },
          { reference: "RES-7", statut: "confirmee", commentaire: null, engagementCree: true },
        ],
        messagesInconnus: [{ reference: "RES-9", de: "Louise Moreau", texte: "Merci d'annuler la réservation de jeudi." }],
        raisons: ["référence inconnue : RES-9"],
      }),
    );
    expect(texte).toContain("DEMANDES REÇUES (1)\n- RES-5 : Camille Girard, Bureau 12, le 15/11/2026");
    expect(texte).toContain("- RES-6 : terminée — « Vu avec le responsable. »");
    expect(texte).toContain("- RES-7 : le programmateur dit « confirmée » ; l'engagement n'a pas changé, à vérifier");
    expect(texte).toContain("MESSAGES POUR UNE DEMANDE INCONNUE (1)\n- RES-9, de Louise Moreau : « Merci d'annuler");
    expect(texte).toContain("Mis de côté : référence inconnue (1)");
    expect(texte).not.toContain("Rien de neuf");
  });

  it("options et impayés : échéance, montant dans sa devise, statut", () => {
    const { texte } = composerRecap(
      donnees({
        options: [option("2026-10-10"), option("2026-10-22")],
        impayes: [concert({ cachet: 450000, devise: "JPY", statut: "joue" })],
      }),
    );
    expect(texte).toContain("(Zurich) : expirée le 10/10/2026");
    expect(texte).toContain("(Zurich) : expire le 22/10/2026");
    expect(texte).toMatch(/\(Metz\) : 450\s000\sJPY, joué/); // espaces insécables de l'écriture française
  });

  it("une liste longue s'arrête à 20 lignes", () => {
    const demandes = Array.from({ length: 23 }, (_, i) => ({ reference: `RES-${i}`, programmateur: "X", lieu: "Y", date: "2026-11-15" }));
    const { texte } = composerRecap(donnees({ demandes }));
    expect(texte).toContain("DEMANDES REÇUES (23)");
    expect(texte).toContain("- RES-19 :");
    expect(texte).not.toContain("- RES-20 :");
    expect(texte).toContain("… et 3 autres : voir le site");
  });
});
