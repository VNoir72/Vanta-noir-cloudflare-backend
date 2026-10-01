CREATE TABLE reward_campaigns (
  id TEXT PRIMARY KEY NOT NULL,
  config_json TEXT NOT NULL,
  code TEXT UNIQUE,
  version INTEGER NOT NULL DEFAULT 1,
  active INTEGER NOT NULL DEFAULT 0,
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL
);
--> statement-breakpoint
CREATE INDEX reward_campaigns_active_idx ON reward_campaigns(active, starts_at, ends_at);
--> statement-breakpoint
CREATE TABLE order_rewards (
  order_id TEXT PRIMARY KEY NOT NULL REFERENCES orders(id),
  campaign_id TEXT NOT NULL REFERENCES reward_campaigns(id),
  title TEXT NOT NULL,
  shipping_savings_kobo INTEGER NOT NULL DEFAULT 0,
  gift_variant_id TEXT NOT NULL DEFAULT '',
  max_uses INTEGER NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE INDEX order_rewards_campaign_idx ON order_rewards(campaign_id, order_id);
--> statement-breakpoint
ALTER TABLE order_items ADD COLUMN is_gift INTEGER NOT NULL DEFAULT 0;
