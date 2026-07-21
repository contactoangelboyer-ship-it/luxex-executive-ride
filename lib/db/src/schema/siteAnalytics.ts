import { pgTable, serial, varchar, text, timestamp } from "drizzle-orm/pg-core";

export const siteVisits = pgTable("site_visits", {
  id: serial("id").primaryKey(),
  sessionId: varchar("session_id", { length: 64 }).notNull(),
  page: varchar("page", { length: 500 }).notNull().default("/"),
  ip: varchar("ip", { length: 50 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type SiteVisit = typeof siteVisits.$inferSelect;
