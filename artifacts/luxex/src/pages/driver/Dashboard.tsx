import { useEffect, useState, useCallback } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Car, CheckCircle, Navigation, Phone, User,
  Calendar, Star, Power, ChevronRight, AlertCircle, MapPin,
  Briefcase, RefreshCw, Route, ParkingSquare, PlayCircle,
  XCircle, AlertTriangle, Loader2,
} from "lucide-react";
import { PortalLayout } from "@/components/PortalLayout";
import { getCurrentUser } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

const YELLOW = "#F2E147";

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  pending:     { bg: "rgba(251,191,36,0.1)",   text: "#fbbf24", border: "rgba(251,191,36,0.25)" },
  confirmed:   { bg: "rgba(96,165,250,0.1)",   text: "#60a5fa", border: "rgba(96,165,250,0.25)" },
  assigned:    { bg: "rgba(167,139,250,0.1)",  text: "#a78bfa", border: "rgba(167,139,250,0.25)" },
  en_route:    { bg: "rgba(251,191,36,0.12)",  text: "#fbbf24", border: "rgba(251,191,36,0.3)" },
  on_site:     { bg: "rgba(52,211,153,0.1)",   text: "#34d399", border: "rgba(52,211,153,0.3)" },
  in_progress: { bg: "rgba(52,211,153,0.15)",  text: "#34d399", border: "rgba(52,211,153,0.4)" },
  completed:   { bg: "rgba(255,255,255,0.05)", text: "rgba(255,255,255,0.5)", border: "rgba(255,255,255,0.1)" },
  cancelled:   { bg: "rgba(248,113,113,0.1)",  text: "#f87171", border: "rgba(248,113,113,0.25)" },
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente", confirmed: "Confirmado", assigned: "Asignado",
  en_route: "En Camino", on_site: "En Sitio",
  in_progress: "En Progreso", completed: "Completado", cancelled: "Cancelado",
};

// Next action for each status
interface RideAction { label: string; nextStatus: string; Icon: React.ElementType; style: React.CSSProperties }

function getRideAction(status: string, yellow: string): RideAction | null {
  switch (status) {
    case "assigned":    return { label: "En Camino",         nextStatus: "en_route",    Icon: Route,          style: { background: "rgba(167,139,250,0.15)", border: "1px solid rgba(167,139,250,0.4)", color: "#a78bfa" } };
    case "en_route":    return { label: "Llegué al Sitio",  nextStatus: "on_site",     Icon: ParkingSquare,  style: { background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.4)", color: yellow } };
    case "on_site":     return { label: "Iniciar Viaje",    nextStatus: "in_progress", Icon: PlayCircle,     style: { background: "rgba(52,211,153,0.12)", border: "1px solid rgba(52,211,153,0.4)", color: "#34d399" } };
    case "in_progress": return { label: "Completar Viaje", nextStatus: "completed",   Icon: CheckCircle,    style: { background: yellow, border: `1px solid ${yellow}`, color: "#0a0a0a" } };
    default: return null;
  }
}

export default function DriverDashboard() {
  const user = getCurrentUser()!;
  const { toast } = useToast();
  const [rides, setRides]           = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isOnline, setIsOnline]     = useState(() => {
    return localStorage.getItem(`luxex_driver_online_${user.email}`) !== "offline";
  });
  const [actionLoading, setActionLoading] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

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

  const updateStatus = async (id: number, status: string) => {
    setActionLoading(true);
    setShowCancelConfirm(false);
    try {
      const res = await fetch(`/api/bookings/${id}/driver-status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email, status }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast({ title: "Error", description: (err as any).error ?? "No se pudo actualizar el estado", variant: "destructive" });
        return;
      }
      const updated = await res.json();
      setRides(prev => prev.map(r => r.id === id ? updated : r));
      toast({ title: "Estado actualizado", description: `Viaje: ${STATUS_LABELS[updated.status] ?? updated.status}` });
    } catch {
      toast({ title: "Error de red", description: "Verifica tu conexión.", variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  const navigateTo = (address: string) => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`, "_blank");
  };

  const today = new Date().toISOString().split("T")[0];
  const todayRides  = rides.filter(r => r.date === today);
  const completed   = rides.filter(r => r.status === "completed");
  const active      = rides.filter(r => ["en_route", "on_site", "in_progress"].includes(r.status));
  const upcoming    = rides
    .filter(r => ["confirmed", "assigned"].includes(r.status) && r.date >= today)
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));

  const activeRide  = active[0] ?? null;
  const nextRide    = activeRide ?? upcoming[0] ?? null;
  const rideAction  = nextRide ? getRideAction(nextRide.status, YELLOW) : null;
  const canCancel   = nextRide ? ["assigned","en_route","on_site","in_progress"].includes(nextRide.status) : false;

  return (
    <PortalLayout user={user} onLogout={() => window.location.href = "/"}>
      <div className="max-w-3xl mx-auto space-y-5 pb-10">

        {/* Header + Online Toggle */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold tracking-widest uppercase mb-1" style={{ color: YELLOW }}>
              {new Date().toLocaleDateString("es-ES", { weekday: "long", month: "long", day: "numeric" })}
            </p>
            <h2 className="text-2xl font-black text-white">Dashboard — {user.firstName}</h2>
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
                <p className="text-sm font-bold text-red-400">Estás offline</p>
                <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
                  Cámbiate a Online para recibir asignaciones de viajes.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Active / Next Ride Card */}
        <AnimatePresence>
          {nextRide && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              style={{
                background: activeRide ? "rgba(52,211,153,0.05)" : "rgba(167,139,250,0.07)",
                border: `1px solid ${activeRide ? "rgba(52,211,153,0.3)" : "rgba(167,139,250,0.3)"}`,
              }}>
              {/* Card header */}
              <div className="flex items-center justify-between px-5 py-3"
                style={{ borderBottom: `1px solid ${activeRide ? "rgba(52,211,153,0.12)" : "rgba(167,139,250,0.12)"}` }}>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full animate-pulse ${activeRide ? "bg-green-400" : "bg-purple-400"}`} />
                  <span className="text-xs font-bold uppercase tracking-widest"
                    style={{ color: activeRide ? "#34d399" : "#a78bfa" }}>
                    {activeRide ? `Viaje Activo — ${STATUS_LABELS[nextRide.status]}` : "Próximo Viaje Asignado"}
                  </span>
                </div>
                <span className="font-mono text-[10px]" style={{ color: activeRide ? "rgba(52,211,153,0.5)" : "rgba(167,139,250,0.5)" }}>
                  {nextRide.confirmationCode}
                </span>
              </div>

              <div className="p-5 space-y-4">
                {/* Route info */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                        style={{ background: "rgba(52,211,153,0.15)", border: "1px solid rgba(52,211,153,0.3)" }}>
                        <div className="w-2 h-2 rounded-full bg-green-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] uppercase tracking-widest font-bold mb-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>Recogida</p>
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
                          <p className="text-[10px] uppercase tracking-widest font-bold mb-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>Destino</p>
                          <p className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.7)" }}>{nextRide.dropoffAddress}</p>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] uppercase tracking-widest mt-1" style={{ color: "rgba(255,255,255,0.3)" }}>
                      {nextRide.date} · {nextRide.time}
                    </p>
                  </div>
                </div>

                {/* Passenger + navigate */}
                <div className="flex items-center gap-3 flex-wrap pt-3"
                  style={{ borderTop: `1px solid ${activeRide ? "rgba(52,211,153,0.1)" : "rgba(167,139,250,0.12)"}` }}>
                  {nextRide.passengerName && (
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.3)" }} />
                      <span className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>{nextRide.passengerName}</span>
                    </div>
                  )}
                  {nextRide.passengerPhone && (
                    <a href={`tel:${nextRide.passengerPhone}`}
                      className="flex items-center gap-1.5 text-xs font-semibold transition-colors"
                      style={{ color: activeRide ? "#34d399" : "#a78bfa" }}>
                      <Phone className="w-3.5 h-3.5" /> {nextRide.passengerPhone}
                    </a>
                  )}
                  {nextRide.passengers > 1 && (
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-white/30" />
                      <span className="text-xs text-white/40">{nextRide.passengers} pax · {nextRide.bags} maletas</span>
                    </div>
                  )}
                  <div className="ml-auto flex gap-2">
                    {nextRide.dropoffAddress && (
                      <button onClick={() => navigateTo(nextRide.dropoffAddress)}
                        className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-colors"
                        style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)", color: "#f87171" }}>
                        <MapPin className="w-3 h-3" /> Destino
                      </button>
                    )}
                    <motion.button whileTap={{ scale: 0.97 }}
                      onClick={() => navigateTo(nextRide.pickupAddress)}
                      className="flex items-center gap-2 px-4 py-2 text-[11px] font-black uppercase tracking-widest text-black"
                      style={{ background: YELLOW }}>
                      <Navigation className="w-3.5 h-3.5" /> Recogida
                    </motion.button>
                  </div>
                </div>

                {nextRide.notes && (
                  <div className="px-3 py-2 text-xs"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <span className="text-white/30 font-bold uppercase tracking-widest text-[10px]">Notas: </span>
                    <span className="text-white/60 italic">{nextRide.notes}</span>
                  </div>
                )}

                {/* ── Status Action Buttons ─────────────────────────────── */}
                {(rideAction || canCancel) && (
                  <div className="space-y-2 pt-1" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>

                    {/* Cancel confirm */}
                    <AnimatePresence>
                      {showCancelConfirm && (
                        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                          className="flex items-start gap-3 p-3"
                          style={{ background: "rgba(248,113,113,0.07)", border: "1px solid rgba(248,113,113,0.25)" }}>
                          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-xs font-bold text-red-400">¿Cancelar este viaje?</p>
                            <p className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
                              Se notificará al pasajero y al administrador.
                            </p>
                            <div className="flex gap-2 mt-2.5">
                              <button
                                onClick={() => updateStatus(nextRide.id, "cancelled")}
                                disabled={actionLoading}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest disabled:opacity-50"
                                style={{ background: "rgba(248,113,113,0.15)", border: "1px solid rgba(248,113,113,0.4)", color: "#f87171" }}>
                                {actionLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                                Sí, cancelar
                              </button>
                              <button
                                onClick={() => setShowCancelConfirm(false)}
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
                      {/* Primary action button */}
                      {rideAction && !showCancelConfirm && (
                        <motion.button whileTap={{ scale: 0.97 }}
                          onClick={() => {
                            if (rideAction.nextStatus === "completed") {
                              if (!window.confirm("¿Confirmas que el viaje fue completado?")) return;
                            }
                            updateStatus(nextRide.id, rideAction.nextStatus);
                          }}
                          disabled={actionLoading}
                          className="flex-1 flex items-center justify-center gap-2 py-3 text-[11px] font-black uppercase tracking-widest disabled:opacity-60 disabled:cursor-not-allowed"
                          style={rideAction.style}>
                          {actionLoading
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <rideAction.Icon className="w-4 h-4" />
                          }
                          {actionLoading ? "Actualizando…" : rideAction.label}
                        </motion.button>
                      )}

                      {/* Cancel button */}
                      {canCancel && !showCancelConfirm && (
                        <motion.button whileTap={{ scale: 0.97 }}
                          onClick={() => setShowCancelConfirm(true)}
                          disabled={actionLoading}
                          className="flex items-center gap-1.5 px-3 py-3 text-[10px] font-bold uppercase tracking-widest disabled:opacity-40"
                          style={{ background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.2)", color: "rgba(248,113,113,0.7)" }}>
                          <XCircle className="w-3.5 h-3.5" />
                          Cancelar
                        </motion.button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { label: "Hoy", value: loading ? "—" : todayRides.length, icon: Car, color: "#fff" },
            { label: "Completados", value: loading ? "—" : completed.length, icon: CheckCircle, color: "#34d399" },
            { label: "Total", value: loading ? "—" : rides.length, icon: Briefcase, color: YELLOW },
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
              <h3 className="font-bold text-sm text-white">Agenda de Hoy</h3>
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
                Todos los viajes <ChevronRight className="w-3.5 h-3.5" />
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
              <p className="text-sm font-semibold text-white/50">Sin viajes programados hoy</p>
              <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.25)" }}>Tus asignaciones aparecerán aquí.</p>
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
                        <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5"
                          style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}` }}>
                          {STATUS_LABELS[r.status] ?? r.status}
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

        {/* Summary */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Viajes Totales", value: rides.length, icon: Briefcase },
            { label: "Tasa de Completados", value: rides.length > 0 ? `${Math.round((completed.length / rides.length) * 100)}%` : "—", icon: Star },
          ].map((s) => {
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
