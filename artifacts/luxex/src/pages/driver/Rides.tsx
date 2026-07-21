import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Car, Search, MapPin, User, Phone, Mail, Navigation,
  ChevronDown, ChevronUp, Package, Clock,
  CheckCircle, PlayCircle, FileText, Loader2,
  AlertTriangle, Route, ParkingSquare, XCircle,
} from "lucide-react";
import { PortalLayout } from "@/components/PortalLayout";
import { getCurrentUser } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

const YELLOW = "#F2E147";

// ── Status definitions ────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  pending:     { bg: "rgba(251,191,36,0.1)",  text: "#fbbf24", border: "rgba(251,191,36,0.25)" },
  confirmed:   { bg: "rgba(96,165,250,0.1)",  text: "#60a5fa", border: "rgba(96,165,250,0.25)" },
  assigned:    { bg: "rgba(167,139,250,0.1)", text: "#a78bfa", border: "rgba(167,139,250,0.25)" },
  en_route:    { bg: "rgba(251,191,36,0.12)", text: "#fbbf24", border: "rgba(251,191,36,0.3)" },
  on_site:     { bg: "rgba(52,211,153,0.1)",  text: "#34d399", border: "rgba(52,211,153,0.3)" },
  in_progress: { bg: "rgba(52,211,153,0.15)", text: "#34d399", border: "rgba(52,211,153,0.4)" },
  completed:   { bg: "rgba(255,255,255,0.05)", text: "rgba(255,255,255,0.5)", border: "rgba(255,255,255,0.1)" },
  cancelled:   { bg: "rgba(248,113,113,0.1)", text: "#f87171", border: "rgba(248,113,113,0.25)" },
};

const STATUS_LABELS: Record<string, string> = {
  pending:     "Pending",
  confirmed:   "Confirmed",
  assigned:    "Assigned",
  en_route:    "En Route",
  on_site:     "On Site",
  in_progress: "In Progress",
  completed:   "Completed",
  cancelled:   "Cancelled",
};

const SERVICE_LABELS: Record<string, string> = {
  airport: "Airport Transfer", corporate: "Corporate", hourly: "Hourly", event: "Special Event",
};

// ── Ride lifecycle step definitions ──────────────────────────────────────────
// Each entry defines the primary action button available from that status.

interface RideAction {
  label: string;
  nextStatus: string;
  color: "green" | "yellow" | "purple" | "red";
  icon: React.ElementType;
  confirm?: string;
}

const RIDE_ACTIONS: Record<string, RideAction> = {
  assigned: {
    label: "En Camino",
    nextStatus: "en_route",
    color: "purple",
    icon: Route,
  },
  en_route: {
    label: "Llegué al Sitio",
    nextStatus: "on_site",
    color: "yellow",
    icon: ParkingSquare,
  },
  on_site: {
    label: "Iniciar Viaje",
    nextStatus: "in_progress",
    color: "green",
    icon: PlayCircle,
  },
  in_progress: {
    label: "Completar Viaje",
    nextStatus: "completed",
    color: "yellow",
    icon: CheckCircle,
    confirm: "¿Confirmas que el viaje fue completado correctamente?",
  },
};

const CANCELLABLE = ["assigned", "en_route", "on_site", "in_progress"];

// ── Progress bar steps ────────────────────────────────────────────────────────

const PROGRESS_STEPS = ["assigned", "en_route", "on_site", "in_progress", "completed"];

function ProgressBar({ status }: { status: string }) {
  const idx = PROGRESS_STEPS.indexOf(status);
  if (idx < 0) return null;
  const labels = ["Asignado", "En Camino", "En Sitio", "En Progreso", "Completado"];
  return (
    <div className="pt-4 pb-1">
      <div className="flex items-center gap-0">
        {PROGRESS_STEPS.map((s, i) => {
          const done = i <= idx;
          const active = i === idx;
          return (
            <div key={s} className="flex items-center" style={{ flex: i < PROGRESS_STEPS.length - 1 ? "1" : "0" }}>
              <div className="flex flex-col items-center">
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center transition-all duration-500"
                  style={{
                    background: done ? (active ? YELLOW : "rgba(242,225,71,0.4)") : "rgba(255,255,255,0.07)",
                    border: done ? (active ? `2px solid ${YELLOW}` : "2px solid rgba(242,225,71,0.3)") : "2px solid rgba(255,255,255,0.1)",
                    boxShadow: active ? `0 0 10px rgba(242,225,71,0.5)` : "none",
                  }}>
                  <div className="w-1.5 h-1.5 rounded-full"
                    style={{ background: done ? (active ? "#0a0a0a" : "rgba(242,225,71,0.7)") : "rgba(255,255,255,0.15)" }} />
                </div>
                <p className="text-[8px] font-bold tracking-widest uppercase mt-1 text-center whitespace-nowrap"
                  style={{ color: active ? YELLOW : done ? "rgba(242,225,71,0.5)" : "rgba(255,255,255,0.2)", maxWidth: "48px" }}>
                  {labels[i]}
                </p>
              </div>
              {i < PROGRESS_STEPS.length - 1 && (
                <div className="h-0.5 flex-1 mx-1 mb-4 transition-all duration-500"
                  style={{ background: i < idx ? "rgba(242,225,71,0.35)" : "rgba(255,255,255,0.07)" }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Action button colors ──────────────────────────────────────────────────────

function actionStyle(color: RideAction["color"]) {
  switch (color) {
    case "green":  return { background: "rgba(52,211,153,0.12)", border: "1px solid rgba(52,211,153,0.4)", color: "#34d399" };
    case "yellow": return { background: YELLOW, border: `1px solid ${YELLOW}`, color: "#0a0a0a" };
    case "purple": return { background: "rgba(167,139,250,0.12)", border: "1px solid rgba(167,139,250,0.4)", color: "#a78bfa" };
    case "red":    return { background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.3)", color: "#f87171" };
  }
}

// ── Main component ────────────────────────────────────────────────────────────

export default function DriverRides() {
  const user = getCurrentUser()!;
  const { toast } = useToast();
  const [rides, setRides]             = useState<any[]>([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedId, setExpandedId]   = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [cancelConfirm, setCancelConfirm] = useState<number | null>(null);

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
        toast({ title: "Sin conexión a base de datos", description: "La actualización de estado requiere conexión.", variant: "destructive" });
        return;
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast({ title: "Error", description: (err as any).error ?? "No se pudo actualizar el estado", variant: "destructive" });
        return;
      }
      const updated = await res.json();
      setRides(prev => prev.map(r => r.id === id ? updated : r));
      const label = STATUS_LABELS[updated.status] ?? updated.status;
      toast({ title: "Estado actualizado", description: `El viaje está ahora: ${label}` });
    } catch {
      toast({ title: "Error de red", description: "Verifica tu conexión e intenta de nuevo.", variant: "destructive" });
    } finally {
      setActionLoading(null);
      setCancelConfirm(null);
    }
  };

  const toggleExpand = (id: number) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  return (
    <PortalLayout user={user} onLogout={() => window.location.href = "/"}>
      <div className="max-w-3xl mx-auto space-y-5 pb-10">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-black text-white">Mis Viajes</h2>
          <span className="text-xs font-bold uppercase tracking-widest px-2.5 py-1"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)" }}>
            {filtered.length} resultado{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "rgba(255,255,255,0.3)" }} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar dirección o pasajero…"
              className="w-full pl-10 pr-4 py-2.5 text-sm text-white outline-none transition-all"
              style={{ background: "#111", border: "1px solid rgba(255,255,255,0.1)" }}
              onFocus={e => { (e.target as HTMLElement).style.borderColor = YELLOW; }}
              onBlur={e => { (e.target as HTMLElement).style.borderColor = "rgba(255,255,255,0.1)"; }} />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 text-sm outline-none cursor-pointer"
            style={{ background: "#111", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", colorScheme: "dark" }}>
            <option value="all">Todos los estados</option>
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
                {rides.length === 0 ? "No tienes viajes asignados" : "Sin resultados"}
              </p>
              <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>
                {rides.length === 0
                  ? "El administrador asignará viajes a tu cuenta. Verifica que tu email de perfil sea correcto."
                  : "Ajusta el filtro o la búsqueda."}
              </p>
            </div>
          ) : (
            <div>
              {filtered.map((r, i) => {
                const sc = STATUS_COLORS[r.status] ?? STATUS_COLORS.pending;
                const isExpanded = expandedId === r.id;
                const action = RIDE_ACTIONS[r.status] ?? null;
                const canCancel = CANCELLABLE.includes(r.status);
                const isActive = ["en_route", "on_site", "in_progress"].includes(r.status);

                return (
                  <div key={r.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    {/* Collapsed row */}
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.03 }}
                      className="flex items-start gap-4 px-5 py-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
                      onClick={() => toggleExpand(r.id)}>
                      <div className="w-10 h-10 flex items-center justify-center shrink-0"
                        style={{
                          background: isActive ? "rgba(52,211,153,0.08)" : "rgba(255,255,255,0.04)",
                          border: isActive ? "1px solid rgba(52,211,153,0.25)" : "1px solid rgba(255,255,255,0.06)",
                        }}>
                        <MapPin className="w-5 h-5" style={{ color: isActive ? "#34d399" : YELLOW }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-white truncate">{r.pickupAddress ?? "Pickup"}</p>
                          {r.dropoffAddress && (
                            <p className="text-xs truncate mt-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>
                              → {r.dropoffAddress}
                            </p>
                          )}
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
                          transition={{ duration: 0.22 }}
                          style={{ overflow: "hidden" }}>
                          <div className="px-5 pb-5 space-y-4"
                            style={{ background: "rgba(255,255,255,0.015)", borderTop: "1px solid rgba(255,255,255,0.04)" }}>

                            {/* Progress bar — only for active lifecycle */}
                            {PROGRESS_STEPS.includes(r.status) && (
                              <ProgressBar status={r.status} />
                            )}

                            {/* Route */}
                            <div className="pt-2 space-y-3">
                              <div className="flex items-start gap-3">
                                <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                                  style={{ background: "rgba(52,211,153,0.15)" }}>
                                  <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[10px] uppercase tracking-widest text-white/25 font-bold mb-0.5">Punto de Recogida</p>
                                  <p className="text-sm font-semibold text-white">{r.pickupAddress}</p>
                                </div>
                                <button onClick={e => { e.stopPropagation(); navigateTo(r.pickupAddress); }}
                                  className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest shrink-0"
                                  style={{ background: `${YELLOW}22`, border: `1px solid ${YELLOW}44`, color: YELLOW }}>
                                  <Navigation className="w-3 h-3" /> Nav
                                </button>
                              </div>
                              {r.dropoffAddress && (
                                <div className="flex items-start gap-3">
                                  <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                                    style={{ background: "rgba(248,113,113,0.15)" }}>
                                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#f87171" }} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[10px] uppercase tracking-widest text-white/25 font-bold mb-0.5">Destino</p>
                                    <p className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.75)" }}>{r.dropoffAddress}</p>
                                  </div>
                                  <button onClick={e => { e.stopPropagation(); navigateTo(r.dropoffAddress); }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest shrink-0"
                                    style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)", color: "#f87171" }}>
                                    <Navigation className="w-3 h-3" /> Nav
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* Info grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
                              {[
                                { icon: Clock, label: "Fecha y Hora", value: `${r.date} · ${r.time}` },
                                { icon: User, label: "Pasajeros", value: `${r.passengers ?? 1} pax · ${r.bags ?? 0} maletas` },
                                { icon: Car, label: "Vehículo", value: r.vehicleType ? r.vehicleType.replace("_", " ") : "Cualquiera" },
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
                              <p className="text-[10px] uppercase tracking-widest text-white/25 font-bold">Contacto del Pasajero</p>
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
                                <p className="text-[10px] uppercase tracking-widest text-white/25 font-bold">Solicitudes Especiales</p>
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
                                      <Package className="w-3 h-3" /> Silla Infantil
                                    </span>
                                  )}
                                  {r.flightNumber && (
                                    <span className="flex items-center gap-1.5 text-xs px-2.5 py-1"
                                      style={{ background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.2)", color: "#a78bfa" }}>
                                      Vuelo: {r.flightNumber}
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

                            {/* ── Action Buttons ──────────────────────────────── */}
                            {(action || canCancel) && (
                              <div className="space-y-2 pt-1">
                                {/* Cancel confirm dialog */}
                                <AnimatePresence>
                                  {cancelConfirm === r.id && (
                                    <motion.div
                                      initial={{ opacity: 0, y: -6 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      exit={{ opacity: 0, y: -6 }}
                                      className="flex items-start gap-3 p-3"
                                      style={{ background: "rgba(248,113,113,0.07)", border: "1px solid rgba(248,113,113,0.25)" }}>
                                      <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold text-red-400">¿Cancelar este viaje?</p>
                                        <p className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
                                          Esta acción notificará al pasajero y al administrador.
                                        </p>
                                        <div className="flex gap-2 mt-2.5">
                                          <button
                                            onClick={e => { e.stopPropagation(); updateStatus(r.id, "cancelled"); }}
                                            disabled={actionLoading === r.id}
                                            className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest disabled:opacity-50"
                                            style={{ background: "rgba(248,113,113,0.15)", border: "1px solid rgba(248,113,113,0.4)", color: "#f87171" }}>
                                            {actionLoading === r.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                                            Sí, cancelar
                                          </button>
                                          <button
                                            onClick={e => { e.stopPropagation(); setCancelConfirm(null); }}
                                            className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest"
                                            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}>
                                            No, volver
                                          </button>
                                        </div>
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>

                                <div className="flex gap-2">
                                  {/* Primary action */}
                                  {action && (
                                    <motion.button whileTap={{ scale: 0.97 }}
                                      onClick={e => {
                                        e.stopPropagation();
                                        if (action.confirm) {
                                          if (!window.confirm(action.confirm)) return;
                                        }
                                        updateStatus(r.id, action.nextStatus);
                                      }}
                                      disabled={actionLoading === r.id}
                                      className="flex items-center justify-center gap-2 px-4 py-3 text-[11px] font-black uppercase tracking-widest flex-1 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                                      style={actionStyle(action.color)}>
                                      {actionLoading === r.id
                                        ? <Loader2 className="w-4 h-4 animate-spin" />
                                        : <action.icon className="w-4 h-4" />
                                      }
                                      {actionLoading === r.id ? "Actualizando…" : action.label}
                                    </motion.button>
                                  )}

                                  {/* Cancel button */}
                                  {canCancel && cancelConfirm !== r.id && (
                                    <motion.button whileTap={{ scale: 0.97 }}
                                      onClick={e => { e.stopPropagation(); setCancelConfirm(r.id); }}
                                      disabled={actionLoading === r.id}
                                      className="flex items-center gap-1.5 px-3 py-3 text-[10px] font-bold uppercase tracking-widest disabled:opacity-40 transition-all"
                                      style={{ background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.2)", color: "rgba(248,113,113,0.7)" }}>
                                      <XCircle className="w-3.5 h-3.5" />
                                      Cancelar
                                    </motion.button>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Completed / Cancelled state message */}
                            {r.status === "completed" && (
                              <div className="flex items-center gap-2 p-3"
                                style={{ background: "rgba(52,211,153,0.05)", border: "1px solid rgba(52,211,153,0.15)" }}>
                                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                                <p className="text-xs text-emerald-400 font-semibold">Viaje completado exitosamente.</p>
                              </div>
                            )}
                            {r.status === "cancelled" && (
                              <div className="flex items-center gap-2 p-3"
                                style={{ background: "rgba(248,113,113,0.05)", border: "1px solid rgba(248,113,113,0.15)" }}>
                                <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                                <p className="text-xs text-red-400 font-semibold">Este viaje fue cancelado.</p>
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
