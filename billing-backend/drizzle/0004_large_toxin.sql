CREATE TABLE IF NOT EXISTS "bill_approval_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bill_id" uuid NOT NULL,
	"action" varchar(50) NOT NULL,
	"performed_by" uuid,
	"notes" text,
	"old_status" varchar(50),
	"new_status" varchar(50),
	"old_approval_status" varchar(50),
	"new_approval_status" varchar(50),
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "expense_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"type" varchar(50) DEFAULT 'EXPENSE' NOT NULL,
	"description" text,
	"is_system" boolean DEFAULT false NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"category_id" uuid,
	"amount" numeric(15, 2) NOT NULL,
	"date" timestamp DEFAULT now() NOT NULL,
	"description" text,
	"payment_method" "payment_method" DEFAULT 'CASH' NOT NULL,
	"reference_number" varchar(100),
	"receipt_url" text,
	"vendor" varchar(255),
	"linked_bill_id" uuid,
	"linked_user_id" uuid,
	"status" varchar(50) DEFAULT 'PAID' NOT NULL,
	"created_by" uuid,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bill_approval_history_bill_idx" ON "bill_approval_history" ("bill_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bill_approval_history_performed_by_idx" ON "bill_approval_history" ("performed_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "expense_categories_business_idx" ON "expense_categories" ("business_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "expense_categories_type_idx" ON "expense_categories" ("type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "expenses_business_idx" ON "expenses" ("business_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "expenses_category_idx" ON "expenses" ("category_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "expenses_date_idx" ON "expenses" ("date");--> statement-breakpoint
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
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "expense_categories" ADD CONSTRAINT "expense_categories_business_id_retail_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "retail_businesses"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "expenses" ADD CONSTRAINT "expenses_business_id_retail_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "retail_businesses"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "expenses" ADD CONSTRAINT "expenses_category_id_expense_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "expense_categories"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "expenses" ADD CONSTRAINT "expenses_linked_bill_id_bills_id_fk" FOREIGN KEY ("linked_bill_id") REFERENCES "bills"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "expenses" ADD CONSTRAINT "expenses_linked_user_id_users_id_fk" FOREIGN KEY ("linked_user_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "expenses" ADD CONSTRAINT "expenses_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
