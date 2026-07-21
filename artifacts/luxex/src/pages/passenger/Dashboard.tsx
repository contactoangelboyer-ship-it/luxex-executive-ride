import { useEffect, useState, useCallback } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Clock, MapPin, Car, ArrowRight, TrendingUp, Navigation, ChevronRight } from "lucide-react";
import { PortalLayout } from "@/components/PortalLayout";
import { getCurrentUser } from "@/hooks/useAuth";
import { BookingSystem } from "@/components/BookingSystem";

const YELLOW = "#F2E147";

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  pending:     { bg: "rgba(251,191,36,0.1)",  text: "#fbbf24", border: "rgba(251,191,36,0.25)" },
  confirmed:   { bg: "rgba(96,165,250,0.1)",  text: "#60a5fa", border: "rgba(96,165,250,0.25)" },
  assigned:    { bg: "rgba(167,139,250,0.1)", text: "#a78bfa", border: "rgba(167,139,250,0.25)" },
  in_progress: { bg: "rgba(52,211,153,0.1)",  text: "#34d399", border: "rgba(52,211,153,0.25)" },
  completed:   { bg: "rgba(255,255,255,0.05)", text: "rgba(255,255,255,0.5)", border: "rgba(255,255,255,0.1)" },
  cancelled:   { bg: "rgba(248,113,113,0.1)", text: "#f87171", border: "rgba(248,113,113,0.25)" },
};
const STATUS_LABELS: Record<string, string> = {
  pending: "Pending", confirmed: "Confirmed", assigned: "Assigned",
  in_progress: "In Progress", completed: "Completed", cancelled: "Cancelled",
};

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "morning"; if (h < 17) return "afternoon"; return "evening";
}

function parsePickupDate(date: string, time: string): Date | null {
  if (!date || !time) return null;
  try { return new Date(`${date}T${time}:00`); } catch { return null; }
}

function useCountdown(date: string, time: string): string {
  const [label, setLabel] = useState("");

  const calc = useCallback(() => {
    const pickup = parsePickupDate(date, time);
    if (!pickup) return setLabel("");
    const diff = pickup.getTime() - Date.now();
    if (diff <= 0) return setLabel("Now");
    const totalMin = Math.floor(diff / 60000);
    const days = Math.floor(totalMin / 1440);
    const hours = Math.floor((totalMin % 1440) / 60);
    const mins = totalMin % 60;
    if (days > 0) setLabel(`${days}d ${hours}h`);
    else if (hours > 0) setLabel(`${hours}h ${mins}m`);
    else setLabel(`${mins} min`);
  }, [date, time]);

  useEffect(() => {
    calc();
    const t = setInterval(calc, 30000);
    return () => clearInterval(t);
  }, [calc]);

  return label;
}

function SkeletonCard() {
  return (
    <div className="p-4 bg-[#111] border border-white/[0.06] space-y-3 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-white/5 shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-white/5 rounded w-3/4" />
          <div className="h-2.5 bg-white/5 rounded w-1/2" />
        </div>
        <div className="h-4 w-10 bg-white/5 rounded" />
      </div>
    </div>
  );
}

function NextRideCard({ ride }: { ride: any }) {
  const countdown = useCountdown(ride.date, ride.time);
  const isLive = ride.status === "in_progress";
  const sc = STATUS_COLORS[ride.status] ?? STATUS_COLORS.pending;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden"
      style={{ background: "linear-gradient(135deg, #111 0%, #0d0d0d 100%)", border: `1px solid ${isLive ? "rgba(52,211,153,0.3)" : "rgba(242,225,71,0.2)"}` }}>

      {isLive && (
        <div className="absolute top-0 left-0 right-0 h-[1px]"
          style={{ background: "linear-gradient(90deg, transparent, #34d399, transparent)" }} />
      )}

      <div className="p-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              {isLive ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <p className="text-[10px] font-black tracking-widest uppercase text-emerald-400">In Progress</p>
                </>
              ) : (
                <>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: YELLOW }} />
                  <p className="text-[10px] font-black tracking-widest uppercase" style={{ color: YELLOW }}>Upcoming Ride</p>
                </>
              )}
            </div>
            <p className="text-white font-bold text-sm">{ride.date} · {ride.time}</p>
          </div>

          {countdown && !isLive && (
            <div className="text-right">
              <p className="text-2xl font-black tabular-nums" style={{ color: YELLOW }}>{countdown}</p>
              <p className="text-[10px] text-white/30 font-semibold">until pickup</p>
            </div>
          )}
          {isLive && (
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-sm"
              style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}` }}>
              En Route
            </span>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex flex-col items-center gap-1 shrink-0">
              <div className="w-2 h-2 rounded-full border-2" style={{ borderColor: YELLOW }} />
              <div className="w-px h-6 bg-white/10" />
              <Navigation className="w-2.5 h-2.5 text-white/30" />
            </div>
            <div className="flex-1 min-w-0 space-y-3">
              <div>
                <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold mb-0.5">Pickup</p>
                <p className="text-sm text-white font-semibold truncate">{ride.pickupAddress ?? "Your pickup location"}</p>
              </div>
              {ride.dropoffAddress && (
                <div>
                  <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold mb-0.5">Drop-off</p>
                  <p className="text-sm text-white/70 truncate">{ride.dropoffAddress}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/[0.05]">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-bold px-2 py-0.5"
              style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}` }}>
              {STATUS_LABELS[ride.status] ?? ride.status}
            </span>
            {ride.confirmationCode && (
              <span className="text-[10px] font-mono text-white/30">{ride.confirmationCode}</span>
            )}
          </div>
          <Link href="/passenger/bookings">
            <a className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest transition-colors"
              style={{ color: "rgba(255,255,255,0.3)" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = YELLOW; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.3)"; }}>
              Details <ChevronRight className="w-3 h-3" />
            </a>
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

export default function PassengerDashboard() {
  const user = getCurrentUser()!;
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/bookings/passenger?email=${encodeURIComponent(user.email)}`)
      .then(r => r.ok ? r.json() : [])
      .then(data => setBookings(Array.isArray(data) ? data : []))
      .catch(() => setBookings([]))
      .finally(() => setLoading(false));
  }, [user.email]);

  const upcoming = bookings.filter(b => ["pending", "confirmed", "assigned", "in_progress"].includes(b.status));
  const completed = bookings.filter(b => b.status === "completed");
  const totalSpent = completed.reduce((s, b) => s + (b.totalAmount ?? 0), 0);

  const nextRide = upcoming[0] ?? null;

  const stats = [
    { label: "Total Rides", value: loading ? null : bookings.length, icon: Car, accent: "#fff" },
    { label: "Upcoming", value: loading ? null : upcoming.length, icon: Calendar, accent: "#60a5fa" },
    { label: "Completed", value: loading ? null : completed.length, icon: Clock, accent: "#34d399" },
    { label: "Total Spent", value: loading ? null : `$${totalSpent.toFixed(0)}`, icon: TrendingUp, accent: YELLOW },
  ];

  return (
    <PortalLayout user={user} onLogout={() => window.location.href = "/"}>
      <div className="max-w-3xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs font-bold tracking-widest uppercase mb-1" style={{ color: YELLOW }}>
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </p>
            <h2 className="text-2xl font-black text-white">
              Good {getGreeting()}, {user.firstName}.
            </h2>
          </div>
          <BookingSystem
            triggerClassName="flex items-center gap-2 px-5 py-2.5 text-sm font-black uppercase tracking-widest text-black transition-colors"
            triggerText="Book a Ride"
            triggerStyle={{ background: YELLOW }}
          />
        </div>

        {/* Next Ride Card */}
        <AnimatePresence>
          {!loading && nextRide && <NextRideCard ride={nextRide} />}
        </AnimatePresence>

        {/* KPI Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {stats.map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                className="p-4 relative overflow-hidden group"
                style={{ background: "#111", border: "1px solid rgba(255,255,255,0.07)" }}>
                <motion.div
                  className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{ background: `radial-gradient(circle at 50% 0%, ${s.accent}08 0%, transparent 70%)` }} />
                <Icon className="w-4 h-4 mb-3" style={{ color: s.accent }} />
                {s.value === null ? (
                  <div className="h-7 w-12 bg-white/5 animate-pulse mb-1 rounded-sm" />
                ) : (
                  <p className="text-2xl font-black text-white">{s.value}</p>
                )}
                <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.45)" }}>{s.label}</p>
              </motion.div>
            );
          })}
        </div>

        {/* Recent Reservations */}
        <div style={{ background: "#111", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <h3 className="font-bold text-sm text-white">Recent Reservations</h3>
            <Link href="/passenger/bookings">
              <a className="flex items-center gap-1 text-xs font-semibold transition-colors"
                style={{ color: "rgba(255,255,255,0.4)" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = YELLOW; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.4)"; }}>
                View all <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </Link>
          </div>

          {loading ? (
            <div className="divide-y divide-white/[0.04]">
              {[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : bookings.length === 0 ? (
            <div className="p-12 text-center">
              <Car className="w-10 h-10 mx-auto mb-3" style={{ color: "rgba(255,255,255,0.1)" }} />
              <p className="text-sm font-semibold text-white">No rides yet</p>
              <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>Your first reservation will appear here.</p>
            </div>
          ) : (
            <div>
              {bookings.slice(0, 5).map((b, i) => {
                const sc = STATUS_COLORS[b.status] ?? STATUS_COLORS.pending;
                return (
                  <motion.div key={b.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
                    className="flex items-start gap-4 px-5 py-4 group hover:bg-white/[0.015] transition-colors"
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <div className="w-9 h-9 flex items-center justify-center shrink-0 transition-colors group-hover:border-white/10"
                      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid transparent" }}>
                      <MapPin className="w-4 h-4" style={{ color: YELLOW }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{b.pickupAddress ?? "Pickup location"}</p>
                      {b.dropoffAddress && <p className="text-xs truncate mt-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>→ {b.dropoffAddress}</p>}
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.4)" }}>{b.date} · {b.time}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5"
                          style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}` }}>
                          {STATUS_LABELS[b.status] ?? b.status}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm font-black text-white shrink-0">${b.totalAmount?.toFixed(0) ?? "—"}</p>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Book Banner */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="p-6" style={{ background: YELLOW }}>
          <p className="text-[10px] font-bold tracking-widest uppercase text-black/50 mb-1">Quick Book</p>
          <h3 className="font-black text-lg text-black mb-1">Need a ride right now?</h3>
          <p className="text-sm text-black/60 mb-4">Executive fleet available 24/7. Fixed pricing, no surge.</p>
          <BookingSystem
            triggerClassName="inline-flex items-center gap-2 px-5 py-2.5 bg-black text-white text-sm font-black uppercase tracking-widest hover:bg-gray-900 transition-colors"
            triggerText="Reserve Now"
          />
        </motion.div>

      </div>
    </PortalLayout>
  );
}
