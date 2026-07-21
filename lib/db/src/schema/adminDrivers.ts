import { pgTable, serial, varchar, text, integer, doublePrecision, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const adminDrivers = pgTable("admin_drivers", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  phone: varchar("phone", { length: 50 }).notNull(),
  email: varchar("email", { length: 200 }),
  licenseNumber: varchar("license_number", { length: 100 }),
  vehicleId: integer("vehicle_id"),
  status: varchar("status", { length: 30 }).notNull().default("available"),
  rating: doublePrecision("rating").default(5.0),
  totalTrips: integer("total_trips").default(0),
  notes: text("notes"),
  verificationStatus: varchar("verification_status", { length: 30 }).notNull().default("pending"),
  accessPin: varchar("access_pin", { length: 10 }),
  pinGeneratedAt: timestamp("pin_generated_at"),
  photoUrl: text("photo_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertAdminDriverSchema = createInsertSchema(adminDrivers).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAdminDriver = z.infer<typeof insertAdminDriverSchema>;
export type AdminDriver = typeof adminDrivers.$inferSelect;
