import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, MapPin, Calendar, Clock, Users, ChevronRight, Check,
  Plane, Loader2, ArrowLeft, Phone, Mail, Briefcase,
  Star, AlertCircle, Luggage, Baby, UserCheck, User, Car,
  Plus, Trash2, Navigation, Route, Timer, Tag,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { RouteMap, fetchRoute, type RouteInfo } from "./RouteMap";

const YELLOW = "#C9A84C";

type ServiceType = "airport" | "corporate" | "hourly" | "event";
type Step = 1 | 2 | 3 | 4 | 5;
type FlightType = "arrival" | "departure";

interface GeoPlace {
  display_name: string;
  short_name: string;
  lat: number;
  lon: number;
}

interface BookingState {
  service: ServiceType | null;
  pickup: GeoPlace | null;
  stops: (GeoPlace | null)[];
  dropoff: GeoPlace | null;
  date: string;
  time: string;
  passengers: number;
  bags: number;
  hours: number;
  vehicleId: string | null;
  flightNumber: string;
  flightType: FlightType;
  meetAndGreet: boolean;
  childSeat: boolean;
  name: string;
  phone: string;
  email: string;
  notes: string;
  promoCode: string;
}

interface VehicleCfg {
  id: string;
  name: string;
  model: string;
  img: string;
  maxPax: number;
  maxBags: number;
  baseRate: number;
  perMile: number;
  hourlyRate: number;
  minMiles: number;
  airportFee: number;
  afterHoursPct: number;
  weekendPct: number;
  tag: string;
}

interface PriceBreakdown {
  baseLabel: string;
  base: number;
  mileage: number;
  airportFee: number;
  afterHours: number;
  weekend: number;
  zoneSurcharge: number;
  zoneName: string;
  meetGreet: number;
  childSeat: number;
  tolls: number;
  stopsFee: number;
  promoDiscount: number;
  subtotal: number;
  gratuity: number;
  distanceMiles: number;
  durationMin: number;
}

const DEFAULT_VEHICLES: VehicleCfg[] = [
  { id: "sedan", name: "Executive Sedan", model: "2025 Mercedes-Benz S580 · BMW 7 Series · Genesis G90", img: "/fleet_sedan.png", maxPax: 3, maxBags: 3, baseRate: 75, perMile: 3.75, hourlyRate: 90, minMiles: 15, airportFee: 45, afterHoursPct: 25, weekendPct: 15, tag: "Most Popular" },
  { id: "suv", name: "Luxury SUV", model: "2025 Cadillac Escalade · Lincoln Navigator · GMC Yukon Denali", img: "/fleet_suv.png", maxPax: 6, maxBags: 6, baseRate: 95, perMile: 4.75, hourlyRate: 115, minMiles: 15, airportFee: 45, afterHoursPct: 25, weekendPct: 15, tag: "" },
  { id: "van", name: "Premium Van", model: "2026 Mercedes Sprinter Executive", img: "/fleet_van.png", maxPax: 14, maxBags: 10, baseRate: 135, perMile: 5.75, hourlyRate: 150, minMiles: 15, airportFee: 55, afterHoursPct: 25, weekendPct: 15, tag: "Groups" },
];

const SERVICES = [
  { id: "airport" as ServiceType, label: "Airport Transfer", desc: "Flight-tracked pickups & drop-offs", icon: Plane },
  { id: "corporate" as ServiceType, label: "Corporate Travel", desc: "Executive point-to-point transport", icon: Briefcase },
  { id: "hourly" as ServiceType, label: "Hourly / As-Directed", desc: "Chauffeur at your full disposal", icon: Clock },
  { id: "event" as ServiceType, label: "Special Events", desc: "Galas, weddings & celebrations", icon: Star },
];

const STEP_LABELS = ["Service", "Trip Details", "Vehicle", "Your Info", "Confirm"];

function calcPrice(state: BookingState, v: VehicleCfg, rawMiles: number, promoDiscountPct = 0, promoFixed = 0, gratuityPct = 20, zoneSurchargePct = 0, zoneFlatFee = 0, zoneNameVal = ""): PriceBreakdown {
  const miles = Math.max(rawMiles, v.minMiles);
  const isHourly = state.service === "hourly";
  const validStops = state.stops.filter(Boolean).length;

  const base = isHourly ? v.hourlyRate * state.hours : v.baseRate;
  const baseLabel = isHourly ? `${state.hours}h × $${v.hourlyRate}/h` : `Base rate`;
  const mileage = isHourly ? 0 : parseFloat((miles * v.perMile).toFixed(2));
  const airportFee = state.service === "airport" ? v.airportFee : 0;
  const hr = state.time ? parseInt(state.time.split(":")[0]) : 12;
  const isAfterHours = hr >= 22 || hr < 6;
  const afterHours = isAfterHours ? parseFloat(((base + mileage) * (v.afterHoursPct / 100)).toFixed(2)) : 0;
  const d = state.date ? new Date(state.date + "T12:00:00") : new Date();
  const dow = d.getDay();
  const weekend = (dow === 0 || dow === 6) ? parseFloat(((base + mileage) * (v.weekendPct / 100)).toFixed(2)) : 0;
  const zoneSurcharge = !isHourly && (zoneSurchargePct > 0 || zoneFlatFee > 0)
    ? parseFloat(((base + mileage) * (zoneSurchargePct / 100) + zoneFlatFee).toFixed(2)) : 0;
  const meetGreet = state.meetAndGreet ? 25 : 0;
  const childSeat = state.childSeat ? 15 : 0;
  const stopsFee = isHourly ? 0 : validStops * 15;
  const tolls = !isHourly ? (miles > 40 ? 32 : miles > 15 ? 20 : 12) : 0;
  const beforePromo = parseFloat((base + mileage + airportFee + afterHours + weekend + zoneSurcharge + meetGreet + childSeat + tolls + stopsFee).toFixed(2));
  const promoDiscount = promoDiscountPct > 0
    ? parseFloat((beforePromo * (promoDiscountPct / 100)).toFixed(2))
    : promoFixed > 0 ? parseFloat(Math.min(promoFixed, beforePromo).toFixed(2)) : 0;
  const subtotal = parseFloat((beforePromo - promoDiscount).toFixed(2));
  const gratuity = gratuityPct > 0 ? parseFloat((subtotal * (gratuityPct / 100)).toFixed(2)) : 0;
  const durationMin = Math.round((miles / 35) * 60);

  return { baseLabel, base, mileage, airportFee, afterHours, weekend, zoneSurcharge, zoneName: zoneNameVal, meetGreet, childSeat, tolls, stopsFee, promoDiscount, subtotal, gratuity, distanceMiles: miles, durationMin };
}

function useDebounce<T>(value: T, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => { const t = setTimeout(() => setDebounced(value), delay); return () => clearTimeout(t); }, [value, delay]);
  return debounced;
}

function shortenPlace(name: string): string {
  return name.split(",").slice(0, 2).join(", ");
}

function AddressInput({ label, icon, value, onSelect, placeholder, onClear }: {
  label: string; icon: React.ReactNode; value: GeoPlace | null;
  onSelect: (p: GeoPlace) => void; placeholder: string; onClear?: () => void;
}) {
  const [query, setQuery] = useState(value?.short_name ?? "");
  const [predictions, setPredictions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const mapDivRef = useRef<HTMLDivElement>(null);
  const debQ = useDebounce(query, 350);

  useEffect(() => {
    if (!focused || debQ.length < 3) { setPredictions([]); return; }
    const goog = (window as any).google;
    if (!goog?.maps?.places) return;
    setLoading(true);
    const svc = new goog.maps.places.AutocompleteService();
    svc.getPlacePredictions(
      { input: debQ, componentRestrictions: { country: "us" } },
      (preds: any[], status: string) => {
        setLoading(false);
        if (status === goog.maps.places.PlacesServiceStatus.OK && preds) {
          setPredictions(preds);
        } else {
          setPredictions([]);
        }
      }
    );
  }, [debQ, focused]);

  const selectPrediction = (pred: any) => {
    const goog = (window as any).google;
    if (!goog?.maps?.places || !mapDivRef.current) return;
    const placeSvc = new goog.maps.places.PlacesService(mapDivRef.current);
    placeSvc.getDetails(
      { placeId: pred.place_id, fields: ["geometry", "formatted_address"] },
      (place: any, status: string) => {
        if (status === goog.maps.places.PlacesServiceStatus.OK && place?.geometry?.location) {
          const lat = place.geometry.location.lat();
          const lon = place.geometry.location.lng();
          const short_name = pred.structured_formatting.main_text +
            (pred.structured_formatting.secondary_text
              ? ", " + pred.structured_formatting.secondary_text.split(",")[0]
              : "");
          onSelect({ display_name: place.formatted_address ?? pred.description, short_name, lat, lon });
          setQuery(short_name);
          setPredictions([]);
          setFocused(false);
        }
      }
    );
  };

  useEffect(() => { if (value) setQuery(value.short_name); else setQuery(""); }, [value]);

  return (
    <div className="relative">
      <div ref={mapDivRef} className="hidden" />
      <label className="block text-[10px] font-bold tracking-[0.2em] uppercase text-white/30 mb-2">{label}</label>
      <div className={`flex items-center gap-3 border px-4 py-3.5 transition-colors duration-200 ${focused ? "border-[#C9A84C]" : "border-white/10"} bg-[#0f0f0f]`}>
        <span className="text-[#C9A84C] shrink-0">{icon}</span>
        <input
          className="flex-1 bg-transparent text-sm text-white placeholder-white/20 outline-none"
          placeholder={placeholder}
          value={query}
          onChange={e => { setQuery(e.target.value); if (value && onClear) onClear(); }}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 200)}
        />
        {loading && <Loader2 className="w-4 h-4 animate-spin text-white/20 shrink-0" />}
        {value && !loading && <Check className="w-4 h-4 text-[#C9A84C] shrink-0" />}
        {value && onClear && !loading && (
          <button onMouseDown={e => { e.preventDefault(); onClear(); setQuery(""); setPredictions([]); }} className="ml-1 text-white/20 hover:text-white/60 transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <AnimatePresence>
        {focused && predictions.length > 0 && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="absolute left-0 right-0 top-full mt-1 z-50 bg-[#111] border border-white/10 overflow-hidden shadow-2xl">
            {predictions.map((p: any) => (
              <button key={p.place_id} onMouseDown={() => selectPrediction(p)}
                className="w-full text-left flex items-start gap-3 px-4 py-3 hover:bg-white/5 transition-colors border-b border-white/[0.04] last:border-0">
                <MapPin className="w-3.5 h-3.5 text-[#C9A84C] shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs text-white/80 leading-snug block">{p.structured_formatting.main_text}</span>
                  <span className="text-[10px] text-white/30 leading-snug">{p.structured_formatting.secondary_text}</span>
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PriceLine({ label, value, highlight = false, discount = false }: { label: string; value: string; highlight?: boolean; discount?: boolean }) {
  return (
    <div className={`flex justify-between items-center py-2 ${highlight ? "border-t border-white/10 mt-1 pt-3" : ""}`}>
      <span className={`text-xs font-light ${highlight ? "font-bold text-white text-sm" : discount ? "text-green-400/70" : "text-white/40"}`}>{label}</span>
      <span className={`text-xs font-semibold tabular-nums ${highlight ? "text-[#C9A84C] text-base font-black" : discount ? "text-green-400 font-bold" : "text-white/70"}`}>{value}</span>
    </div>
  );
}

const INITIAL_STATE: BookingState = {
  service: null, pickup: null, stops: [], dropoff: null, date: "", time: "",
  passengers: 1, bags: 1, hours: 2, vehicleId: null,
  flightNumber: "", flightType: "arrival", meetAndGreet: false,
  childSeat: false, name: "", phone: "", email: "", notes: "", promoCode: "",
};

interface Props { triggerClassName?: string; triggerText?: string; triggerStyle?: React.CSSProperties; }

export function BookingSystem({ triggerClassName, triggerText = "BOOK NOW", triggerStyle }: Props) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [confirmCode, setConfirmCode] = useState("");
  const [showMap, setShowMap] = useState(true);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [promoDiscountPct, setPromoDiscountPct] = useState(0);
  const [promoChecking, setPromoChecking] = useState(false);
  const [gratuityPct, setGratuityPct] = useState(20);
  const [promoFixedDiscount, setPromoFixedDiscount] = useState(0);
  const { toast } = useToast();

  const [vehicles, setVehicles] = useState<VehicleCfg[]>(DEFAULT_VEHICLES);
  const [zones, setZones] = useState<any[]>([]);
  const [activeZone, setActiveZone] = useState<any | null>(null);
  const [b, setB] = useState<BookingState>({ ...INITIAL_STATE });
  const set = useCallback((patch: Partial<BookingState>) => setB(prev => ({ ...prev, ...patch })), []);

  useEffect(() => {
    // Load pricing config (base rates, per-mile, etc.) — admin can edit these
    fetch("/api/pricing").then(r => r.ok ? r.json() : null)
      .then((configs: any[] | null) => {
        if (!configs?.length) return;
        setVehicles(prev => prev.map(v => {
          const cfg = configs.find((c: any) => c.vehicleType === v.id);
          return cfg ? { ...v, baseRate: cfg.baseRate, perMile: cfg.perMile, hourlyRate: cfg.hourlyRate, minMiles: cfg.minMiles, airportFee: cfg.airportFee, afterHoursPct: cfg.afterHoursPct, weekendPct: cfg.weekendPct } : v;
        }));
      }).catch(() => {});

    // Load active vehicle types from admin fleet — only show types with at least one active vehicle
    fetch("/api/vehicles").then(r => r.ok ? r.json() : null)
      .then((activeTypes: string[] | null) => {
        if (!activeTypes?.length) return; // No active vehicles in admin → keep defaults (safe fallback)
        setVehicles(prev => prev.filter(v => activeTypes.includes(v.id)));
      }).catch(() => {}); // On error keep all vehicles

    // Load active service zones for surcharge calculation
    fetch("/api/zones").then(r => r.ok ? r.json() : null)
      .then((data: any[] | null) => { if (data?.length) setZones(data); })
      .catch(() => {});
  }, []);

  // Match pickup/dropoff against admin-defined zones
  useEffect(() => {
    if (!zones.length) { setActiveZone(null); return; }
    const addr = (place: any) => (place?.display_name ?? "").toLowerCase();
    const match = zones.find(z => z.city && (addr(b.pickup).includes(z.city.toLowerCase()) || addr(b.dropoff).includes(z.city.toLowerCase())));
    setActiveZone(match ?? null);
  }, [b.pickup, b.dropoff, zones]);

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const validStops = b.stops.filter(Boolean) as GeoPlace[];
  const allRoutePoints = [b.pickup, ...validStops, b.service !== "hourly" ? b.dropoff : null].filter(Boolean) as GeoPlace[];

  useEffect(() => {
    if (allRoutePoints.length < 2) { setRouteInfo(null); return; }
    const timer = setTimeout(async () => {
      const info = await fetchRoute(allRoutePoints.map(p => ({ lat: p.lat, lon: p.lon })));
      if (info) setRouteInfo(info);
    }, 600);
    return () => clearTimeout(timer);
  }, [b.pickup?.lat, b.dropoff?.lat, validStops.length]);

  const dist = routeInfo ? routeInfo.distanceMiles : 0;
  const selectedVehicle = vehicles.find(v => v.id === b.vehicleId) ?? null;
  const zonePct = activeZone?.surchargePct ?? 0;
  const zoneFee = activeZone?.flatFee ?? 0;
  const zoneLabel = activeZone?.name ?? "";
  const price = selectedVehicle ? calcPrice(b, selectedVehicle, dist, promoDiscountPct, promoFixedDiscount, gratuityPct, zonePct, zoneFee, zoneLabel) : null;
  const eligibleVehicles = vehicles.filter(v => v.maxPax >= b.passengers);

  const addStop = () => { if (b.stops.length < 4) set({ stops: [...b.stops, null] }); };
  const removeStop = (i: number) => { const s = [...b.stops]; s.splice(i, 1); set({ stops: s }); };
  const updateStop = (i: number, place: GeoPlace) => { const s = [...b.stops]; s[i] = place; set({ stops: s }); };

  const checkPromo = async (code: string) => {
    if (!code.trim()) { setPromoDiscountPct(0); setPromoFixedDiscount(0); return; }
    setPromoChecking(true);
    try {
      const res = await fetch(`/api/promotions/validate?code=${encodeURIComponent(code.trim())}`);
      if (res.ok) {
        const promo = await res.json();
        if (promo.type === "percent") {
          setPromoDiscountPct(promo.value ?? 0);
          setPromoFixedDiscount(0);
          toast({ title: `Promo applied — ${promo.value}% off`, description: promo.description ?? code });
        } else if (promo.type === "flat") {
          setPromoFixedDiscount(promo.value ?? 0);
          setPromoDiscountPct(0);
          toast({ title: `Promo applied — $${promo.value} off`, description: promo.description ?? code });
        } else {
          setPromoDiscountPct(0);
          setPromoFixedDiscount(0);
          toast({ title: "Promo applied", description: promo.description ?? code });
        }
      } else {
        const err = await res.json().catch(() => ({}));
        setPromoDiscountPct(0);
        setPromoFixedDiscount(0);
        toast({ title: (err as any).error ?? "Invalid promo code", variant: "destructive" });
      }
    } catch { setPromoDiscountPct(0); setPromoFixedDiscount(0); } finally { setPromoChecking(false); }
  };

  const canNext = (): boolean => {
    if (step === 1) return !!b.service;
    if (step === 2) {
      if (b.service === "hourly") return !!b.pickup && !!b.date && !!b.time;
      return !!b.pickup && !!b.dropoff && !!b.date && !!b.time;
    }
    if (step === 3) return !!b.vehicleId;
    if (step === 4) return !!b.name && !!b.phone && !!b.email;
    return false;
  };

  const next = () => { if (canNext()) setStep(s => (s + 1) as Step); };
  const back = () => setStep(s => (s - 1) as Step);

  const confirm = async () => {
    if (!selectedVehicle || !price || !b.pickup) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service: b.service,
          pickupAddress: b.pickup.display_name, pickupLat: b.pickup.lat, pickupLon: b.pickup.lon,
          dropoffAddress: b.dropoff?.display_name ?? null, dropoffLat: b.dropoff?.lat ?? null, dropoffLon: b.dropoff?.lon ?? null,
          additionalStops: validStops.length > 0 ? validStops.map(s => s.display_name) : null,
          date: b.date, time: b.time, passengers: b.passengers, bags: b.bags,
          hours: b.service === "hourly" ? b.hours : null, vehicleType: b.vehicleId,
          flightNumber: b.flightNumber || null, flightType: b.flightType,
          passengerName: b.name, passengerPhone: b.phone, passengerEmail: b.email,
          notes: b.notes || null, meetAndGreet: b.meetAndGreet, childSeat: b.childSeat,
          baseAmount: price.base, mileageAmount: price.mileage,
          surchargesAmount: price.airportFee + price.afterHours + price.weekend + price.zoneSurcharge + price.meetGreet + price.childSeat + price.stopsFee,
          tollsAmount: price.tolls, totalAmount: price.subtotal, distanceMiles: price.distanceMiles,
          promoCode: b.promoCode || null, promoDiscount: price.promoDiscount,
        }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error((e as any).error ?? `HTTP ${res.status}`); }
      const data = await res.json();
      setConfirmCode(data.confirmationCode ?? data.confirmation_code ?? "");
      setSubmitted(true);
    } catch (err: any) {
      toast({ title: "Booking failed", description: err?.message ?? "We couldn't process your reservation. Please try again.", variant: "destructive" });
    } finally { setSubmitting(false); }
  };

  const reset = () => {
    setOpen(false);
    setTimeout(() => { setStep(1); setSubmitted(false); setConfirmCode(""); setRouteInfo(null); setPromoDiscountPct(0); setPromoFixedDiscount(0); setGratuityPct(20); setB({ ...INITIAL_STATE }); }, 400);
  };

  const minDate = new Date().toISOString().split("T")[0];
  const mapPickup = b.pickup ? { lat: b.pickup.lat, lon: b.pickup.lon } : null;
  const mapDropoff = b.dropoff ? { lat: b.dropoff.lat, lon: b.dropoff.lon } : null;
  const mapStops = validStops.map(s => ({ lat: s.lat, lon: s.lon }));
  const hasMapContent = !!(mapPickup || mapDropoff);

  return (
    <>
      <button onClick={() => setOpen(true)} className={triggerClassName} style={triggerStyle} data-testid="button-book-trigger">
        {triggerText}
      </button>

      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4"
              onClick={(e) => { if (e.target === e.currentTarget) reset(); }}>

              <motion.div initial={{ opacity: 0, y: 60, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 40 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="relative w-full max-h-[100dvh] md:max-h-[92vh] bg-[#0a0a0a] border border-white/[0.07] flex overflow-hidden"
                style={{ fontFamily: "'DM Sans', sans-serif", maxWidth: step === 2 && hasMapContent && showMap ? "900px" : "640px", transition: "max-width 0.4s cubic-bezier(0.22,1,0.36,1)" }}>

                {/* Map Panel */}
                <AnimatePresence>
                  {step === 2 && hasMapContent && showMap && (
                    <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: "380px", opacity: 1 }} exit={{ width: 0, opacity: 0 }}
                      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                      className="hidden lg:flex flex-col relative shrink-0 overflow-hidden border-r border-white/[0.06]">
                      <RouteMap pickup={mapPickup} dropoff={mapDropoff} stops={mapStops} className="flex-1" />
                      {routeInfo && (
                        <div className="shrink-0 px-4 py-3 bg-[#0a0a0a] border-t border-white/[0.06] flex items-center gap-5">
                          <div className="flex items-center gap-2 text-xs">
                            <Route className="w-3.5 h-3.5 text-[#C9A84C]" />
                            <span className="font-black text-white">{routeInfo.distanceMiles.toFixed(1)}</span>
                            <span className="text-white/30">mi</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <Timer className="w-3.5 h-3.5 text-[#C9A84C]" />
                            <span className="font-black text-white">{routeInfo.durationMin}</span>
                            <span className="text-white/30">min</span>
                          </div>
                          {validStops.length > 0 && (
                            <div className="flex items-center gap-2 text-xs">
                              <MapPin className="w-3.5 h-3.5 text-purple-400" />
                              <span className="font-black text-purple-300">{validStops.length}</span>
                              <span className="text-white/30">stop{validStops.length > 1 ? "s" : ""}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Main Form Panel */}
                <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
                  {/* Header */}
                  <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.07] shrink-0">
                    <div className="flex items-center gap-4">
                      {step > 1 && !submitted && (
                        <button onClick={back} className="text-white/30 hover:text-white transition-colors">
                          <ArrowLeft className="w-4 h-4" />
                        </button>
                      )}
                      <div>
                        <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/25">
                          {submitted ? "Confirmed" : `Step ${step} of 5 · ${STEP_LABELS[step - 1]}`}
                        </p>
                        <h2 className="font-black text-base uppercase tracking-tight text-white mt-0.5">
                          {submitted ? "Reservation Received" : "Reserve Your Ride"}
                        </h2>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {step === 2 && hasMapContent && (
                        <button onClick={() => setShowMap(v => !v)}
                          className={`hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 border text-[9px] font-black uppercase tracking-widest transition-colors ${showMap ? "border-[#C9A84C]/40 text-[#C9A84C] bg-[#C9A84C]/5" : "border-white/10 text-white/30 hover:border-white/20"}`}>
                          <Navigation className="w-3 h-3" /> Map
                        </button>
                      )}
                      <button onClick={reset} className="text-white/30 hover:text-white transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  {!submitted && (
                    <div className="flex shrink-0">
                      {STEP_LABELS.map((_, i) => (
                        <div key={i} className="flex-1 h-0.5 transition-colors duration-500"
                          style={{ background: i < step ? YELLOW : "rgba(255,255,255,0.06)" }} />
                      ))}
                    </div>
                  )}

                  {/* Scrollable Body */}
                  <div className="flex-1 overflow-y-auto px-6 py-5">
                    <AnimatePresence mode="wait">

                      {/* Step 1 — Service */}
                      {step === 1 && (
                        <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}
                          className="grid grid-cols-2 gap-3">
                          {SERVICES.map(svc => {
                            const Icon = svc.icon;
                            const active = b.service === svc.id;
                            return (
                              <motion.button key={svc.id} whileTap={{ scale: 0.98 }} onClick={() => set({ service: svc.id })}
                                className={`flex flex-col items-start gap-3 p-5 border text-left transition-all duration-200 ${active ? "border-[#C9A84C] bg-[#C9A84C]/5" : "border-white/[0.07] hover:border-white/20 bg-[#0f0f0f]"}`}>
                                <div className={`w-8 h-8 flex items-center justify-center border ${active ? "border-[#C9A84C]/40 bg-[#C9A84C]/10" : "border-white/10"}`}>
                                  <Icon className={`w-4 h-4 ${active ? "text-[#C9A84C]" : "text-white/40"}`} />
                                </div>
                                <div>
                                  <p className={`font-black text-sm uppercase tracking-tight ${active ? "text-[#C9A84C]" : "text-white"}`}>{svc.label}</p>
                                  <p className="text-[10px] text-white/30 mt-0.5 leading-relaxed">{svc.desc}</p>
                                </div>
                              </motion.button>
                            );
                          })}
                        </motion.div>
                      )}

                      {/* Step 2 — Trip Details + Map + Multi-stops */}
                      {step === 2 && (
                        <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}
                          className="space-y-4">

                          {/* Mobile inline map */}
                          {hasMapContent && (
                            <div className="lg:hidden h-44 border border-white/[0.06] overflow-hidden">
                              <RouteMap pickup={mapPickup} dropoff={mapDropoff} stops={mapStops} className="w-full h-full" />
                            </div>
                          )}

                          <AddressInput label="Pickup Address" icon={<MapPin className="w-4 h-4" />}
                            value={b.pickup} onSelect={p => set({ pickup: p })} placeholder="Enter pickup location" onClear={() => set({ pickup: null })} />

                          {/* Multi-stops */}
                          {b.stops.map((stop, i) => (
                            <div key={i} className="flex gap-2 items-end">
                              <div className="flex-1">
                                <AddressInput
                                  label={`Stop ${i + 1}  (+$15)`}
                                  icon={<div className="w-4 h-4 rounded-full border-2 border-purple-400/70 flex items-center justify-center text-[8px] font-black text-purple-400">{i + 1}</div>}
                                  value={stop}
                                  onSelect={p => updateStop(i, p)}
                                  placeholder="Intermediate stop address"
                                  onClear={() => { const s = [...b.stops]; s[i] = null; set({ stops: s }); }}
                                />
                              </div>
                              <button onClick={() => removeStop(i)} className="p-3 mb-0 border border-white/[0.06] text-white/20 hover:text-white/60 hover:border-white/20 transition-colors shrink-0">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}

                          {b.stops.length < 4 && (
                            <button onClick={addStop}
                              className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/30 hover:text-[#C9A84C] transition-colors py-1">
                              <Plus className="w-3.5 h-3.5" />
                              {b.service === "hourly"
                                ? `Add stop ${b.stops.length > 0 ? `(${b.stops.length + 1} of 4)` : "· included in hourly rate"}`
                                : `Add intermediate stop ${b.stops.length > 0 ? `(${b.stops.length + 1} of 4)` : "· $15 each"}`}
                            </button>
                          )}

                          {b.service !== "hourly" && (
                            <AddressInput label="Drop-off Address" icon={<Navigation className="w-4 h-4" />}
                              value={b.dropoff} onSelect={p => set({ dropoff: p })} placeholder="Enter drop-off location" onClear={() => set({ dropoff: null })} />
                          )}

                          {/* Route info banner */}
                          {routeInfo && (
                            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                              className="flex items-center gap-5 px-4 py-3 bg-[#C9A84C]/5 border border-[#C9A84C]/15">
                              <Route className="w-4 h-4 text-[#C9A84C] shrink-0" />
                              <div className="flex gap-5 text-xs">
                                <div><span className="font-black text-white">{routeInfo.distanceMiles.toFixed(1)}</span><span className="text-white/30 ml-1">miles</span></div>
                                <div><span className="font-black text-white">{routeInfo.durationMin}</span><span className="text-white/30 ml-1">min est.</span></div>
                                {validStops.length > 0 && <div><span className="font-black text-purple-300">{validStops.length}</span><span className="text-white/30 ml-1">stop{validStops.length > 1 ? "s" : ""}</span></div>}
                              </div>
                            </motion.div>
                          )}

                          {/* Date & Time */}
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[10px] font-bold tracking-[0.2em] uppercase text-white/30 mb-2">Date</label>
                              <div className="flex items-center gap-3 border border-white/10 px-4 py-3.5 bg-[#0f0f0f] focus-within:border-[#C9A84C] transition-colors">
                                <Calendar className="w-4 h-4 text-[#C9A84C] shrink-0" />
                                <input type="date" min={minDate} value={b.date} onChange={e => set({ date: e.target.value })}
                                  className="flex-1 bg-transparent text-sm text-white outline-none" style={{ colorScheme: "dark" }} />
                              </div>
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold tracking-[0.2em] uppercase text-white/30 mb-2">Time</label>
                              <div className="flex items-center gap-3 border border-white/10 px-4 py-3.5 bg-[#0f0f0f] focus-within:border-[#C9A84C] transition-colors">
                                <Clock className="w-4 h-4 text-[#C9A84C] shrink-0" />
                                <input type="time" value={b.time} onChange={e => set({ time: e.target.value })}
                                  className="flex-1 bg-transparent text-sm text-white outline-none" style={{ colorScheme: "dark" }} />
                              </div>
                            </div>
                          </div>

                          {/* Passengers & Bags */}
                          <div className="grid grid-cols-2 gap-3">
                            {[
                              { key: "passengers" as const, icon: <Users className="w-4 h-4" />, label: "Passengers", min: 1, max: 14 },
                              { key: "bags" as const, icon: <Luggage className="w-4 h-4" />, label: "Bags", min: 0, max: 14 },
                            ].map(f => (
                              <div key={f.key}>
                                <label className="block text-[10px] font-bold tracking-[0.2em] uppercase text-white/30 mb-2">{f.label}</label>
                                <div className="flex items-center gap-3 border border-white/10 px-4 py-3 bg-[#0f0f0f]">
                                  <span className="text-[#C9A84C] shrink-0">{f.icon}</span>
                                  <button onClick={() => set({ [f.key]: Math.max(f.min, b[f.key] - 1) })} className="text-white/30 hover:text-white transition-colors w-5 text-center">−</button>
                                  <span className="flex-1 text-center text-sm font-bold text-white">{b[f.key]}</span>
                                  <button onClick={() => set({ [f.key]: Math.min(f.max, b[f.key] + 1) })} className="text-white/30 hover:text-white transition-colors w-5 text-center">+</button>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Hourly duration */}
                          {b.service === "hourly" && (
                            <div>
                              <label className="block text-[10px] font-bold tracking-[0.2em] uppercase text-white/30 mb-2">Duration</label>
                              <div className="flex gap-2 flex-wrap">
                                {[2, 3, 4, 5, 6, 8, 10, 12].map(h => (
                                  <button key={h} onClick={() => set({ hours: h })}
                                    className={`px-4 py-2 border text-xs font-black transition-all ${b.hours === h ? "border-[#C9A84C] text-[#C9A84C] bg-[#C9A84C]/10" : "border-white/10 text-white/30 hover:border-white/20"}`}>
                                    {h}h
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Airport options */}
                          {b.service === "airport" && (
                            <div className="space-y-3">
                              <div className="grid grid-cols-2 gap-2">
                                {(["arrival", "departure"] as FlightType[]).map(ft => (
                                  <button key={ft} onClick={() => set({ flightType: ft })}
                                    className={`flex items-center gap-2 px-3 py-2 border text-xs font-bold capitalize transition-all ${b.flightType === ft ? "border-[#C9A84C] text-[#C9A84C] bg-[#C9A84C]/5" : "border-white/10 text-white/30 hover:border-white/20"}`}>
                                    <Plane className={`w-3.5 h-3.5 ${ft === "departure" ? "rotate-45" : "-rotate-45"}`} /> {ft}
                                  </button>
                                ))}
                              </div>
                              <div className="flex items-center gap-3 border border-white/10 px-4 py-3.5 bg-[#0f0f0f] focus-within:border-[#C9A84C] transition-colors">
                                <Plane className="w-4 h-4 text-[#C9A84C] shrink-0" />
                                <input placeholder="Flight number (optional)" value={b.flightNumber} onChange={e => set({ flightNumber: e.target.value })}
                                  className="flex-1 bg-transparent text-sm text-white placeholder-white/20 outline-none" />
                              </div>
                            </div>
                          )}

                          {/* Add-ons */}
                          <div className="flex gap-2">
                            {[
                              { key: "meetAndGreet" as const, icon: <UserCheck className="w-4 h-4" />, label: "Meet & Greet", price: "+$25" },
                              { key: "childSeat" as const, icon: <Baby className="w-4 h-4" />, label: "Child Seat", price: "+$15" },
                            ].map(opt => (
                              <button key={opt.key} onClick={() => set({ [opt.key]: !b[opt.key] })}
                                className={`flex-1 flex items-center gap-2 px-4 py-3 border text-xs font-bold transition-all ${b[opt.key] ? "border-[#C9A84C] text-[#C9A84C] bg-[#C9A84C]/5" : "border-white/10 text-white/30 hover:border-white/20"}`}>
                                {opt.icon} {opt.label}
                                <span className="ml-auto text-[10px] opacity-60">{opt.price}</span>
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}

                      {/* Step 3 — Vehicle */}
                      {step === 3 && (
                        <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}
                          className="space-y-3">
                          {routeInfo && b.service !== "hourly" && (
                            <div className="flex items-center gap-4 px-4 py-3 bg-white/[0.02] border border-white/[0.05]">
                              <Car className="w-3.5 h-3.5 text-white/20" />
                              <div className="flex gap-4 text-xs">
                                <div><span className="font-bold text-white">{routeInfo.distanceMiles.toFixed(1)} mi</span></div>
                                <div><span className="text-white/50">{routeInfo.durationMin} min est.</span></div>
                                {validStops.length > 0 && <div><span className="text-purple-300">{validStops.length} stop{validStops.length > 1 ? "s" : ""}</span></div>}
                              </div>
                            </div>
                          )}
                          {eligibleVehicles.map(v => {
                            const p = calcPrice(b, v, dist, promoDiscountPct, promoFixedDiscount, gratuityPct, zonePct, zoneFee, zoneLabel);
                            const active = b.vehicleId === v.id;
                            return (
                              <motion.button key={v.id} onClick={() => set({ vehicleId: v.id })} whileTap={{ scale: 0.995 }}
                                className={`w-full text-left border transition-all duration-200 overflow-hidden ${active ? "border-[#C9A84C]" : "border-white/[0.07] hover:border-white/20"}`}>
                                <div className="relative h-36 overflow-hidden bg-[#0a0a0a]">
                                  <img src={v.img} alt={v.name} className={`w-full h-full object-cover transition-transform duration-500 ${active ? "scale-105" : "scale-100 hover:scale-105"}`} />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                                  {v.tag && <span className="absolute top-3 left-3 text-[9px] font-bold tracking-widest uppercase px-2 py-1 border border-[#C9A84C]/50 text-[#C9A84C] bg-black/60 backdrop-blur-sm">{v.tag}</span>}
                                  {active && <span className="absolute top-3 right-3 w-5 h-5 flex items-center justify-center bg-[#C9A84C] rounded-full"><Check className="w-3 h-3 text-black" strokeWidth={3} /></span>}
                                </div>
                                <div className={`px-4 py-3 flex items-start justify-between gap-3 transition-colors duration-200 ${active ? "bg-[#C9A84C]/5" : "bg-[#111] hover:bg-white/[0.02]"}`}>
                                  <div className="min-w-0">
                                    <p className={`font-black text-sm uppercase tracking-wide leading-tight ${active ? "text-[#C9A84C]" : "text-white"}`}>{v.name}</p>
                                    <p className="text-[10px] text-white/35 mt-0.5 truncate">{v.model}</p>
                                    <div className="flex gap-3 mt-1.5">
                                      <span className="text-[10px] text-white/25">Up to {v.maxPax} pax</span>
                                      <span className="text-[10px] text-white/25">Up to {v.maxBags} bags</span>
                                    </div>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <p className="font-black text-xl leading-none" style={{ color: active ? YELLOW : "#ffffff" }}>${p.subtotal.toFixed(0)}</p>
                                    <p className="text-[10px] text-white/25 mt-0.5">+grat ${p.gratuity.toFixed(0)}</p>
                                    <p className="text-[10px] text-white/20">{p.durationMin}min est.</p>
                                  </div>
                                </div>
                                {active && (
                                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                                    className="px-4 pb-3 pt-0 border-t border-[#C9A84C]/10 bg-[#C9A84C]/5">
                                    <PriceLine label={p.baseLabel} value={`$${p.base.toFixed(2)}`} />
                                    {p.mileage > 0 && <PriceLine label={`${dist.toFixed(1)} mi × $${v.perMile}/mi`} value={`$${p.mileage.toFixed(2)}`} />}
                                    {p.stopsFee > 0 && <PriceLine label={`${validStops.length} stop${validStops.length > 1 ? "s" : ""} × $15`} value={`$${p.stopsFee.toFixed(2)}`} />}
                                    {p.airportFee > 0 && <PriceLine label="Airport fee" value={`$${p.airportFee.toFixed(2)}`} />}
                                    {p.afterHours > 0 && <PriceLine label="After-hours surcharge" value={`$${p.afterHours.toFixed(2)}`} />}
                                    {p.weekend > 0 && <PriceLine label="Weekend surcharge" value={`$${p.weekend.toFixed(2)}`} />}
                                    {p.zoneSurcharge > 0 && <PriceLine label={`Zone surcharge (${p.zoneName})`} value={`$${p.zoneSurcharge.toFixed(2)}`} />}
                                    {p.meetGreet > 0 && <PriceLine label="Meet & Greet" value={`$${p.meetGreet.toFixed(2)}`} />}
                                    {p.childSeat > 0 && <PriceLine label="Child Seat" value={`$${p.childSeat.toFixed(2)}`} />}
                                    {p.tolls > 0 && <PriceLine label="Est. tolls" value={`$${p.tolls.toFixed(2)}`} />}
                                    {p.promoDiscount > 0 && <PriceLine label="Promo discount" value={`-$${p.promoDiscount.toFixed(2)}`} discount />}
                                    <PriceLine label="Total (excl. gratuity)" value={`$${p.subtotal.toFixed(2)}`} highlight />
                                  </motion.div>
                                )}
                              </motion.button>
                            );
                          })}

                          {/* Promo code */}
                          <div className="pt-2">
                            <label className="block text-[10px] font-bold tracking-[0.2em] uppercase text-white/30 mb-2">Promo Code (optional)</label>
                            <div className="flex gap-2">
                              <div className="flex items-center gap-3 border border-white/10 px-4 py-3 bg-[#0f0f0f] flex-1 focus-within:border-[#C9A84C] transition-colors">
                                <Tag className="w-4 h-4 text-[#C9A84C]/40 shrink-0" />
                                <input placeholder="Enter code" value={b.promoCode}
                                  onChange={e => { set({ promoCode: e.target.value }); if (!e.target.value) setPromoDiscountPct(0); }}
                                  onKeyDown={e => { if (e.key === "Enter") checkPromo(b.promoCode); }}
                                  className="flex-1 bg-transparent text-sm text-white placeholder-white/20 outline-none uppercase tracking-widest" />
                                {promoDiscountPct > 0 && <Check className="w-4 h-4 text-green-400 shrink-0" />}
                              </div>
                              <button onClick={() => checkPromo(b.promoCode)} disabled={promoChecking || !b.promoCode}
                                className="px-4 py-3 border border-white/10 text-xs font-bold text-white/40 hover:text-white hover:border-white/30 transition-colors disabled:opacity-40">
                                {promoChecking ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {/* Step 4 — Passenger Info */}
                      {step === 4 && (
                        <motion.div key="s4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}
                          className="space-y-4">
                          {[
                            { key: "name" as const, label: "Full Name", icon: <User className="w-4 h-4" />, type: "text", placeholder: "John Smith", required: true },
                            { key: "phone" as const, label: "Phone", icon: <Phone className="w-4 h-4" />, type: "tel", placeholder: "+1 (347) 000-0000", required: true },
                            { key: "email" as const, label: "Email", icon: <Mail className="w-4 h-4" />, type: "email", placeholder: "you@email.com", required: true },
                          ].map(f => (
                            <div key={f.key}>
                              <label className="block text-[10px] font-bold tracking-[0.2em] uppercase text-white/30 mb-2">{f.label}</label>
                              <div className="flex items-center gap-3 border border-white/10 px-4 py-3.5 bg-[#0f0f0f] focus-within:border-[#C9A84C] transition-colors">
                                <span className="text-[#C9A84C] shrink-0">{f.icon}</span>
                                <input type={f.type} placeholder={f.placeholder} required={f.required}
                                  className="flex-1 bg-transparent text-sm text-white placeholder-white/20 outline-none"
                                  value={b[f.key]} onChange={e => set({ [f.key]: e.target.value })} />
                              </div>
                            </div>
                          ))}
                          <div>
                            <label className="block text-[10px] font-bold tracking-[0.2em] uppercase text-white/30 mb-2">Notes (optional)</label>
                            <textarea rows={2} placeholder="Special instructions, preferences…"
                              className="w-full border border-white/10 bg-[#0f0f0f] px-4 py-3 text-sm text-white placeholder-white/20 outline-none resize-none focus:border-[#C9A84C] transition-colors"
                              value={b.notes} onChange={e => set({ notes: e.target.value })} />
                          </div>
                        </motion.div>
                      )}

                      {/* Step 5 — Confirm */}
                      {step === 5 && !submitted && (
                        <motion.div key="s5" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}
                          className="space-y-4">
                          <div className="bg-[#0f0f0f] border border-white/[0.07] p-5 space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-xs">
                              {([
                                ["Service", b.service === "hourly" ? `Hourly / As-Directed · ${b.hours}h` : b.service?.replace("_", " ")],
                                ["Date & Time", `${b.date} · ${b.time}`],
                                ["Pickup", b.pickup?.short_name],
                                ...validStops.map((s, i) => [`Stop ${i + 1}`, s.short_name] as [string, string]),
                                ["Drop-off", b.dropoff?.short_name ?? (b.service === "hourly" ? "As directed" : "—")],
                                routeInfo && b.service !== "hourly" ? ["Route", `${routeInfo.distanceMiles.toFixed(1)} mi · ${routeInfo.durationMin} min`] : null,
                                ["Passengers", `${b.passengers} pax · ${b.bags} bags`],
                                ["Vehicle", selectedVehicle?.name],
                                ["Contact", b.name],
                              ] as ([string, string | undefined] | null)[]).filter((x): x is [string, string | undefined] => x !== null).map(([k, v]) => (
                                <div key={String(k)}>
                                  <p className="text-[10px] tracking-widest uppercase text-white/20 mb-1 font-bold">{k}</p>
                                  <p className="text-white/70 capitalize">{String(v ?? "—")}</p>
                                </div>
                              ))}
                            </div>
                            {price && (
                              <div className="border-t border-white/[0.06] pt-4">
                                {price.airportFee > 0 && <PriceLine label="Airport fee" value={`$${price.airportFee.toFixed(2)}`} />}
                                {price.afterHours > 0 && <PriceLine label="After-hours surcharge" value={`$${price.afterHours.toFixed(2)}`} />}
                                {price.weekend > 0 && <PriceLine label="Weekend surcharge" value={`$${price.weekend.toFixed(2)}`} />}
                                {price.zoneSurcharge > 0 && <PriceLine label={`Zone surcharge (${price.zoneName})`} value={`$${price.zoneSurcharge.toFixed(2)}`} />}
                                {price.meetGreet > 0 && <PriceLine label="Meet & Greet" value={`$${price.meetGreet.toFixed(2)}`} />}
                                {price.childSeat > 0 && <PriceLine label="Child Seat" value={`$${price.childSeat.toFixed(2)}`} />}
                                {price.tolls > 0 && <PriceLine label="Est. tolls" value={`$${price.tolls.toFixed(2)}`} />}
                                {price.promoDiscount > 0 && (
                                  <PriceLine
                                    label={promoDiscountPct > 0 ? `Promo (${promoDiscountPct}% off)` : `Promo ($${promoFixedDiscount} off)`}
                                    value={`-$${price.promoDiscount.toFixed(2)}`}
                                    discount
                                  />
                                )}
                                <PriceLine label="Subtotal" value={`$${price.subtotal.toFixed(2)}`} highlight />
                              </div>
                            )}

                            {/* Gratuity selector */}
                            <div className="mt-4 space-y-2">
                              <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/25">Gratuity (not collected now)</p>
                              <div className="flex gap-1.5">
                                {([0, 15, 18, 20] as const).map(pct => (
                                  <button key={pct} type="button" onClick={() => setGratuityPct(pct)}
                                    className={`flex-1 py-2.5 border text-[10px] font-black tracking-widest uppercase transition-all ${gratuityPct === pct ? "border-[#C9A84C] text-[#C9A84C] bg-[#C9A84C]/10" : "border-white/[0.08] text-white/25 hover:border-white/20 hover:text-white/40"}`}>
                                    {pct === 0 ? "None" : `${pct}%`}
                                    {pct > 0 && price && <span className="block text-[8px] opacity-60 mt-0.5 font-semibold">${(price.subtotal * pct / 100).toFixed(0)}</span>}
                                  </button>
                                ))}
                              </div>
                            </div>

                          </div>
                          <div className="flex items-start gap-3 px-4 py-3 bg-[#C9A84C]/5 border border-[#C9A84C]/15">
                            <AlertCircle className="w-4 h-4 text-[#C9A84C] shrink-0 mt-0.5" />
                            <p className="text-xs text-white/40 leading-relaxed">A concierge will confirm your booking within minutes. No payment is collected now.</p>
                          </div>
                        </motion.div>
                      )}

                      {/* Confirmed */}
                      {submitted && (
                        <motion.div key="done" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
                          className="flex flex-col items-center text-center py-8 gap-5">
                          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.1, type: "spring", stiffness: 300, damping: 20 }}
                            className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: YELLOW }}>
                            <Check className="w-7 h-7 text-black" strokeWidth={3} />
                          </motion.div>
                          <div>
                            <h3 className="font-black text-xl uppercase tracking-tight text-white mb-2">You're on the list.</h3>
                            {confirmCode && <p className="font-mono text-[#C9A84C] text-lg font-black mb-3 tracking-[0.2em]">{confirmCode}</p>}
                            <p className="text-white/40 text-sm font-light max-w-[280px] leading-relaxed">
                              Our concierge will reach out to {b.email || "you"} within minutes to confirm.
                            </p>
                          </div>
                          <a href="tel:+18483888817" className="flex items-center gap-2 text-[11px] font-semibold tracking-wide text-white/30 hover:text-white transition-colors">
                            <Phone className="w-3.5 h-3.5 text-[#C9A84C]" /> +1 (848) 388-8817
                          </a>
                          <button onClick={reset} className="text-[10px] font-black uppercase tracking-widest text-white/20 hover:text-white/60 transition-colors border border-white/10 px-4 py-2 mt-2">
                            Close
                          </button>
                        </motion.div>
                      )}

                    </AnimatePresence>
                  </div>

                  {/* Footer */}
                  {!submitted && step < 5 && (
                    <div className="px-6 py-5 border-t border-white/[0.07] shrink-0">
                      <button onClick={next} disabled={!canNext()}
                        className="w-full py-4 text-[11px] font-black tracking-[0.2em] uppercase flex items-center justify-center gap-2 transition-opacity"
                        style={{ background: canNext() ? YELLOW : "rgba(201,168,76,0.2)", color: canNext() ? "#000" : "rgba(201,168,76,0.3)" }}>
                        Continue <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  {!submitted && step === 5 && (
                    <div className="px-6 py-5 border-t border-white/[0.07] shrink-0">
                      <button onClick={confirm} disabled={submitting}
                        className="w-full py-4 text-[11px] font-black tracking-[0.2em] uppercase flex items-center justify-center gap-2 hover:opacity-90"
                        style={{ background: YELLOW, color: "#000" }}>
                        {submitting ? <><Loader2 className="w-4 h-4 animate-spin" />Sending…</> : "Confirm Reservation"}
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
