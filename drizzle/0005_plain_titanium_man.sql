CREATE TABLE "permissions" (
	"id" serial NOT NULL,
	"uuid" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"documentId" uuid NOT NULL,
	"can_read" boolean DEFAULT false,
	"can_update" boolean DEFAULT false,
	"can_delete" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "permissions" ADD CONSTRAINT "permissions_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "permissions" ADD CONSTRAINT "permissions_documentId_documents_id_fk" FOREIGN KEY ("documentId") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;