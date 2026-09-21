CREATE TABLE `email_outbox` (
	`id` text PRIMARY KEY NOT NULL,
	`event_key` text NOT NULL,
	`recipient` text NOT NULL,
	`subject` text NOT NULL,
	`body` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`next_attempt_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`locked_at` text,
	`last_error` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`sent_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `email_outbox_event_idx` ON `email_outbox` (`event_key`);--> statement-breakpoint
CREATE INDEX `email_outbox_pending_idx` ON `email_outbox` (`status`,`next_attempt_at`);--> statement-breakpoint
CREATE TABLE `product_reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`order_id` text NOT NULL,
	`display_name` text NOT NULL,
	`rating` integer NOT NULL,
	`fit` text DEFAULT 'true_to_size' NOT NULL,
	`body` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reviews_order_product_idx` ON `product_reviews` (`order_id`,`product_id`);--> statement-breakpoint
CREATE INDEX `reviews_product_status_idx` ON `product_reviews` (`product_id`,`status`);--> statement-breakpoint
CREATE TABLE `request_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`hits` integer DEFAULT 0 NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `return_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`kind` text NOT NULL,
	`reason` text NOT NULL,
	`items_json` text NOT NULL,
	`status` text DEFAULT 'requested' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`refund_kobo` integer DEFAULT 0 NOT NULL,
	`refund_reference` text DEFAULT '' NOT NULL,
	`refund_status` text DEFAULT 'none' NOT NULL,
	`restocked` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `returns_order_idx` ON `return_requests` (`order_id`);--> statement-breakpoint
CREATE INDEX `returns_status_created_idx` ON `return_requests` (`status`,`created_at`);--> statement-breakpoint
CREATE TABLE `stock_adjustments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`variant_id` text NOT NULL,
	`old_stock` integer NOT NULL,
	`new_stock` integer NOT NULL,
	`reason` text NOT NULL,
	`actor` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `stock_adjustments_variant_created_idx` ON `stock_adjustments` (`variant_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `subscribers` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`kind` text NOT NULL,
	`variant_id` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`token` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `subscribers_email_kind_variant_idx` ON `subscribers` (`email`,`kind`,`variant_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `subscribers_token_idx` ON `subscribers` (`token`);--> statement-breakpoint
ALTER TABLE `orders` ADD `carrier` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `tracking_number` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `tracking_url` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `delivery_estimate` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `products` ADD `details_json` text DEFAULT '{}' NOT NULL;