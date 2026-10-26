CREATE TABLE "courriels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"identifiant" text NOT NULL,
	"expediteur" text NOT NULL,
	"objet" text NOT NULL,
	"date_envoi" timestamp with time zone,
	"texte" text NOT NULL,
	"courrier_id" uuid,
	"importe_par" uuid,
	"importe_le" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "courriels_identifiant_unique" UNIQUE("identifiant")
);
--> statement-breakpoint
ALTER TABLE "courriels" ADD CONSTRAINT "courriels_courrier_id_courriers_id_fk" FOREIGN KEY ("courrier_id") REFERENCES "public"."courriers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courriels" ADD CONSTRAINT "courriels_importe_par_utilisateurs_id_fk" FOREIGN KEY ("importe_par") REFERENCES "public"."utilisateurs"("id") ON DELETE set null ON UPDATE no action;