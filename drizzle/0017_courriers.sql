CREATE TABLE "courriers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"texte" text NOT NULL,
	"structure" text,
	"signataire" text,
	"date_courrier" date,
	"reference" text,
	"montant" integer,
	"type_dossier" text,
	"classement" text NOT NULL,
	"modele" text NOT NULL,
	"cree_par" uuid,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "courriers" ADD CONSTRAINT "courriers_cree_par_utilisateurs_id_fk" FOREIGN KEY ("cree_par") REFERENCES "public"."utilisateurs"("id") ON DELETE set null ON UPDATE no action;