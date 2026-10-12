CREATE TYPE "public"."devise" AS ENUM('EUR', 'CHF', 'USD', 'GBP', 'JPY');--> statement-breakpoint
CREATE TYPE "public"."precision_date" AS ENUM('jour', 'mois', 'saison');--> statement-breakpoint
CREATE TYPE "public"."statut" AS ENUM('demande', 'option', 'contrat_envoye', 'confirme', 'joue', 'facture', 'paye', 'annule');--> statement-breakpoint
CREATE TABLE "engagement_musiciens" (
	"engagement_id" uuid NOT NULL,
	"musicien_id" uuid NOT NULL,
	CONSTRAINT "engagement_musiciens_engagement_id_musicien_id_pk" PRIMARY KEY("engagement_id","musicien_id")
);
--> statement-breakpoint
CREATE TABLE "engagements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"titre" text,
	"debut" timestamp with time zone NOT NULL,
	"precision_date" "precision_date" DEFAULT 'jour' NOT NULL,
	"duree_minutes" integer,
	"lieu_id" uuid NOT NULL,
	"programmateur_id" uuid NOT NULL,
	"statut" "statut" DEFAULT 'demande' NOT NULL,
	"cachet" integer,
	"devise" "devise" DEFAULT 'EUR' NOT NULL,
	"programme" text,
	"notes" text,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL,
	"modifie_le" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lieux" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nom" text NOT NULL,
	"adresse" text NOT NULL,
	"ville" text NOT NULL,
	"pays" text NOT NULL,
	"latitude" double precision,
	"longitude" double precision
);
--> statement-breakpoint
CREATE TABLE "programmateurs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nom" text NOT NULL,
	"structure" text NOT NULL,
	"email" text NOT NULL,
	"telephone" text
);
--> statement-breakpoint
ALTER TABLE "engagement_musiciens" ADD CONSTRAINT "engagement_musiciens_engagement_id_engagements_id_fk" FOREIGN KEY ("engagement_id") REFERENCES "public"."engagements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "engagement_musiciens" ADD CONSTRAINT "engagement_musiciens_musicien_id_utilisateurs_id_fk" FOREIGN KEY ("musicien_id") REFERENCES "public"."utilisateurs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "engagements" ADD CONSTRAINT "engagements_lieu_id_lieux_id_fk" FOREIGN KEY ("lieu_id") REFERENCES "public"."lieux"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "engagements" ADD CONSTRAINT "engagements_programmateur_id_programmateurs_id_fk" FOREIGN KEY ("programmateur_id") REFERENCES "public"."programmateurs"("id") ON DELETE no action ON UPDATE no action;