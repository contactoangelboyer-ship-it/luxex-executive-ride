import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users2, Search, X, Loader2, Mail, Phone, Calendar,
  DollarSign, ClipboardList, ChevronRight, TrendingUp, XCircle,
  CheckCircle2, Clock, Car, MapPin, RefreshCw,
} from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { adminApi } from "@/lib/adminApi";

const YELLOW = "#C9A84C";

const STATUS_COLORS: Record<string, string> = {
  pending:     "text-[#C9A84C] bg-[#C9A84C]/10 border-[#C9A84C]/20",
  confirmed:   "text-blue-300 bg-blue-400/10 border-blue-400/20",
  assigned:    "text-purple-300 bg-purple-400/10 border-purple-400/20",
  in_progress: "text-white bg-white/10 border-white/30",
  completed:   "text-green-300 bg-green-400/10 border-green-400/20",
  cancelled:   "text-white/25 bg-white/[0.03] border-white/[0.06]",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending", confirmed: "Confirmed", assigned: "Assigned",
  in_progress: "In Progress", completed: "Completed", cancelled: "Cancelled",
};

const SERVICE_LABELS: Record<string, string> = {
  airport: "Airport", corporate: "Corporate", hourly: "Hourly", event: "Event",
};

const VEHICLE_LABELS: Record<string, string> = {
  sedan: "Sedan", suv: "SUV", van: "Van", limo: "Limo",
};

function fmt(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(d: string) {
  if (!d) return "—";
  return new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function Clients() {
  const [clients, setClients]         = useState<any[]>([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState("");
  const [selected, setSelected]       = useState<any | null>(null);
  const [bookings, setBookings]       = useState<any[]>([]);
  const [bookLoading, setBookLoading] = useState(false);

  const load = () => {
    setLoading(true);
    adminApi.clients.list()
      .then(setClients)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openClient = async (c: any) => {
    setSelected(c);
    setBookings([]);
    setBookLoading(true);
    try {
      const data = await adminApi.clients.bookings(c.email);
      setBookings(Array.isArray(data) ? data : []);
    } catch {
      setBookings([]);
    } finally {
      setBookLoading(false);
    }
  };

  const filtered = clients.filter(c => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      c.name?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.phone?.toLowerCase().includes(q)
    );
  });

  // Totals
  const totalRevenue = clients.reduce((s, c) => s + (c.totalSpent ?? 0), 0);
  const totalBookings = clients.reduce((s, c) => s + (c.totalBookings ?? 0), 0);

  return (
    <AdminLayout>
      <div className="space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="font-black text-xl uppercase tracking-tight text-white">Clients</h2>
            <p className="text-white/25 text-xs mt-0.5">
              {loading ? "Loading…" : `${clients.length} unique clients · ${totalBookings} total bookings · $${fmt(totalRevenue)} collected`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={load} disabled={loading}
              className="flex items-center gap-2 px-3 py-2 border border-white/10 text-white/30 hover:text-white hover:border-white/30 transition-colors text-[10px] font-bold tracking-widest uppercase disabled:opacity-40">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
            </button>
          </div>
        </div>

        {/* Summary cards */}
        {!loading && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: "Total Clients",   value: clients.length,           icon: Users2,       color: YELLOW },
              { label: "Total Bookings",  value: totalBookings,            icon: ClipboardList, color: YELLOW },
              { label: "Revenue",         value: `$${fmt(totalRevenue)}`,  icon: DollarSign,   color: "#4ade80" },
              { label: "Avg. per Client", value: clients.length ? `$${fmt(totalRevenue / clients.length)}` : "$0.00", icon: TrendingUp, color: "#60a5fa" },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="bg-[#0f0f0f] border border-white/[0.06] p-4 flex items-center gap-3">
                <div className="w-8 h-8 flex items-center justify-center border border-white/[0.08] shrink-0" style={{ background: `${color}15` }}>
                  <Icon className="w-4 h-4" style={{ color }} />
                </div>
                <div>
                  <p className="font-black text-lg text-white leading-tight">{value}</p>
                  <p className="text-[9px] uppercase tracking-widest text-white/20 font-bold">{label}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by name, email or phone…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-[#0f0f0f] border border-white/[0.07] focus:border-[#C9A84C]/40 text-sm text-white placeholder-white/20 pl-9 pr-4 py-2.5 outline-none transition-colors"
          />
          {search && (
            <button onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Table */}
        <div className="bg-[#0f0f0f] border border-white/[0.06] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.04]">
                  {["Name", "Email", "Phone", "Bookings", "Completed", "Cancelled", "Total Spent", "Last Trip", ""].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[10px] font-bold tracking-widest uppercase text-white/20 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={9} className="text-center py-12">
                    <Loader2 className="w-5 h-5 animate-spin text-white/20 mx-auto" />
                  </td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={9} className="text-center py-12 text-white/20 text-xs">
                    {search ? "No clients match your search." : "No clients yet. They'll appear here after the first booking."}
                  </td></tr>
                ) : filtered.map(c => (
                  <tr key={c.email}
                    className="border-b border-white/[0.03] hover:bg-white/[0.02] cursor-pointer transition-colors"
                    onClick={() => openClient(c)}>
                    <td className="px-4 py-3">
                      <p className="text-sm font-bold text-white">{c.name ?? "—"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs text-white/50 font-mono">{c.email}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-white/50">{c.phone ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-black text-white">{c.totalBookings ?? 0}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1 text-xs text-green-400">
                        <CheckCircle2 className="w-3 h-3" />{c.completedBookings ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1 text-xs text-white/30">
                        <XCircle className="w-3 h-3" />{c.cancelledBookings ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-bold" style={{ color: YELLOW }}>
                        ${fmt(c.totalSpent ?? 0)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-white/40 whitespace-nowrap">
                      {fmtDate(c.lastBookingDate)}
                    </td>
                    <td className="px-4 py-3">
                      <ChevronRight className="w-4 h-4 text-white/20" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Detail panel */}
      <AnimatePresence>
        {selected && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-50 flex items-start justify-end p-0"
            onClick={e => { if (e.target === e.currentTarget) setSelected(null); }}>

            <motion.div
              initial={{ x: 480 }} animate={{ x: 0 }} exit={{ x: 480 }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="h-full w-full max-w-lg bg-[#0a0a0a] border-l border-white/[0.07] flex flex-col overflow-hidden">

              {/* Panel header */}
              <div className="flex items-start justify-between px-6 py-5 border-b border-white/[0.06] shrink-0">
                <div className="flex-1 min-w-0 pr-3">
                  <h3 className="font-black text-lg text-white leading-tight truncate">{selected.name}</h3>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Mail className="w-3 h-3 text-white/30 shrink-0" />
                    <p className="text-xs text-white/40 font-mono truncate">{selected.email}</p>
                  </div>
                  {selected.phone && (
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Phone className="w-3 h-3 text-white/30 shrink-0" />
                      <p className="text-xs text-white/40">{selected.phone}</p>
                    </div>
                  )}
                </div>
                <button onClick={() => setSelected(null)} className="text-white/30 hover:text-white shrink-0">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Stats strip */}
              <div className="grid grid-cols-3 border-b border-white/[0.06] shrink-0">
                {[
                  { label: "Bookings",  value: selected.totalBookings ?? 0,       color: "white"    },
                  { label: "Completed", value: selected.completedBookings ?? 0,    color: "#4ade80"  },
                  { label: "Spent",     value: `$${fmt(selected.totalSpent ?? 0)}`, color: YELLOW    },
                ].map(({ label, value, color }, i) => (
                  <div key={label} className={`px-4 py-3 ${i < 2 ? "border-r border-white/[0.06]" : ""}`}>
                    <p className="font-black text-lg leading-tight" style={{ color }}>{value}</p>
                    <p className="text-[9px] uppercase tracking-widest text-white/20 font-bold mt-0.5">{label}</p>
                  </div>
                ))}
              </div>

              {/* Meta */}
              <div className="px-6 py-3 border-b border-white/[0.06] shrink-0 flex items-center gap-6">
                {selected.firstBookingDate && (
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3 h-3 text-white/25" />
                    <span className="text-[10px] text-white/30">First: {fmtDate(selected.firstBookingDate)}</span>
                  </div>
                )}
                {selected.lastBookingDate && (
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3 h-3 text-white/25" />
                    <span className="text-[10px] text-white/30">Last: {fmtDate(selected.lastBookingDate)}</span>
                  </div>
                )}
              </div>

              {/* Booking history */}
              <div className="flex-1 overflow-y-auto">
                <p className="px-6 pt-4 pb-2 text-[10px] font-black uppercase tracking-widest text-white/25">
                  Booking History
                </p>

                {bookLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-5 h-5 animate-spin text-white/20" />
                  </div>
                ) : bookings.length === 0 ? (
                  <div className="flex items-center justify-center py-16">
                    <p className="text-white/20 text-xs">No bookings found.</p>
                  </div>
                ) : (
                  <div className="px-4 pb-6 space-y-2">
                    {bookings.map(b => (
                      <motion.div key={b.id}
                        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                        className="bg-[#0f0f0f] border border-white/[0.06] p-4 space-y-3">

                        {/* Top row */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[10px] font-mono font-bold text-[#C9A84C]/70">{b.confirmationCode}</span>
                              <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 border ${STATUS_COLORS[b.status] ?? "text-white/30 border-white/10"}`}>
                                {STATUS_LABELS[b.status] ?? b.status}
                              </span>
                            </div>
                            <p className="text-xs text-white/60 mt-1">
                              {SERVICE_LABELS[b.service] ?? b.service} · {VEHICLE_LABELS[b.vehicleType] ?? b.vehicleType ?? "—"}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            {b.status !== "cancelled" && (b.totalAmount ?? 0) > 0 ? (
                              <p className="font-black text-sm" style={{ color: YELLOW }}>${fmt(b.totalAmount)}</p>
                            ) : (
                              <p className="text-xs text-white/20">—</p>
                            )}
                          </div>
                        </div>

                        {/* Date + route */}
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 text-[10px] text-white/35">
                            <Calendar className="w-3 h-3 shrink-0" />
                            <span>{fmtDate(b.date)} · {b.time}</span>
                          </div>
                          <div className="flex items-start gap-2 text-[10px] text-white/35">
                            <MapPin className="w-3 h-3 shrink-0 mt-0.5" />
                            <div className="min-w-0">
                              <p className="truncate">{b.pickupAddress}</p>
                              {b.dropoffAddress && <p className="truncate text-white/20">→ {b.dropoffAddress}</p>}
                            </div>
                          </div>
                          {b.vehicleType && (
                            <div className="flex items-center gap-2 text-[10px] text-white/25">
                              <Car className="w-3 h-3 shrink-0" />
                              <span>{VEHICLE_LABELS[b.vehicleType] ?? b.vehicleType} · {b.passengers ?? 1} pax</span>
                            </div>
                          )}
                        </div>

                        {/* Admin notes */}
                        {b.adminNotes && (
                          <p className="text-[10px] text-white/30 italic bg-white/[0.02] border border-white/[0.04] px-2.5 py-1.5">
                            {b.adminNotes}
                          </p>
                        )}
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
}
