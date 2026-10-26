-- Doublons déjà en base (avant cette règle) : seule la plus ancienne relance en attente d'un engagement est gardée.
UPDATE "propositions" p SET "etat" = 'refusee', "decide_le" = now(), "erreur" = 'doublon refusé à la migration 0023'
WHERE p."etat" IN ('en_attente', 'envoi_en_cours') AND EXISTS (
  SELECT 1 FROM "propositions" q WHERE q."engagement_id" = p."engagement_id"
    AND q."etat" IN ('en_attente', 'envoi_en_cours') AND q."cree_le" < p."cree_le"
);--> statement-breakpoint
CREATE UNIQUE INDEX "une_relance_en_attente_par_engagement" ON "propositions" USING btree ("engagement_id") WHERE "propositions"."etat" in ('en_attente', 'envoi_en_cours');