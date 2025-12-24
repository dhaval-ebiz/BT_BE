CREATE TABLE IF NOT EXISTS "merchant_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"merchant_id" uuid NOT NULL,
	"payment_number" varchar(100) NOT NULL,
	"payment_date" timestamp NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"method" "payment_method" NOT NULL,
	"status" "payment_status" DEFAULT 'COMPLETED' NOT NULL,
	"reference_number" varchar(255),
	"notes" text,
	"created_by" uuid NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "merchant_payments_business_idx" ON "merchant_payments" ("business_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "merchant_payments_merchant_idx" ON "merchant_payments" ("merchant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "merchant_payments_date_idx" ON "merchant_payments" ("payment_date");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "merchant_payments" ADD CONSTRAINT "merchant_payments_business_id_retail_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "retail_businesses"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "merchant_payments" ADD CONSTRAINT "merchant_payments_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "merchant_payments" ADD CONSTRAINT "merchant_payments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
