import { useEffect, useState, useCallback } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Car, DollarSign, CheckCircle, Navigation, Phone, User,
  Calendar, Star, Power, ChevronRight, AlertCircle, MapPin,
  Briefcase, Clock, RefreshCw,
} from "lucide-react";
import { PortalLayout } from "@/components/PortalLayout";
import { getCurrentUser } from "@/hooks/useAuth";

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

export default function DriverDashboard() {
  const user = getCurrentUser()!;
  const [rides, setRides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isOnline, setIsOnline] = useState(() => {
    return localStorage.getItem(`luxex_driver_online_${user.email}`) !== "offline";
  });

  const toggleOnline = () => {
    const next = !isOnline;
    setIsOnline(next);
    localStorage.setItem(`luxex_driver_online_${user.email}`, next ? "online" : "offline");
  };

  const load = useCallback((showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    fetch(`/api/bookings/driver?email=${encodeURIComponent(user.email)}`)
      .then(r => r.ok ? r.json() : [])
      .then(data => setRides(Array.isArray(data) ? data : []))
      .catch(() => setRides([]))
      .finally(() => { setLoading(false); setRefreshing(false); });
  }, [user.email]);

  useEffect(() => { load(); }, [load]);

  const today = new Date().toISOString().split("T")[0];
  const todayRides = rides.filter(r => r.date === today);
  const completed = rides.filter(r => r.status === "completed");
  const active = rides.filter(r => r.status === "in_progress");
  const upcoming = rides
    .filter(r => ["confirmed", "assigned"].includes(r.status) && r.date >= today)
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
  const nextRide = upcoming[0] ?? active[0] ?? null;
  const todayEarnings = todayRides.filter(r => r.status === "completed")
    .reduce((acc, r) => acc + (r.totalAmount ?? 0), 0);
  const totalEarnings = completed.reduce((acc, r) => acc + (r.totalAmount ?? 0), 0);
  const weekRides = rides.filter(r => {
    const d = new Date(r.date);
    const now = new Date();
    const diff = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
    return diff <= 7 && r.status === "completed";
  });
  const weekEarnings = weekRides.reduce((acc, r) => acc + (r.totalAmount ?? 0), 0);

  const navigateTo = (address: string) => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`, "_blank");
  };

  return (
    <PortalLayout user={user} onLogout={() => window.location.href = "/"}>
      <div className="max-w-3xl mx-auto space-y-5 pb-10">

        {/* Header + Online Toggle */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold tracking-widest uppercase mb-1" style={{ color: YELLOW }}>
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </p>
            <h2 className="text-2xl font-black text-white">{user.firstName}&apos;s Dashboard</h2>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => load(true)} disabled={refreshing}
              className="p-2.5 transition-colors"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} style={{ color: "rgba(255,255,255,0.4)" }} />
            </button>
            <motion.button onClick={toggleOnline} whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-black uppercase tracking-widest transition-all"
              style={isOnline
                ? { background: "rgba(52,211,153,0.12)", border: "1px solid rgba(52,211,153,0.4)", color: "#34d399" }
                : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.35)" }
              }>
              <div className={`w-2 h-2 rounded-full shrink-0 ${isOnline ? "bg-green-400 animate-pulse" : "bg-white/25"}`} />
              {isOnline ? "Online" : "Offline"}
              <Power className="w-3.5 h-3.5" />
            </motion.button>
          </div>
        </div>

        {/* Offline Warning */}
        <AnimatePresence>
          {!isOnline && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="flex items-start gap-3 p-4"
              style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.25)" }}>
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-red-400">You&apos;re offline</p>
                <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
                  Switch to Online to be visible and receive new ride assignments.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Next / Active Ride Card */}
        <AnimatePresence>
          {nextRide && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              style={{ background: "rgba(167,139,250,0.07)", border: "1px solid rgba(167,139,250,0.3)" }}>
              <div className="flex items-center justify-between px-5 py-3"
                style={{ borderBottom: "1px solid rgba(167,139,250,0.12)" }}>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                  <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "#a78bfa" }}>
                    {nextRide.status === "in_progress" ? "Active — In Progress" : "Next Assigned Ride"}
                  </span>
                </div>
                <span className="font-mono text-[10px]" style={{ color: "rgba(167,139,250,0.5)" }}>
                  {nextRide.confirmationCode}
                </span>
              </div>

              <div className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                        style={{ background: "rgba(52,211,153,0.15)", border: "1px solid rgba(52,211,153,0.3)" }}>
                        <div className="w-2 h-2 rounded-full bg-green-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] uppercase tracking-widest font-bold mb-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>Pickup</p>
                        <p className="text-sm font-bold text-white">{nextRide.pickupAddress}</p>
                      </div>
                    </div>
                    {nextRide.dropoffAddress && (
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                          style={{ background: "rgba(248,113,113,0.15)", border: "1px solid rgba(248,113,113,0.3)" }}>
                          <div className="w-2 h-2 rounded-full" style={{ background: "#f87171" }} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] uppercase tracking-widest font-bold mb-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>Drop-off</p>
                          <p className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.7)" }}>{nextRide.dropoffAddress}</p>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-2xl font-black text-white">${nextRide.totalAmount?.toFixed(0) ?? "—"}</p>
                    <p className="text-[10px] uppercase tracking-widest mt-1" style={{ color: "rgba(255,255,255,0.3)" }}>
                      {nextRide.date} · {nextRide.time}
                    </p>
                  </div>
                </div>

                {/* Passenger info + actions */}
                <div className="flex items-center gap-3 flex-wrap pt-3"
                  style={{ borderTop: "1px solid rgba(167,139,250,0.12)" }}>
                  {nextRide.passengerName && (
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.3)" }} />
                      <span className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>{nextRide.passengerName}</span>
                    </div>
                  )}
                  {nextRide.passengerPhone && (
                    <a href={`tel:${nextRide.passengerPhone}`}
                      className="flex items-center gap-1.5 text-xs font-semibold transition-colors"
                      style={{ color: "#a78bfa" }}>
                      <Phone className="w-3.5 h-3.5" /> {nextRide.passengerPhone}
                    </a>
                  )}
                  {nextRide.passengers > 1 && (
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-white/30" />
                      <span className="text-xs text-white/40">{nextRide.passengers} pax · {nextRide.bags} bags</span>
                    </div>
                  )}
                  {nextRide.vehicleType && (
                    <div className="flex items-center gap-1.5">
                      <Car className="w-3.5 h-3.5 text-white/30" />
                      <span className="text-xs text-white/40 capitalize">{nextRide.vehicleType.replace("_", " ")}</span>
                    </div>
                  )}
                  <div className="ml-auto flex gap-2">
                    {nextRide.dropoffAddress && (
                      <button onClick={() => navigateTo(nextRide.dropoffAddress)}
                        className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-colors"
                        style={{ background: "rgba(167,139,250,0.15)", border: "1px solid rgba(167,139,250,0.3)", color: "#a78bfa" }}>
                        <MapPin className="w-3 h-3" /> Drop-off
                      </button>
                    )}
                    <motion.button whileTap={{ scale: 0.97 }}
                      onClick={() => navigateTo(nextRide.pickupAddress)}
                      className="flex items-center gap-2 px-4 py-2 text-[11px] font-black uppercase tracking-widest text-black"
                      style={{ background: YELLOW }}>
                      <Navigation className="w-3.5 h-3.5" /> Navigate
                    </motion.button>
                  </div>
                </div>

                {nextRide.notes && (
                  <div className="px-3 py-2 text-xs"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <span className="text-white/30 font-bold uppercase tracking-widest text-[10px]">Notes: </span>
                    <span className="text-white/60 italic">{nextRide.notes}</span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Today's Rides", value: loading ? "—" : todayRides.length, icon: Car, color: "#fff" },
            { label: "Today Earned", value: loading ? "—" : `$${todayEarnings.toFixed(0)}`, icon: DollarSign, color: YELLOW },
            { label: "This Week", value: loading ? "—" : `$${weekEarnings.toFixed(0)}`, icon: Clock, color: "#60a5fa" },
            { label: "All-Time", value: loading ? "—" : `$${totalEarnings.toFixed(0)}`, icon: Star, color: "#a78bfa" },
          ].map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }} className="p-4"
                style={{ background: "#111", border: "1px solid rgba(255,255,255,0.07)" }}>
                <Icon className="w-4 h-4 mb-3" style={{ color: s.color }} />
                <p className="text-2xl font-black text-white">{s.value}</p>
                <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>{s.label}</p>
              </motion.div>
            );
          })}
        </div>

        {/* Today's Schedule */}
        <div style={{ background: "#111", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="flex items-center justify-between px-5 py-4"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" style={{ color: "rgba(255,255,255,0.3)" }} />
              <h3 className="font-bold text-sm text-white">Today&apos;s Schedule</h3>
              {todayRides.length > 0 && (
                <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5"
                  style={{ background: `${YELLOW}22`, color: YELLOW, border: `1px solid ${YELLOW}44` }}>
                  {todayRides.length}
                </span>
              )}
            </div>
            <Link href="/driver/rides">
              <a className="flex items-center gap-1 text-xs font-semibold transition-colors"
                style={{ color: "rgba(255,255,255,0.35)" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = YELLOW; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.35)"; }}>
                All rides <ChevronRight className="w-3.5 h-3.5" />
              </a>
            </Link>
          </div>

          {loading ? (
            <div className="p-10 flex justify-center">
              <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
                style={{ borderColor: `${YELLOW} transparent ${YELLOW} ${YELLOW}` }} />
            </div>
          ) : todayRides.length === 0 ? (
            <div className="p-10 text-center">
              <Calendar className="w-8 h-8 mx-auto mb-3" style={{ color: "rgba(255,255,255,0.08)" }} />
              <p className="text-sm font-semibold text-white/50">No rides scheduled today</p>
              <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.25)" }}>
                Your assignments will appear here.
              </p>
            </div>
          ) : (
            <div>
              {todayRides
                .sort((a, b) => a.time.localeCompare(b.time))
                .map((r, i) => {
                  const sc = STATUS_COLORS[r.status] ?? STATUS_COLORS.pending;
                  return (
                    <motion.div key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.04 }}
                      className="flex items-center gap-4 px-5 py-3.5"
                      style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      <div className="w-14 shrink-0">
                        <p className="text-sm font-black text-white">{r.time}</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{r.pickupAddress}</p>
                        {r.passengerName && (
                          <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>{r.passengerName}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2.5 shrink-0">
                        <span className="text-sm font-black text-white">${r.totalAmount?.toFixed(0) ?? "—"}</span>
                        <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5"
                          style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}` }}>
                          {STATUS_LABELS[r.status]}
                        </span>
                        <button onClick={() => navigateTo(r.pickupAddress)}
                          className="p-1.5 transition-colors"
                          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                          <Navigation className="w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.4)" }} />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
            </div>
          )}
        </div>

        {/* Summary row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total Rides", value: rides.length, icon: Briefcase },
            { label: "Completed", value: completed.length, icon: CheckCircle },
            { label: "Completion", value: rides.length > 0 ? `${Math.round((completed.length / rides.length) * 100)}%` : "—", icon: Star },
          ].map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="p-3 text-center"
                style={{ background: "#0f0f0f", border: "1px solid rgba(255,255,255,0.05)" }}>
                <Icon className="w-4 h-4 mx-auto mb-2" style={{ color: "rgba(255,255,255,0.25)" }} />
                <p className="text-lg font-black text-white">{s.value}</p>
                <p className="text-[10px] uppercase tracking-widest mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>{s.label}</p>
              </div>
            );
          })}
        </div>

      </div>
    </PortalLayout>
  );
}
