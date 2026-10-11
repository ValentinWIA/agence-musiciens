CREATE TABLE "invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"nom" text NOT NULL,
	"instrument" "instrument" NOT NULL,
	"jeton_hash" text NOT NULL,
	"expire_le" timestamp with time zone NOT NULL,
	"acceptee_le" timestamp with time zone,
	"cree_par" uuid NOT NULL,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invitations_jeton_hash_unique" UNIQUE("jeton_hash")
);
--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_cree_par_utilisateurs_id_fk" FOREIGN KEY ("cree_par") REFERENCES "public"."utilisateurs"("id") ON DELETE no action ON UPDATE no action;