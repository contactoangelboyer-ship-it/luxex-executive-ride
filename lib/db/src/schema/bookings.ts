import { pgTable, serial, varchar, text, integer, boolean, doublePrecision, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  confirmationCode: varchar("confirmation_code", { length: 12 }).notNull(),
  service: varchar("service", { length: 50 }).notNull(),
  status: varchar("status", { length: 30 }).notNull().default("pending"),
  pickupAddress: text("pickup_address").notNull(),
  pickupLat: doublePrecision("pickup_lat"),
  pickupLon: doublePrecision("pickup_lon"),
  dropoffAddress: text("dropoff_address"),
  dropoffLat: doublePrecision("dropoff_lat"),
  dropoffLon: doublePrecision("dropoff_lon"),
  date: varchar("date", { length: 20 }).notNull(),
  time: varchar("time", { length: 10 }).notNull(),
  passengers: integer("passengers").notNull().default(1),
  bags: integer("bags").notNull().default(1),
  hours: integer("hours"),
  vehicleType: varchar("vehicle_type", { length: 50 }),
  driverId: integer("driver_id"),
  flightNumber: varchar("flight_number", { length: 20 }),
  flightType: varchar("flight_type", { length: 20 }),
  passengerName: varchar("passenger_name", { length: 200 }).notNull(),
  passengerPhone: varchar("passenger_phone", { length: 30 }).notNull(),
  passengerEmail: varchar("passenger_email", { length: 200 }).notNull(),
  notes: text("notes"),
  meetAndGreet: boolean("meet_and_greet").default(false),
  childSeat: boolean("child_seat").default(false),
  baseAmount: doublePrecision("base_amount").default(0),
  mileageAmount: doublePrecision("mileage_amount").default(0),
  surchargesAmount: doublePrecision("surcharges_amount").default(0),
  tollsAmount: doublePrecision("tolls_amount").default(0),
  totalAmount: doublePrecision("total_amount").notNull().default(0),
  distanceMiles: doublePrecision("distance_miles").default(0),
  promoCode: varchar("promo_code", { length: 50 }),
  promoDiscount: doublePrecision("promo_discount").default(0),
  adminNotes: text("admin_notes"),
  reminder24hSentAt: timestamp("reminder_24h_sent_at"),
  reminder2hSentAt: timestamp("reminder_2h_sent_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertBookingSchema = createInsertSchema(bookings).omit({ id: true, confirmationCode: true, createdAt: true, updatedAt: true });
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Booking = typeof bookings.$inferSelect;
