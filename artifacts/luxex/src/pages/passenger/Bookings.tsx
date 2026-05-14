import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Car, Search, Calendar, MapPin, User, Phone, Mail,
  ChevronDown, ChevronUp, Clock, DollarSign, XCircle,
  Package, CheckCircle, FileText,
} from "lucide-react";
import { PortalLayout } from "@/components/PortalLayout";
import { getCurrentUser } from "@/hooks/useAuth";
import { BookingSystem } from "@/components/BookingSystem";
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

export default function PassengerBookings() {
  const user = getCurrentUser()!;
  const { toast } = useToast();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  const load = useCallback(() => {
    fetch(`/api/bookings/passenger?email=${encodeURIComponent(user.email)}`)
      .then(r => r.ok ? r.json() : [])
      .then(data => setBookings(Array.isArray(data) ? data : []))
      .catch(() => setBookings([]))
      .finally(() => setLoading(false));
  }, [user.email]);

  useEffect(() => { load(); }, [load]);

  const filtered = bookings.filter(b => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      b.pickupAddress?.toLowerCase().includes(q) ||
      b.dropoffAddress?.toLowerCase().includes(q) ||
      b.confirmationCode?.toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || b.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const cancelBooking = async (id: number) => {
    if (!window.confirm("Cancel this booking? This cannot be undone.")) return;
    setCancellingId(id);
    try {
      const res = await fetch(`/api/bookings/${id}/cancel`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email }),
      });
      if (res.status === 503) {
        toast({ title: "Database not connected", description: "Cancellations require a database connection.", variant: "destructive" });
        return;
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast({ title: "Cannot cancel", description: (err as any).error ?? "Failed to cancel booking", variant: "destructive" });
        return;
      }
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status: "cancelled" } : b));
      setExpandedId(null);
      toast({ title: "Booking cancelled", description: "Your booking has been cancelled successfully." });
    } catch {
      toast({ title: "Error", description: "Network error. Please try again.", variant: "destructive" });
    } finally {
      setCancellingId(null);
    }
  };

  const toggleExpand = (id: number) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  return (
    <PortalLayout user={user} onLogout={() => window.location.href = "/"}>
      <div className="max-w-3xl mx-auto space-y-5 pb-10">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-2xl font-black text-white">My Bookings</h2>
            <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>{filtered.length} reservations</p>
          </div>
          <BookingSystem
            triggerClassName="flex items-center gap-2 px-5 py-2.5 text-sm font-black uppercase tracking-widest text-black"
            triggerText="+ New Booking"
            triggerStyle={{ background: YELLOW }}
          />
        </div>

        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "rgba(255,255,255,0.3)" }} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search address, confirmation code…"
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

        {/* Bookings list */}
        <div style={{ background: "#111", border: "1px solid rgba(255,255,255,0.07)" }}>
          {loading ? (
            <div className="p-12 flex justify-center">
              <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
                style={{ borderColor: `${YELLOW} transparent ${YELLOW} ${YELLOW}` }} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-14 text-center">
              <Calendar className="w-10 h-10 mx-auto mb-3" style={{ color: "rgba(255,255,255,0.1)" }} />
              <p className="text-sm font-semibold text-white">
                {bookings.length === 0 ? "No bookings yet" : "No results found"}
              </p>
              <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>
                {bookings.length === 0 ? "Your reservations will appear here." : "Try adjusting your search or filter."}
              </p>
            </div>
          ) : (
            <div>
              {filtered.map((b, i) => {
                const sc = STATUS_COLORS[b.status] ?? STATUS_COLORS.pending;
                const isExpanded = expandedId === b.id;
                const canCancel = ["pending", "confirmed"].includes(b.status);

                return (
                  <div key={b.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    {/* Collapsed row */}
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.04 }}
                      className="flex items-start gap-4 px-5 py-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
                      onClick={() => toggleExpand(b.id)}>
                      <div className="w-10 h-10 flex items-center justify-center shrink-0"
                        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <MapPin className="w-5 h-5" style={{ color: YELLOW }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-white truncate">{b.pickupAddress ?? "Pickup location"}</p>
                            {b.dropoffAddress && (
                              <p className="text-xs mt-0.5 truncate" style={{ color: "rgba(255,255,255,0.5)" }}>
                                → {b.dropoffAddress}
                              </p>
                            )}
                          </div>
                          <p className="text-sm font-black text-white shrink-0">${b.totalAmount?.toFixed(0) ?? "—"}</p>
                        </div>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className="font-mono text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>
                            {b.confirmationCode}
                          </span>
                          <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.4)" }}>
                            {b.date} · {b.time}
                          </span>
                          {b.service && (
                            <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>
                              {SERVICE_LABELS[b.service] ?? b.service}
                            </span>
                          )}
                          <span className="text-[10px] font-bold px-2 py-0.5"
                            style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}` }}>
                            {STATUS_LABELS[b.status] ?? b.status}
                          </span>
                        </div>
                      </div>
                      <div className="shrink-0 mt-1">
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
                            style={{ background: "rgba(255,255,255,0.012)", borderTop: "1px solid rgba(255,255,255,0.04)" }}>

                            {/* Info grid */}
                            <div className="pt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                              {[
                                { icon: Clock, label: "Date & Time", value: `${b.date} · ${b.time}` },
                                { icon: Car, label: "Service", value: SERVICE_LABELS[b.service] ?? b.service ?? "—" },
                                { icon: User, label: "Passengers", value: `${b.passengers ?? 1} pax · ${b.bags ?? 0} bags` },
                                { icon: DollarSign, label: "Total", value: `$${b.totalAmount?.toFixed(2) ?? "0.00"}` },
                              ].map(item => {
                                const Icon = item.icon;
                                return (
                                  <div key={item.label} className="px-3 py-2.5"
                                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                                    <div className="flex items-center gap-1.5 mb-1">
                                      <Icon className="w-3 h-3 text-white/25" />
                                      <p className="text-[9px] uppercase tracking-widest text-white/25 font-bold">{item.label}</p>
                                    </div>
                                    <p className="text-xs font-semibold text-white">{item.value}</p>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Price breakdown */}
                            {(b.baseAmount > 0 || b.mileageAmount > 0) && (
                              <div className="space-y-1.5">
                                <p className="text-[10px] uppercase tracking-widest text-white/25 font-bold">Price Breakdown</p>
                                <div className="px-3 py-3 space-y-1.5 text-xs"
                                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                                  {b.baseAmount > 0 && <div className="flex justify-between"><span className="text-white/40">Base</span><span className="text-white">${b.baseAmount?.toFixed(2)}</span></div>}
                                  {b.mileageAmount > 0 && <div className="flex justify-between"><span className="text-white/40">Mileage</span><span className="text-white">${b.mileageAmount?.toFixed(2)}</span></div>}
                                  {b.surchargesAmount > 0 && <div className="flex justify-between"><span className="text-white/40">Surcharges</span><span className="text-white">${b.surchargesAmount?.toFixed(2)}</span></div>}
                                  {b.tollsAmount > 0 && <div className="flex justify-between"><span className="text-white/40">Tolls</span><span className="text-white">${b.tollsAmount?.toFixed(2)}</span></div>}
                                  {b.promoDiscount > 0 && <div className="flex justify-between"><span className="text-green-400">Promo ({b.promoCode})</span><span className="text-green-400">-${b.promoDiscount?.toFixed(2)}</span></div>}
                                  <div className="flex justify-between pt-1.5 font-bold" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                                    <span className="text-white/60">Total</span>
                                    <span style={{ color: YELLOW }}>${b.totalAmount?.toFixed(2)}</span>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Driver info when assigned */}
                            {["assigned", "in_progress", "completed"].includes(b.status) && (
                              <div className="space-y-2">
                                <p className="text-[10px] uppercase tracking-widest text-white/25 font-bold">Your Driver</p>
                                <div className="flex items-center gap-3 px-4 py-3"
                                  style={{ background: "rgba(167,139,250,0.06)", border: "1px solid rgba(167,139,250,0.2)" }}>
                                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-black text-sm font-black shrink-0"
                                    style={{ background: "#a78bfa" }}>
                                    <User className="w-4 h-4 text-white" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-bold text-white">Driver Assigned</p>
                                    <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
                                      Your driver has been assigned. They will contact you before pickup.
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Special extras */}
                            {(b.meetAndGreet || b.childSeat || b.flightNumber || b.notes) && (
                              <div className="space-y-2">
                                <p className="text-[10px] uppercase tracking-widest text-white/25 font-bold">Extras & Notes</p>
                                <div className="flex flex-wrap gap-2">
                                  {b.meetAndGreet && (
                                    <span className="flex items-center gap-1.5 text-xs px-2.5 py-1"
                                      style={{ background: `${YELLOW}18`, border: `1px solid ${YELLOW}30`, color: YELLOW }}>
                                      <CheckCircle className="w-3 h-3" /> Meet & Greet
                                    </span>
                                  )}
                                  {b.childSeat && (
                                    <span className="flex items-center gap-1.5 text-xs px-2.5 py-1"
                                      style={{ background: "rgba(96,165,250,0.1)", border: "1px solid rgba(96,165,250,0.2)", color: "#60a5fa" }}>
                                      <Package className="w-3 h-3" /> Child Seat
                                    </span>
                                  )}
                                  {b.flightNumber && (
                                    <span className="flex items-center gap-1.5 text-xs px-2.5 py-1"
                                      style={{ background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.2)", color: "#a78bfa" }}>
                                      Flight: {b.flightNumber} ({b.flightType})
                                    </span>
                                  )}
                                </div>
                                {b.notes && (
                                  <div className="flex items-start gap-2 px-3 py-2"
                                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                                    <FileText className="w-3.5 h-3.5 text-white/25 shrink-0 mt-0.5" />
                                    <p className="text-xs italic text-white/50">{b.notes}</p>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Contact info (confirmation) */}
                            <div className="flex flex-wrap gap-2">
                              {b.passengerPhone && (
                                <div className="flex items-center gap-2 px-3 py-2"
                                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                                  <Phone className="w-3.5 h-3.5 text-white/30" />
                                  <span className="text-xs text-white/60">{b.passengerPhone}</span>
                                </div>
                              )}
                              {b.passengerEmail && (
                                <div className="flex items-center gap-2 px-3 py-2"
                                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                                  <Mail className="w-3.5 h-3.5 text-white/30" />
                                  <span className="text-xs text-white/60">{b.passengerEmail}</span>
                                </div>
                              )}
                            </div>

                            {/* Cancel button */}
                            {canCancel && (
                              <motion.button whileTap={{ scale: 0.97 }}
                                onClick={e => { e.stopPropagation(); cancelBooking(b.id); }}
                                disabled={cancellingId === b.id}
                                className="flex items-center gap-2 px-4 py-2.5 text-[11px] font-black uppercase tracking-widest disabled:opacity-60 transition-opacity"
                                style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)", color: "#f87171" }}>
                                <XCircle className="w-4 h-4" />
                                {cancellingId === b.id ? "Cancelling…" : "Cancel Booking"}
                              </motion.button>
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
