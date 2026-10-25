CREATE TYPE "public"."etat_agent" AS ENUM('en_cours', 'terminee', 'arretee_tours', 'arretee_budget', 'arretee_duree', 'en_echec');--> statement-breakpoint
CREATE TYPE "public"."porte_agent" AS ENUM('page', 'mcp');--> statement-breakpoint
CREATE TABLE "executions_agent" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"utilisateur_id" uuid,
	"porte" "porte_agent" NOT NULL,
	"demande" text NOT NULL,
	"etat" "etat_agent" DEFAULT 'en_cours' NOT NULL,
	"debut_le" timestamp with time zone DEFAULT now() NOT NULL,
	"fin_le" timestamp with time zone,
	"tours" integer,
	"cout" integer,
	"reponse" text,
	"erreur" text,
	"etapes" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "executions_agent" ADD CONSTRAINT "executions_agent_utilisateur_id_utilisateurs_id_fk" FOREIGN KEY ("utilisateur_id") REFERENCES "public"."utilisateurs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "un_seul_agent_en_cours" ON "executions_agent" USING btree ("etat") WHERE "executions_agent"."etat" = 'en_cours';