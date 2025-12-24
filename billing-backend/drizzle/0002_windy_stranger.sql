CREATE TABLE IF NOT EXISTS "bill_approval_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bill_id" uuid NOT NULL,
	"action" varchar(50) NOT NULL,
	"performed_by" uuid,
	"notes" text,
	"old_status" "billing_status",
	"new_status" "billing_status",
	"old_approval_status" "approval_status",
	"new_approval_status" "approval_status",
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bill_approval_history_bill_idx" ON "bill_approval_history" ("bill_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bill_approval_history_performed_by_idx" ON "bill_approval_history" ("performed_by");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bill_approval_history" ADD CONSTRAINT "bill_approval_history_bill_id_bills_id_fk" FOREIGN KEY ("bill_id") REFERENCES "bills"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bill_approval_history" ADD CONSTRAINT "bill_approval_history_performed_by_users_id_fk" FOREIGN KEY ("performed_by") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
