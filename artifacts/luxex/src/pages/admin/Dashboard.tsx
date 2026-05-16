import { useEffect, useState, useCallback } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar, Users, Clock, DollarSign, ChevronRight, AlertTriangle,
  TrendingUp, TrendingDown, Car, MapPin, Activity, RefreshCw,
  ArrowRight, Receipt, CalendarCheck, CheckCircle2, XCircle, Mail, Wifi,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { AdminLayout } from "@/components/AdminLayout";
import { adminApi } from "@/lib/adminApi";

const YELLOW = "#F2E147";
const Y20 = "rgba(242,225,71,0.2)";
const Y05 = "rgba(242,225,71,0.05)";

const STATUS_COLORS: Record<string, string> = {
  pending:     "text-[#F2E147] bg-[#F2E147]/10 border-[#F2E147]/20",
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

const CHART_TOOLTIP_STYLE = {
  backgroundColor: "#111",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 0,
  color: "#fff",
  fontSize: 11,
  fontFamily: "'DM Sans', sans-serif",
};

function generateDemoBookings(): any[] {
  const now = new Date();
  const rows: [number, string, string, string, number, string, string][] = [
    [0,  "airport",   "sedan", "confirmed",   245, "08:30", "James Rothman"],
    [0,  "corporate", "suv",   "assigned",    185, "14:00", "Sandra Lee"],
    [1,  "airport",   "sedan", "completed",   220, "07:15", "Michael Torres"],
    [1,  "hourly",    "suv",   "completed",   345, "10:00", "Priya Kapoor"],
    [2,  "corporate", "sedan", "completed",   165, "09:30", "David Chen"],
    [2,  "airport",   "suv",   "completed",   290, "18:45", "Elena Voss"],
    [3,  "event",     "limo",  "completed",   480, "20:00", "Robert Kim"],
    [3,  "corporate", "sedan", "completed",   175, "08:00", "Lisa Park"],
    [4,  "airport",   "sedan", "completed",   210, "11:30", "Marcus Webb"],
    [4,  "hourly",    "van",   "completed",   415, "13:00", "Sophia Nair"],
    [5,  "corporate", "sedan", "cancelled",     0, "16:00", "James Rothman"],
    [5,  "airport",   "suv",   "completed",   255, "06:45", "Sandra Lee"],
    [6,  "airport",   "sedan", "completed",   195, "09:15", "Priya Kapoor"],
    [6,  "corporate", "sedan", "completed",   160, "15:30", "David Chen"],
    [7,  "event",     "suv",   "completed",   390, "19:00", "Elena Voss"],
    [7,  "airport",   "sedan", "completed",   230, "07:45", "Michael Torres"],
    [8,  "hourly",    "sedan", "completed",   270, "11:00", "Marcus Webb"],
    [8,  "corporate", "suv",   "completed",   310, "14:30", "Robert Kim"],
    [9,  "airport",   "sedan", "cancelled",     0, "08:00", "Lisa Park"],
    [9,  "corporate", "sedan", "completed",   185, "10:45", "Sophia Nair"],
    [10, "airport",   "suv",   "completed",   260, "17:15", "James Rothman"],
    [10, "event",     "limo",  "completed",   520, "21:00", "Sandra Lee"],
    [11, "corporate", "sedan", "completed",   170, "09:00", "David Chen"],
    [11, "airport",   "sedan", "completed",   215, "06:30", "Priya Kapoor"],
    [12, "hourly",    "van",   "completed",   380, "12:00", "Marcus Webb"],
    [12, "corporate", "sedan", "completed",   155, "15:00", "Elena Voss"],
    [13, "airport",   "sedan", "completed",   200, "08:15", "Michael Torres"],
    [13, "corporate", "suv",   "completed",   320, "13:45", "Robert Kim"],
  ];
  const pickups = ["Newark Liberty Intl Airport", "JFK Terminal 4", "Manhattan Midtown", "LaGuardia Airport", "Greenwich, CT"];
  const drops   = ["Manhattan Midtown", "Hoboken, NJ", "Newark, NJ", "Westchester, NY", "Brooklyn, NY"];
  return rows.map(([dayOffset, service, vehicleType, status, amount, time, name], idx) => {
    const d = new Date(now);
    d.setDate(d.getDate() - dayOffset);
    return {
      id: idx + 1,
      confirmationCode: `LX${String(idx + 1).padStart(5, "0")}`,
      status, service, vehicleType, totalAmount: amount,
      date: d.toISOString().split("T")[0], time,
      passengerName: name,
      pickupAddress: pickups[idx % pickups.length],
      dropoffAddress: drops[idx % drops.length],
    };
  });
}

const DEMO_BOOKINGS = generateDemoBookings();

function buildRevenueTrend(bookings: any[]): { day: string; revenue: number; count: number }[] {
  const days: Record<string, { revenue: number; count: number }> = {};
  const now = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days[key] = { revenue: 0, count: 0 };
  }
  for (const b of bookings) {
    if (days[b.date] && b.status !== "cancelled") {
      days[b.date].revenue += b.totalAmount ?? 0;
      days[b.date].count++;
    }
  }
  return Object.entries(days).map(([day, v]) => ({
    day: new Date(day + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    revenue: Math.round(v.revenue),
    count: v.count,
  }));
}

function buildStatusPie(bookings: any[]): { name: string; value: number; color: string }[] {
  const counts: Record<string, number> = {};
  for (const b of bookings) counts[b.status] = (counts[b.status] ?? 0) + 1;
  const colorMap: Record<string, string> = {
    pending: YELLOW, confirmed: "#60a5fa", assigned: "#a78bfa",
    in_progress: "#ffffff", completed: "#4ade80", cancelled: "#444",
  };
  return Object.entries(counts)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({ name: STATUS_LABELS[k] ?? k, value: v, color: colorMap[k] ?? "#555" }));
}

function buildServiceBreakdown(bookings: any[]): { name: string; revenue: number; count: number }[] {
  const map: Record<string, { revenue: number; count: number }> = {};
  for (const b of bookings) {
    if (b.status === "cancelled") continue;
    const svc = b.service ?? "other";
    if (!map[svc]) map[svc] = { revenue: 0, count: 0 };
    map[svc].revenue += b.totalAmount ?? 0;
    map[svc].count++;
  }
  return Object.entries(map).map(([k, v]) => ({
    name: SERVICE_LABELS[k] ?? k,
    revenue: Math.round(v.revenue),
    count: v.count,
  })).sort((a, b) => b.revenue - a.revenue);
}

function buildVehicleBreakdown(bookings: any[]): { name: string; count: number }[] {
  const map: Record<string, number> = {};
  for (const b of bookings) {
    if (!b.vehicleType || b.status === "cancelled") continue;
    map[b.vehicleType] = (map[b.vehicleType] ?? 0) + 1;
  }
  const labels: Record<string, string> = { sedan: "Sedan", suv: "SUV", van: "Van", limo: "Limo" };
  return Object.entries(map).map(([k, v]) => ({ name: labels[k] ?? k, count: v })).sort((a, b) => b.count - a.count);
}

function StatCard({ label, value, icon: Icon, color, sub, trend, loading, delay = 0 }: {
  label: string; value: React.ReactNode; icon: any; color: string; sub: string;
  trend?: "up" | "down" | null; loading?: boolean; delay?: number;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
      className="bg-[#0f0f0f] border border-white/[0.06] p-5 relative overflow-hidden group hover:border-white/[0.12] transition-colors">
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent pointer-events-none" />
      <div className="flex items-start justify-between mb-4">
        <div className="w-8 h-8 flex items-center justify-center border border-white/[0.08]" style={{ background: `${color}15` }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        {trend && (
          <span className={`flex items-center gap-1 text-[10px] font-bold ${trend === "up" ? "text-green-400" : "text-red-400"}`}>
            {trend === "up" ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          </span>
        )}
      </div>
      <p className="font-black text-2xl text-white mb-1 tracking-tight">
        {loading ? <span className="inline-block w-16 h-7 bg-white/5 animate-pulse" /> : value}
      </p>
      <p className="text-[10px] text-white/20 uppercase tracking-widest font-bold">{label}</p>
      {sub && <p className="text-[10px] text-white/25 mt-1">{sub}</p>}
    </motion.div>
  );
}

function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h3 className="font-black text-sm uppercase tracking-wider text-white/80">{title}</h3>
      {action}
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [allBookings, setAllBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dnsHealth, setDnsHealth] = useState<any>(null);
  const [dnsHealth, setDnsHealth] = useState<any>(null);
  const [activeChart, setActiveChart] = useState<"revenue" | "count">("revenue");

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    try {
      const [dashData, bookings] = await Promise.all([
        adminApi.dashboard(),
        adminApi.bookings.list(),
      ]);
      setData(dashData);
      setAllBookings(bookings);
      adminApi.dnsHealth().then(setDnsHealth).catch(() => {});
    } catch (e) { console.error(e); } finally {
      setLoading(false); setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const stats = data?.stats ?? {};
  const dbConfigured = data?.dbConfigured !== false;
  const recentBookings = (data?.recentBookings ?? []).slice(0, 8);

  const displayBookings = !loading && !dbConfigured ? DEMO_BOOKINGS : allBookings;

  const revenueTrend = buildRevenueTrend(displayBookings);
  const statusPie = buildStatusPie(displayBookings);
  const serviceBreakdown = buildServiceBreakdown(displayBookings);
  const vehicleBreakdown = buildVehicleBreakdown(displayBookings);

  const completedDisplay = displayBookings.filter(b => b.status === "completed");
  const demoRevenue = completedDisplay.reduce((s, b) => s + (b.totalAmount ?? 0), 0);
  const avgTicket = completedDisplay.length > 0
    ? (dbConfigured ? (stats.totalRevenue ?? 0) : demoRevenue) / completedDisplay.length
    : 0;

  const completionRate = displayBookings.length > 0
    ? Math.round((completedDisplay.length / displayBookings.length) * 100)
    : 0;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-black text-xl uppercase tracking-tight text-white mb-1">Operations Dashboard</h2>
            <p className="text-white/25 text-xs">{new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
          </div>
          <button onClick={() => load(true)} disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 border border-white/10 text-white/30 hover:text-white hover:border-white/30 transition-colors text-[10px] font-bold tracking-widest uppercase">
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>

        {/* DB Warning */}
        {!loading && !dbConfigured && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-4 p-4 border border-[#F2E147]/20 bg-[#F2E147]/5">
            <AlertTriangle className="w-5 h-5 text-[#F2E147] shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-[#F2E147] mb-1">Database not connected — showing demo data</p>
              <p className="text-xs text-white/40 leading-relaxed">
                Charts and metrics below use sample data for preview. Add a <code className="font-mono bg-[#F2E147]/10 px-1 text-[#F2E147]">DATABASE_URL</code> environment variable to switch to live data.
              </p>
            </div>
          </motion.div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Today's Bookings" value={stats.todayBookings ?? 0} icon={Calendar} color={YELLOW}
            sub={`${stats.totalBookings ?? 0} total all-time`} loading={loading} delay={0} />
          <StatCard label="Today's Revenue" value={`$${(stats.todayRevenue ?? 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`} icon={DollarSign} color={YELLOW}
            sub={`$${(stats.totalRevenue ?? 0).toLocaleString("en-US", { maximumFractionDigits: 0 })} all-time`} loading={loading} delay={0.04} />
          <StatCard label="Pending Actions" value={stats.pendingBookings ?? 0} icon={Clock} color="rgba(255,255,255,0.5)"
            sub="Require attention" loading={loading} delay={0.08} />
          <StatCard label="Fleet Status" value={`${stats.availableDrivers ?? 0}/${stats.totalDrivers ?? 0}`} icon={Users} color="rgba(255,255,255,0.5)"
            sub={`${stats.activeVehicles ?? 0} active vehicles`} loading={loading} delay={0.12} />
        </div>

        {/* Secondary KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}
            className="bg-[#0f0f0f] border border-white/[0.06] px-4 py-3 flex items-center gap-3">
            <div className="w-7 h-7 flex items-center justify-center bg-green-400/10 border border-green-400/20 shrink-0">
              <TrendingUp className="w-3.5 h-3.5 text-green-400" />
            </div>
            <div>
              <p className="font-black text-lg text-white">{completionRate}%</p>
              <p className="text-[9px] uppercase tracking-widest text-white/20 font-bold">Completion Rate</p>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="bg-[#0f0f0f] border border-white/[0.06] px-4 py-3 flex items-center gap-3">
            <div className="w-7 h-7 flex items-center justify-center bg-[#F2E147]/10 border border-[#F2E147]/20 shrink-0">
              <Receipt className="w-3.5 h-3.5 text-[#F2E147]" />
            </div>
            <div>
              <p className="font-black text-lg text-white">${avgTicket.toFixed(0)}</p>
              <p className="text-[9px] uppercase tracking-widest text-white/20 font-bold">Avg. Ticket</p>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }}
            className="bg-[#0f0f0f] border border-white/[0.06] px-4 py-3 flex items-center gap-3">
            <div className="w-7 h-7 flex items-center justify-center bg-blue-400/10 border border-blue-400/20 shrink-0">
              <Car className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <div>
              <p className="font-black text-lg text-white">{displayBookings.filter(b => b.status === "in_progress").length}</p>
              <p className="text-[9px] uppercase tracking-widest text-white/20 font-bold">In Progress</p>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}
            className="bg-[#0f0f0f] border border-white/[0.06] px-4 py-3 flex items-center gap-3">
            <div className="w-7 h-7 flex items-center justify-center bg-purple-400/10 border border-purple-400/20 shrink-0">
              <CalendarCheck className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <div>
              <p className="font-black text-lg text-white">{displayBookings.filter(b => b.status === "confirmed" || b.status === "assigned").length}</p>
              <p className="text-[9px] uppercase tracking-widest text-white/20 font-bold">Confirmed</p>
            </div>
          </motion.div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { href: "/admin/bookings?status=pending", label: "View Pending", icon: Clock, active: true },
            { href: "/admin/bookings", label: "All Bookings", icon: Calendar, active: false },
            { href: "/admin/drivers", label: "Manage Drivers", icon: Users, active: false },
            { href: "/admin/pricing", label: "Adjust Pricing", icon: DollarSign, active: false },
          ].map((a, i) => {
            const Icon = a.icon;
            return (
              <Link key={a.href} href={a.href}>
                <a className={`flex items-center justify-between p-3 border text-xs font-bold tracking-wide hover:bg-white/[0.03] transition-colors ${a.active ? "border-[#F2E147]/30 text-[#F2E147] bg-[#F2E147]/5" : "border-white/[0.07] text-white/40 hover:text-white hover:border-white/20"}`}>
                  <div className="flex items-center gap-2">
                    <Icon className="w-3.5 h-3.5" />
                    {a.label}
                  </div>
                  <ChevronRight className="w-3.5 h-3.5" />
                </a>
              </Link>
            );
          })}
        </div>

          {/* System Health */}
          {dnsHealth && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="bg-[#0f0f0f] border border-white/[0.06] p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Wifi className="w-3.5 h-3.5 text-white/30" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/40">System Health</span>
                </div>
                {dnsHealth.ok
                  ? <span className="text-[9px] font-bold text-green-400 uppercase tracking-widest flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> All systems operational</span>
                  : <span className="text-[9px] font-bold text-red-400 uppercase tracking-widest flex items-center gap-1"><XCircle className="w-3 h-3" /> Action required</span>
                }
              </div>
              <div className="flex flex-wrap gap-2">
                {dnsHealth.checks?.map((check: any) => (
                  <div key={check.id} title={check.detail}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 border text-[10px] font-bold cursor-default ${check.ok ? "border-white/[0.06] bg-white/[0.02] text-white/40" : "border-red-500/30 bg-red-500/10 text-red-400"}`}>
                    {check.ok ? <CheckCircle2 className="w-3 h-3 text-green-400 shrink-0" /> : <XCircle className="w-3 h-3 text-red-400 shrink-0" />}
                    {check.label}
                  </div>
                ))}
                <button onClick={() => adminApi.dnsHealth().then(setDnsHealth).catch(() => {})}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 border border-white/[0.06] text-[10px] font-bold text-white/20 hover:text-white hover:border-white/20 transition-colors">
                  <RefreshCw className="w-3 h-3" /> Refresh
                </button>
              </div>
              {!dnsHealth.ok && (
                <p className="text-[10px] text-white/30 mt-2 leading-relaxed">
                  Items in red indicate a configuration problem. Hover each badge to see details.
                </p>
              )}
            </motion.div>
          )}

          {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Revenue / Count Area Chart */}
          <div className="lg:col-span-2 bg-[#0f0f0f] border border-white/[0.06] p-5">
            <div className="flex items-center justify-between mb-5">
              <SectionHeader title="14-Day Activity" />
              <div className="flex gap-1 ml-auto -mt-4">
                {(["revenue", "count"] as const).map(k => (
                  <button key={k} onClick={() => setActiveChart(k)}
                    className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest border transition-colors ${activeChart === k ? "border-[#F2E147] text-[#F2E147] bg-[#F2E147]/10" : "border-white/10 text-white/30 hover:border-white/20"}`}>
                    {k === "revenue" ? "Revenue" : "Trips"}
                  </button>
                ))}
              </div>
            </div>
            {loading ? (
              <div className="h-40 bg-white/[0.02] animate-pulse" />
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={revenueTrend} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="yGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={YELLOW} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={YELLOW} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="day" tick={{ fill: "rgba(255,255,255,0.2)", fontSize: 9, fontFamily: "DM Sans" }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: "rgba(255,255,255,0.2)", fontSize: 9, fontFamily: "DM Sans" }} tickLine={false} axisLine={false}
                    tickFormatter={v => activeChart === "revenue" ? `$${v}` : String(v)} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE}
                    formatter={(v: any) => [activeChart === "revenue" ? `$${v.toLocaleString()}` : v, activeChart === "revenue" ? "Revenue" : "Trips"]} />
                  <Area type="monotone" dataKey={activeChart} stroke={YELLOW} strokeWidth={2} fill="url(#yGrad)" dot={false} activeDot={{ r: 4, fill: YELLOW, stroke: "black", strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Status Pie */}
          <div className="bg-[#0f0f0f] border border-white/[0.06] p-5">
            <SectionHeader title="Status Mix" />
            {loading || statusPie.length === 0 ? (
              <div className="h-40 bg-white/[0.02] animate-pulse" />
            ) : (
              <>
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <Pie data={statusPie} cx="50%" cy="50%" innerRadius={40} outerRadius={60}
                      paddingAngle={3} dataKey="value" strokeWidth={0}>
                      {statusPie.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 mt-2">
                  {statusPie.map(s => (
                    <div key={s.name} className="flex items-center justify-between text-[10px]">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
                        <span className="text-white/40">{s.name}</span>
                      </div>
                      <span className="font-bold text-white/60">{s.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Service & Vehicle Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Revenue by Service */}
          <div className="bg-[#0f0f0f] border border-white/[0.06] p-5">
            <SectionHeader title="Revenue by Service" />
            {loading || serviceBreakdown.length === 0 ? (
              <div className="h-36 bg-white/[0.02] animate-pulse" />
            ) : (
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={serviceBreakdown} margin={{ top: 0, right: 0, left: -20, bottom: 0 }} barSize={20}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: "rgba(255,255,255,0.2)", fontSize: 9, fontFamily: "DM Sans" }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: "rgba(255,255,255,0.2)", fontSize: 9, fontFamily: "DM Sans" }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(v: any) => [`$${v.toLocaleString()}`, "Revenue"]} />
                  <Bar dataKey="revenue" fill={YELLOW} radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Vehicle Utilization */}
          <div className="bg-[#0f0f0f] border border-white/[0.06] p-5">
            <SectionHeader title="Fleet Utilization" />
            {loading || vehicleBreakdown.length === 0 ? (
              <div className="h-36 bg-white/[0.02] animate-pulse" />
            ) : (
              <div className="space-y-3 mt-2">
                {vehicleBreakdown.map(v => {
                  const max = vehicleBreakdown[0]?.count ?? 1;
                  const pct = Math.round((v.count / max) * 100);
                  return (
                    <div key={v.name}>
                      <div className="flex justify-between text-[10px] mb-1.5">
                        <span className="text-white/50 font-bold uppercase tracking-wider">{v.name}</span>
                        <span className="text-white/30">{v.count} trips</span>
                      </div>
                      <div className="w-full h-1.5 bg-white/[0.05]">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ delay: 0.3, duration: 0.8 }}
                          className="h-full" style={{ background: YELLOW }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Recent Bookings Table */}
        <div className="bg-[#0f0f0f] border border-white/[0.06]">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
            <h3 className="font-bold text-sm uppercase tracking-wider text-white/80">Recent Bookings</h3>
            <Link href="/admin/bookings">
              <a className="flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase text-white/25 hover:text-[#F2E147] transition-colors">
                View all <ArrowRight className="w-3 h-3" />
              </a>
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.04]">
                  {["Code", "Passenger", "Service", "Route", "Date", "Vehicle", "Amount", "Status"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[10px] font-bold tracking-widest uppercase text-white/20 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="border-b border-white/[0.03]">
                      {Array.from({ length: 8 }).map((_, j) => (
                        <td key={j} className="px-4 py-3"><div className="h-3 bg-white/[0.04] animate-pulse" style={{ width: `${50 + Math.random() * 50}%` }} /></td>
                      ))}
                    </tr>
                  ))
                ) : recentBookings.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-10 text-white/20 text-xs">
                      {dbConfigured ? "No bookings yet" : "Connect a database to see bookings here"}
                    </td>
                  </tr>
                ) : recentBookings.map((b: any) => (
                  <tr key={b.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors group">
                    <td className="px-4 py-3 font-mono text-[11px] text-[#F2E147]">{b.confirmationCode}</td>
                    <td className="px-4 py-3 text-xs text-white font-medium whitespace-nowrap">{b.passengerName}</td>
                    <td className="px-4 py-3 text-xs text-white/50 capitalize whitespace-nowrap">{SERVICE_LABELS[b.service] ?? b.service}</td>
                    <td className="px-4 py-3 text-xs text-white/40 max-w-[160px]">
                      <div className="flex items-center gap-1 truncate">
                        <MapPin className="w-3 h-3 text-[#F2E147]/40 shrink-0" />
                        <span className="truncate">{b.pickupAddress?.split(",")[0] ?? "—"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-white/50 whitespace-nowrap">{b.date} · {b.time}</td>
                    <td className="px-4 py-3 text-xs text-white/50 capitalize whitespace-nowrap">{b.vehicleType ?? "—"}</td>
                    <td className="px-4 py-3 text-xs font-black text-white whitespace-nowrap">${(b.totalAmount ?? 0).toFixed(0)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-1 border ${STATUS_COLORS[b.status] ?? "text-white/30 border-white/10"}`}>
                        {STATUS_LABELS[b.status] ?? b.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Live Status Bar */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          className="flex items-center gap-2 px-4 py-3 border border-white/[0.05] bg-white/[0.01]">
          <Activity className="w-3.5 h-3.5 text-green-400 shrink-0" />
          <div className="flex items-center gap-1.5 flex-1 min-w-0 flex-wrap gap-y-1">
            <span className="text-[10px] text-white/25 uppercase tracking-widest font-bold">Fleet</span>
            {[
              { label: "Available", value: stats.availableDrivers ?? 0, color: "text-green-400" },
              { label: "On Trip", value: displayBookings.filter(b => b.status === "in_progress").length, color: "text-blue-400" },
              { label: "Off Duty", value: Math.max(0, (stats.totalDrivers ?? 0) - (stats.availableDrivers ?? 0) - displayBookings.filter(b => b.status === "in_progress").length), color: "text-white/30" },
            ].map(s => (
              <span key={s.label} className="flex items-center gap-1 text-[10px]">
                <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" style={{ color: s.color.replace("text-", "") }} />
                <span className={s.color}>{s.value}</span>
                <span className="text-white/20">{s.label}</span>
                <span className="text-white/10 mx-1">·</span>
              </span>
            ))}
          </div>
          <span className="text-[9px] text-white/15 uppercase tracking-widest shrink-0">
            Updated {new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
          </span>
        </motion.div>
      </div>
    </AdminLayout>
  );
}
