import { pgTable, serial, varchar, doublePrecision, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const pricingConfig = pgTable("pricing_config", {
  id: serial("id").primaryKey(),
  vehicleType: varchar("vehicle_type", { length: 50 }).notNull().unique(),
  baseRate: doublePrecision("base_rate").notNull(),
  perMile: doublePrecision("per_mile").notNull(),
  hourlyRate: doublePrecision("hourly_rate").notNull(),
  minMiles: integer("min_miles").notNull().default(15),
  airportFee: doublePrecision("airport_fee").notNull().default(45),
  afterHoursPct: doublePrecision("after_hours_pct").notNull().default(25),
  weekendPct: doublePrecision("weekend_pct").notNull().default(15),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPricingSchema = createInsertSchema(pricingConfig).omit({ id: true, updatedAt: true });
export type InsertPricing = z.infer<typeof insertPricingSchema>;
export type PricingConfig = typeof pricingConfig.$inferSelect;
