CREATE TABLE `admin_audit` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`actor` text NOT NULL,
	`action` text NOT NULL,
	`entity` text NOT NULL,
	`detail` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `admin_audit_created_idx` ON `admin_audit` (`created_at`);--> statement-breakpoint
CREATE TABLE `admin_staff` (
	`email` text PRIMARY KEY NOT NULL,
	`role` text NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `courier_events` (
	`id` text PRIMARY KEY NOT NULL,
	`reference` text NOT NULL,
	`status` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `exchanges` (
	`return_id` text PRIMARY KEY NOT NULL,
	`items_json` text NOT NULL,
	`status` text DEFAULT 'allocated' NOT NULL,
	`tracking_number` text DEFAULT '' NOT NULL,
	`carrier` text DEFAULT '' NOT NULL,
	`actor` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`return_id`) REFERENCES `return_requests`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `promotions` (
	`code` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`kind` text NOT NULL,
	`value` integer NOT NULL,
	`minimum_kobo` integer DEFAULT 0 NOT NULL,
	`minimum_quantity` integer DEFAULT 1 NOT NULL,
	`product_ids` text DEFAULT '[]' NOT NULL,
	`max_uses` integer DEFAULT 0 NOT NULL,
	`starts_at` text NOT NULL,
	`ends_at` text NOT NULL,
	`active` integer DEFAULT 0 NOT NULL,
	`version` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
ALTER TABLE `orders` ADD `discount_kobo` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `promotion_code` text DEFAULT '' NOT NULL;