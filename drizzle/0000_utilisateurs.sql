CREATE TYPE "public"."instrument" AS ENUM('piano', 'violon');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('admin', 'musicien');--> statement-breakpoint
CREATE TABLE "utilisateurs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"nom" text NOT NULL,
	"role" "role" NOT NULL,
	"instrument" "instrument",
	"mot_de_passe_hash" text NOT NULL,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "utilisateurs_email_unique" UNIQUE("email")
);
