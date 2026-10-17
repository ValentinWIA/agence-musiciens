import { describe, expect, it } from "vitest";
import {
  cachetsImpayes,
  composerRecap,
  optionARelancer,
  optionsQuiExpirent,
  regrouperRaisons,
  type ConcertPasse,
  type DonneesRecap,
  type OptionPosee,
} from "./recap";

const aujourdhui = "2026-10-18";

function option(expireLe: string): OptionPosee {
  return {
    titre: "Duo piano-violon",
    debut: new Date("2026-12-19T18:30:00Z"),
    pays: "Suisse",
    ville: "Zurich",
    salle: "Tonhalle",
    musiciens: ["Hugo Lambert", "Inès Moreau"],
    expireLe,
  };
}

function concert(modif: Partial<ConcertPasse> = {}): ConcertPasse {
  return {
    titre: "Récital",
    debut: new Date("2026-09-01T18:00:00Z"),
    pays: "France",
    ville: "Metz",
    salle: "Arsenal",
    musiciens: ["Anna Petit"],
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

describe("optionARelancer", () => {
  it("vrai à 7 jours pile et pour une échéance passée, faux à 8 jours", () => {
    expect(optionARelancer("2026-10-25", aujourdhui)).toBe(true);
    expect(optionARelancer("2026-10-10", aujourdhui)).toBe(true);
    expect(optionARelancer("2026-10-26", aujourdhui)).toBe(false);
  });
});

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
  it("rien de neuf : le récap part quand même, sans groupe vide, avec l'import", () => {
    const { sujet, texte } = composerRecap(donnees());
    expect(sujet).toBe("Récap du matin — dimanche 18 octobre");
    expect(texte).toContain("Rien de neuf cette nuit.");
    expect(texte).not.toContain("EN BREF");
    expect(texte).not.toContain("À FAIRE");
    expect(texte).not.toContain("REÇU DU FLUX");
    expect(texte).toContain("IMPORT\nNuit du 18/10 importée : 15 reçus, 2 doublons, 0 mis de côté.");
    expect(texte).not.toContain("/nuit"); // rien de mis de côté : pas de lien vers le détail
    expect(texte).toContain("https://agence-musiciens.vercel.app");
  });

  it("en bref compte ce qui est présent, au singulier ou au pluriel", () => {
    const { texte } = composerRecap(donnees({ options: [option("2026-10-20"), option("2026-10-22")], impayes: [concert()] }));
    expect(texte).toContain("EN BREF\n• 2 options à relancer\n• 1 cachet impayé\n\n");
  });

  it("plusieurs nuits en une phrase ; une panne garde sa ligne et va dans le sujet", () => {
    const { sujet, texte } = composerRecap(
      donnees({
        nuits: [
          { nuitDu: "2026-09-20", etat: "reussie", recus: 16, doublons: 2, misDeCote: 3, erreur: null },
          { nuitDu: "2026-09-21", etat: "reussie", recus: 12, doublons: 2, misDeCote: 1, erreur: null },
          { nuitDu: "2026-09-22", etat: "en_echec", recus: 0, doublons: 0, misDeCote: 0, erreur: "délai dépassé" },
        ],
        raisons: ["référence inconnue : RES-1", "référence inconnue : RES-2", "champ invalide : donnees.debut", "référence inconnue : RES-3"],
      }),
    );
    expect(sujet).toContain("(import en échec)");
    expect(texte).toContain(
      "2 nuits importées (du 20/09 au 21/09) : 28 reçus, 4 doublons, 4 mis de côté (référence inconnue : 3, champ invalide : 1).",
    );
    expect(texte).toContain("Nuit du 22/09 : import en échec (délai dépassé), elle sera réessayée.");
    expect(texte).toContain("Détail des événements mis de côté : https://agence-musiciens.vercel.app/nuit");
  });

  it("à faire : artistes d'abord, salle et ville, échéance, montant et jours écoulés", () => {
    const { texte } = composerRecap(
      donnees({
        options: [option("2026-10-15"), option("2026-10-22")],
        impayes: [concert({ cachet: 450000, devise: "JPY", statut: "joue", debut: new Date("2026-06-20T19:00:00Z") })],
        messages: [{ reference: "RES-4", de: "Louise Moreau", texte: "Merci d'annuler la réservation de jeudi." }],
      }),
    );
    expect(texte).toContain("À FAIRE\n\nOptions à relancer\n• Hugo Lambert et Inès Moreau — Duo piano-violon, Tonhalle (Zurich)");
    expect(texte).toContain("  concert le sam. 19/12/2026 · option expirée le 15/10");
    expect(texte).toContain("  concert le sam. 19/12/2026 · option jusqu'au jeu. 22/10");
    expect(texte).toContain("Cachets impayés\n• Anna Petit — Récital, Arsenal (Metz)");
    expect(texte).toMatch(/ {2}joué le 20\/06\/2026 · 450\s000\sJPY · joué, il y a 120 jours/); // espaces insécables
    expect(texte).toContain("Messages à lire\n• Louise Moreau (réf. RES-4) :\n  « Merci d'annuler la réservation de jeudi. »");
  });

  it("reçu du flux : l'écart avec un engagement existant est signalé, pas appliqué", () => {
    const { texte } = composerRecap(
      donnees({
        demandes: [{ reference: "RES-5", programmateur: "Camille Girard", lieu: "Bureau 12", date: "2026-11-15" }],
        changements: [
          { reference: "RES-6", statut: "terminee", commentaire: "Vu avec le responsable.", engagementCree: false },
          { reference: "RES-7", statut: "confirmee", commentaire: null, engagementCree: true },
        ],
        messagesInconnus: [{ reference: "RES-9", de: "Louise Moreau", texte: "Décalez à vendredi." }],
      }),
    );
    expect(texte).toContain("REÇU DU FLUX\n\nNouvelles demandes\n• Camille Girard — Bureau 12, le dim. 15/11/2026 (réf. RES-5)");
    expect(texte).toContain("• RES-6 : terminée — « Vu avec le responsable. »");
    expect(texte).toContain("• RES-7 : le programmateur dit « confirmée »\n  l'engagement n'a pas changé : à vérifier");
    expect(texte).toContain("Messages pour une demande inconnue\n• Louise Moreau (réf. RES-9) :");
    expect(texte).not.toContain("À FAIRE");
  });

  it("une liste longue s'arrête à 20 lignes", () => {
    const demandes = Array.from({ length: 23 }, (_, i) => ({ reference: `RES-${i}`, programmateur: "X", lieu: "Y", date: "2026-11-15" }));
    const { texte } = composerRecap(donnees({ demandes }));
    expect(texte).toContain("• 23 nouvelles demandes");
    expect(texte).toContain("(réf. RES-19)");
    expect(texte).not.toContain("(réf. RES-20)");
    expect(texte).toContain("• … et 3 autres");
    expect(texte).not.toContain("voir le site");
  });
});
