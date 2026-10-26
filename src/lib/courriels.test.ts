import PostalMime from "postal-mime";
import { describe, expect, it } from "vitest";
import { extraireCourriel, htmlEnTexte, identifiantCourriel, schemaEnvoi, texteDuCourriel } from "./courriels";

// Courriels fictifs, écrits comme les enregistre une messagerie.
const TEXTE = [
  "From: Salle Gaveau <programmation@gaveau.test>",
  "To: claire@cm-management.test",
  "Subject: =?UTF-8?Q?R=C3=A9cital_du_14_mars?=",
  "Date: Mon, 26 Oct 2026 10:00:00 +0100",
  "Message-ID: <recital-14-mars@gaveau.test>",
  "Content-Type: text/plain; charset=utf-8",
  "",
  "Bonjour Claire,",
  "Nous confirmons le récital du 14 mars 2027.",
].join("\r\n");

const HTML = [
  "From: prog@opera.test",
  "Subject: Facture",
  "Content-Type: text/html; charset=utf-8",
  "",
  "<p>Bonjour&nbsp;<b>Claire</b>,</p><p>Ci-joint la facture &amp; le RIB.</p><style>p{}</style>",
].join("\r\n");

describe("lecture d'un .eml", () => {
  it("garde expéditeur, objet décodé, date et identifiant", async () => {
    const c = extraireCourriel(await PostalMime.parse(TEXTE));
    expect(c).toEqual({
      messageId: "<recital-14-mars@gaveau.test>",
      expediteur: "Salle Gaveau <programmation@gaveau.test>",
      objet: "Récital du 14 mars",
      date: "2026-10-26T09:00:00.000Z",
      texte: "Bonjour Claire,\nNous confirmons le récital du 14 mars 2027.",
    });
    expect(schemaEnvoi.safeParse([c]).success).toBe(true);
  });

  it("un courriel en HTML seulement donne son texte, sans balises", async () => {
    const c = extraireCourriel(await PostalMime.parse(HTML));
    expect(c?.texte).toBe("Bonjour Claire,\nCi-joint la facture & le RIB.");
    expect(c?.expediteur).toBe("prog@opera.test");
    expect(c?.messageId).toBeNull();
    expect(c?.date).toBeNull();
  });

  it("un courriel sans texte est illisible", () => {
    expect(extraireCourriel({ subject: "vide", text: "   " })).toBeNull();
    expect(extraireCourriel({ html: "<p> </p>" })).toBeNull();
  });

  it("sans objet ni expéditeur : des libellés plutôt que du vide", () => {
    expect(extraireCourriel({ text: "Bonjour" })).toMatchObject({ objet: "(sans objet)", expediteur: "expéditeur inconnu" });
  });

  it("htmlEnTexte décode les accents écrits en entités", () => {
    expect(htmlEnTexte("ao&ucirc;t : 1&nbsp;800&nbsp;&euro;, &agrave; r&eacute;gler &#233; &#xE9; &inconnu;")).toBe("août : 1 800 €, à régler é é &inconnu;");
  });

  it("htmlEnTexte retire scripts et styles", () => {
    expect(htmlEnTexte("<script>alert(1)</script>a<br>b")).toBe("a\nb");
  });
});

describe("doublons", () => {
  it("le Message-ID sert d'identifiant", async () => {
    const c = extraireCourriel(await PostalMime.parse(TEXTE))!;
    expect(await identifiantCourriel(c)).toBe("<recital-14-mars@gaveau.test>");
  });

  it("sans Message-ID : même courriel, même empreinte ; texte différent, empreinte différente", async () => {
    const a = extraireCourriel(await PostalMime.parse(HTML))!;
    const b = extraireCourriel(await PostalMime.parse(HTML))!;
    expect(await identifiantCourriel(a)).toBe(await identifiantCourriel(b));
    expect(await identifiantCourriel(a)).toMatch(/^empreinte:[0-9a-f]{64}$/);
    expect(await identifiantCourriel({ ...a, texte: "autre" })).not.toBe(await identifiantCourriel(a));
  });

  it("le serveur refuse un envoi trop gros ou mal formé", () => {
    const c = { messageId: null, expediteur: "x", objet: "y", date: null, texte: "z" };
    expect(schemaEnvoi.safeParse(Array(21).fill(c)).success).toBe(false);
    expect(schemaEnvoi.safeParse([{ ...c, date: "hier" }]).success).toBe(false);
    expect(schemaEnvoi.safeParse([]).success).toBe(false);
  });
});

describe("texte donné à l'IA pour un courriel importé", () => {
  it("en-tête puis texte ; sans date, pas de ligne Date", () => {
    const c = { expediteur: "Salle Gaveau <p@gaveau.test>", objet: "Récital", texte: "Bonjour" };
    expect(texteDuCourriel({ ...c, dateEnvoi: new Date("2026-10-19T08:00:00Z") })).toBe(
      "De : Salle Gaveau <p@gaveau.test>\nDate : 19 octobre 2026 à 10:00\nObjet : Récital\n\nBonjour",
    );
    expect(texteDuCourriel({ ...c, dateEnvoi: null })).toBe("De : Salle Gaveau <p@gaveau.test>\nObjet : Récital\n\nBonjour");
  });
});
