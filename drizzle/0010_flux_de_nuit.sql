CREATE TYPE "public"."declencheur" AS ENUM('cron', 'bouton');--> statement-breakpoint
CREATE TYPE "public"."etat_evenement" AS ENUM('traite', 'doublon', 'mis_de_cote');--> statement-breakpoint
CREATE TYPE "public"."etat_execution" AS ENUM('en_cours', 'reussie', 'en_echec');--> statement-breakpoint
CREATE TYPE "public"."statut_demande" AS ENUM('demandee', 'confirmee', 'terminee', 'annulee');--> statement-breakpoint
CREATE TABLE "demandes_recues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference" text NOT NULL,
	"statut" "statut_demande" NOT NULL,
	"programmateur" text NOT NULL,
	"lieu" text NOT NULL,
	"date_concert" date NOT NULL,
	"duree_minutes" integer NOT NULL,
	"categorie" text NOT NULL,
	"recue_le" date NOT NULL,
	"commentaire" text,
	"engagement_id" uuid,
	CONSTRAINT "demandes_recues_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "evenements_flux" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"flux_id" text,
	"execution_id" uuid NOT NULL,
	"type" text,
	"reference" text,
	"horodatage" timestamp with time zone,
	"brut" jsonb NOT NULL,
	"etat" "etat_evenement" NOT NULL,
	"raison" text,
	CONSTRAINT "evenements_flux_flux_id_unique" UNIQUE("flux_id")
);
--> statement-breakpoint
CREATE TABLE "executions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nuit_du" date NOT NULL,
	"declencheur" "declencheur" NOT NULL,
	"etat" "etat_execution" DEFAULT 'en_cours' NOT NULL,
	"debut_le" timestamp with time zone DEFAULT now() NOT NULL,
	"fin_le" timestamp with time zone,
	"appels" integer DEFAULT 0 NOT NULL,
	"recus" integer DEFAULT 0 NOT NULL,
	"doublons" integer DEFAULT 0 NOT NULL,
	"traites" integer DEFAULT 0 NOT NULL,
	"mis_de_cote" integer DEFAULT 0 NOT NULL,
	"erreur" text
);
--> statement-breakpoint
ALTER TABLE "demandes_recues" ADD CONSTRAINT "demandes_recues_engagement_id_engagements_id_fk" FOREIGN KEY ("engagement_id") REFERENCES "public"."engagements"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evenements_flux" ADD CONSTRAINT "evenements_flux_execution_id_executions_id_fk" FOREIGN KEY ("execution_id") REFERENCES "public"."executions"("id") ON DELETE no action ON UPDATE no action;