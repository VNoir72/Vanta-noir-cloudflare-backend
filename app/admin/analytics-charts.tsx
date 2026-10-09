"use client";

import { motion } from "motion/react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatNaira } from "@/lib/catalog";
import type { AdminAnalytics } from "@/lib/store-db";

const revenueConfig = {
  revenueKobo: {
    label: "Paid revenue",
    color: "var(--admin-accent)",
  },
} satisfies ChartConfig;

const categoryConfig = {
  units: {
    label: "Units",
    color: "var(--admin-text)",
  },
} satisfies ChartConfig;

export function AnalyticsCharts({ analytics }: { analytics: AdminAnalytics }) {
  const revenue = analytics.trend.reduce((sum, point) => sum + point.revenueKobo, 0);
  const trackedUnits = analytics.categoryMix.reduce((sum, point) => sum + point.units, 0);
  const hasRevenue = analytics.trend.some((point) => point.revenueKobo > 0);

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className="mt-12"
    >
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">Signal room</p>
          <h2 className="mt-2 font-sans text-4xl">Drop signal</h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
            Live D1 order and inventory telemetry, shaped for the next Vanta Noir release.
          </p>
        </div>
        <div className="border border-border bg-primary/[0.06] px-4 py-3 text-right">
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">14-day paid revenue</p>
          <p className="mt-1 text-lg text-foreground">{hasRevenue ? formatNaira(revenue) : "Awaiting first order"}</p>
        </div>
      </div>

      <div className="grid gap-px border border-border bg-card lg:grid-cols-[1.35fr_0.65fr]">
        <div className="bg-muted p-5 sm:p-7">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Revenue pulse</p>
              <p className="mt-1 text-xs text-muted-foreground">Paid revenue · last 14 days</p>
            </div>
            <span className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              <span className="size-1.5 rounded-full bg-primary " />
              Live
            </span>
          </div>
          <ChartContainer config={revenueConfig} className="h-[260px] w-full">
            <AreaChart data={analytics.trend} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="vn-revenue-gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--admin-accent)" stopOpacity={0.38} />
                  <stop offset="100%" stopColor="var(--admin-accent)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="var(--admin-muted)" />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tickMargin={10}
                minTickGap={22}
                tick={{ fill: "var(--admin-muted)", fontSize: 10 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tickMargin={8}
                tick={{ fill: "var(--admin-muted)", fontSize: 10 }}
                tickFormatter={(value) => `₦${Math.round(Number(value) / 100000)}k`}
              />
              <ChartTooltip
                cursor={{ stroke: "var(--admin-muted)", strokeWidth: 1 }}
                content={<ChartTooltipContent indicator="line" />}
              />
              <Area
                type="monotone"
                dataKey="revenueKobo"
                stroke="var(--color-revenueKobo)"
                strokeWidth={2}
                fill="url(#vn-revenue-gradient)"
                dot={false}
                activeDot={{ r: 4, fill: "var(--admin-accent)", stroke: "var(--admin-surface)", strokeWidth: 2 }}
              />
            </AreaChart>
          </ChartContainer>
        </div>

        <div className="bg-muted p-5 sm:p-7">
          <div className="mb-6">
            <p className="text-sm text-muted-foreground">Demand by line</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {hasRevenue ? "Paid units by category" : "Available units by category"}
            </p>
          </div>
          <ChartContainer config={categoryConfig} className="h-[260px] w-full">
            <BarChart data={analytics.categoryMix} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--admin-muted)" />
              <XAxis
                dataKey="category"
                axisLine={false}
                tickLine={false}
                tickMargin={10}
                tick={{ fill: "var(--admin-muted)", fontSize: 10 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tickMargin={8}
                tick={{ fill: "var(--admin-muted)", fontSize: 10 }}
                allowDecimals={false}
              />
              <ChartTooltip
                cursor={{ fill: "var(--admin-soft)" }}
                content={<ChartTooltipContent indicator="dot" />}
              />
              <Bar dataKey="units" fill="var(--color-units)" radius={[1, 1, 0, 0]} maxBarSize={36} />
            </BarChart>
          </ChartContainer>
          <p className="mt-5 border-t border-border pt-4 text-xs text-muted-foreground">
            {trackedUnits.toLocaleString()} total units currently tracked across the line.
          </p>
        </div>
      </div>
    </motion.section>
  );
}
