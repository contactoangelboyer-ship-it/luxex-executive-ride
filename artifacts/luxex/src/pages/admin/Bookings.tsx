import { useCallback, useEffect, useRef, useState } from "react";
import { useSearch } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Loader2, XCircle, Car, CheckCircle, Download, Plus, Mail, Zap, Navigation2, Bell, Clock, CalendarDays } from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { adminApi } from "@/lib/adminApi";

const YELLOW = "#C9A84C";

function PlacesInput({ value, onChange, onPlaceSelect, required, placeholder, className }: {
  value: string;
  onChange: (val: string) => void;
  onPlaceSelect?: (place: { address: string; lat: number; lon: number }) => void;
  required?: boolean; placeholder?: string; className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const acRef = useRef<any>(null);

  useEffect(() => {
    const goog = (window as any).google;
    if (!goog?.maps?.places || !inputRef.current) return;
    acRef.current = new goog.maps.places.Autocomplete(inputRef.current, {
      componentRestrictions: { country: "us" },
      fields: ["formatted_address", "name", "geometry"],
    });
    const listener = acRef.current.addListener("place_changed", () => {
      const place = acRef.current.getPlace();
      const address = place.formatted_address ?? place.name ?? "";
      onChange(address);
      if (onPlaceSelect && place.geometry?.location) {
        onPlaceSelect({ address, lat: place.geometry.location.lat(), lon: place.geometry.location.lng() });
      }
    });
    return () => { goog.maps.event.removeListener(listener); };
  }, []);

  return (
    <input
      ref={inputRef}
      required={required}
      className={className}
      placeholder={placeholder}
      value={value}
      onChange={e => onChange(e.target.value)}
    />
  );
}

const STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "assigned", label: "Assigned" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const STATUS_COLORS: Record<string, string> = {
  pending:     "text-[#C9A84C] bg-[#C9A84C]/10 border-[#C9A84C]/20",
  confirmed:   "text-white/80 bg-white/10 border-white/20",
  assigned:    "text-[#C9A84C]/80 bg-[#C9A84C]/5 border-[#C9A84C]/15",
  in_progress: "text-white bg-white/10 border-white/30",
  completed:   "text-white/40 bg-white/5 border-white/10",
  cancelled:   "text-white/25 bg-white/[0.03] border-white/[0.06]",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending", confirmed: "Confirmed", assigned: "Assigned",
  in_progress: "In Progress", completed: "Completed", cancelled: "Cancelled",
};

const VEHICLE_TYPES = ["sedan", "suv", "van", "sprinter", "limo"];
const SERVICE_TYPES = ["airport", "corporate", "hourly", "event"];
const FLIGHT_TYPES = ["arrival", "departure"];

// ── Date / grouping helpers ────────────────────────────────────────────────
function getTodayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDateSection(dateStr: string): string {
  const today = getTodayStr();
  const dn = new Date(); dn.setDate(dn.getDate() + 1);
  const tomorrow = `${dn.getFullYear()}-${String(dn.getMonth() + 1).padStart(2, "0")}-${String(dn.getDate()).padStart(2, "0")}`;
  if (dateStr === today) return "Today";
  if (dateStr === tomorrow) return "Tomorrow";
  const [y, mo, day] = dateStr.split("-").map(Number);
  return new Date(y, mo - 1, day).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function isActiveStatus(status: string): boolean {
  return ["pending", "confirmed", "assigned", "in_progress"].includes(status);
}

function minutesUntilTrip(date: string, time: string | null): number | null {
  if (!time) return null;
  const today = getTodayStr();
  if (date !== today) return null;
  const [h, m] = time.split(":").map(Number);
  const tripMs = new Date();
  tripMs.setHours(h, m, 0, 0);
  return Math.round((tripMs.getTime() - Date.now()) / 60000);
}

const EMPTY_FORM = {
  service: "airport",
  pickupAddress: "",
  pickupLat: null as number | null,
  pickupLon: null as number | null,
  dropoffAddress: "",
  dropoffLat: null as number | null,
  dropoffLon: null as number | null,
  date: "",
  time: "",
  passengers: 1,
  bags: 1,
  hours: "",
  vehicleType: "sedan",
  flightNumber: "",
  flightType: "",
  passengerName: "",
  passengerPhone: "",
  passengerEmail: "",
  notes: "",
  meetAndGreet: false,
  childSeat: false,
  baseAmount: "",
  mileageAmount: "",
  surchargesAmount: "",
  tollsAmount: "",
  totalAmount: "",
  promoCode: "",
  promoDiscount: "",
  driverId: "",
  status: "pending",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] font-bold tracking-widest uppercase text-white/25 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

const inputCls = "w-full bg-[#111] border border-white/10 focus:border-[#C9A84C] text-sm text-white placeholder-white/20 px-3 py-2.5 outline-none transition-colors";
const selectCls = inputCls + " cursor-pointer";

export default function Bookings() {
  const rawSearch = useSearch();
  const [bookings, setBookings] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState(() => new URLSearchParams(rawSearch).get("status") ?? "");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [driverAssign, setDriverAssign] = useState<string>("");
  const [adminNotes, setAdminNotes] = useState("");
    const [adminPrice, setAdminPrice] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");

  // New booking modal state
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<typeof EMPTY_FORM>(EMPTY_FORM);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pricing, setPricing] = useState<any[]>([]);
  const [routeInfo, setRouteInfo] = useState<{ distanceMiles: number; durationMin: number } | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);

  // Edit form state for detail modal
  const [editPassengerName, setEditPassengerName] = useState("");
  const [editPassengerPhone, setEditPassengerPhone] = useState("");
  const [editPassengerEmail, setEditPassengerEmail] = useState("");
  const [editService, setEditService] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editPickupAddress, setEditPickupAddress] = useState("");
  const [editDropoffAddress, setEditDropoffAddress] = useState("");
  const [editPassengers, setEditPassengers] = useState<number>(1);
  const [editBags, setEditBags] = useState<number>(1);
  const [editHours, setEditHours] = useState("");
  const [editVehicleType, setEditVehicleType] = useState("");
  const [editFlightNumber, setEditFlightNumber] = useState("");
  const [editFlightType, setEditFlightType] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editMeetAndGreet, setEditMeetAndGreet] = useState(false);
  const [editChildSeat, setEditChildSeat] = useState(false);
  const [editBaseAmount, setEditBaseAmount] = useState("");
  const [editMileageAmount, setEditMileageAmount] = useState("");
  const [editSurchargesAmount, setEditSurchargesAmount] = useState("");
  const [editTollsAmount, setEditTollsAmount] = useState("");
  const [editPromoCode, setEditPromoCode] = useState("");
  const [editPromoDiscount, setEditPromoDiscount] = useState("");

  const load = () => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (statusFilter) params.status = statusFilter;
    Promise.all([adminApi.bookings.list(params), adminApi.drivers.list(), adminApi.pricing.list()])
      .then(([b, d, p]) => { setBookings(b); setDrivers(d); setPricing(p); })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const autoFillPrice = useCallback((vehicleType: string, service: string, hours: string, form: typeof EMPTY_FORM) => {
    const p = pricing.find((row: any) => row.vehicleType === vehicleType);
    if (!p) return;
    const isHourly = service === "hourly";
    let base = 0;
    let mileage = 0;
    let surcharges = 0;
    if (isHourly) {
      base = p.hourlyRate * (Number(hours) || 1);
      mileage = 0;
    } else {
      base = p.baseRate;
      const actualMiles = routeInfo ? Math.max(routeInfo.distanceMiles, p.minMiles) : p.minMiles;
      mileage = parseFloat((p.perMile * actualMiles).toFixed(2));
    }
    // After-hours surcharge (22:00–05:59)
    if (!isHourly && form.time) {
      const hr = parseInt(form.time.split(":")[0]);
      if (hr >= 22 || hr < 6) {
        surcharges = parseFloat((surcharges + (base + mileage) * ((p.afterHoursPct ?? 25) / 100)).toFixed(2));
      }
    }
    // Estimated tolls based on actual or minimum miles
    const milesForTolls = routeInfo ? Math.max(routeInfo.distanceMiles, p.minMiles) : p.minMiles;
    const tolls = !isHourly ? (milesForTolls > 40 ? 32 : milesForTolls > 15 ? 20 : 12) : 0;
    setCreateForm(prev => ({
      ...prev,
      baseAmount: String(base),
      mileageAmount: String(mileage),
      surchargesAmount: String(surcharges),
      tollsAmount: String(tolls),
      totalAmount: "",
    }));
  }, [pricing, routeInfo]);

  useEffect(() => { load(); }, [statusFilter]);

  // Auto-calculate route when both pickup and dropoff coords are available
  useEffect(() => {
    const { pickupLat, pickupLon, dropoffLat, dropoffLon } = createForm;
    if (!pickupLat || !pickupLon || !dropoffLat || !dropoffLon) {
      setRouteInfo(null);
      return;
    }
    const goog = (window as any).google;
    if (!goog?.maps) return;
    setRouteLoading(true);
    const svc = new goog.maps.DirectionsService();
    svc.route(
      { origin: { lat: pickupLat, lng: pickupLon }, destination: { lat: dropoffLat, lng: dropoffLon }, travelMode: goog.maps.TravelMode.DRIVING },
      (result: any, status: string) => {
        setRouteLoading(false);
        if (status !== "OK" || !result?.routes?.[0]) { setRouteInfo(null); return; }
        const route = result.routes[0];
        let distanceMeters = 0, durationSeconds = 0;
        route.legs.forEach((leg: any) => { distanceMeters += leg.distance.value; durationSeconds += leg.duration.value; });
        const distanceMiles = parseFloat(((distanceMeters / 1609.344) * 1.05).toFixed(2));
        const durationMin = Math.round(durationSeconds / 60);
        setRouteInfo({ distanceMiles, durationMin });
        // Recalculate mileage and tolls with real distance
        setCreateForm(prev => {
          if (prev.service === "hourly") return prev;
          const p = pricing.find((row: any) => row.vehicleType === prev.vehicleType);
          if (!p) return prev;
          const actualMiles = Math.max(distanceMiles, p.minMiles);
          const mileage = parseFloat((actualMiles * p.perMile).toFixed(2));
          const tolls = distanceMiles > 40 ? 32 : distanceMiles > 15 ? 20 : 12;
          return { ...prev, mileageAmount: String(mileage), tollsAmount: String(tolls), totalAmount: "" };
        });
      }
    );
  }, [createForm.pickupLat, createForm.pickupLon, createForm.dropoffLat, createForm.dropoffLon]);

  const filtered = bookings.filter(b => {
    if (!search) return true;
    const s = search.toLowerCase();
    return b.passengerName?.toLowerCase().includes(s) || b.confirmationCode?.toLowerCase().includes(s)
      || b.pickupAddress?.toLowerCase().includes(s) || b.passengerPhone?.includes(s);
  });

  // Sort: active trips by date/time ASC (today first), completed/cancelled at bottom by date DESC
  const today = getTodayStr();
  const sorted = [...filtered].sort((a, b) => {
    const aActive = isActiveStatus(a.status);
    const bActive = isActiveStatus(b.status);
    if (aActive !== bActive) return aActive ? -1 : 1;
    if (aActive) {
      if (a.date !== b.date) return a.date < b.date ? -1 : 1;
      return (a.time ?? "") < (b.time ?? "") ? -1 : 1;
    }
    if (a.date !== b.date) return a.date > b.date ? -1 : 1;
    return (a.time ?? "") > (b.time ?? "") ? -1 : 1;
  });

  // Group into date sections
  const dateGroups: { key: string; label: string; isToday: boolean; items: any[] }[] = [];
  for (const b of sorted) {
    const isActive = isActiveStatus(b.status);
    if (!isActive) {
      const last = dateGroups[dateGroups.length - 1];
      if (last?.key === "__archive__") { last.items.push(b); }
      else { dateGroups.push({ key: "__archive__", label: "Completed & Cancelled", isToday: false, items: [b] }); }
    } else {
      const last = dateGroups[dateGroups.length - 1];
      if (last?.key === b.date) { last.items.push(b); }
      else { dateGroups.push({ key: b.date, label: formatDateSection(b.date), isToday: b.date === today, items: [b] }); }
    }
  }

  // Today's active trips for the reminder banner
  const todayActiveTrips = bookings.filter(b => b.date === today && isActiveStatus(b.status));
  // Trips starting within the next 2 hours
  const upcomingSoon = todayActiveTrips.filter(b => {
    const mins = minutesUntilTrip(b.date, b.time);
    return mins !== null && mins >= 0 && mins <= 120;
  });

  const setReminder = (b: any) => {
    if (b.date !== today || !b.time) {
      alert(`Recordatorio guardado:\n${b.passengerName} — ${b.date} a las ${b.time ?? "TBD"}\n${b.pickupAddress}`);
      return;
    }
    const [h, m] = b.time.split(":").map(Number);
    const tripTime = new Date(); tripTime.setHours(h, m, 0, 0);
    const reminderMs = tripTime.getTime() - 30 * 60 * 1000;
    const msUntil = reminderMs - Date.now();
    const scheduleNotif = () => {
      if (msUntil > 0) {
        setTimeout(() => {
          new Notification(`Viaje en 30 min — ${b.passengerName}`, {
            body: `${b.time} · ${b.pickupAddress}`,
            icon: "/favicon.ico",
          });
        }, msUntil);
        alert(`✓ Recordatorio activado. Recibirás una notificación 30 minutos antes del viaje a las ${b.time}.`);
      } else {
        const mins = minutesUntilTrip(b.date, b.time);
        if (mins !== null && mins > 0) {
          alert(`El viaje es en ${mins} minutos — ¡comienza pronto!\n${b.passengerName} — ${b.pickupAddress}`);
        } else {
          alert(`Este viaje ya inició o está pasando ahora.\n${b.passengerName} — ${b.time}`);
        }
      }
    };
    if (!("Notification" in window)) {
      alert(`Recordatorio: Viaje a las ${b.time} para ${b.passengerName}\n${b.pickupAddress}`);
    } else if (Notification.permission === "granted") {
      scheduleNotif();
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission().then(p => { if (p === "granted") scheduleNotif(); else alert(`Recordatorio: ${b.passengerName} a las ${b.time}`); });
    } else {
      alert(`Recordatorio: Viaje a las ${b.time} para ${b.passengerName}\n${b.pickupAddress}`);
    }
  };

  const openDetail = (b: any) => {
    setSelected(b);
    setDriverAssign(b.driverId != null ? String(b.driverId) : "");
    setAdminNotes(b.adminNotes ?? "");
    setAdminPrice(b.totalAmount != null ? String(b.totalAmount.toFixed(2)) : "");
    setSelectedStatus(b.status);
    setSaveError("");
    setResendMsg(null);
    setEditPassengerName(b.passengerName ?? "");
    setEditPassengerPhone(b.passengerPhone ?? "");
    setEditPassengerEmail(b.passengerEmail ?? "");
    setEditService(b.service ?? "airport");
    setEditDate(b.date ?? "");
    setEditTime(b.time ?? "");
    setEditPickupAddress(b.pickupAddress ?? "");
    setEditDropoffAddress(b.dropoffAddress ?? "");
    setEditPassengers(b.passengers ?? 1);
    setEditBags(b.bags ?? 1);
    setEditHours(b.hours != null ? String(b.hours) : "");
    setEditVehicleType(b.vehicleType ?? "sedan");
    setEditFlightNumber(b.flightNumber ?? "");
    setEditFlightType(b.flightType ?? "");
    setEditNotes(b.notes ?? "");
    setEditMeetAndGreet(b.meetAndGreet ?? false);
    setEditChildSeat(b.childSeat ?? false);
    setEditBaseAmount(b.baseAmount != null ? String(b.baseAmount) : "");
    setEditMileageAmount(b.mileageAmount != null ? String(b.mileageAmount) : "");
    setEditSurchargesAmount(b.surchargesAmount != null ? String(b.surchargesAmount) : "");
    setEditTollsAmount(b.tollsAmount != null ? String(b.tollsAmount) : "");
    setEditPromoCode(b.promoCode ?? "");
    setEditPromoDiscount(b.promoDiscount != null ? String(b.promoDiscount) : "");
  };

  const handleResendConfirmation = async () => {
    if (!selected) return;
    setResending(true);
    setResendMsg(null);
    try {
      await adminApi.bookings.resendConfirmation(selected.id);
      setResendMsg({ ok: true, text: `Confirmation email sent to ${selected.passengerEmail}` });
    } catch (e: any) {
      setResendMsg({ ok: false, text: e?.message ?? "Failed to send email. Please try again." });
    } finally {
      setResending(false);
    }
  };

  const handleDriverChange = (driverId: string) => {
    setDriverAssign(driverId);
    if (driverId !== "" && (selectedStatus === "pending" || selectedStatus === "confirmed")) {
      setSelectedStatus("assigned");
    }
    if (driverId === "" && selectedStatus === "assigned") {
      setSelectedStatus("confirmed");
    }
  };

  const quickUpdateStatus = async (id: number, status: string) => {
    setSaving(true);
    try {
      const updated = await adminApi.bookings.update(id, { status });
      setBookings(prev => prev.map(b => b.id === id ? updated : b));
    } catch { alert("Failed to update status. Please try again."); } finally { setSaving(false); }
  };

  const exportCSV = () => {
    const headers = ["Code", "Passenger", "Phone", "Email", "Service", "Date", "Time", "Pickup", "Drop-off", "Vehicle", "Driver", "Total", "Status"];
    const rows = filtered.map(b => {
      const driver = drivers.find((d: any) => d.id === b.driverId);
      return [
        b.confirmationCode, b.passengerName, b.passengerPhone, b.passengerEmail,
        b.service, b.date, b.time, b.pickupAddress, b.dropoffAddress ?? "",
        b.vehicleType ?? "", driver?.name ?? "", b.totalAmount?.toFixed(2) ?? "0", b.status,
      ];
    });
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `luxex-bookings-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const saveDetail = async () => {
    if (!selected) return;
    setSaving(true);
    setSaveError("");
    try {
      const payload: Record<string, any> = {
        status: selectedStatus,
        driverId: driverAssign !== "" ? Number(driverAssign) : null,
        adminNotes,
        passengerName: editPassengerName,
        passengerPhone: editPassengerPhone,
        passengerEmail: editPassengerEmail,
        service: editService,
        date: editDate,
        time: editTime,
        pickupAddress: editPickupAddress,
        dropoffAddress: editDropoffAddress || null,
        passengers: Number(editPassengers),
        bags: Number(editBags),
        hours: editHours ? Number(editHours) : null,
        vehicleType: editVehicleType || null,
        flightNumber: editFlightNumber || null,
        flightType: editFlightType || null,
        notes: editNotes || null,
        meetAndGreet: editMeetAndGreet,
        childSeat: editChildSeat,
        baseAmount: parseFloat(editBaseAmount) || 0,
        mileageAmount: parseFloat(editMileageAmount) || 0,
        surchargesAmount: parseFloat(editSurchargesAmount) || 0,
        tollsAmount: parseFloat(editTollsAmount) || 0,
        promoCode: editPromoCode || null,
        promoDiscount: parseFloat(editPromoDiscount) || 0,
      };
      if (adminPrice !== "" && !isNaN(Number(adminPrice)) && Number(adminPrice) > 0) {
        payload.totalAmount = Number(adminPrice);
      }
      const updated = await adminApi.bookings.update(selected.id, payload);
      setBookings(prev => prev.map(b => b.id === selected.id ? updated : b));
      openDetail(updated);
    } catch (e: any) { setSaveError(e?.message ?? "Error saving changes. Please try again."); } finally { setSaving(false); }
  };

  const setField = (key: keyof typeof EMPTY_FORM, value: any) => {
    setCreateForm(prev => {
      const next = { ...prev, [key]: value };
      if ((key === "vehicleType" || key === "service" || key === "hours" || key === "date" || key === "time") && pricing.length > 0) {
        const p = pricing.find((row: any) => row.vehicleType === next.vehicleType);
        if (p) {
          const isHourly = next.service === "hourly";
          let base = 0;
          let mileage = 0;
          let surcharges = 0;
          if (isHourly) {
            base = p.hourlyRate * (Number(next.hours) || 1);
            mileage = 0;
          } else {
            base = p.baseRate;
            const actualMiles = routeInfo ? Math.max(routeInfo.distanceMiles, p.minMiles) : p.minMiles;
            mileage = parseFloat((p.perMile * actualMiles).toFixed(2));
          }
          // After-hours surcharge (22:00–05:59)
          if (!isHourly && next.time) {
            const hr = parseInt(next.time.split(":")[0]);
            if (hr >= 22 || hr < 6) {
              surcharges = parseFloat((surcharges + (base + mileage) * ((p.afterHoursPct ?? 25) / 100)).toFixed(2));
            }
          }
          // Estimated tolls based on actual or minimum miles
          const milesForTolls = routeInfo ? Math.max(routeInfo.distanceMiles, p.minMiles) : p.minMiles;
          const tolls = !isHourly ? (milesForTolls > 40 ? 32 : milesForTolls > 15 ? 20 : 12) : 0;
          return { ...next, baseAmount: String(base), mileageAmount: String(mileage), surchargesAmount: String(surcharges), tollsAmount: String(tolls), totalAmount: "" };
        }
      }
      return next;
    });
  };

  const computedTotal = () => {
    const base = parseFloat(String(createForm.baseAmount)) || 0;
    const mileage = parseFloat(String(createForm.mileageAmount)) || 0;
    const surcharges = parseFloat(String(createForm.surchargesAmount)) || 0;
    const tolls = parseFloat(String(createForm.tollsAmount)) || 0;
    const discount = parseFloat(String(createForm.promoDiscount)) || 0;
    return Math.max(0, base + mileage + surcharges + tolls - discount);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError("");
    try {
      const payload: Record<string, any> = {
        service: createForm.service,
        pickupAddress: createForm.pickupAddress,
        pickupLat: createForm.pickupLat ?? null,
        pickupLon: createForm.pickupLon ?? null,
        dropoffAddress: createForm.dropoffAddress || null,
        dropoffLat: createForm.dropoffLat ?? null,
        dropoffLon: createForm.dropoffLon ?? null,
        date: createForm.date,
        time: createForm.time,
        passengers: Number(createForm.passengers),
        bags: Number(createForm.bags),
        hours: createForm.hours ? Number(createForm.hours) : null,
        vehicleType: createForm.vehicleType || null,
        flightNumber: createForm.flightNumber || null,
        flightType: createForm.flightType || null,
        passengerName: createForm.passengerName,
        passengerPhone: createForm.passengerPhone,
        passengerEmail: createForm.passengerEmail,
        notes: createForm.notes || null,
        meetAndGreet: createForm.meetAndGreet,
        childSeat: createForm.childSeat,
        baseAmount: parseFloat(String(createForm.baseAmount)) || 0,
        mileageAmount: parseFloat(String(createForm.mileageAmount)) || 0,
        surchargesAmount: parseFloat(String(createForm.surchargesAmount)) || 0,
        tollsAmount: parseFloat(String(createForm.tollsAmount)) || 0,
        totalAmount: createForm.totalAmount !== "" ? parseFloat(String(createForm.totalAmount)) : computedTotal(),
        promoCode: createForm.promoCode || null,
        promoDiscount: parseFloat(String(createForm.promoDiscount)) || 0,
        status: createForm.status,
        driverId: createForm.driverId !== "" ? Number(createForm.driverId) : null,
        distanceMiles: routeInfo?.distanceMiles ?? null,
      };
      const created = await adminApi.bookings.create(payload);
      setBookings(prev => [created, ...prev]);
      setShowCreate(false);
      setCreateForm(EMPTY_FORM);
      setRouteInfo(null);
    } catch (e: any) {
      setCreateError(e?.message ?? "Failed to create booking. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="font-black text-xl uppercase tracking-tight text-white">Bookings</h2>
            <p className="text-white/25 text-xs">{filtered.length} results</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { setShowCreate(true); setCreateError(""); setCreateForm(EMPTY_FORM); setRouteInfo(null); }}
              className="flex items-center gap-2 px-3 py-2 text-[10px] font-bold tracking-widest uppercase text-black"
              style={{ background: YELLOW }}>
              <Plus className="w-3.5 h-3.5" /> New Booking
            </button>
            <button onClick={exportCSV}
              className="flex items-center gap-2 px-3 py-2 border border-white/[0.07] text-white/30 hover:text-white hover:border-white/30 transition-colors text-[10px] font-bold tracking-widest uppercase">
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <div className="flex items-center gap-2 bg-[#111] border border-white/[0.07] px-3 py-2 flex-1 min-w-[180px]">
            <Search className="w-3.5 h-3.5 text-white/20 shrink-0" />
            <input className="bg-transparent text-sm text-white placeholder-white/20 outline-none flex-1"
              placeholder="Search passenger, code, phone…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex gap-1 flex-wrap">
            {STATUS_OPTIONS.map(opt => (
              <button key={opt.value} onClick={() => setStatusFilter(opt.value)}
                className={`px-3 py-2 text-[10px] font-bold tracking-widest uppercase border transition-colors ${statusFilter === opt.value ? "border-[#C9A84C] text-[#C9A84C] bg-[#C9A84C]/5" : "border-white/[0.07] text-white/30 hover:border-white/20"}`}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Today's Trips Banner ───────────────────────────────────────────── */}
        {!loading && todayActiveTrips.length > 0 && (
          <div className="border border-[#C9A84C]/25 bg-[#C9A84C]/5 px-4 py-3 flex items-center gap-3 flex-wrap">
            <CalendarDays className="w-4 h-4 text-[#C9A84C] shrink-0" />
            <div className="flex-1">
              <span className="text-[#C9A84C] text-xs font-bold uppercase tracking-widest">
                {todayActiveTrips.length} viaje{todayActiveTrips.length !== 1 ? "s" : ""} programado{todayActiveTrips.length !== 1 ? "s" : ""} para hoy
              </span>
              {upcomingSoon.length > 0 && (
                <span className="ml-3 text-[10px] text-white/50">
                  · {upcomingSoon.length} comienza{upcomingSoon.length !== 1 ? "n" : ""} en las próximas 2 horas
                </span>
              )}
            </div>
            <div className="flex gap-2 flex-wrap">
              {todayActiveTrips.slice(0, 3).map(b => {
                const mins = minutesUntilTrip(b.date, b.time);
                return (
                  <div key={b.id} className="flex items-center gap-1.5 bg-black/30 border border-white/[0.06] px-2.5 py-1">
                    <Clock className="w-3 h-3 text-white/30" />
                    <span className="text-[11px] text-white/60 font-mono">{b.time ?? "—"}</span>
                    <span className="text-[11px] text-white/40">{b.passengerName?.split(" ")[0]}</span>
                    {mins !== null && mins >= 0 && mins <= 120 && (
                      <span className="text-[10px] font-bold text-amber-400 ml-1">{mins}m</span>
                    )}
                    <button onClick={() => setReminder(b)} title="Poner recordatorio"
                      className="ml-1 text-[#C9A84C]/50 hover:text-[#C9A84C] transition-colors">
                      <Bell className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
              {todayActiveTrips.length > 3 && (
                <span className="text-[11px] text-white/30 self-center">+{todayActiveTrips.length - 3} más</span>
              )}
            </div>
          </div>
        )}

        <div className="bg-[#0f0f0f] border border-white/[0.06] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.04]">
                  {["Code", "Passenger", "Phone", "Service", "Pickup", "Date / Time", "Vehicle", "Driver", "Total", "Status", "Actions"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[10px] font-bold tracking-widest uppercase text-white/20 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={11} className="text-center py-10"><Loader2 className="w-5 h-5 animate-spin text-white/20 mx-auto" /></td></tr>
                ) : sorted.length === 0 ? (
                  <tr><td colSpan={11} className="text-center py-10 text-white/20 text-xs">No bookings found</td></tr>
                ) : dateGroups.map(group => (
                  <>
                    {/* Date section header */}
                    <tr key={`hdr-${group.key}`} className={group.isToday ? "border-b border-[#C9A84C]/20" : "border-b border-white/[0.04]"}>
                      <td colSpan={11} className={`px-4 py-2 ${group.isToday ? "bg-[#C9A84C]/8" : group.key === "__archive__" ? "bg-white/[0.015]" : "bg-white/[0.02]"}`}>
                        <div className="flex items-center gap-2">
                          {group.isToday
                            ? <CalendarDays className="w-3 h-3 text-[#C9A84C]" />
                            : group.key === "__archive__"
                            ? <CheckCircle className="w-3 h-3 text-white/20" />
                            : <Clock className="w-3 h-3 text-white/25" />
                          }
                          <span className={`text-[10px] font-black uppercase tracking-widest ${group.isToday ? "text-[#C9A84C]" : group.key === "__archive__" ? "text-white/20" : "text-white/30"}`}>
                            {group.label}
                          </span>
                          <span className={`text-[9px] font-bold ml-1 ${group.isToday ? "text-[#C9A84C]/50" : "text-white/15"}`}>
                            — {group.items.length} viaje{group.items.length !== 1 ? "s" : ""}
                          </span>
                        </div>
                      </td>
                    </tr>
                    {/* Booking rows for this group */}
                    {group.items.map(b => {
                      const driver = drivers.find(d => d.id === b.driverId);
                      const mins = minutesUntilTrip(b.date, b.time);
                      const isSoon = mins !== null && mins >= 0 && mins <= 60;
                      return (
                        <tr key={b.id}
                          className={`border-b border-white/[0.03] hover:bg-white/[0.02] cursor-pointer ${isSoon ? "bg-amber-400/[0.03]" : ""}`}
                          onClick={() => openDetail(b)}>
                          <td className="px-4 py-3 font-mono text-[11px] text-[#C9A84C] whitespace-nowrap">{b.confirmationCode}</td>
                          <td className="px-4 py-3 text-xs text-white font-medium whitespace-nowrap">
                            {b.passengerName}
                            {isSoon && <span className="ml-1.5 text-[9px] font-bold text-amber-400 bg-amber-400/10 px-1 py-0.5">en {mins}m</span>}
                          </td>
                          <td className="px-4 py-3 text-xs text-white/40 whitespace-nowrap">{b.passengerPhone}</td>
                          <td className="px-4 py-3 text-xs text-white/50 capitalize whitespace-nowrap">{b.service}</td>
                          <td className="px-4 py-3 text-xs text-white/40 max-w-[140px] truncate">{b.pickupAddress}</td>
                          <td className="px-4 py-3 text-xs whitespace-nowrap">
                            <span className={group.isToday ? "text-[#C9A84C]/80 font-bold" : "text-white/50"}>{b.date}</span>
                            <span className="text-white/30 ml-1">{b.time}</span>
                          </td>
                          <td className="px-4 py-3 text-xs text-white/50 capitalize whitespace-nowrap">{b.vehicleType ?? "—"}</td>
                          <td className="px-4 py-3 text-xs text-white/50 whitespace-nowrap">{driver?.name ?? "—"}</td>
                          <td className="px-4 py-3 text-xs font-bold text-white whitespace-nowrap">${(b.totalAmount ?? 0).toFixed(0)}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-1 border ${STATUS_COLORS[b.status] ?? "text-white/30 border-white/10"}`}>
                              {STATUS_LABELS[b.status] ?? b.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                            <div className="flex gap-1">
                              {isActiveStatus(b.status) && (
                                <button onClick={() => setReminder(b)} title="Poner recordatorio"
                                  className="p-1.5 border border-[#C9A84C]/15 text-[#C9A84C]/40 hover:text-[#C9A84C] hover:border-[#C9A84C]/40 transition-colors">
                                  <Bell className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {b.status === "pending" && (
                                <button onClick={() => quickUpdateStatus(b.id, "confirmed")} title="Confirm"
                                  className="p-1.5 border border-green-400/20 text-green-400 hover:bg-green-400/10 transition-colors">
                                  <CheckCircle className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {["pending", "confirmed", "assigned"].includes(b.status) && (
                                <button onClick={() => quickUpdateStatus(b.id, "cancelled")} title="Cancel"
                                  className="p-1.5 border border-red-400/20 text-red-400 hover:bg-red-400/10 transition-colors">
                                  <XCircle className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {b.status === "assigned" && (
                                <button onClick={() => quickUpdateStatus(b.id, "in_progress")} title="Start trip"
                                  className="p-1.5 border border-blue-400/20 text-blue-400 hover:bg-blue-400/10 transition-colors">
                                  <Car className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {b.status === "in_progress" && (
                                <button onClick={() => quickUpdateStatus(b.id, "completed")} title="Complete"
                                  className="p-1.5 border border-white/10 text-white/40 hover:bg-white/5 transition-colors">
                                  <CheckCircle className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Create Booking Modal ─────────────────────────────────────────── */}
      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/85 z-50 flex items-start justify-center p-4 overflow-y-auto"
            onClick={e => { if (e.target === e.currentTarget) setShowCreate(false); }}>
            <motion.div initial={{ opacity: 0, scale: 0.97, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
              className="w-full max-w-2xl bg-[#0a0a0a] border border-white/[0.07] my-6">
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
                <div>
                  <h3 className="font-black text-sm uppercase tracking-widest text-white">New Booking</h3>
                  <p className="text-white/30 text-xs mt-0.5">Create a reservation on behalf of a passenger</p>
                </div>
                <button onClick={() => setShowCreate(false)} className="text-white/30 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreate} className="p-5 space-y-5">
                {/* Passenger Info */}
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-white/20 font-bold mb-3 border-b border-white/[0.04] pb-2">Passenger Information</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Field label="Full Name *">
                      <input required className={inputCls} placeholder="John Smith"
                        value={createForm.passengerName} onChange={e => setField("passengerName", e.target.value)} />
                    </Field>
                    <Field label="Phone *">
                      <input required className={inputCls} placeholder="+1 (555) 000-0000"
                        value={createForm.passengerPhone} onChange={e => setField("passengerPhone", e.target.value)} />
                    </Field>
                    <Field label="Email *">
                      <input required type="email" className={inputCls} placeholder="passenger@email.com"
                        value={createForm.passengerEmail} onChange={e => setField("passengerEmail", e.target.value)} />
                    </Field>
                  </div>
                </div>

                {/* Trip Details */}
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-white/20 font-bold mb-3 border-b border-white/[0.04] pb-2">Trip Details</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                    <Field label="Service *">
                      <select required className={selectCls} style={{ colorScheme: "dark" }}
                        value={createForm.service} onChange={e => setField("service", e.target.value)}>
                        {SERVICE_TYPES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                      </select>
                    </Field>
                    <Field label="Date *">
                      <input required type="date" className={inputCls} style={{ colorScheme: "dark" }}
                        value={createForm.date} onChange={e => setField("date", e.target.value)} />
                    </Field>
                    <Field label="Time *">
                      <input required type="time" className={inputCls} style={{ colorScheme: "dark" }}
                        value={createForm.time} onChange={e => setField("time", e.target.value)} />
                    </Field>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                    <Field label="Pickup Address *">
                      <PlacesInput required className={inputCls} placeholder="123 Main St, Newark NJ"
                        value={createForm.pickupAddress}
                        onChange={v => setCreateForm(prev => ({ ...prev, pickupAddress: v, pickupLat: null, pickupLon: null }))}
                        onPlaceSelect={p => setCreateForm(prev => ({ ...prev, pickupAddress: p.address, pickupLat: p.lat, pickupLon: p.lon }))}
                      />
                    </Field>
                    <Field label="Drop-off Address">
                      <PlacesInput className={inputCls} placeholder="EWR Airport — Terminal A"
                        value={createForm.dropoffAddress}
                        onChange={v => setCreateForm(prev => ({ ...prev, dropoffAddress: v, dropoffLat: null, dropoffLon: null }))}
                        onPlaceSelect={p => setCreateForm(prev => ({ ...prev, dropoffAddress: p.address, dropoffLat: p.lat, dropoffLon: p.lon }))}
                      />
                    </Field>
                  </div>
                  {/* Route info badge */}
                  {(routeLoading || routeInfo) && createForm.service !== "hourly" && (
                    <div className="flex items-center gap-4 px-3 py-2 bg-[#C9A84C]/5 border border-[#C9A84C]/15 mb-3">
                      {routeLoading ? (
                        <div className="flex items-center gap-2 text-[10px] text-white/40 font-bold uppercase tracking-widest">
                          <Loader2 className="w-3 h-3 animate-spin" /> Calculating route…
                        </div>
                      ) : routeInfo ? (
                        <>
                          <Navigation2 className="w-3.5 h-3.5 text-[#C9A84C]/60 shrink-0" />
                          <div className="text-center">
                            <p className="font-black text-sm text-[#C9A84C] leading-none">{routeInfo.distanceMiles.toFixed(1)}</p>
                            <p className="text-[9px] text-white/30 uppercase tracking-widest font-bold">miles</p>
                          </div>
                          <div className="w-px h-5 bg-white/10" />
                          <div className="text-center">
                            <p className="font-black text-sm text-white leading-none">{routeInfo.durationMin}</p>
                            <p className="text-[9px] text-white/30 uppercase tracking-widest font-bold">min</p>
                          </div>
                          <p className="text-[10px] text-white/25 ml-1">Mileage y peajes actualizados con distancia real</p>
                        </>
                      ) : null}
                    </div>
                  )}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <Field label="Vehicle">
                      <select className={selectCls} style={{ colorScheme: "dark" }}
                        value={createForm.vehicleType} onChange={e => setField("vehicleType", e.target.value)}>
                        {VEHICLE_TYPES.map(v => <option key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</option>)}
                      </select>
                    </Field>
                    <Field label="Passengers">
                      <input type="number" min={1} max={20} className={inputCls}
                        value={createForm.passengers} onChange={e => setField("passengers", e.target.value)} />
                    </Field>
                    <Field label="Bags">
                      <input type="number" min={0} max={20} className={inputCls}
                        value={createForm.bags} onChange={e => setField("bags", e.target.value)} />
                    </Field>
                    <Field label="Hours (if hourly)">
                      <input type="number" min={1} className={inputCls} placeholder="—"
                        value={createForm.hours} onChange={e => setField("hours", e.target.value)} />
                    </Field>
                  </div>
                </div>

                {/* Flight Info */}
                {createForm.service === "airport" && (
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-white/20 font-bold mb-3 border-b border-white/[0.04] pb-2">Flight Information</p>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Flight Number">
                        <input className={inputCls} placeholder="AA 1234"
                          value={createForm.flightNumber} onChange={e => setField("flightNumber", e.target.value)} />
                      </Field>
                      <Field label="Flight Type">
                        <select className={selectCls} style={{ colorScheme: "dark" }}
                          value={createForm.flightType} onChange={e => setField("flightType", e.target.value)}>
                          <option value="">—</option>
                          {FLIGHT_TYPES.map(f => <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>)}
                        </select>
                      </Field>
                    </div>
                  </div>
                )}

                {/* Pricing */}
                <div>
                  <div className="flex items-center justify-between mb-3 border-b border-white/[0.04] pb-2">
                    <p className="text-[10px] uppercase tracking-widest text-white/20 font-bold">Pricing</p>
                    {pricing.length > 0 && (
                      <button
                        type="button"
                        onClick={() => autoFillPrice(createForm.vehicleType, createForm.service, createForm.hours, createForm)}
                        className="flex items-center gap-1.5 px-2.5 py-1 text-[9px] font-bold tracking-widest uppercase border border-[#C9A84C]/30 text-[#C9A84C]/70 hover:text-[#C9A84C] hover:border-[#C9A84C]/60 transition-colors"
                      >
                        <Zap className="w-3 h-3" /> Auto-fill Price
                      </button>
                    )}
                  </div>
                  {pricing.length > 0 && createForm.vehicleType && (
                    <div className="mb-3 px-3 py-2 bg-[#C9A84C]/5 border border-[#C9A84C]/10 text-[10px] text-[#C9A84C]/60">
                      {(() => {
                        const p = pricing.find((row: any) => row.vehicleType === createForm.vehicleType);
                        if (!p) return null;
                        return createForm.service === "hourly"
                          ? `Hourly rate: $${p.hourlyRate}/hr · Price updates automatically with hours`
                          : `Base: $${p.baseRate} · Min. mileage: ${p.minMiles} mi × $${p.perMile}/mi`;
                      })()}
                    </div>
                  )}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                    <Field label="Base ($)">
                      <input type="number" min={0} step="0.01" className={inputCls} placeholder="0.00"
                        value={createForm.baseAmount} onChange={e => setField("baseAmount", e.target.value)} />
                    </Field>
                    <Field label="Mileage ($)">
                      <input type="number" min={0} step="0.01" className={inputCls} placeholder="0.00"
                        value={createForm.mileageAmount} onChange={e => setField("mileageAmount", e.target.value)} />
                    </Field>
                    <Field label="Surcharges ($)">
                      <input type="number" min={0} step="0.01" className={inputCls} placeholder="0.00"
                        value={createForm.surchargesAmount} onChange={e => setField("surchargesAmount", e.target.value)} />
                    </Field>
                    <Field label="Tolls ($)">
                      <input type="number" min={0} step="0.01" className={inputCls} placeholder="0.00"
                        value={createForm.tollsAmount} onChange={e => setField("tollsAmount", e.target.value)} />
                    </Field>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <Field label="Promo Code">
                      <input className={inputCls} placeholder="LUXVIP"
                        value={createForm.promoCode} onChange={e => setField("promoCode", e.target.value)} />
                    </Field>
                    <Field label="Promo Discount ($)">
                      <input type="number" min={0} step="0.01" className={inputCls} placeholder="0.00"
                        value={createForm.promoDiscount} onChange={e => setField("promoDiscount", e.target.value)} />
                    </Field>
                    <Field label="Total Override ($)">
                      <input type="number" min={0} step="0.01" className={inputCls}
                        placeholder={`Auto: $${computedTotal().toFixed(2)}`}
                        value={createForm.totalAmount} onChange={e => setField("totalAmount", e.target.value)} />
                    </Field>
                  </div>
                  <p className="text-[10px] text-white/20 mt-1.5">
                    Calculated total: <span className="text-[#C9A84C] font-bold">${computedTotal().toFixed(2)}</span>
                    {" "}(leave Total Override blank to use this)
                  </p>
                </div>

                {/* Assignment */}
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-white/20 font-bold mb-3 border-b border-white/[0.04] pb-2">Assignment & Status</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="Assign Driver">
                      <select className={selectCls} style={{ colorScheme: "dark" }}
                        value={createForm.driverId} onChange={e => setField("driverId", e.target.value)}>
                        <option value="">No driver assigned</option>
                        {drivers.map(d => (
                          <option key={d.id} value={String(d.id)}>
                            {d.name}{d.status === "off_duty" ? " (Off Duty)" : d.status === "on_trip" ? " (On Trip)" : ""}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Initial Status">
                      <select className={selectCls} style={{ colorScheme: "dark" }}
                        value={createForm.status} onChange={e => setField("status", e.target.value)}>
                        {["pending", "confirmed", "assigned"].map(s => (
                          <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                        ))}
                      </select>
                    </Field>
                  </div>
                </div>

                {/* Add-ons & Notes */}
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-white/20 font-bold mb-3 border-b border-white/[0.04] pb-2">Add-ons & Notes</p>
                  <div className="flex gap-5 mb-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="accent-[#C9A84C]"
                        checked={createForm.meetAndGreet} onChange={e => setField("meetAndGreet", e.target.checked)} />
                      <span className="text-xs text-white/60">Meet & Greet</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="accent-[#C9A84C]"
                        checked={createForm.childSeat} onChange={e => setField("childSeat", e.target.checked)} />
                      <span className="text-xs text-white/60">Child Seat</span>
                    </label>
                  </div>
                  <Field label="Notes / Special Instructions">
                    <textarea rows={2} className={inputCls + " resize-none"} placeholder="Any special instructions…"
                      value={createForm.notes} onChange={e => setField("notes", e.target.value)} />
                  </Field>
                </div>

                {createError && (
                  <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 px-3 py-2">{createError}</p>
                )}

                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => setShowCreate(false)}
                    className="flex-1 py-3 text-[11px] font-black tracking-widest uppercase border border-white/10 text-white/40 hover:text-white hover:border-white/30 transition-colors">
                    Cancel
                  </button>
                  <button type="submit" disabled={creating}
                    className="flex-1 py-3 text-[11px] font-black tracking-widest uppercase text-black flex items-center justify-center gap-2 disabled:opacity-60"
                    style={{ background: YELLOW }}>
                    {creating ? <><Loader2 className="w-4 h-4 animate-spin" />Creating…</> : "Create Booking"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Detail / Edit Modal ──────────────────────────────────────────── */}
      <AnimatePresence>
        {selected && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
            onClick={e => { if (e.target === e.currentTarget) setSelected(null); }}>
            <motion.div initial={{ opacity: 0, scale: 0.97, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
              className="w-full max-w-xl bg-[#0a0a0a] border border-white/[0.07] max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
                <div>
                  <span className="font-mono text-sm font-bold text-[#C9A84C]">{selected.confirmationCode}</span>
                  <p className="text-white/30 text-xs mt-0.5">{selected.passengerName}</p>
                </div>
                <button onClick={() => setSelected(null)} className="text-white/30 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-5">

                {/* Passenger Information */}
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-white/20 font-bold mb-3 border-b border-white/[0.04] pb-2">Passenger Information</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Field label="Full Name *">
                      <input required className={inputCls} placeholder="John Smith"
                        value={editPassengerName} onChange={e => setEditPassengerName(e.target.value)} />
                    </Field>
                    <Field label="Phone *">
                      <input required className={inputCls} placeholder="+1 (555) 000-0000"
                        value={editPassengerPhone} onChange={e => setEditPassengerPhone(e.target.value)} />
                    </Field>
                    <Field label="Email *">
                      <input required type="email" className={inputCls} placeholder="passenger@email.com"
                        value={editPassengerEmail} onChange={e => setEditPassengerEmail(e.target.value)} />
                    </Field>
                  </div>
                </div>

                {/* Trip Details */}
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-white/20 font-bold mb-3 border-b border-white/[0.04] pb-2">Trip Details</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                    <Field label="Service *">
                      <select required className={selectCls} style={{ colorScheme: "dark" }}
                        value={editService} onChange={e => setEditService(e.target.value)}>
                        {SERVICE_TYPES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                      </select>
                    </Field>
                    <Field label="Date *">
                      <input required type="date" className={inputCls} style={{ colorScheme: "dark" }}
                        value={editDate} onChange={e => setEditDate(e.target.value)} />
                    </Field>
                    <Field label="Time *">
                      <input required type="time" className={inputCls} style={{ colorScheme: "dark" }}
                        value={editTime} onChange={e => setEditTime(e.target.value)} />
                    </Field>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                    <Field label="Pickup Address *">
                      <PlacesInput required className={inputCls} placeholder="123 Main St, Newark NJ"
                        value={editPickupAddress}
                        onChange={v => setEditPickupAddress(v)}
                      />
                    </Field>
                    <Field label="Drop-off Address">
                      <PlacesInput className={inputCls} placeholder="EWR Airport — Terminal A"
                        value={editDropoffAddress}
                        onChange={v => setEditDropoffAddress(v)}
                      />
                    </Field>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <Field label="Vehicle">
                      <select className={selectCls} style={{ colorScheme: "dark" }}
                        value={editVehicleType} onChange={e => setEditVehicleType(e.target.value)}>
                        {VEHICLE_TYPES.map(v => <option key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</option>)}
                      </select>
                    </Field>
                    <Field label="Passengers">
                      <input type="number" min={1} max={20} className={inputCls}
                        value={editPassengers} onChange={e => setEditPassengers(Number(e.target.value))} />
                    </Field>
                    <Field label="Bags">
                      <input type="number" min={0} max={20} className={inputCls}
                        value={editBags} onChange={e => setEditBags(Number(e.target.value))} />
                    </Field>
                    <Field label="Hours (hourly)">
                      <input type="number" min={1} className={inputCls} placeholder="—"
                        value={editHours} onChange={e => setEditHours(e.target.value)} />
                    </Field>
                  </div>
                </div>

                {/* Flight Info */}
                {editService === "airport" && (
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-white/20 font-bold mb-3 border-b border-white/[0.04] pb-2">Flight Information</p>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Flight Number">
                        <input className={inputCls} placeholder="AA 1234"
                          value={editFlightNumber} onChange={e => setEditFlightNumber(e.target.value)} />
                      </Field>
                      <Field label="Flight Type">
                        <select className={selectCls} style={{ colorScheme: "dark" }}
                          value={editFlightType} onChange={e => setEditFlightType(e.target.value)}>
                          <option value="">—</option>
                          {FLIGHT_TYPES.map(f => <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>)}
                        </select>
                      </Field>
                    </div>
                  </div>
                )}

                {/* Pricing */}
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-white/20 font-bold mb-3 border-b border-white/[0.04] pb-2">Pricing</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                    <Field label="Base ($)">
                      <input type="number" min={0} step="0.01" className={inputCls} placeholder="0.00"
                        value={editBaseAmount} onChange={e => setEditBaseAmount(e.target.value)} />
                    </Field>
                    <Field label="Mileage ($)">
                      <input type="number" min={0} step="0.01" className={inputCls} placeholder="0.00"
                        value={editMileageAmount} onChange={e => setEditMileageAmount(e.target.value)} />
                    </Field>
                    <Field label="Surcharges ($)">
                      <input type="number" min={0} step="0.01" className={inputCls} placeholder="0.00"
                        value={editSurchargesAmount} onChange={e => setEditSurchargesAmount(e.target.value)} />
                    </Field>
                    <Field label="Tolls ($)">
                      <input type="number" min={0} step="0.01" className={inputCls} placeholder="0.00"
                        value={editTollsAmount} onChange={e => setEditTollsAmount(e.target.value)} />
                    </Field>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <Field label="Promo Code">
                      <input className={inputCls} placeholder="LUXVIP"
                        value={editPromoCode} onChange={e => setEditPromoCode(e.target.value)} />
                    </Field>
                    <Field label="Promo Discount ($)">
                      <input type="number" min={0} step="0.01" className={inputCls} placeholder="0.00"
                        value={editPromoDiscount} onChange={e => setEditPromoDiscount(e.target.value)} />
                    </Field>
                  </div>
                </div>

                {/* Add-ons & Notes */}
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-white/20 font-bold mb-3 border-b border-white/[0.04] pb-2">Add-ons & Passenger Notes</p>
                  <div className="flex gap-5 mb-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="accent-[#C9A84C]"
                        checked={editMeetAndGreet} onChange={e => setEditMeetAndGreet(e.target.checked)} />
                      <span className="text-xs text-white/60">Meet &amp; Greet</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="accent-[#C9A84C]"
                        checked={editChildSeat} onChange={e => setEditChildSeat(e.target.checked)} />
                      <span className="text-xs text-white/60">Child Seat</span>
                    </label>
                  </div>
                  <Field label="Passenger Notes">
                    <textarea rows={2} className={inputCls + " resize-none"} placeholder="Special instructions from passenger…"
                      value={editNotes} onChange={e => setEditNotes(e.target.value)} />
                  </Field>
                </div>

                <div className="border-t border-white/[0.05] pt-4 space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold tracking-widest uppercase text-white/20 mb-2">Status</label>
                    <div className="flex gap-1.5 flex-wrap">
                      {["pending","confirmed","assigned","in_progress","completed","cancelled"].map(s => (
                        <button key={s} onClick={() => setSelectedStatus(s)} disabled={saving}
                          className={`px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider border transition-colors disabled:opacity-50 ${selectedStatus === s ? STATUS_COLORS[s] : "border-white/[0.07] text-white/20 hover:border-white/20"}`}>
                          {STATUS_LABELS[s]}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold tracking-widest uppercase text-white/20 mb-2">Assign Driver</label>
                    <select
                      value={driverAssign}
                      onChange={e => handleDriverChange(e.target.value)}
                      className="w-full bg-[#111] border border-white/10 focus:border-[#C9A84C] text-sm text-white px-3 py-2.5 outline-none transition-colors"
                      style={{ colorScheme: "dark" }}
                    >
                      <option value="">No driver assigned</option>
                      {drivers.map(d => (
                        <option key={d.id} value={String(d.id)}>
                          {d.name}{d.status === "off_duty" ? " (Off Duty)" : d.status === "on_trip" ? " (On Trip)" : ""}
                        </option>
                      ))}
                    </select>
                    {drivers.length === 0 && (
                      <p className="text-[10px] text-white/30 mt-1">No drivers registered yet. Add drivers first.</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold tracking-widest uppercase text-white/20 mb-2">Override Price (USD)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-sm">$</span>
                      <input type="number" step="0.01" min="0" value={adminPrice}
                        onChange={e => setAdminPrice(e.target.value)}
                        className="w-full bg-[#111] border border-white/10 focus:border-[#C9A84C] text-sm text-white placeholder-white/20 pl-7 pr-3 py-2.5 outline-none transition-colors"
                        placeholder={selected?.totalAmount?.toFixed(2) ?? "0.00"} />
                    </div>
                    <p className="text-[10px] text-white/20 mt-1">Leave blank to keep original price. Current: {selected?.totalAmount?.toFixed(2) ?? "0.00"}</p>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold tracking-widest uppercase text-white/20 mb-2">Internal Notes</label>
                    <textarea rows={2} value={adminNotes} onChange={e => setAdminNotes(e.target.value)}
                      className="w-full bg-[#111] border border-white/10 focus:border-[#C9A84C] text-sm text-white placeholder-white/20 px-3 py-2.5 outline-none resize-none transition-colors"
                      placeholder="Instructions for the driver…" />
                  </div>

                  {saveError && <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 px-3 py-2">{saveError}</p>}

                  <button
                    type="button"
                    onClick={saveDetail}
                    disabled={saving}
                    className="w-full py-3 text-[11px] font-black tracking-widest uppercase text-black flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed transition-opacity"
                    style={{ background: YELLOW }}
                  >
                    {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</> : "Save Changes"}
                  </button>

                  <div className="border-t border-white/[0.05] pt-3">
                    <p className="text-[10px] uppercase tracking-widest text-white/20 mb-2 font-bold">Email</p>
                    {resendMsg && (
                      <p className={`text-xs px-3 py-2 mb-2 border ${resendMsg.ok ? "text-green-400 bg-green-400/10 border-green-400/20" : "text-red-400 bg-red-400/10 border-red-400/20"}`}>
                        {resendMsg.text}
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={handleResendConfirmation}
                      disabled={resending}
                      className="w-full py-2.5 text-[11px] font-bold tracking-widest uppercase border border-white/10 text-white/50 hover:text-white hover:border-white/30 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      {resending ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Sending…</> : <><Mail className="w-3.5 h-3.5" />Resend Confirmation Email</>}
                    </button>
                  </div>
                </div>

              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
}
