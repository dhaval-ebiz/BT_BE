DO $$ BEGIN
 CREATE TYPE "ai_content_type" AS ENUM('BANNER', 'SQL_QUERY', 'TEXT', 'IMAGE', 'PROMOTION', 'DESCRIPTION', 'SOCIAL_POST');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "analytics_granularity" AS ENUM('HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "approval_status" AS ENUM('NOT_REQUIRED', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "billing_status" AS ENUM('DRAFT', 'PENDING', 'PAID', 'PARTIAL', 'OVERDUE', 'CANCELLED', 'VOID');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "business_type" AS ENUM('RETAIL', 'WHOLESALE', 'SERVICE', 'MANUFACTURING', 'WORKSHOP', 'HYBRID', 'RESTAURANT', 'ECOMMERCE');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "inventory_method" AS ENUM('FIFO', 'LIFO', 'AVERAGE', 'SPECIFIC', 'NONE');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "message_status" AS ENUM('PENDING', 'SENT', 'DELIVERED', 'FAILED', 'READ');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "message_type" AS ENUM('WHATSAPP', 'SMS', 'EMAIL', 'PUSH');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "notification_channel" AS ENUM('IN_APP', 'EMAIL', 'SMS', 'WHATSAPP', 'PUSH');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "payment_method" AS ENUM('CASH', 'CARD', 'UPI', 'BANK_TRANSFER', 'CHEQUE', 'DIGITAL_WALLET', 'NET_BANKING', 'OTHER');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "payment_status" AS ENUM('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED', 'CANCELLED', 'PROCESSING');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "permission_action" AS ENUM('CREATE', 'READ', 'UPDATE', 'DELETE', 'APPROVE', 'EXPORT', 'MANAGE', 'VOID');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "permission_resource" AS ENUM('DASHBOARD', 'CUSTOMERS', 'MERCHANTS', 'PRODUCTS', 'BILLS', 'PAYMENTS', 'REPORTS', 'SETTINGS', 'USERS', 'ROLES', 'MESSAGES', 'AI_FEATURES', 'ANALYTICS', 'MONEY_MANAGEMENT', 'INVENTORY', 'APPROVALS', 'AUDIT_LOGS');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "product_type" AS ENUM('PHYSICAL_PRODUCT', 'RAW_MATERIAL', 'SERVICE', 'COMPOSITE', 'DIGITAL', 'CONSUMABLE');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "product_unit" AS ENUM('KG', 'GRAM', 'LITER', 'MILLILITER', 'PIECE', 'DOZEN', 'METER', 'FEET', 'BOX', 'BUNDLE', 'INCH', 'YARD', 'HOUR', 'DAY', 'SERVICE', 'NOT_APPLICABLE', 'TON', 'QUINTAL');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "recurring_frequency" AS ENUM('DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "stock_movement_type" AS ENUM('PURCHASE', 'SALE', 'RETURN', 'ADJUSTMENT', 'TRANSFER', 'DAMAGE', 'EXPIRED', 'CONSUMPTION', 'PRODUCTION');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "subscription_plan" AS ENUM('FREE', 'BASIC', 'PREMIUM', 'ENTERPRISE', 'CUSTOM');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "transaction_type" AS ENUM('DEPOSIT', 'WITHDRAWAL', 'TRANSFER_IN', 'TRANSFER_OUT', 'PAYMENT', 'REFUND', 'ADJUSTMENT', 'BILL_PAYMENT', 'ADVANCE_PAYMENT', 'CREDIT_NOTE', 'DEBIT_NOTE');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "user_role" AS ENUM('SUPER_ADMIN', 'RETAIL_OWNER', 'MANAGER', 'CASHIER', 'VIEWER', 'ACCOUNTANT');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "user_status" AS ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING', 'DELETED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ai_generated_content" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "ai_content_type" NOT NULL,
	"prompt" text NOT NULL,
	"content" text,
	"image_url" text,
	"model" varchar(100),
	"provider" varchar(100),
	"tokens_used" integer,
	"cost" numeric(10, 6),
	"generation_time" integer,
	"status" varchar(50) DEFAULT 'COMPLETED' NOT NULL,
	"error_message" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid,
	"user_id" uuid,
	"action" varchar(100) NOT NULL,
	"action_type" varchar(50) NOT NULL,
	"entity_type" varchar(100) NOT NULL,
	"entity_id" varchar(255),
	"entity_name" varchar(255),
	"old_values" jsonb,
	"new_values" jsonb,
	"changes" jsonb,
	"ip_address" varchar(45),
	"user_agent" text,
	"request_id" varchar(100),
	"severity" varchar(20) DEFAULT 'INFO' NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bill_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bill_id" uuid NOT NULL,
	"product_id" uuid,
	"variant_id" uuid,
	"item_type" varchar(50) DEFAULT 'PRODUCT' NOT NULL,
	"product_name" varchar(255) NOT NULL,
	"product_code" varchar(100),
	"description" text,
	"hsn_code" varchar(50),
	"sac_code" varchar(50),
	"unit" "product_unit" NOT NULL,
	"quantity" numeric(10, 2) NOT NULL,
	"rate" numeric(15, 2) NOT NULL,
	"discount_percent" numeric(5, 2) DEFAULT '0.00',
	"discount_amount" numeric(15, 2) DEFAULT '0.00',
	"tax_percent" numeric(5, 2) DEFAULT '0.00',
	"tax_amount" numeric(15, 2) DEFAULT '0.00',
	"subtotal" numeric(15, 2) NOT NULL,
	"total_amount" numeric(15, 2) NOT NULL,
	"cost_price" numeric(15, 2),
	"sort_order" integer DEFAULT 0,
	"notes" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"customer_id" uuid,
	"bill_number" varchar(100) NOT NULL,
	"bill_type" varchar(50) DEFAULT 'SALE' NOT NULL,
	"bill_date" timestamp NOT NULL,
	"due_date" timestamp,
	"status" "billing_status" DEFAULT 'DRAFT' NOT NULL,
	"approval_status" "approval_status" DEFAULT 'NOT_REQUIRED' NOT NULL,
	"subtotal" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"discount_amount" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"discount_percent" numeric(5, 2) DEFAULT '0.00',
	"tax_amount" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"shipping_cost" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"adjustment_amount" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"round_off_amount" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"total_amount" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"paid_amount" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"balance_amount" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"payment_method" "payment_method",
	"payment_status" "payment_status" DEFAULT 'PENDING',
	"payment_due_date" timestamp,
	"billing_address" jsonb,
	"shipping_address" jsonb,
	"notes" text,
	"internal_notes" text,
	"terms" text,
	"customer_notes" text,
	"requires_approval" boolean DEFAULT false NOT NULL,
	"created_by" uuid NOT NULL,
	"approved_by" uuid,
	"approved_at" timestamp,
	"rejected_by" uuid,
	"rejected_at" timestamp,
	"rejection_reason" text,
	"whatsapp_sent" boolean DEFAULT false NOT NULL,
	"whatsapp_sent_at" timestamp,
	"sms_sent" boolean DEFAULT false NOT NULL,
	"sms_sent_at" timestamp,
	"email_sent" boolean DEFAULT false NOT NULL,
	"email_sent_at" timestamp,
	"is_recurring" boolean DEFAULT false NOT NULL,
	"recurring_frequency" "recurring_frequency",
	"parent_bill_id" uuid,
	"voided_at" timestamp,
	"voided_by" uuid,
	"void_reason" text,
	"metadata" jsonb,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "bills_business_bill_number_idx" UNIQUE("business_id","bill_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "business_analytics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"period_type" "analytics_granularity" NOT NULL,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"total_revenue" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"total_cost" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"gross_profit" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"gross_profit_margin" numeric(5, 2) DEFAULT '0.00' NOT NULL,
	"total_bills" integer DEFAULT 0 NOT NULL,
	"paid_bills" integer DEFAULT 0 NOT NULL,
	"partial_bills" integer DEFAULT 0 NOT NULL,
	"overdue_bills" integer DEFAULT 0 NOT NULL,
	"total_customers" integer DEFAULT 0 NOT NULL,
	"new_customers" integer DEFAULT 0 NOT NULL,
	"active_customers" integer DEFAULT 0 NOT NULL,
	"churned_customers" integer DEFAULT 0 NOT NULL,
	"top_selling_products" jsonb,
	"low_stock_products" jsonb,
	"average_order_value" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"total_outstanding" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"total_advances" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"predicted_revenue" numeric(15, 2),
	"mrr_prediction" numeric(15, 2),
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "business_analytics_business_period_idx" UNIQUE("business_id","period_type","period_start")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "business_staff" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role_id" uuid,
	"position" varchar(100),
	"department" varchar(100),
	"employee_code" varchar(50),
	"salary" numeric(15, 2),
	"commission_rate" numeric(5, 2),
	"commission_type" varchar(50),
	"joined_at" timestamp DEFAULT now() NOT NULL,
	"left_at" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"can_create_bills" boolean DEFAULT true NOT NULL,
	"can_approve_bills" boolean DEFAULT false NOT NULL,
	"can_manage_money" boolean DEFAULT false NOT NULL,
	"can_access_reports" boolean DEFAULT false NOT NULL,
	"can_manage_inventory" boolean DEFAULT false NOT NULL,
	"can_manage_customers" boolean DEFAULT true NOT NULL,
	"can_give_discounts" boolean DEFAULT true NOT NULL,
	"max_bill_amount" numeric(15, 2),
	"max_discount_percent" numeric(5, 2) DEFAULT '0.00',
	"max_discount_amount" numeric(15, 2),
	"working_hours" jsonb,
	"weekly_hours" integer,
	"notes" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "business_staff_business_user_idx" UNIQUE("business_id","user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "customer_purchase_patterns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"purchase_count" integer DEFAULT 1 NOT NULL,
	"last_purchase_date" timestamp NOT NULL,
	"first_purchase_date" timestamp NOT NULL,
	"avg_purchase_interval" integer,
	"avg_quantity" numeric(10, 2),
	"avg_price" numeric(15, 2),
	"last_price" numeric(15, 2),
	"predicted_next_purchase" timestamp,
	"confidence" numeric(5, 2),
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "customer_purchase_patterns_customer_product_idx" UNIQUE("customer_id","product_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"customer_code" varchar(50) NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100),
	"company_name" varchar(255),
	"customer_type" varchar(50) DEFAULT 'INDIVIDUAL',
	"email" varchar(255),
	"phone" varchar(20),
	"alternate_phone" varchar(20),
	"whatsapp_number" varchar(20),
	"date_of_birth" timestamp,
	"anniversary" timestamp,
	"billing_address" jsonb,
	"shipping_address" jsonb,
	"gst_number" varchar(50),
	"pan_number" varchar(20),
	"credit_limit" numeric(15, 2) DEFAULT '0.00',
	"outstanding_balance" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"total_purchases" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"total_payments" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"wallet_balance" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"total_deposits" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"total_withdrawals" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"credit_days" integer DEFAULT 0,
	"is_credit_allowed" boolean DEFAULT false NOT NULL,
	"preferred_payment_method" "payment_method",
	"preferred_communication_channel" "notification_channel",
	"send_whatsapp_bills" boolean DEFAULT true NOT NULL,
	"send_sms_bills" boolean DEFAULT false NOT NULL,
	"send_email_bills" boolean DEFAULT false NOT NULL,
	"loyalty_points" integer DEFAULT 0 NOT NULL,
	"loyalty_tier" varchar(50),
	"lifetime_value" numeric(15, 2) DEFAULT '0.00',
	"notes" text,
	"tags" jsonb,
	"custom_fields" jsonb,
	"source" varchar(100),
	"referred_by" uuid,
	"last_purchase_date" timestamp,
	"total_bills_count" integer DEFAULT 0 NOT NULL,
	"avg_bill_amount" numeric(15, 2) DEFAULT '0.00',
	"frequent_products" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_blacklisted" boolean DEFAULT false NOT NULL,
	"blacklist_reason" text,
	"is_vip" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "customers_business_code_idx" UNIQUE("business_id","customer_code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "daily_sales_summary" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"summary_date" timestamp NOT NULL,
	"total_bills" integer DEFAULT 0 NOT NULL,
	"total_sales" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"total_payments" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"total_refunds" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"total_discounts" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"total_tax" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"cash_sales" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"card_sales" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"upi_sales" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"credit_sales" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"new_customers" integer DEFAULT 0 NOT NULL,
	"returning_customers" integer DEFAULT 0 NOT NULL,
	"unique_customers" integer DEFAULT 0 NOT NULL,
	"average_bill_value" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"highest_bill_amount" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"lowest_bill_amount" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "daily_sales_summary_business_date_idx" UNIQUE("business_id","summary_date")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "merchants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"merchant_code" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"company_name" varchar(255),
	"contact_person" varchar(255),
	"email" varchar(255),
	"phone" varchar(20),
	"alternate_phone" varchar(20),
	"whatsapp_number" varchar(20),
	"website" text,
	"address" jsonb,
	"account_number" varchar(100),
	"account_holder_name" varchar(255),
	"bank_name" varchar(255),
	"branch_name" varchar(255),
	"ifsc_code" varchar(20),
	"swift_code" varchar(20),
	"gst_number" varchar(50),
	"pan_number" varchar(20),
	"tax_number" varchar(100),
	"credit_limit" numeric(15, 2) DEFAULT '0.00',
	"outstanding_balance" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"total_purchases" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"total_payments" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"payment_terms" integer DEFAULT 30,
	"delivery_terms" text,
	"return_policy" text,
	"rating" numeric(3, 2),
	"total_orders" integer DEFAULT 0 NOT NULL,
	"avg_delivery_time" integer,
	"on_time_delivery_rate" numeric(5, 2),
	"categories" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_preferred" boolean DEFAULT false NOT NULL,
	"notes" text,
	"tags" jsonb,
	"metadata" jsonb,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "merchants_business_code_idx" UNIQUE("business_id","merchant_code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"customer_id" uuid,
	"bill_id" uuid,
	"type" "message_type" NOT NULL,
	"channel" "notification_channel" NOT NULL,
	"recipient" varchar(255) NOT NULL,
	"recipient_name" varchar(255),
	"subject" varchar(500),
	"content" text NOT NULL,
	"html_content" text,
	"status" "message_status" DEFAULT 'PENDING' NOT NULL,
	"provider" varchar(100),
	"provider_id" varchar(255),
	"provider_response" jsonb,
	"sent_at" timestamp,
	"delivered_at" timestamp,
	"read_at" timestamp,
	"failed_at" timestamp,
	"error_message" text,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"max_retries" integer DEFAULT 3 NOT NULL,
	"cost" numeric(10, 4),
	"attachments" jsonb,
	"scheduled_for" timestamp,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payment_allocations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payment_id" uuid NOT NULL,
	"bill_id" uuid NOT NULL,
	"allocated_amount" numeric(15, 2) NOT NULL,
	"bill_balance_before" numeric(15, 2) NOT NULL,
	"bill_balance_after" numeric(15, 2) NOT NULL,
	"allocation_date" timestamp DEFAULT now() NOT NULL,
	"allocation_order" integer DEFAULT 1 NOT NULL,
	"notes" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "payment_allocations_payment_bill_idx" UNIQUE("payment_id","bill_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"customer_id" uuid,
	"payment_number" varchar(100) NOT NULL,
	"payment_date" timestamp NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"allocated_amount" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"unallocated_amount" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"method" "payment_method" NOT NULL,
	"status" "payment_status" DEFAULT 'PENDING' NOT NULL,
	"reference_number" varchar(255),
	"transaction_id" varchar(255),
	"bank_name" varchar(255),
	"cheque_number" varchar(100),
	"cheque_date" timestamp,
	"upi_id" varchar(255),
	"card_last4" varchar(4),
	"card_brand" varchar(50),
	"notes" text,
	"internal_notes" text,
	"receipt_url" text,
	"created_by" uuid NOT NULL,
	"verified_by" uuid,
	"verified_at" timestamp,
	"metadata" jsonb,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "payments_business_payment_number_idx" UNIQUE("business_id","payment_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role_id" uuid NOT NULL,
	"resource" "permission_resource" NOT NULL,
	"action" "permission_action" NOT NULL,
	"conditions" jsonb,
	"is_allowed" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "permissions_role_resource_action_idx" UNIQUE("role_id","resource","action")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "product_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"description" text,
	"parent_id" uuid,
	"category_type" varchar(50) DEFAULT 'PRODUCT' NOT NULL,
	"image" text,
	"icon" varchar(100),
	"color" varchar(7),
	"sort_order" integer DEFAULT 0,
	"default_tax_rate" numeric(5, 2),
	"is_active" boolean DEFAULT true NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "product_categories_business_name_idx" UNIQUE("business_id","name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "product_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid,
	"variant_id" uuid,
	"image_url" text NOT NULL,
	"thumbnail_url" text,
	"image_type" varchar(50) DEFAULT 'PRODUCT' NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0,
	"alt_text" varchar(255),
	"caption" text,
	"file_size" integer,
	"mime_type" varchar(100),
	"width" integer,
	"height" integer,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "product_variants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"variant_name" varchar(100) NOT NULL,
	"attributes" jsonb NOT NULL,
	"sku" varchar(255),
	"barcode" varchar(255),
	"price_adjustment" numeric(15, 2) DEFAULT '0.00',
	"purchase_price" numeric(15, 2),
	"selling_price" numeric(15, 2),
	"mrp" numeric(15, 2),
	"stock_quantity" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"minimum_stock" numeric(10, 2),
	"weight" numeric(10, 3),
	"dimensions" jsonb,
	"images" jsonb,
	"primary_image" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"category_id" uuid,
	"product_code" varchar(100) NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255),
	"description" text,
	"short_description" varchar(500),
	"product_type" "product_type" DEFAULT 'PHYSICAL_PRODUCT' NOT NULL,
	"track_quantity" boolean DEFAULT true NOT NULL,
	"track_cost" boolean DEFAULT true NOT NULL,
	"is_service" boolean DEFAULT false NOT NULL,
	"service_duration" integer,
	"service_category" varchar(100),
	"includes_material" boolean DEFAULT false NOT NULL,
	"material_cost" numeric(15, 2) DEFAULT '0.00',
	"labor_cost" numeric(15, 2) DEFAULT '0.00',
	"unit" "product_unit" NOT NULL,
	"purchase_price" numeric(15, 2) DEFAULT '0.00',
	"selling_price" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"mrp" numeric(15, 2),
	"wholesale_price" numeric(15, 2),
	"min_selling_price" numeric(15, 2),
	"max_discount_percent" numeric(5, 2) DEFAULT '100.00',
	"tax_percent" numeric(5, 2) DEFAULT '0.00',
	"hsn_code" varchar(50),
	"sac_code" varchar(50),
	"is_taxable" boolean DEFAULT true NOT NULL,
	"tax_category" varchar(100),
	"current_stock" numeric(10, 2) DEFAULT '0.00',
	"minimum_stock" numeric(10, 2),
	"maximum_stock" numeric(10, 2),
	"reorder_point" numeric(10, 2),
	"reorder_quantity" numeric(10, 2),
	"barcode" varchar(255),
	"sku" varchar(255),
	"upc" varchar(50),
	"ean" varchar(50),
	"isbn" varchar(50),
	"qr_code" text,
	"weight" numeric(10, 3),
	"weight_unit" varchar(20) DEFAULT 'kg',
	"dimensions" jsonb,
	"images" jsonb,
	"primary_image" text,
	"thumbnail_image" text,
	"has_variants" boolean DEFAULT false NOT NULL,
	"variant_attributes" jsonb,
	"brand" varchar(255),
	"manufacturer" varchar(255),
	"country_of_origin" varchar(100),
	"specifications" jsonb,
	"features" jsonb,
	"tags" jsonb,
	"meta_title" varchar(255),
	"meta_description" text,
	"meta_keywords" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"is_available_online" boolean DEFAULT false NOT NULL,
	"view_count" integer DEFAULT 0 NOT NULL,
	"total_sold" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"total_revenue" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"last_sold_at" timestamp,
	"last_restocked_at" timestamp,
	"profit_margin" numeric(5, 2),
	"average_cost" numeric(15, 2),
	"metadata" jsonb,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "products_business_code_idx" UNIQUE("business_id","product_code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "qr_code_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"product_id" uuid,
	"batch_code" varchar(100) NOT NULL,
	"batch_name" varchar(255) NOT NULL,
	"total_codes" integer NOT NULL,
	"used_codes" integer DEFAULT 0 NOT NULL,
	"active_codes" integer DEFAULT 0 NOT NULL,
	"purpose" varchar(255),
	"notes" text,
	"expired_at" timestamp,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "qr_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"batch_id" uuid,
	"product_id" uuid,
	"variant_id" uuid,
	"qr_code" varchar(255) NOT NULL,
	"qr_data" jsonb NOT NULL,
	"qr_image_url" text,
	"qr_format" varchar(50) DEFAULT 'png',
	"is_active" boolean DEFAULT true NOT NULL,
	"is_used" boolean DEFAULT false NOT NULL,
	"used_at" timestamp,
	"used_by" uuid,
	"used_in_bill_id" uuid,
	"scan_count" integer DEFAULT 0 NOT NULL,
	"last_scanned_at" timestamp,
	"expires_at" timestamp,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "qr_codes_qr_code_unique" UNIQUE("qr_code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rate_limits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"identifier" varchar(255) NOT NULL,
	"identifier_type" varchar(50) NOT NULL,
	"endpoint" varchar(255) NOT NULL,
	"request_count" integer DEFAULT 0 NOT NULL,
	"max_requests" integer NOT NULL,
	"window_start" timestamp NOT NULL,
	"window_end" timestamp NOT NULL,
	"is_blocked" boolean DEFAULT false NOT NULL,
	"blocked_until" timestamp,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "rate_limits_identifier_endpoint_idx" UNIQUE("identifier","endpoint","window_start")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "retail_businesses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"description" text,
	"business_type" "business_type" DEFAULT 'RETAIL' NOT NULL,
	"industry_type" varchar(100),
	"tracks_inventory" boolean DEFAULT true NOT NULL,
	"inventory_method" "inventory_method" DEFAULT 'FIFO' NOT NULL,
	"allow_negative_stock" boolean DEFAULT false NOT NULL,
	"low_stock_alert_enabled" boolean DEFAULT true NOT NULL,
	"auto_numbering" boolean DEFAULT true NOT NULL,
	"bill_prefix" varchar(20) DEFAULT 'INV',
	"bill_number_format" varchar(50) DEFAULT '{PREFIX}-{YEAR}-{NUMBER}',
	"next_bill_number" integer DEFAULT 1 NOT NULL,
	"default_tax_rate" numeric(5, 2) DEFAULT '0.00',
	"tax_inclusive" boolean DEFAULT false NOT NULL,
	"enable_rounding" boolean DEFAULT true NOT NULL,
	"rounding_precision" integer DEFAULT 0,
	"is_service_based" boolean DEFAULT false NOT NULL,
	"service_categories" jsonb,
	"allow_material_in_service" boolean DEFAULT true NOT NULL,
	"registration_number" varchar(100),
	"tax_number" varchar(100),
	"gst_number" varchar(50),
	"pan_number" varchar(20),
	"phone" varchar(20),
	"email" varchar(255),
	"website" text,
	"logo" text,
	"cover_image" text,
	"primary_color" varchar(7) DEFAULT '#3B82F6',
	"secondary_color" varchar(7) DEFAULT '#10B981',
	"address" jsonb,
	"billing_address" jsonb,
	"shipping_address" jsonb,
	"business_hours" jsonb,
	"holidays" jsonb,
	"social_media" jsonb,
	"settings" jsonb,
	"billing_settings" jsonb,
	"payment_settings" jsonb,
	"notification_settings" jsonb,
	"analytics_settings" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_suspended" boolean DEFAULT false NOT NULL,
	"suspension_reason" text,
	"subscription_plan" "subscription_plan" DEFAULT 'FREE' NOT NULL,
	"subscription_started_at" timestamp,
	"subscription_expires_at" timestamp,
	"trial_ends_at" timestamp,
	"monthly_image_quota" integer DEFAULT 5 NOT NULL,
	"used_image_quota" integer DEFAULT 0 NOT NULL,
	"last_image_quota_reset" timestamp DEFAULT now(),
	"monthly_ai_query_quota" integer DEFAULT 100 NOT NULL,
	"used_ai_query_quota" integer DEFAULT 0 NOT NULL,
	"last_ai_quota_reset" timestamp DEFAULT now(),
	"metadata" jsonb,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "retail_businesses_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid,
	"name" varchar(100) NOT NULL,
	"display_name" varchar(255) NOT NULL,
	"description" text,
	"is_system" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "service_pricing_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"product_id" uuid,
	"name" varchar(255) NOT NULL,
	"description" text,
	"base_service_cost" numeric(15, 2) NOT NULL,
	"included_materials" jsonb,
	"allow_material_modification" boolean DEFAULT true NOT NULL,
	"pricing_tiers" jsonb,
	"estimated_duration" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_permission_overrides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"business_id" uuid NOT NULL,
	"resource" "permission_resource" NOT NULL,
	"action" "permission_action" NOT NULL,
	"is_allowed" boolean NOT NULL,
	"reason" text,
	"expires_at" timestamp,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_perm_override_unique" UNIQUE("user_id","business_id","resource","action")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"refresh_token" text NOT NULL,
	"access_token" text,
	"device_id" varchar(255),
	"device_name" varchar(255),
	"ip_address" varchar(45),
	"user_agent" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_activity_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_sessions_refresh_token_unique" UNIQUE("refresh_token")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(20),
	"password" varchar(255) NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100),
	"role" "user_role" DEFAULT 'RETAIL_OWNER' NOT NULL,
	"status" "user_status" DEFAULT 'PENDING' NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"phone_verified" boolean DEFAULT false NOT NULL,
	"last_login_at" timestamp,
	"last_login_ip" varchar(45),
	"login_attempts" integer DEFAULT 0 NOT NULL,
	"lock_until" timestamp,
	"password_reset_token" text,
	"password_reset_expires_at" timestamp,
	"email_verification_token" text,
	"email_verification_expires_at" timestamp,
	"phone_verification_token" varchar(10),
	"phone_verification_expires_at" timestamp,
	"two_factor_secret" text,
	"two_factor_enabled" boolean DEFAULT false NOT NULL,
	"two_factor_backup_codes" jsonb,
	"avatar" text,
	"timezone" varchar(100) DEFAULT 'Asia/Kolkata',
	"language" varchar(10) DEFAULT 'en',
	"preferences" jsonb,
	"metadata" jsonb,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_content_business_idx" ON "ai_generated_content" ("business_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_content_user_idx" ON "ai_generated_content" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_content_type_idx" ON "ai_generated_content" ("type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_content_created_at_idx" ON "ai_generated_content" ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_business_idx" ON "audit_logs" ("business_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_user_idx" ON "audit_logs" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_entity_type_idx" ON "audit_logs" ("entity_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_entity_id_idx" ON "audit_logs" ("entity_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_created_at_idx" ON "audit_logs" ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bill_items_bill_idx" ON "bill_items" ("bill_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bill_items_product_idx" ON "bill_items" ("product_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bills_business_idx" ON "bills" ("business_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bills_customer_idx" ON "bills" ("customer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bills_status_idx" ON "bills" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bills_approval_status_idx" ON "bills" ("approval_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bills_bill_date_idx" ON "bills" ("bill_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bills_due_date_idx" ON "bills" ("due_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bills_payment_status_idx" ON "bills" ("payment_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bills_created_by_idx" ON "bills" ("created_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bills_balance_amount_idx" ON "bills" ("balance_amount");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bills_deleted_at_idx" ON "bills" ("deleted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "business_analytics_business_idx" ON "business_analytics" ("business_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "business_analytics_period_type_idx" ON "business_analytics" ("period_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "business_staff_business_idx" ON "business_staff" ("business_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "business_staff_user_idx" ON "business_staff" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "business_staff_role_idx" ON "business_staff" ("role_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "business_staff_is_active_idx" ON "business_staff" ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "customer_purchase_patterns_business_idx" ON "customer_purchase_patterns" ("business_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "customer_purchase_patterns_customer_idx" ON "customer_purchase_patterns" ("customer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "customer_purchase_patterns_product_idx" ON "customer_purchase_patterns" ("product_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "customer_purchase_patterns_last_purchase_idx" ON "customer_purchase_patterns" ("last_purchase_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "customers_business_idx" ON "customers" ("business_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "customers_phone_idx" ON "customers" ("phone");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "customers_email_idx" ON "customers" ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "customers_whatsapp_idx" ON "customers" ("whatsapp_number");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "customers_outstanding_idx" ON "customers" ("outstanding_balance");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "customers_wallet_idx" ON "customers" ("wallet_balance");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "customers_is_active_idx" ON "customers" ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "customers_is_vip_idx" ON "customers" ("is_vip");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "customers_deleted_at_idx" ON "customers" ("deleted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "daily_sales_summary_business_idx" ON "daily_sales_summary" ("business_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "daily_sales_summary_date_idx" ON "daily_sales_summary" ("summary_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "merchants_business_idx" ON "merchants" ("business_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "merchants_phone_idx" ON "merchants" ("phone");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "merchants_email_idx" ON "merchants" ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "merchants_outstanding_idx" ON "merchants" ("outstanding_balance");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "merchants_is_active_idx" ON "merchants" ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "merchants_is_preferred_idx" ON "merchants" ("is_preferred");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "merchants_deleted_at_idx" ON "merchants" ("deleted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "messages_business_idx" ON "messages" ("business_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "messages_customer_idx" ON "messages" ("customer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "messages_bill_idx" ON "messages" ("bill_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "messages_status_idx" ON "messages" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "messages_scheduled_for_idx" ON "messages" ("scheduled_for");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payment_allocations_payment_idx" ON "payment_allocations" ("payment_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payment_allocations_bill_idx" ON "payment_allocations" ("bill_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payments_business_idx" ON "payments" ("business_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payments_customer_idx" ON "payments" ("customer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payments_status_idx" ON "payments" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payments_method_idx" ON "payments" ("method");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payments_payment_date_idx" ON "payments" ("payment_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payments_deleted_at_idx" ON "payments" ("deleted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "permissions_role_idx" ON "permissions" ("role_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "permissions_resource_idx" ON "permissions" ("resource");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "product_categories_business_idx" ON "product_categories" ("business_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "product_categories_parent_idx" ON "product_categories" ("parent_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "product_categories_slug_idx" ON "product_categories" ("slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "product_categories_category_type_idx" ON "product_categories" ("category_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "product_images_product_idx" ON "product_images" ("product_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "product_images_variant_idx" ON "product_images" ("variant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "product_images_type_idx" ON "product_images" ("image_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "product_images_is_primary_idx" ON "product_images" ("is_primary");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "product_variants_product_idx" ON "product_variants" ("product_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "product_variants_sku_idx" ON "product_variants" ("sku");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "product_variants_barcode_idx" ON "product_variants" ("barcode");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "product_variants_is_active_idx" ON "product_variants" ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_business_idx" ON "products" ("business_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_category_idx" ON "products" ("category_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_product_type_idx" ON "products" ("product_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_track_quantity_idx" ON "products" ("track_quantity");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_is_service_idx" ON "products" ("is_service");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_barcode_idx" ON "products" ("barcode");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_sku_idx" ON "products" ("sku");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_slug_idx" ON "products" ("slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_is_active_idx" ON "products" ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_current_stock_idx" ON "products" ("current_stock");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_deleted_at_idx" ON "products" ("deleted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "qr_code_batches_business_idx" ON "qr_code_batches" ("business_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "qr_code_batches_product_idx" ON "qr_code_batches" ("product_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "qr_code_batches_batch_code_idx" ON "qr_code_batches" ("batch_code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "qr_codes_business_code_idx" ON "qr_codes" ("business_id","qr_code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "qr_codes_business_idx" ON "qr_codes" ("business_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "qr_codes_batch_idx" ON "qr_codes" ("batch_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "qr_codes_product_idx" ON "qr_codes" ("product_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "qr_codes_qr_code_idx" ON "qr_codes" ("qr_code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "qr_codes_is_active_idx" ON "qr_codes" ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rate_limits_identifier_idx" ON "rate_limits" ("identifier");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "retail_businesses_owner_idx" ON "retail_businesses" ("owner_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "retail_businesses_slug_idx" ON "retail_businesses" ("slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "retail_businesses_active_idx" ON "retail_businesses" ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "retail_businesses_business_type_idx" ON "retail_businesses" ("business_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "retail_businesses_tracks_inventory_idx" ON "retail_businesses" ("tracks_inventory");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "retail_businesses_subscription_plan_idx" ON "retail_businesses" ("subscription_plan");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "retail_businesses_deleted_at_idx" ON "retail_businesses" ("deleted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "roles_business_name_idx" ON "roles" ("business_id","name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "roles_business_idx" ON "roles" ("business_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "roles_is_system_idx" ON "roles" ("is_system");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "service_pricing_templates_business_idx" ON "service_pricing_templates" ("business_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "service_pricing_templates_product_idx" ON "service_pricing_templates" ("product_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "service_pricing_templates_is_active_idx" ON "service_pricing_templates" ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_perm_override_user_business_idx" ON "user_permission_overrides" ("user_id","business_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_sessions_user_id_idx" ON "user_sessions" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_sessions_refresh_token_idx" ON "user_sessions" ("refresh_token");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_sessions_is_active_idx" ON "user_sessions" ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_sessions_expires_at_idx" ON "user_sessions" ("expires_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_email_idx" ON "users" ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_phone_idx" ON "users" ("phone");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_role_idx" ON "users" ("role");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_status_idx" ON "users" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_deleted_at_idx" ON "users" ("deleted_at");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ai_generated_content" ADD CONSTRAINT "ai_generated_content_business_id_retail_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "retail_businesses"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ai_generated_content" ADD CONSTRAINT "ai_generated_content_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_business_id_retail_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "retail_businesses"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bill_items" ADD CONSTRAINT "bill_items_bill_id_bills_id_fk" FOREIGN KEY ("bill_id") REFERENCES "bills"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bill_items" ADD CONSTRAINT "bill_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bill_items" ADD CONSTRAINT "bill_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bills" ADD CONSTRAINT "bills_business_id_retail_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "retail_businesses"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bills" ADD CONSTRAINT "bills_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bills" ADD CONSTRAINT "bills_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bills" ADD CONSTRAINT "bills_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bills" ADD CONSTRAINT "bills_rejected_by_users_id_fk" FOREIGN KEY ("rejected_by") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bills" ADD CONSTRAINT "bills_parent_bill_id_bills_id_fk" FOREIGN KEY ("parent_bill_id") REFERENCES "bills"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bills" ADD CONSTRAINT "bills_voided_by_users_id_fk" FOREIGN KEY ("voided_by") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "business_analytics" ADD CONSTRAINT "business_analytics_business_id_retail_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "retail_businesses"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "business_staff" ADD CONSTRAINT "business_staff_business_id_retail_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "retail_businesses"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "business_staff" ADD CONSTRAINT "business_staff_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "business_staff" ADD CONSTRAINT "business_staff_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "customer_purchase_patterns" ADD CONSTRAINT "customer_purchase_patterns_business_id_retail_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "retail_businesses"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "customer_purchase_patterns" ADD CONSTRAINT "customer_purchase_patterns_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "customer_purchase_patterns" ADD CONSTRAINT "customer_purchase_patterns_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "customers" ADD CONSTRAINT "customers_business_id_retail_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "retail_businesses"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "customers" ADD CONSTRAINT "customers_referred_by_customers_id_fk" FOREIGN KEY ("referred_by") REFERENCES "customers"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "daily_sales_summary" ADD CONSTRAINT "daily_sales_summary_business_id_retail_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "retail_businesses"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "merchants" ADD CONSTRAINT "merchants_business_id_retail_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "retail_businesses"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "messages" ADD CONSTRAINT "messages_business_id_retail_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "retail_businesses"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "messages" ADD CONSTRAINT "messages_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "messages" ADD CONSTRAINT "messages_bill_id_bills_id_fk" FOREIGN KEY ("bill_id") REFERENCES "bills"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_bill_id_bills_id_fk" FOREIGN KEY ("bill_id") REFERENCES "bills"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payments" ADD CONSTRAINT "payments_business_id_retail_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "retail_businesses"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payments" ADD CONSTRAINT "payments_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payments" ADD CONSTRAINT "payments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payments" ADD CONSTRAINT "payments_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "permissions" ADD CONSTRAINT "permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_business_id_retail_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "retail_businesses"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_parent_id_product_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "product_categories"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "product_images" ADD CONSTRAINT "product_images_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "product_images" ADD CONSTRAINT "product_images_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "products" ADD CONSTRAINT "products_business_id_retail_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "retail_businesses"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "products" ADD CONSTRAINT "products_category_id_product_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "product_categories"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "qr_code_batches" ADD CONSTRAINT "qr_code_batches_business_id_retail_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "retail_businesses"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "qr_code_batches" ADD CONSTRAINT "qr_code_batches_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "qr_codes" ADD CONSTRAINT "qr_codes_business_id_retail_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "retail_businesses"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "qr_codes" ADD CONSTRAINT "qr_codes_batch_id_qr_code_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "qr_code_batches"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "qr_codes" ADD CONSTRAINT "qr_codes_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "qr_codes" ADD CONSTRAINT "qr_codes_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "qr_codes" ADD CONSTRAINT "qr_codes_used_by_users_id_fk" FOREIGN KEY ("used_by") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "qr_codes" ADD CONSTRAINT "qr_codes_used_in_bill_id_bills_id_fk" FOREIGN KEY ("used_in_bill_id") REFERENCES "bills"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "retail_businesses" ADD CONSTRAINT "retail_businesses_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "roles" ADD CONSTRAINT "roles_business_id_retail_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "retail_businesses"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "service_pricing_templates" ADD CONSTRAINT "service_pricing_templates_business_id_retail_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "retail_businesses"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "service_pricing_templates" ADD CONSTRAINT "service_pricing_templates_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_permission_overrides" ADD CONSTRAINT "user_permission_overrides_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_permission_overrides" ADD CONSTRAINT "user_permission_overrides_business_id_retail_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "retail_businesses"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_permission_overrides" ADD CONSTRAINT "user_permission_overrides_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
