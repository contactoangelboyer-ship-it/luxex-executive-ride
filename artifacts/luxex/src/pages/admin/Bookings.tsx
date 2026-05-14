import { useEffect, useRef, useState } from "react";
import { useSearch } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Loader2, XCircle, Car, CheckCircle, Download, Plus } from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { adminApi } from "@/lib/adminApi";

const YELLOW = "#F2E147";

function PlacesInput({ value, onChange, required, placeholder, className }: {
  value: string; onChange: (val: string) => void;
  required?: boolean; placeholder?: string; className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const acRef = useRef<any>(null);

  useEffect(() => {
    const goog = (window as any).google;
    if (!goog?.maps?.places || !inputRef.current) return;
    acRef.current = new goog.maps.places.Autocomplete(inputRef.current, {
      componentRestrictions: { country: "us" },
      fields: ["formatted_address", "name"],
    });
    const listener = acRef.current.addListener("place_changed", () => {
      const place = acRef.current.getPlace();
      onChange(place.formatted_address ?? place.name ?? "");
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
  pending:     "text-[#F2E147] bg-[#F2E147]/10 border-[#F2E147]/20",
  confirmed:   "text-white/80 bg-white/10 border-white/20",
  assigned:    "text-[#F2E147]/80 bg-[#F2E147]/5 border-[#F2E147]/15",
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

const EMPTY_FORM = {
  service: "airport",
  pickupAddress: "",
  dropoffAddress: "",
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

const inputCls = "w-full bg-[#111] border border-white/10 focus:border-[#F2E147] text-sm text-white placeholder-white/20 px-3 py-2.5 outline-none transition-colors";
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
  const [selectedStatus, setSelectedStatus] = useState<string>("");

  // New booking modal state
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<typeof EMPTY_FORM>(EMPTY_FORM);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const load = () => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (statusFilter) params.status = statusFilter;
    Promise.all([adminApi.bookings.list(params), adminApi.drivers.list()])
      .then(([b, d]) => { setBookings(b); setDrivers(d); })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [statusFilter]);

  const filtered = bookings.filter(b => {
    if (!search) return true;
    const s = search.toLowerCase();
    return b.passengerName?.toLowerCase().includes(s) || b.confirmationCode?.toLowerCase().includes(s)
      || b.pickupAddress?.toLowerCase().includes(s) || b.passengerPhone?.includes(s);
  });

  const openDetail = (b: any) => {
    setSelected(b);
    setDriverAssign(b.driverId != null ? String(b.driverId) : "");
    setAdminNotes(b.adminNotes ?? "");
    setSelectedStatus(b.status);
    setSaveError("");
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
      };
      const updated = await adminApi.bookings.update(selected.id, payload);
      setBookings(prev => prev.map(b => b.id === selected.id ? updated : b));
      setSelected(updated);
      setDriverAssign(updated.driverId != null ? String(updated.driverId) : "");
      setAdminNotes(updated.adminNotes ?? "");
      setSelectedStatus(updated.status);
    } catch (e: any) { setSaveError(e?.message ?? "Error saving changes. Please try again."); } finally { setSaving(false); }
  };

  const setField = (key: keyof typeof EMPTY_FORM, value: any) => {
    setCreateForm(prev => ({ ...prev, [key]: value }));
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
        dropoffAddress: createForm.dropoffAddress || null,
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
      };
      const created = await adminApi.bookings.create(payload);
      setBookings(prev => [created, ...prev]);
      setShowCreate(false);
      setCreateForm(EMPTY_FORM);
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
            <button onClick={() => { setShowCreate(true); setCreateError(""); setCreateForm(EMPTY_FORM); }}
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
                className={`px-3 py-2 text-[10px] font-bold tracking-widest uppercase border transition-colors ${statusFilter === opt.value ? "border-[#F2E147] text-[#F2E147] bg-[#F2E147]/5" : "border-white/[0.07] text-white/30 hover:border-white/20"}`}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-[#0f0f0f] border border-white/[0.06] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.04]">
                  {["Code", "Passenger", "Phone", "Service", "Pickup", "Date", "Vehicle", "Driver", "Total", "Status", "Actions"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[10px] font-bold tracking-widest uppercase text-white/20 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={11} className="text-center py-10"><Loader2 className="w-5 h-5 animate-spin text-white/20 mx-auto" /></td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={11} className="text-center py-10 text-white/20 text-xs">No bookings found</td></tr>
                ) : filtered.map(b => {
                  const driver = drivers.find(d => d.id === b.driverId);
                  return (
                    <tr key={b.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] cursor-pointer" onClick={() => openDetail(b)}>
                      <td className="px-4 py-3 font-mono text-[11px] text-[#F2E147] whitespace-nowrap">{b.confirmationCode}</td>
                      <td className="px-4 py-3 text-xs text-white font-medium whitespace-nowrap">{b.passengerName}</td>
                      <td className="px-4 py-3 text-xs text-white/40 whitespace-nowrap">{b.passengerPhone}</td>
                      <td className="px-4 py-3 text-xs text-white/50 capitalize whitespace-nowrap">{b.service}</td>
                      <td className="px-4 py-3 text-xs text-white/40 max-w-[140px] truncate">{b.pickupAddress}</td>
                      <td className="px-4 py-3 text-xs text-white/50 whitespace-nowrap">{b.date} {b.time}</td>
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
                        value={createForm.pickupAddress} onChange={v => setField("pickupAddress", v)} />
                    </Field>
                    <Field label="Drop-off Address">
                      <PlacesInput className={inputCls} placeholder="EWR Airport — Terminal A"
                        value={createForm.dropoffAddress} onChange={v => setField("dropoffAddress", v)} />
                    </Field>
                  </div>
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
                  <p className="text-[10px] uppercase tracking-widest text-white/20 font-bold mb-3 border-b border-white/[0.04] pb-2">Pricing</p>
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
                    Calculated total: <span className="text-[#F2E147] font-bold">${computedTotal().toFixed(2)}</span>
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
                      <input type="checkbox" className="accent-[#F2E147]"
                        checked={createForm.meetAndGreet} onChange={e => setField("meetAndGreet", e.target.checked)} />
                      <span className="text-xs text-white/60">Meet & Greet</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="accent-[#F2E147]"
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
                  <span className="font-mono text-sm font-bold text-[#F2E147]">{selected.confirmationCode}</span>
                  <p className="text-white/30 text-xs mt-0.5">{selected.passengerName}</p>
                </div>
                <button onClick={() => setSelected(null)} className="text-white/30 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-5">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  {[
                    ["Service", selected.service],
                    ["Date", `${selected.date} ${selected.time}`],
                    ["Passengers", selected.passengers],
                    ["Bags", selected.bags],
                    ["Pickup", selected.pickupAddress],
                    ["Drop-off", selected.dropoffAddress ?? "—"],
                    ["Flight", selected.flightNumber ?? "—"],
                    ["Vehicle", selected.vehicleType ?? "—"],
                  ].map(([k, v]) => (
                    <div key={String(k)}>
                      <p className="text-[10px] uppercase tracking-widest text-white/20 mb-1 font-bold">{k}</p>
                      <p className="text-white/70">{v}</p>
                    </div>
                  ))}
                </div>

                <div className="border-t border-white/[0.05] pt-4 grid grid-cols-2 gap-3 text-xs">
                  <div><p className="text-[10px] uppercase tracking-widest text-white/20 mb-1 font-bold">Phone</p><p className="text-white/70">{selected.passengerPhone}</p></div>
                  <div><p className="text-[10px] uppercase tracking-widest text-white/20 mb-1 font-bold">Email</p><p className="text-white/70">{selected.passengerEmail}</p></div>
                </div>

                <div className="border-t border-white/[0.05] pt-4">
                  <p className="text-[10px] uppercase tracking-widest text-white/20 mb-2 font-bold">Price Breakdown</p>
                  <div className="space-y-1 text-xs">
                    {selected.baseAmount > 0 && <div className="flex justify-between"><span className="text-white/40">Base</span><span className="text-white">${selected.baseAmount?.toFixed(2)}</span></div>}
                    {selected.mileageAmount > 0 && <div className="flex justify-between"><span className="text-white/40">Mileage</span><span className="text-white">${selected.mileageAmount?.toFixed(2)}</span></div>}
                    {selected.surchargesAmount > 0 && <div className="flex justify-between"><span className="text-white/40">Surcharges</span><span className="text-white">${selected.surchargesAmount?.toFixed(2)}</span></div>}
                    {selected.tollsAmount > 0 && <div className="flex justify-between"><span className="text-white/40">Tolls</span><span className="text-white">${selected.tollsAmount?.toFixed(2)}</span></div>}
                    <div className="flex justify-between border-t border-white/[0.05] pt-2 font-bold">
                      <span className="text-white/60">Total</span>
                      <span className="text-[#F2E147] text-sm">${selected.totalAmount?.toFixed(2)}</span>
                    </div>
                  </div>
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
                      className="w-full bg-[#111] border border-white/10 focus:border-[#F2E147] text-sm text-white px-3 py-2.5 outline-none transition-colors"
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
                    <label className="block text-[10px] font-bold tracking-widest uppercase text-white/20 mb-2">Internal Notes</label>
                    <textarea rows={2} value={adminNotes} onChange={e => setAdminNotes(e.target.value)}
                      className="w-full bg-[#111] border border-white/10 focus:border-[#F2E147] text-sm text-white placeholder-white/20 px-3 py-2.5 outline-none resize-none transition-colors"
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
                </div>

                {selected.notes && (
                  <div className="border-t border-white/[0.05] pt-4">
                    <p className="text-[10px] uppercase tracking-widest text-white/20 mb-1 font-bold">Passenger Notes</p>
                    <p className="text-xs text-white/50 italic">{selected.notes}</p>
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
