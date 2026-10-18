CREATE TABLE "appels_ia" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"utilisateur_id" uuid,
	"fonction" text NOT NULL,
	"modele" text NOT NULL,
	"jetons_entree" integer NOT NULL,
	"jetons_sortie" integer NOT NULL,
	"cout" integer NOT NULL,
	"duree_ms" integer NOT NULL,
	"reussi" boolean NOT NULL,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "appels_ia" ADD CONSTRAINT "appels_ia_utilisateur_id_utilisateurs_id_fk" FOREIGN KEY ("utilisateur_id") REFERENCES "public"."utilisateurs"("id") ON DELETE set null ON UPDATE no action;