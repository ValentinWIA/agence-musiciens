CREATE TYPE "public"."etat_proposition" AS ENUM('en_attente', 'envoi_en_cours', 'envoyee', 'non_envoyee', 'refusee');--> statement-breakpoint
CREATE TABLE "propositions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"execution_id" uuid,
	"engagement_id" uuid,
	"objet" text NOT NULL,
	"destinataire" text NOT NULL,
	"destinataire_nom" text NOT NULL,
	"sujet" text NOT NULL,
	"texte" text NOT NULL,
	"etat" "etat_proposition" DEFAULT 'en_attente' NOT NULL,
	"erreur" text,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL,
	"decide_le" timestamp with time zone,
	"decide_par" uuid
);
--> statement-breakpoint
ALTER TABLE "propositions" ADD CONSTRAINT "propositions_execution_id_executions_agent_id_fk" FOREIGN KEY ("execution_id") REFERENCES "public"."executions_agent"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "propositions" ADD CONSTRAINT "propositions_engagement_id_engagements_id_fk" FOREIGN KEY ("engagement_id") REFERENCES "public"."engagements"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "propositions" ADD CONSTRAINT "propositions_decide_par_utilisateurs_id_fk" FOREIGN KEY ("decide_par") REFERENCES "public"."utilisateurs"("id") ON DELETE set null ON UPDATE no action;