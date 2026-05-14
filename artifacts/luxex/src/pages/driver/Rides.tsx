import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Car, Search, MapPin, User, Phone, Mail, Navigation,
  ChevronDown, ChevronUp, Package, Clock, DollarSign,
  CheckCircle, PlayCircle, FileText,
} from "lucide-react";
import { PortalLayout } from "@/components/PortalLayout";
import { getCurrentUser } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

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

const SERVICE_LABELS: Record<string, string> = {
  airport: "Airport Transfer", corporate: "Corporate", hourly: "Hourly", event: "Special Event",
};

export default function DriverRides() {
  const user = getCurrentUser()!;
  const { toast } = useToast();
  const [rides, setRides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const load = useCallback(() => {
    fetch(`/api/bookings/driver?email=${encodeURIComponent(user.email)}`)
      .then(r => r.ok ? r.json() : [])
      .then(data => setRides(Array.isArray(data) ? data : []))
      .catch(() => setRides([]))
      .finally(() => setLoading(false));
  }, [user.email]);

  useEffect(() => { load(); }, [load]);

  const filtered = rides.filter(r => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      r.pickupAddress?.toLowerCase().includes(q) ||
      r.dropoffAddress?.toLowerCase().includes(q) ||
      r.passengerName?.toLowerCase().includes(q) ||
      r.confirmationCode?.toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const navigateTo = (address: string) => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`, "_blank");
  };

  const updateStatus = async (id: number, status: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/bookings/${id}/driver-status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email, status }),
      });
      if (res.status === 503) {
        toast({ title: "Database not connected", description: "Status updates require a database connection.", variant: "destructive" });
        return;
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast({ title: "Error", description: (err as any).error ?? "Failed to update status", variant: "destructive" });
        return;
      }
      const updated = await res.json();
      setRides(prev => prev.map(r => r.id === id ? updated : r));
      toast({ title: "Status updated", description: `Ride is now ${STATUS_LABELS[updated.status]}` });
    } catch {
      toast({ title: "Error", description: "Network error. Please try again.", variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const toggleExpand = (id: number) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  return (
    <PortalLayout user={user} onLogout={() => window.location.href = "/"}>
      <div className="max-w-3xl mx-auto space-y-5 pb-10">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-black text-white">My Rides</h2>
          <span className="text-xs font-bold uppercase tracking-widest px-2.5 py-1"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)" }}>
            {filtered.length} results
          </span>
        </div>

        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "rgba(255,255,255,0.3)" }} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search address or passenger…"
              className="w-full pl-10 pr-4 py-2.5 text-sm text-white outline-none transition-all"
              style={{ background: "#111", border: "1px solid rgba(255,255,255,0.1)" }}
              onFocus={e => { (e.target as HTMLElement).style.borderColor = YELLOW; }}
              onBlur={e => { (e.target as HTMLElement).style.borderColor = "rgba(255,255,255,0.1)"; }} />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 text-sm outline-none cursor-pointer"
            style={{ background: "#111", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", colorScheme: "dark" }}>
            <option value="all">All Status</option>
            {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>

        {/* Rides List */}
        <div style={{ background: "#111", border: "1px solid rgba(255,255,255,0.07)" }}>
          {loading ? (
            <div className="p-12 flex justify-center">
              <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
                style={{ borderColor: `${YELLOW} transparent ${YELLOW} ${YELLOW}` }} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-14 text-center">
              <Car className="w-10 h-10 mx-auto mb-3" style={{ color: "rgba(255,255,255,0.1)" }} />
              <p className="text-sm font-semibold text-white">
                {rides.length === 0 ? "No rides assigned yet" : "No results found"}
              </p>
              <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>
                {rides.length === 0
                  ? "The admin will assign rides to your account. Make sure your driver profile email matches."
                  : "Try adjusting your search or filter."}
              </p>
            </div>
          ) : (
            <div>
              {filtered.map((r, i) => {
                const sc = STATUS_COLORS[r.status] ?? STATUS_COLORS.pending;
                const isExpanded = expandedId === r.id;
                const canStart = r.status === "assigned";
                const canComplete = r.status === "in_progress";

                return (
                  <div key={r.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    {/* Collapsed row */}
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.03 }}
                      className="flex items-start gap-4 px-5 py-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
                      onClick={() => toggleExpand(r.id)}>
                      <div className="w-10 h-10 flex items-center justify-center shrink-0"
                        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <MapPin className="w-5 h-5" style={{ color: YELLOW }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-white truncate">{r.pickupAddress ?? "Pickup"}</p>
                            {r.dropoffAddress && (
                              <p className="text-xs truncate mt-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>
                                → {r.dropoffAddress}
                              </p>
                            )}
                          </div>
                          <p className="text-sm font-black text-white shrink-0">${r.totalAmount?.toFixed(0) ?? "—"}</p>
                        </div>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.5)" }}>
                            {r.date} · {r.time}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5"
                            style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}` }}>
                            {STATUS_LABELS[r.status] ?? r.status}
                          </span>
                          {r.service && (
                            <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>
                              {SERVICE_LABELS[r.service] ?? r.service}
                            </span>
                          )}
                        </div>
                        {r.passengerName && (
                          <div className="flex items-center gap-1.5 mt-1">
                            <User className="w-3 h-3" style={{ color: "rgba(255,255,255,0.25)" }} />
                            <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.5)" }}>{r.passengerName}</span>
                          </div>
                        )}
                      </div>
                      <div className="shrink-0">
                        {isExpanded
                          ? <ChevronUp className="w-4 h-4" style={{ color: "rgba(255,255,255,0.3)" }} />
                          : <ChevronDown className="w-4 h-4" style={{ color: "rgba(255,255,255,0.2)" }} />
                        }
                      </div>
                    </motion.div>

                    {/* Expanded detail */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          style={{ overflow: "hidden" }}>
                          <div className="px-5 pb-5 space-y-4"
                            style={{ background: "rgba(255,255,255,0.015)", borderTop: "1px solid rgba(255,255,255,0.04)" }}>

                            {/* Route detail */}
                            <div className="pt-4 space-y-3">
                              <div className="flex items-start gap-3">
                                <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                                  style={{ background: "rgba(52,211,153,0.15)" }}>
                                  <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[10px] uppercase tracking-widest text-white/25 font-bold mb-0.5">Pickup Address</p>
                                  <p className="text-sm font-semibold text-white">{r.pickupAddress}</p>
                                </div>
                                <button onClick={e => { e.stopPropagation(); navigateTo(r.pickupAddress); }}
                                  className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest shrink-0"
                                  style={{ background: `${YELLOW}22`, border: `1px solid ${YELLOW}44`, color: YELLOW }}>
                                  <Navigation className="w-3 h-3" /> Go
                                </button>
                              </div>
                              {r.dropoffAddress && (
                                <div className="flex items-start gap-3">
                                  <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                                    style={{ background: "rgba(248,113,113,0.15)" }}>
                                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#f87171" }} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[10px] uppercase tracking-widest text-white/25 font-bold mb-0.5">Drop-off Address</p>
                                    <p className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.75)" }}>{r.dropoffAddress}</p>
                                  </div>
                                  <button onClick={e => { e.stopPropagation(); navigateTo(r.dropoffAddress); }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest shrink-0"
                                    style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)", color: "#f87171" }}>
                                    <Navigation className="w-3 h-3" /> Go
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* Info grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                              {[
                                { icon: Clock, label: "Date & Time", value: `${r.date} · ${r.time}` },
                                { icon: DollarSign, label: "Total", value: `$${r.totalAmount?.toFixed(2) ?? "0.00"}` },
                                { icon: User, label: "Passengers", value: `${r.passengers ?? 1} pax · ${r.bags ?? 0} bags` },
                                { icon: Car, label: "Vehicle", value: r.vehicleType ? r.vehicleType.replace("_", " ") : "Any" },
                              ].map(item => {
                                const Icon = item.icon;
                                return (
                                  <div key={item.label} className="px-3 py-2.5"
                                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                                    <div className="flex items-center gap-1.5 mb-1">
                                      <Icon className="w-3 h-3 text-white/25" />
                                      <p className="text-[9px] uppercase tracking-widest text-white/25 font-bold">{item.label}</p>
                                    </div>
                                    <p className="text-xs font-semibold text-white capitalize">{item.value}</p>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Passenger contact */}
                            <div className="space-y-2">
                              <p className="text-[10px] uppercase tracking-widest text-white/25 font-bold">Passenger Contact</p>
                              <div className="flex flex-wrap gap-2">
                                {r.passengerName && (
                                  <div className="flex items-center gap-2 px-3 py-2"
                                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                                    <User className="w-3.5 h-3.5 text-white/30" />
                                    <span className="text-xs text-white/70">{r.passengerName}</span>
                                  </div>
                                )}
                                {r.passengerPhone && (
                                  <a href={`tel:${r.passengerPhone}`} onClick={e => e.stopPropagation()}
                                    className="flex items-center gap-2 px-3 py-2 transition-colors"
                                    style={{ background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.2)", color: "#34d399" }}>
                                    <Phone className="w-3.5 h-3.5" />
                                    <span className="text-xs font-semibold">{r.passengerPhone}</span>
                                  </a>
                                )}
                                {r.passengerEmail && (
                                  <a href={`mailto:${r.passengerEmail}`} onClick={e => e.stopPropagation()}
                                    className="flex items-center gap-2 px-3 py-2 transition-colors"
                                    style={{ background: "rgba(96,165,250,0.06)", border: "1px solid rgba(96,165,250,0.2)", color: "#60a5fa" }}>
                                    <Mail className="w-3.5 h-3.5" />
                                    <span className="text-xs font-semibold">{r.passengerEmail}</span>
                                  </a>
                                )}
                              </div>
                            </div>

                            {/* Special requests */}
                            {(r.notes || r.meetAndGreet || r.childSeat || r.flightNumber) && (
                              <div className="space-y-2">
                                <p className="text-[10px] uppercase tracking-widest text-white/25 font-bold">Special Requests</p>
                                <div className="flex flex-wrap gap-2">
                                  {r.meetAndGreet && (
                                    <span className="flex items-center gap-1.5 text-xs px-2.5 py-1"
                                      style={{ background: `${YELLOW}18`, border: `1px solid ${YELLOW}30`, color: YELLOW }}>
                                      <User className="w-3 h-3" /> Meet & Greet
                                    </span>
                                  )}
                                  {r.childSeat && (
                                    <span className="flex items-center gap-1.5 text-xs px-2.5 py-1"
                                      style={{ background: "rgba(96,165,250,0.1)", border: "1px solid rgba(96,165,250,0.2)", color: "#60a5fa" }}>
                                      <Package className="w-3 h-3" /> Child Seat
                                    </span>
                                  )}
                                  {r.flightNumber && (
                                    <span className="flex items-center gap-1.5 text-xs px-2.5 py-1"
                                      style={{ background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.2)", color: "#a78bfa" }}>
                                      Flight: {r.flightNumber}
                                    </span>
                                  )}
                                </div>
                                {r.notes && (
                                  <div className="flex items-start gap-2 px-3 py-2.5"
                                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                                    <FileText className="w-3.5 h-3.5 text-white/25 shrink-0 mt-0.5" />
                                    <p className="text-xs italic" style={{ color: "rgba(255,255,255,0.55)" }}>{r.notes}</p>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Action buttons */}
                            {(canStart || canComplete) && (
                              <div className="flex gap-2 pt-1">
                                {canStart && (
                                  <motion.button whileTap={{ scale: 0.97 }}
                                    onClick={e => { e.stopPropagation(); updateStatus(r.id, "in_progress"); }}
                                    disabled={actionLoading === r.id}
                                    className="flex items-center gap-2 px-4 py-2.5 text-[11px] font-black uppercase tracking-widest flex-1 justify-center disabled:opacity-60"
                                    style={{ background: "rgba(52,211,153,0.12)", border: "1px solid rgba(52,211,153,0.35)", color: "#34d399" }}>
                                    <PlayCircle className="w-4 h-4" />
                                    {actionLoading === r.id ? "Updating…" : "Start Trip"}
                                  </motion.button>
                                )}
                                {canComplete && (
                                  <motion.button whileTap={{ scale: 0.97 }}
                                    onClick={e => { e.stopPropagation(); updateStatus(r.id, "completed"); }}
                                    disabled={actionLoading === r.id}
                                    className="flex items-center gap-2 px-4 py-2.5 text-[11px] font-black uppercase tracking-widest flex-1 justify-center disabled:opacity-60 text-black"
                                    style={{ background: YELLOW }}>
                                    <CheckCircle className="w-4 h-4" />
                                    {actionLoading === r.id ? "Updating…" : "Complete Trip"}
                                  </motion.button>
                                )}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </PortalLayout>
  );
}
