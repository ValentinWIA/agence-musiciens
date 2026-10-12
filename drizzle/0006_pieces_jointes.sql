CREATE TYPE "public"."type_piece" AS ENUM('contrat', 'fiche_technique', 'autre');--> statement-breakpoint
CREATE TABLE "pieces_jointes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"engagement_id" uuid NOT NULL,
	"type" "type_piece" NOT NULL,
	"nom_fichier" text NOT NULL,
	"taille" integer NOT NULL,
	"chemin" text NOT NULL,
	"ajoutee_par" uuid NOT NULL,
	"ajoutee_le" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pieces_jointes_chemin_unique" UNIQUE("chemin")
);
--> statement-breakpoint
ALTER TABLE "pieces_jointes" ADD CONSTRAINT "pieces_jointes_engagement_id_engagements_id_fk" FOREIGN KEY ("engagement_id") REFERENCES "public"."engagements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pieces_jointes" ADD CONSTRAINT "pieces_jointes_ajoutee_par_utilisateurs_id_fk" FOREIGN KEY ("ajoutee_par") REFERENCES "public"."utilisateurs"("id") ON DELETE no action ON UPDATE no action;