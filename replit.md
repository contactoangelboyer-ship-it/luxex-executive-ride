# LuxEx Executive Ride

Luxury executive transportation booking platform — passengers book airport, corporate, hourly, and event rides with real-time pricing, route maps, and email confirmations.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, proxied at `/api`)
- `pnpm --filter @workspace/luxex run dev` — run the React frontend (port 23203, proxied at `/`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL`, `RESEND_API_KEY`, `SESSION_SECRET`, `ADMIN_EMAIL` (optional, for admin notifications)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 19 + Vite 7, Wouter router, Framer Motion, Recharts, Leaflet/React-Leaflet, React Hook Form
- API: Express 5 + Pino logging
- DB: PostgreSQL + Drizzle ORM
- Email: Resend (`sendCustomerConfirmation`, `sendAdminNotification`, `sendDriverAssignment`, `sendStatusUpdate`)
- Auth: Custom HMAC JWT for admin panel (no Clerk)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/db/src/schema/` — all Drizzle table definitions (bookings, vehicles, zones, pricing, promotions, adminDrivers, adminUsers, rides, users)
- `lib/db/src/index.ts` — DB client export
- `artifacts/api-server/src/app.ts` — Express app, routes mounted at `/api` and `/api/admin`
- `artifacts/api-server/src/routes/bookings.ts` — public routes: pricing, vehicles, zones, promotions/validate, bookings CRUD
- `artifacts/api-server/src/routes/admin/` — admin CRUD routes (protected by HMAC JWT middleware)
- `artifacts/api-server/src/middlewares/adminAuth.ts` — admin JWT middleware; default: user=`admin`, pass=`luxex2024!`
- `artifacts/api-server/src/lib/mailer.ts` — Resend email helpers
- `artifacts/luxex/src/App.tsx` — main router with all pages and route guards
- `artifacts/luxex/src/components/BookingSystem.tsx` — multi-step booking wizard (882 lines)
- `artifacts/luxex/src/lib/adminApi.ts` — admin API client (direct fetch)

## Architecture decisions

- Contract-first OpenAPI codegen is **not** used for the frontend — the original repo used direct fetch calls and custom hooks, so that pattern was preserved.
- Admin authentication uses a custom HMAC-SHA256 JWT (not Clerk/Auth) stored in `adminAuth.ts`. The JWT secret is derived from `SESSION_SECRET`.
- Public endpoints (`/api/vehicles`, `/api/zones`, `/api/promotions/validate`) were added to the `bookingsRouter` since they are consumed by the public-facing booking wizard.
- Emails are sent fire-and-forget after booking creation to avoid blocking the HTTP response.
- Frontend `dependencies` (not `devDependencies`) was intentionally preserved from the original repo.

## Product

- **Landing page** — animated intro, service selection (airport, corporate, hourly, event)
- **Booking wizard** — 5-step flow: service → route & schedule → vehicle selection with live pricing → passenger details → confirmation with code
- **My Bookings** — passenger lookup by email, cancel bookings
- **Driver Portal** — drivers look up their assigned rides and update status (in_progress → completed)
- **Admin panel** — CRUD for bookings, vehicles, drivers, zones, pricing, promotions; analytics dashboard with Recharts

## User preferences

_Populate as you build._

## Gotchas

- Do NOT run `pnpm dev` at workspace root — use workflows or `pnpm --filter` instead.
- `ADMIN_EMAIL` env var is optional but needed for admin notification emails on new bookings.
- The frontend calls `/api/vehicles` and `/api/zones` as public endpoints (not `/api/admin/vehicles`).
- Admin login: username=`admin`, password=`luxex2024!` (change in production via `adminUsers` table).

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
