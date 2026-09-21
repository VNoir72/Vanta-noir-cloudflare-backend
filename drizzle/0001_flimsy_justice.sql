CREATE TABLE `product_images` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`color` text DEFAULT '' NOT NULL,
	`image_url` text NOT NULL,
	`image_alt` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `product_images_product_idx` ON `product_images` (`product_id`);--> statement-breakpoint
CREATE INDEX `product_images_color_idx` ON `product_images` (`product_id`,`color`);--> statement-breakpoint
ALTER TABLE `product_variants` ADD `color_hex` text DEFAULT '#101112' NOT NULL;--> statement-breakpoint
ALTER TABLE `product_variants` ADD `active` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `products` ADD `status` text DEFAULT 'published' NOT NULL;--> statement-breakpoint
ALTER TABLE `products` ADD `featured` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `products` ADD `sort_order` integer DEFAULT 0 NOT NULL;