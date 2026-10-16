import { describe, expect, it } from "vitest";
import {
  BIOGRAPHIE_MAX,
  cachetMoyen,
  PHOTO_MAX_OCTETS,
  recapEngagements,
  REPERTOIRE_MAX_LIGNES,
  verifierFiche,
  verifierPhoto,
} from "./musiciens";

describe("vérification de la fiche", () => {
  it("accepte une fiche normale, nettoie les espaces et les lignes vides du répertoire", () => {
    expect(verifierFiche({ biographie: "  Pianiste lyonnais.  ", repertoire: "Bach, Partita n° 2\n\n  Ravel, Gaspard  \n" })).toEqual({
      fiche: { biographie: "Pianiste lyonnais.", repertoire: "Bach, Partita n° 2\nRavel, Gaspard" },
    });
  });

  it("accepte une fiche vide (cas vide) : rien à afficher", () => {
    expect(verifierFiche({ biographie: "   ", repertoire: "\n \n" })).toEqual({ fiche: { biographie: null, repertoire: null } });
  });

  it("biographie : 2 000 caractères acceptés, un de plus refusé (limite)", () => {
    expect(verifierFiche({ biographie: "a".repeat(BIOGRAPHIE_MAX), repertoire: "" })).toHaveProperty("fiche");
    expect(verifierFiche({ biographie: "a".repeat(BIOGRAPHIE_MAX + 1), repertoire: "" })).toEqual({
      erreurs: { biographie: ["2000 caractères au plus (actuellement 2001)."] },
    });
  });

  it("répertoire : 100 œuvres acceptées, 101 refusées ; les lignes vides ne comptent pas (limite)", () => {
    const oeuvres = (n: number) => Array.from({ length: n }, (_, i) => `Œuvre ${i}`).join("\n");
    expect(verifierFiche({ biographie: "", repertoire: oeuvres(REPERTOIRE_MAX_LIGNES) + "\n\n\n" })).toHaveProperty("fiche");
    expect(verifierFiche({ biographie: "", repertoire: oeuvres(REPERTOIRE_MAX_LIGNES + 1) })).toEqual({
      erreurs: { repertoire: ["100 œuvres au plus (actuellement 101)."] },
    });
  });

  it("refuse une ligne de répertoire trop longue (un texte collé sur une ligne) et signale les deux champs", () => {
    expect(verifierFiche({ biographie: "a".repeat(BIOGRAPHIE_MAX + 1), repertoire: "x".repeat(201) })).toEqual({
      erreurs: {
        biographie: ["2000 caractères au plus (actuellement 2001)."],
        repertoire: ["Une œuvre par ligne, 200 caractères au plus par ligne."],
      },
    });
  });
});

describe("vérification de la photo", () => {
  const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
  const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const WEBP = new TextEncoder().encode("RIFF\x10\x00\x00\x00WEBP");

  it("reconnaît JPEG, PNG et WebP par leur contenu, quel que soit le nom", () => {
    expect(verifierPhoto({ nom: "portrait.jpg", taille: 1000, debut: JPEG })).toEqual({ photo: { type: "image/jpeg", taille: 1000 } });
    expect(verifierPhoto({ nom: "portrait.jpg", taille: 1000, debut: PNG })).toEqual({ photo: { type: "image/png", taille: 1000 } });
    expect(verifierPhoto({ nom: "sans-extension", taille: 1000, debut: WEBP })).toEqual({ photo: { type: "image/webp", taille: 1000 } });
  });

  it("refuse un faux JPEG : un PDF renommé (cas piégé)", () => {
    expect(verifierPhoto({ nom: "photo.jpg", taille: 1000, debut: new TextEncoder().encode("%PDF-1.7") })).toEqual({
      erreur: "Ce fichier n'est pas une photo JPEG, PNG ou WebP.",
    });
  });

  it("refuse un « RIFF » qui n'est pas du WebP (un son WAV, par exemple)", () => {
    expect(verifierPhoto({ nom: "a.webp", taille: 1000, debut: new TextEncoder().encode("RIFF\x10\x00\x00\x00WAVE") })).toHaveProperty("erreur");
  });

  it("2 Mo acceptés, un octet de plus refusé (limite)", () => {
    expect(verifierPhoto({ nom: "a.jpg", taille: PHOTO_MAX_OCTETS, debut: JPEG })).toHaveProperty("photo");
    expect(verifierPhoto({ nom: "a.jpg", taille: PHOTO_MAX_OCTETS + 1, debut: JPEG })).toEqual({ erreur: "Cette photo dépasse 2 Mo." });
  });

  it("distingue « aucun fichier choisi » et « fichier vide » (cas vides)", () => {
    expect(verifierPhoto({ nom: "", taille: 0, debut: new Uint8Array() })).toEqual({ erreur: "Choisissez une photo." });
    expect(verifierPhoto({ nom: "a.jpg", taille: 0, debut: new Uint8Array() })).toEqual({ erreur: "Ce fichier est vide." });
  });
});

describe("récapitulatif des engagements", () => {
  const maintenant = new Date("2026-10-16T12:00:00Z");
  const e = (id: string, jour: string, statut: Parameters<typeof recapEngagements>[0][number]["statut"]) => ({
    id,
    debut: new Date(`${jour}T20:00:00Z`),
    statut,
  });

  it("aucun engagement (cas vide)", () => {
    expect(recapEngagements([], maintenant)).toEqual({ aVenir: [], derniersPasses: [], nombrePasses: 0, parStatut: {} });
  });

  it("à venir du plus proche au plus lointain ; passés du plus récent au plus ancien, 5 au plus avec le total", () => {
    const liste = [
      e("loin", "2027-03-01", "demande"),
      e("proche", "2026-10-20", "confirme"),
      ...["2026-01-10", "2026-02-10", "2026-03-10", "2026-04-10", "2026-05-10", "2026-06-10"].map((j, i) => e(`p${i}`, j, "paye")),
    ];
    const recap = recapEngagements(liste, maintenant);
    expect(recap.aVenir.map((x) => x.id)).toEqual(["proche", "loin"]);
    expect(recap.derniersPasses.map((x) => x.id)).toEqual(["p5", "p4", "p3", "p2", "p1"]);
    expect(recap.nombrePasses).toBe(6);
    expect(recap.parStatut).toEqual({ demande: 1, confirme: 1, paye: 6 });
  });

  it("un annulé n'est ni à venir ni passé, mais compté par statut", () => {
    const recap = recapEngagements([e("a", "2026-12-01", "annule"), e("b", "2026-01-01", "annule")], maintenant);
    expect(recap.aVenir).toEqual([]);
    expect(recap.nombrePasses).toBe(0);
    expect(recap.parStatut).toEqual({ annule: 2 });
  });
});

describe("cachet moyen", () => {
  it("aucun engagement tenu → aucune moyenne (affichée « — »)", () => {
    expect(cachetMoyen([])).toEqual([]);
    expect(cachetMoyen([{ statut: "option", cachet: 100000, devise: "EUR", nombreMusiciens: 1 }])).toEqual([]);
  });

  it("un duo à 3 000 € compte 1 500 € pour chacun", () => {
    expect(cachetMoyen([{ statut: "confirme", cachet: 300000, devise: "EUR", nombreMusiciens: 2 }])).toEqual([
      { devise: "EUR", moyenne: 150000, nombre: 1 },
    ]);
  });

  it("une moyenne par devise, sans conversion", () => {
    expect(
      cachetMoyen([
        { statut: "joue", cachet: 200000, devise: "EUR", nombreMusiciens: 1 },
        { statut: "paye", cachet: 300000, devise: "CHF", nombreMusiciens: 2 },
        { statut: "facture", cachet: 100000, devise: "EUR", nombreMusiciens: 1 },
      ]),
    ).toEqual([
      { devise: "EUR", moyenne: 150000, nombre: 2 },
      { devise: "CHF", moyenne: 150000, nombre: 1 },
    ]);
  });

  it("bénévole compte pour 0 ; « à définir » et annulé ne comptent pas", () => {
    expect(
      cachetMoyen([
        { statut: "confirme", cachet: 200000, devise: "EUR", nombreMusiciens: 1 },
        { statut: "joue", cachet: 0, devise: "EUR", nombreMusiciens: 1 },
        { statut: "confirme", cachet: null, devise: "EUR", nombreMusiciens: 1 },
        { statut: "annule", cachet: 900000, devise: "EUR", nombreMusiciens: 1 },
      ]),
    ).toEqual([{ devise: "EUR", moyenne: 100000, nombre: 2 }]);
  });

  it("arrondit au centime (1 000,01 € en duo → 500,01 €)", () => {
    expect(cachetMoyen([{ statut: "confirme", cachet: 100001, devise: "EUR", nombreMusiciens: 2 }])[0].moyenne).toBe(50001);
  });
});
