CREATE EXTENSION IF NOT EXISTS vector;
--> statement-breakpoint
CREATE TABLE "passages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" text NOT NULL,
	"titre" text NOT NULL,
	"page" integer NOT NULL,
	"texte" text NOT NULL,
	"empreinte" text NOT NULL,
	"vecteur" vector(1024) NOT NULL,
	"indexe_le" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "passages_document_page" ON "passages" USING btree ("document_id","page");