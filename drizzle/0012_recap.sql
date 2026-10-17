CREATE TABLE "recaps" (
	"jour" date PRIMARY KEY NOT NULL,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL,
	"envoye_le" timestamp with time zone,
	"destinataire" text
);
--> statement-breakpoint
ALTER TABLE "engagements" ADD COLUMN "option_expire_le" date;