import { describe, expect, it } from "vitest";
import { schemaLecture, schemaSaisie, verifierLecture, type Lecture } from "./courrier";
import flux from "./courriers.flux.json";

// Les 10 courriers fournis par le flux (sujet reservations, lus le 18/10/2026).
const courrier = (n: string) => flux.courriers.find((c) => c.id === `COU-reservations-${n}`)!.texte;

// Une lecture fidèle de COU-01, telle qu'un modèle devrait la rendre.
const lectureCou01: Lecture = {
  structure: { valeur: "Cabinet Roche", extrait: "Cabinet Roche" },
  signataire: { valeur: "Maëlle Fournier", extrait: "Maëlle Fournier" },
  date: { valeur: "2026-03-21", extrait: "Le 21 mars 2026" },
  reference: { valeur: "RES-2024-589", extrait: "réservation RES-2024-589" },
  montant: { valeur: "5250.11", extrait: "Le montant concerné est de 5 250,11 euros" },
  typeDossier: { valeur: "permanence", extrait: "Il s'agit d'un dossier de type permanence" },
  classement: { valeur: "changement", raison: "Passage de six à douze personnes." },
};

describe("vérification d'une lecture", () => {
  it("marque « vérifié » chaque champ dont l'extrait est dans le courrier", () => {
    const v = verifierLecture(courrier("01"), lectureCou01);
    for (const nom of ["structure", "signataire", "date", "reference", "montant", "typeDossier"] as const) {
      expect(v[nom].etat, nom).toBe("verifie");
    }
  });

  it("tolère les espaces, la casse et l'apostrophe typographique dans l'extrait", () => {
    const lecture = { ...lectureCou01, typeDossier: { valeur: "permanence", extrait: "il s’agit d’un  dossier de TYPE permanence" } };
    expect(verifierLecture(courrier("01"), lecture).typeDossier.etat).toBe("verifie");
  });

  it("COU-07 sans montant : un champ laissé vide est « absent du courrier »", () => {
    const lecture = { ...lectureCou01, montant: { valeur: null, extrait: null } };
    expect(verifierLecture(courrier("07"), lecture).montant.etat).toBe("absent");
  });

  it("COU-07 : un montant inventé est « à relire » (aucun extrait ne peut le justifier)", () => {
    const lecture = { ...lectureCou01, montant: { valeur: "2961.45", extrait: "Le montant concerné est de 2 961,45 euros" } };
    const v = verifierLecture(courrier("07"), lecture).montant;
    expect(v.etat).toBe("a_relire");
    expect(v.pourquoi).toMatch(/introuvable/);
  });

  it("COU-04 « la semaine dernière » : une date calculée est « à relire »", () => {
    const lecture = { ...lectureCou01, date: { valeur: "2026-10-11", extrait: "Le la semaine dernière" } };
    const v = verifierLecture(courrier("04"), lecture).date;
    expect(v.etat).toBe("a_relire");
    expect(v.pourquoi).toMatch(/pas écrite/);
  });

  it("un montant qui ne correspond pas à son extrait est « à relire » (extrait juste, valeur fausse)", () => {
    const lecture = { ...lectureCou01, montant: { valeur: "5205.11", extrait: "5 250,11 euros" } };
    expect(verifierLecture(courrier("01"), lecture).montant.etat).toBe("a_relire");
  });

  it("une valeur sans extrait est « à relire »", () => {
    const lecture = { ...lectureCou01, signataire: { valeur: "Maëlle Fournier", extrait: null } };
    expect(verifierLecture(courrier("01"), lecture).signataire.etat).toBe("a_relire");
  });

  it("un montant rond s'écrit avec ou sans centimes", () => {
    const texte = "Objet : réservation RES-1\nLe montant est de 3 000 euros.";
    const lecture = { ...lectureCou01, montant: { valeur: "3000", extrait: "3 000 euros" } };
    expect(verifierLecture(texte, lecture).montant.etat).toBe("verifie");
  });
});

describe("format imposé au modèle", () => {
  it("refuse une réponse dont le classement sort de la liste", () => {
    const reponse = { ...lectureCou01, classement: { valeur: "réclamation", raison: "…" } };
    expect(schemaLecture.safeParse(reponse).success).toBe(false);
  });

  it("refuse une réponse à laquelle il manque un champ", () => {
    const incomplete: Partial<Lecture> = { ...lectureCou01 };
    delete incomplete.montant;
    expect(schemaLecture.safeParse(incomplete).success).toBe(false);
  });
});

describe("saisie validée par l'agent", () => {
  const saisie = {
    texte: courrier("01"),
    modele: "claude-haiku-5-5",
    structure: "Cabinet Roche",
    signataire: "",
    date: "",
    reference: "RES-2024-589",
    montant: "5 250,11",
    typeDossier: "permanence",
    classement: "changement",
  };

  it("garde le montant en centimes et vide les champs laissés vides", () => {
    const r = schemaSaisie.parse(saisie);
    expect(r.montant).toBe(525011);
    expect(r.signataire).toBeNull();
    expect(r.date).toBeNull();
  });

  it("refuse un montant illisible", () => {
    expect(schemaSaisie.safeParse({ ...saisie, montant: "beaucoup" }).success).toBe(false);
  });
});
