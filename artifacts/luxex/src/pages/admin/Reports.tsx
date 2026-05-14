import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  DollarSign, TrendingUp, Car, Users, RefreshCw,
  AlertTriangle, Download, BarChart3, Star,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { AdminLayout } from "@/components/AdminLayout";
import { adminApi } from "@/lib/adminApi";

const YELLOW = "#F2E147";
const COLORS = [YELLOW, "#60a5fa", "#a78bfa", "#34d399", "#f87171", "#fb923c"];

type Range = "week" | "month" | "all";

function generateDailyData(bookings: any[], days: number) {
  const result: { date: string; revenue: number; trips: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split("T")[0];
    const dayBookings = bookings.filter(b => b.date === key && b.status === "completed");
    result.push({
      date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      revenue: dayBookings.reduce((s, b) => s + (b.totalAmount ?? 0), 0),
      trips: dayBookings.length,
    });
  }
  return result;
}

export default function Reports() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [range, setRange] = useState<Range>("month");
  const [dbConfigured, setDbConfigured] = useState(true);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    try {
      const [b, d] = await Promise.all([adminApi.bookings.list(), adminApi.drivers.list()]);
      setBookings(b);
      setDrivers(d);
      setDbConfigured(true);
    } catch {
      setDbConfigured(false);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const now = new Date();
  const filterByRange = (b: any[]) => {
    if (range === "week") {
      const cutoff = new Date(now); cutoff.setDate(cutoff.getDate() - 7);
      return b.filter(x => new Date(x.date) >= cutoff);
    }
    if (range === "month") {
      const cutoff = new Date(now); cutoff.setDate(cutoff.getDate() - 30);
      return b.filter(x => new Date(x.date) >= cutoff);
    }
    return b;
  };

  const ranged = filterByRange(bookings);
  const completed = ranged.filter(b => b.status === "completed");
  const cancelled = ranged.filter(b => b.status === "cancelled");
  const totalRevenue = completed.reduce((s, b) => s + (b.totalAmount ?? 0), 0);
  const avgTicket = completed.length > 0 ? totalRevenue / completed.length : 0;
  const completionRate = ranged.length > 0 ? Math.round((completed.length / ranged.length) * 100) : 0;

  const dailyData = generateDailyData(bookings, range === "week" ? 7 : range === "month" ? 30 : 60);

  const vehicleData = ["sedan", "suv", "van", "limo"].map(type => ({
    name: { sedan: "Sedan", suv: "SUV", van: "Van", limo: "Limo" }[type] ?? type,
    value: completed.filter(b => b.vehicleType === type).length,
    revenue: completed.filter(b => b.vehicleType === type).reduce((s, b) => s + (b.totalAmount ?? 0), 0),
  })).filter(d => d.value > 0);

  const statusData = [
    { name: "Completed", value: bookings.filter(b => b.status === "completed").length, color: "#34d399" },
    { name: "Pending", value: bookings.filter(b => b.status === "pending").length, color: YELLOW },
    { name: "Confirmed", value: bookings.filter(b => b.status === "confirmed").length, color: "#60a5fa" },
    { name: "Assigned", value: bookings.filter(b => b.status === "assigned").length, color: "#a78bfa" },
    { name: "Cancelled", value: bookings.filter(b => b.status === "cancelled").length, color: "#f87171" },
  ].filter(d => d.value > 0);

  const driverPerformance = drivers
    .map(d => {
      const driverBookings = completed.filter(b => b.driverId === d.id);
      return {
        name: d.name,
        trips: driverBookings.length,
        earnings: driverBookings.reduce((s, b) => s + (b.totalAmount ?? 0), 0),
        rating: d.rating ?? 5.0,
      };
    })
    .filter(d => d.trips > 0)
    .sort((a, b) => b.earnings - a.earnings)
    .slice(0, 8);

  const exportCSV = () => {
    const headers = ["Date", "Code", "Passenger", "Service", "Vehicle", "Driver", "Total", "Status"];
    const rows = ranged.map(b => {
      const driver = drivers.find(d => d.id === b.driverId);
      return [b.date, b.confirmationCode, b.passengerName, b.service, b.vehicleType ?? "", driver?.name ?? "", b.totalAmount?.toFixed(2) ?? "0", b.status];
    });
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `luxex-report-${range}-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="px-3 py-2.5 text-xs" style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.1)" }}>
        <p className="font-bold text-white mb-1">{label}</p>
        {payload.map((p: any) => (
          <p key={p.name} style={{ color: p.color }}>
            {p.name}: {p.name === "Revenue" ? `$${p.value.toFixed(0)}` : p.value}
          </p>
        ))}
      </div>
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="font-black text-xl uppercase tracking-tight text-white mb-1">Reports & Analytics</h2>
            <p className="text-white/25 text-xs">Revenue, trip volume, and driver performance</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex border border-white/[0.07]">
              {(["week", "month", "all"] as Range[]).map(r => (
                <button key={r} onClick={() => setRange(r)}
                  className={`px-3 py-2 text-[10px] font-bold tracking-widest uppercase transition-colors ${range === r ? "text-black" : "text-white/30 hover:text-white"}`}
                  style={range === r ? { background: YELLOW } : {}}>
                  {r === "week" ? "7 Days" : r === "month" ? "30 Days" : "All Time"}
                </button>
              ))}
            </div>
            <button onClick={() => load(true)} disabled={refreshing}
              className="p-2 border border-white/[0.07] text-white/30 hover:text-white hover:border-white/30 transition-colors">
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            </button>
            <button onClick={exportCSV}
              className="flex items-center gap-2 px-3 py-2 border border-white/[0.07] text-white/30 hover:text-white hover:border-white/30 transition-colors text-[10px] font-bold tracking-widest uppercase">
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
          </div>
        </div>

        {/* DB Warning */}
        {!loading && !dbConfigured && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-4 p-4 border border-[#F2E147]/20 bg-[#F2E147]/5">
            <AlertTriangle className="w-5 h-5 text-[#F2E147] shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-[#F2E147] mb-1">Database not connected</p>
              <p className="text-xs text-white/40 leading-relaxed">
                Add a <code className="font-mono bg-[#F2E147]/10 px-1 text-[#F2E147]">DATABASE_URL</code> environment variable to see live analytics.
              </p>
            </div>
          </motion.div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Total Revenue", value: loading ? "—" : `$${totalRevenue.toLocaleString("en-US", { maximumFractionDigits: 0 })}`, icon: DollarSign, color: YELLOW, sub: `${completed.length} completed trips` },
            { label: "Avg. Ticket", value: loading ? "—" : `$${avgTicket.toFixed(0)}`, icon: BarChart3, color: "#60a5fa", sub: "per completed ride" },
            { label: "Completion Rate", value: loading ? "—" : `${completionRate}%`, icon: TrendingUp, color: "#34d399", sub: `${cancelled.length} cancelled` },
            { label: "Active Drivers", value: loading ? "—" : drivers.filter(d => d.status === "available").length, icon: Users, color: "#a78bfa", sub: `${drivers.length} registered total` },
          ].map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-[#0f0f0f] border border-white/[0.06] px-4 py-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-8 h-8 flex items-center justify-center border border-white/[0.06]" style={{ background: `${s.color}18` }}>
                    <Icon className="w-4 h-4" style={{ color: s.color }} />
                  </div>
                </div>
                <p className="font-black text-2xl text-white mb-1">{s.value}</p>
                <p className="text-[10px] uppercase tracking-widest text-white/20 font-bold">{s.label}</p>
                <p className="text-[10px] text-white/25 mt-1">{s.sub}</p>
              </motion.div>
            );
          })}
        </div>

        {/* Revenue Trend Chart */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-[#0f0f0f] border border-white/[0.06] p-5">
          <h3 className="font-black text-sm uppercase tracking-wider text-white/80 mb-4">Revenue Trend</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={dailyData}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={YELLOW} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={YELLOW} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="date" tick={{ fill: "rgba(255,255,255,0.2)", fontSize: 10 }} tickLine={false} axisLine={false}
                interval={Math.floor(dailyData.length / 6)} />
              <YAxis tick={{ fill: "rgba(255,255,255,0.2)", fontSize: 10 }} tickLine={false} axisLine={false}
                tickFormatter={v => `$${v}`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="revenue" name="Revenue" stroke={YELLOW} strokeWidth={2}
                fill="url(#revGrad)" dot={false} activeDot={{ r: 4, fill: YELLOW }} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Vehicle Type Distribution */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
            className="bg-[#0f0f0f] border border-white/[0.06] p-5">
            <h3 className="font-black text-sm uppercase tracking-wider text-white/80 mb-4">Revenue by Vehicle</h3>
            {vehicleData.length === 0 ? (
              <div className="flex items-center justify-center h-40">
                <p className="text-xs text-white/20">No completed trips yet</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={vehicleData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={35}>
                    {vehicleData.map((_, idx) => (
                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconType="circle" iconSize={8}
                    formatter={(v) => <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 11 }}>{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </motion.div>

          {/* Status Distribution */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="bg-[#0f0f0f] border border-white/[0.06] p-5">
            <h3 className="font-black text-sm uppercase tracking-wider text-white/80 mb-4">Booking Status Distribution</h3>
            {statusData.length === 0 ? (
              <div className="flex items-center justify-center h-40">
                <p className="text-xs text-white/20">No bookings yet</p>
              </div>
            ) : (
              <div className="space-y-3 mt-2">
                {statusData.map(s => (
                  <div key={s.name} className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span style={{ color: s.color }} className="font-bold">{s.name}</span>
                      <span className="text-white/40">{s.value} ({ranged.length > 0 ? Math.round((s.value / bookings.length) * 100) : 0}%)</span>
                    </div>
                    <div className="h-1.5 bg-white/[0.06] overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${bookings.length > 0 ? (s.value / bookings.length) * 100 : 0}%` }}
                        transition={{ delay: 0.4, duration: 0.6 }}
                        className="h-full"
                        style={{ background: s.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>

        {/* Trip Volume Bar Chart */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          className="bg-[#0f0f0f] border border-white/[0.06] p-5">
          <h3 className="font-black text-sm uppercase tracking-wider text-white/80 mb-4">Trip Volume</h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={dailyData} barSize={range === "week" ? 20 : 8}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: "rgba(255,255,255,0.2)", fontSize: 10 }} tickLine={false} axisLine={false}
                interval={Math.floor(dailyData.length / 6)} />
              <YAxis tick={{ fill: "rgba(255,255,255,0.2)", fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="trips" name="Trips" fill={`${YELLOW}70`} radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Top Drivers */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="bg-[#0f0f0f] border border-white/[0.06]">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.04]">
            <h3 className="font-black text-sm uppercase tracking-wider text-white/80">Top Performing Drivers</h3>
            <span className="text-[10px] uppercase tracking-widest text-white/20 font-bold">
              {range === "week" ? "Last 7 Days" : range === "month" ? "Last 30 Days" : "All Time"}
            </span>
          </div>
          {driverPerformance.length === 0 ? (
            <div className="p-10 text-center text-xs text-white/20">
              {drivers.length === 0 ? "No drivers registered yet" : "No completed trips in this period"}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.04]">
                    {["Rank", "Driver", "Trips", "Revenue", "Avg. Ticket", "Rating"].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-[10px] font-bold tracking-widest uppercase text-white/20 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {driverPerformance.map((d, i) => (
                    <tr key={d.name} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-black text-sm" style={{ color: i < 3 ? YELLOW : "rgba(255,255,255,0.3)" }}>
                          #{i + 1}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-white whitespace-nowrap">{d.name}</td>
                      <td className="px-4 py-3 text-sm text-white/60">{d.trips}</td>
                      <td className="px-4 py-3 text-sm font-bold text-white">${d.earnings.toFixed(0)}</td>
                      <td className="px-4 py-3 text-xs text-white/50">${d.trips > 0 ? (d.earnings / d.trips).toFixed(0) : 0}</td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1 text-xs" style={{ color: YELLOW }}>
                          <Star className="w-3 h-3 fill-current" />{d.rating.toFixed(1)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>

        {/* Summary stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Total Trips", value: ranged.length, sub: "in selected period" },
            { label: "Completed", value: completed.length, sub: `${completionRate}% rate` },
            { label: "Cancelled", value: cancelled.length, sub: `${ranged.length > 0 ? Math.round((cancelled.length / ranged.length) * 100) : 0}% rate` },
            { label: "Pending Review", value: bookings.filter(b => b.status === "pending").length, sub: "require action" },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 + i * 0.04 }}
              className="bg-[#0f0f0f] border border-white/[0.06] px-4 py-3">
              <p className="font-black text-xl text-white">{s.value}</p>
              <p className="text-[10px] uppercase tracking-widest text-white/20 font-bold mt-1">{s.label}</p>
              <p className="text-[10px] text-white/20 mt-0.5">{s.sub}</p>
            </motion.div>
          ))}
        </div>

      </div>
    </AdminLayout>
  );
}
