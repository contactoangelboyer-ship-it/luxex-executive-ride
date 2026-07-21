import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Search, Loader2, CheckCircle2, Clock, XCircle,
  Car, MapPin, Calendar, Users, Phone, Star, AlertCircle,
  Plane, Briefcase, Shield
} from "lucide-react";

const YELLOW = "#C9A84C";

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
    pending:   { label: "Pending Review",  color: "#C9A84C", bg: "rgba(201,168,76,0.1)",  icon: <Clock className="w-3.5 h-3.5" /> },
    confirmed: { label: "Confirmed",       color: "#4ade80", bg: "rgba(74,222,128,0.1)", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
    completed: { label: "Completed",       color: "#9ca3af", bg: "rgba(156,163,175,0.1)",icon: <Star className="w-3.5 h-3.5" /> },
    cancelled: { label: "Cancelled",       color: "#f87171", bg: "rgba(248,113,113,0.1)",icon: <XCircle className="w-3.5 h-3.5" /> },
    "in-progress": { label: "In Progress", color: "#60a5fa", bg: "rgba(96,165,250,0.1)", icon: <Car className="w-3.5 h-3.5" /> },
  };
  const s = map[status] ?? map.pending;
  return (
    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-none border text-xs font-bold tracking-[0.12em] uppercase"
      style={{ color: s.color, background: s.bg, borderColor: s.color + "33" }}>
      {s.icon}
      {s.label}
    </div>
  );
}

function Detail({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-3.5 border-b border-white/[0.06]">
      <div className="shrink-0 mt-0.5" style={{ color: YELLOW + "99" }}>{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-white/25 mb-0.5">{label}</p>
        <p className="text-sm text-white/80 leading-relaxed">{value}</p>
      </div>
    </div>
  );
}

function fmtTime(t: string): string {
  if (!t) return t ?? "";
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${(m ?? 0).toString().padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

function titleCase(s: string) {
  return (s ?? "").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

export default function TrackBooking() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [booking, setBooking] = useState<any>(null);
  const [error, setError] = useState("");

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = code.trim().toUpperCase();
    if (!clean) return;
    setLoading(true);
    setError("");
    setBooking(null);
    try {
      const res = await fetch(`/api/bookings/track?code=${encodeURIComponent(clean)}`);
      if (res.ok) {
        setBooking(await res.json());
      } else {
        const d = await res.json().catch(() => ({}));
        setError((d as any).error ?? "Booking not found. Please check the code and try again.");
      }
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#060606] text-white flex flex-col">
      {/* Nav */}
      <header className="fixed inset-x-0 top-0 z-50 bg-[#060606]/95 backdrop-blur-md border-b border-white/[0.06]">
        <div className="max-w-[900px] mx-auto px-6 h-[72px] flex items-center justify-between">
          <a href="/" className="flex items-center gap-3 group">
            <ArrowLeft className="w-4 h-4 text-white/30 group-hover:text-white transition-colors" />
            <img src="https://ik.imagekit.io/xnfnvsnut/1001351366-removebg-preview.png"
              alt="LuxEx" className="h-14 w-auto object-contain" />
          </a>
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/30">Track Your Booking</p>
        </div>
      </header>

      {/* Progress bar accent */}
      <div className="fixed top-0 inset-x-0 h-[2px] z-[60]" style={{ background: YELLOW }} />

      <main className="flex-1 pt-[72px] flex items-start justify-center">
        <div className="w-full max-w-[580px] px-6 py-16">

          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
            className="mb-12">
            <div className="w-8 h-[2px] mb-6" style={{ background: YELLOW }} />
            <h1 className="text-3xl md:text-4xl font-black tracking-tight leading-[1.1] mb-3">
              Track your booking.
            </h1>
            <p className="text-white/40 text-sm leading-relaxed">
              Enter your confirmation code to see your trip status and details.
            </p>
          </motion.div>

          {/* Search form */}
          <motion.form onSubmit={handleTrack} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }} className="mb-8">
            <label className="block text-[10px] font-bold tracking-[0.2em] uppercase text-white/30 mb-3">
              Confirmation Code
            </label>
            <div className="flex gap-3">
              <div className="flex-1 flex items-center gap-3 border border-white/10 px-4 py-4 bg-[#0f0f0f] focus-within:border-[#C9A84C] transition-colors">
                <Search className="w-4 h-4 text-white/20 shrink-0" />
                <input
                  value={code}
                  onChange={e => { setCode(e.target.value.toUpperCase()); setError(""); }}
                  placeholder="e.g. LX-A3B7K2"
                  maxLength={12}
                  className="flex-1 bg-transparent text-sm text-white placeholder-white/20 outline-none font-mono tracking-widest uppercase"
                />
              </div>
              <button type="submit" disabled={loading || !code.trim()}
                className="px-6 py-4 font-black text-[11px] tracking-[0.15em] uppercase transition-all disabled:opacity-40"
                style={{ background: YELLOW, color: "#0a0a0a" }}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Track"}
              </button>
            </div>
            <p className="text-[11px] text-white/20 mt-2">
              Your confirmation code was included in your booking confirmation email.
            </p>
          </motion.form>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="flex items-start gap-3 border border-red-500/20 bg-red-500/5 px-4 py-4 mb-8">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <p className="text-sm text-red-300">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Results */}
          <AnimatePresence mode="wait">
            {booking && (
              <motion.div key={booking.confirmationCode}
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}>

                {/* Status */}
                <div className="border border-white/[0.07] bg-[#0d0d0d] p-6 mb-6">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/25 mb-1">Confirmation #</p>
                      <p className="font-mono text-lg font-bold tracking-widest" style={{ color: YELLOW }}>
                        {booking.confirmationCode}
                      </p>
                    </div>
                    <StatusBadge status={booking.status} />
                  </div>

                  {booking.status === "pending" && (
                    <div className="text-xs text-white/40 mt-2 border-t border-white/[0.06] pt-4">
                      Your booking is under review. You'll receive a confirmation email shortly.
                    </div>
                  )}
                  {booking.status === "confirmed" && (
                    <div className="text-xs text-white/40 mt-2 border-t border-white/[0.06] pt-4">
                      Your booking is confirmed. Your chauffeur will contact you before the trip.
                    </div>
                  )}
                </div>

                {/* Driver info (if assigned) */}
                {booking.driverName && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
                    className="border border-[#C9A84C]/20 bg-[#C9A84C]/5 p-5 mb-6">
                    <p className="text-[10px] font-bold tracking-[0.2em] uppercase mb-3" style={{ color: YELLOW }}>
                      Your Chauffeur
                    </p>
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-[#C9A84C]/10 border border-[#C9A84C]/20 flex items-center justify-center">
                        <span className="text-sm font-black" style={{ color: YELLOW }}>
                          {booking.driverName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-bold text-white/90">{booking.driverName}</p>
                        {booking.driverPhone && (
                          <a href={`tel:${booking.driverPhone}`}
                            className="text-xs text-white/40 hover:text-white transition-colors flex items-center gap-1.5 mt-0.5">
                            <Phone className="w-3 h-3" />
                            {booking.driverPhone}
                          </a>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Trip details */}
                <div className="border border-white/[0.07] bg-[#0d0d0d] p-6">
                  <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/25 mb-4">Trip Details</p>

                  <Detail icon={<Briefcase className="w-4 h-4" />} label="Service" value={titleCase(booking.service ?? "")} />
                  <Detail icon={<Calendar className="w-4 h-4" />} label="Date & Time" value={`${booking.date} · ${fmtTime(booking.time)}`} />
                  <Detail icon={<MapPin className="w-4 h-4" />} label="Pickup" value={booking.pickupAddress} />
                  {booking.dropoffAddress && <Detail icon={<MapPin className="w-4 h-4" />} label="Drop-off" value={booking.dropoffAddress} />}
                  <Detail icon={<Car className="w-4 h-4" />} label="Vehicle" value={titleCase(booking.vehicleType ?? "")} />
                  <Detail icon={<Users className="w-4 h-4" />} label="Passengers" value={`${booking.passengers}`} />
                  {booking.flightNumber && <Detail icon={<Plane className="w-4 h-4" />} label="Flight" value={booking.flightNumber} />}
                </div>

                {/* Help */}
                <div className="mt-6 text-center">
                  <p className="text-xs text-white/25">
                    Need to make changes?{" "}
                    <a href="tel:+18483888817" className="hover:text-white transition-colors" style={{ color: YELLOW + "99" }}>
                      Call +1 (848) 388-8817
                    </a>
                    {" "}or{" "}
                    <a href="mailto:info@luxexride.com" className="hover:text-white transition-colors" style={{ color: YELLOW + "99" }}>
                      email us
                    </a>
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Trust badges */}
          {!booking && !error && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
              className="border-t border-white/[0.06] pt-8 grid grid-cols-3 gap-4">
              {[
                { icon: <Shield className="w-4 h-4" />, label: "Secure tracking" },
                { icon: <Clock className="w-4 h-4" />, label: "Real-time status" },
                { icon: <Phone className="w-4 h-4" />, label: "24/7 support" },
              ].map(({ icon, label }) => (
                <div key={label} className="flex flex-col items-center gap-2 text-center">
                  <div style={{ color: YELLOW + "55" }}>{icon}</div>
                  <p className="text-[10px] text-white/25 font-medium">{label}</p>
                </div>
              ))}
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
}
