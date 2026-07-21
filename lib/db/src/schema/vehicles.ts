import { pgTable, serial, varchar, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const vehicles = pgTable("vehicles", {
  id: serial("id").primaryKey(),
  type: varchar("type", { length: 50 }).notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  model: varchar("model", { length: 200 }),
  plate: varchar("plate", { length: 30 }),
  color: varchar("color", { length: 50 }),
  year: integer("year"),
  maxPassengers: integer("max_passengers").notNull().default(3),
  maxBags: integer("max_bags").notNull().default(3),
  status: varchar("status", { length: 30 }).notNull().default("active"),
  driverId: integer("driver_id"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertVehicleSchema = createInsertSchema(vehicles).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertVehicle = z.infer<typeof insertVehicleSchema>;
export type Vehicle = typeof vehicles.$inferSelect;
