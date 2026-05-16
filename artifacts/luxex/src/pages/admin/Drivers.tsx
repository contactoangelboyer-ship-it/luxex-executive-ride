import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Edit2, Trash2, X, Loader2, Star, Key, RefreshCw, Eye, EyeOff, Copy, Check, ShieldCheck, ShieldX, ShieldAlert } from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { adminApi } from "@/lib/adminApi";

const YELLOW = "#F2E147";

const STATUS_COLORS: Record<string, string> = {
  available: "text-[#F2E147] bg-[#F2E147]/10 border-[#F2E147]/20",
  on_trip:   "text-white/80 bg-white/10 border-white/20",
  off_duty:  "text-white/25 bg-white/[0.03] border-white/[0.06]",
};

const VERIFY_COLORS: Record<string, string> = {
  verified: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  pending:  "text-amber-400 bg-amber-400/10 border-amber-400/20",
  rejected: "text-red-400 bg-red-400/10 border-red-400/20",
};

const VERIFY_ICONS: Record<string, React.ReactNode> = {
  verified: <ShieldCheck className="w-3 h-3" />,
  pending:  <ShieldAlert className="w-3 h-3" />,
  rejected: <ShieldX className="w-3 h-3" />,
};

const EMPTY = {
  name: "", phone: "", email: "", licenseNumber: "",
  vehicleId: null as number | null, status: "available", notes: "",
};

type ModalType = "add" | "edit" | "pin" | null;

export default function Drivers() {
  const [drivers, setDrivers]     = useState<any[]>([]);
  const [vehicles, setVehicles]   = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [modal, setModal]         = useState<ModalType>(null);
  const [form, setForm]           = useState<typeof EMPTY>({ ...EMPTY });
  const [editId, setEditId]       = useState<number | null>(null);
  const [saving, setSaving]       = useState(false);
  const [saveError, setSaveError] = useState("");

  const [pinDriver, setPinDriver]       = useState<any | null>(null);
  const [pinVisible, setPinVisible]     = useState(false);
  const [customPin, setCustomPin]       = useState("");
  const [pinSaving, setPinSaving]       = useState(false);
  const [pinError, setPinError]         = useState("");
  const [copied, setCopied]             = useState(false);
  const [verifyBusy, setVerifyBusy]     = useState<number | null>(null);

  const load = () => {
    Promise.all([adminApi.drivers.list(), adminApi.vehicles.list()])
      .then(([d, v]) => { setDrivers(d); setVehicles(v); })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setForm({ ...EMPTY }); setEditId(null); setSaveError(""); setModal("add");
  };

  const openEdit = (d: any) => {
    setForm({
      name: d.name, phone: d.phone, email: d.email ?? "",
      licenseNumber: d.licenseNumber ?? "", vehicleId: d.vehicleId ?? null,
      status: d.status, notes: d.notes ?? "",
    });
    setEditId(d.id); setSaveError(""); setModal("edit");
  };

  const openPin = (d: any) => {
    setPinDriver(d); setCustomPin(""); setPinError(""); setPinVisible(false); setCopied(false); setModal("pin");
  };

  const save = async () => {
    if (!form.name.trim()) { setSaveError("Full name is required."); return; }
    if (!form.phone.trim()) { setSaveError("Phone number is required."); return; }
    setSaving(true); setSaveError("");
    try {
      const payload = {
        name: form.name.trim(), phone: form.phone.trim(),
        email: form.email.trim() || null, licenseNumber: form.licenseNumber.trim() || null,
        vehicleId: form.vehicleId ?? null, status: form.status, notes: form.notes.trim() || null,
      };
      if (modal === "add") {
        const created = await adminApi.drivers.create(payload);
        setDrivers(prev => [created, ...prev]);
      } else if (editId !== null) {
        const updated = await adminApi.drivers.update(editId, payload);
        setDrivers(prev => prev.map(d => d.id === editId ? updated : d));
      }
      setModal(null);
    } catch (e: any) {
      setSaveError(e?.message ?? "Error saving driver.");
    } finally { setSaving(false); }
  };

  const del = async (id: number) => {
    if (!confirm("Delete this driver?")) return;
    try {
      await adminApi.drivers.delete(id);
      setDrivers(prev => prev.filter(d => d.id !== id));
    } catch { alert("Failed to delete driver."); }
  };

  const generatePin = async () => {
    if (!pinDriver) return;
    setPinSaving(true); setPinError("");
    try {
      const res = await adminApi.drivers.generatePin(pinDriver.id);
      const updated = res.driver;
      setPinDriver(updated);
      setDrivers(prev => prev.map(d => d.id === updated.id ? updated : d));
      setPinVisible(true);
    } catch (e: any) {
      setPinError(e?.message ?? "Failed to generate PIN.");
    } finally { setPinSaving(false); }
  };

  const setCustomPinHandler = async () => {
    if (!pinDriver) return;
    if (!/^\d{4,10}$/.test(customPin)) { setPinError("PIN must be 4–10 digits."); return; }
    setPinSaving(true); setPinError("");
    try {
      const updated = await adminApi.drivers.setPin(pinDriver.id, customPin);
      setPinDriver(updated);
      setDrivers(prev => prev.map(d => d.id === updated.id ? updated : d));
      setCustomPin("");
      setPinVisible(true);
    } catch (e: any) {
      setPinError(e?.message ?? "Failed to set PIN.");
    } finally { setPinSaving(false); }
  };

  const copyPin = async () => {
    if (!pinDriver?.accessPin) return;
    await navigator.clipboard.writeText(pinDriver.accessPin);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleVerify = async (id: number, status: "verified" | "rejected" | "pending") => {
    setVerifyBusy(id);
    try {
      const updated = await adminApi.drivers.verify(id, status);
      setDrivers(prev => prev.map(d => d.id === updated.id ? updated : d));
      if (modal === "pin" && pinDriver?.id === id) setPinDriver(updated);
    } catch (e: any) {
      alert(e?.message ?? "Failed to update verification.");
    } finally { setVerifyBusy(null); }
  };

  const inp = (key: keyof typeof EMPTY, val: any) => setForm(prev => ({ ...prev, [key]: val }));

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-black text-xl uppercase tracking-tight text-white">Drivers</h2>
            <p className="text-white/25 text-xs">{drivers.length} registered</p>
          </div>
          <button type="button" onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2.5 text-[11px] font-black tracking-widest uppercase text-black"
            style={{ background: YELLOW }}>
            <Plus className="w-3.5 h-3.5" /> Add Driver
          </button>
        </div>

        <div className="bg-[#0f0f0f] border border-white/[0.06] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.04]">
                  {["Name", "Phone", "License", "Vehicle", "Status", "Verification", "Rating", "Trips", "PIN", "Actions"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[10px] font-bold tracking-widest uppercase text-white/20 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={10} className="text-center py-10"><Loader2 className="w-5 h-5 animate-spin text-white/20 mx-auto" /></td></tr>
                ) : drivers.length === 0 ? (
                  <tr><td colSpan={10} className="text-center py-10 text-white/20 text-xs">No drivers yet. Add the first one.</td></tr>
                ) : drivers.map(d => {
                  const vehicle = vehicles.find(v => v.id === d.vehicleId);
                  const vs = d.verificationStatus ?? "pending";
                  return (
                    <tr key={d.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                      <td className="px-4 py-3 text-sm font-bold text-white">{d.name}</td>
                      <td className="px-4 py-3 text-xs text-white/50">{d.phone}</td>
                      <td className="px-4 py-3 text-xs text-white/50 font-mono">{d.licenseNumber ?? "—"}</td>
                      <td className="px-4 py-3 text-xs text-white/50">{vehicle ? vehicle.name : "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-1 border ${STATUS_COLORS[d.status] ?? "text-white/30 border-white/10"}`}>
                          {d.status === "available" ? "Available" : d.status === "on_trip" ? "On Trip" : "Off Duty"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className={`flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-1 border ${VERIFY_COLORS[vs] ?? "text-white/30 border-white/10"}`}>
                            {VERIFY_ICONS[vs]}
                            {vs}
                          </span>
                          {vs !== "verified" && (
                            <button type="button"
                              onClick={() => handleVerify(d.id, "verified")}
                              disabled={verifyBusy === d.id}
                              title="Approve driver"
                              className="p-1 border border-emerald-400/20 text-emerald-400/60 hover:text-emerald-400 hover:border-emerald-400/40 transition-colors disabled:opacity-40">
                              {verifyBusy === d.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-3 h-3" />}
                            </button>
                          )}
                          {vs !== "rejected" && (
                            <button type="button"
                              onClick={() => handleVerify(d.id, "rejected")}
                              disabled={verifyBusy === d.id}
                              title="Reject driver"
                              className="p-1 border border-red-400/20 text-red-400/40 hover:text-red-400 hover:border-red-400/40 transition-colors disabled:opacity-40">
                              {verifyBusy === d.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldX className="w-3 h-3" />}
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1 text-xs text-[#F2E147]">
                          <Star className="w-3 h-3 fill-current" />{(d.rating ?? 5.0).toFixed(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-white/40">{d.totalTrips ?? 0}</td>
                      <td className="px-4 py-3">
                        {d.accessPin ? (
                          <span className="text-[10px] font-mono font-bold text-[#F2E147]/70 bg-[#F2E147]/5 border border-[#F2E147]/10 px-2 py-0.5">••••••</span>
                        ) : (
                          <span className="text-[10px] text-white/20">No PIN</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5">
                          <button type="button" onClick={() => openPin(d)} title="Manage PIN"
                            className="p-1.5 border border-[#F2E147]/20 text-[#F2E147]/40 hover:text-[#F2E147] hover:border-[#F2E147]/40 transition-colors">
                            <Key className="w-3.5 h-3.5" />
                          </button>
                          <button type="button" onClick={() => openEdit(d)} title="Edit driver"
                            className="p-1.5 border border-white/10 text-white/40 hover:text-white hover:border-white/30 transition-colors">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button type="button" onClick={() => del(d.id)} title="Delete driver"
                            className="p-1.5 border border-white/[0.06] text-white/25 hover:text-white/70 hover:border-white/20 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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

      <AnimatePresence>
        {(modal === "add" || modal === "edit") && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
            onClick={e => { if (e.target === e.currentTarget) setModal(null); }}>
            <motion.div initial={{ opacity: 0, scale: 0.97, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
              className="w-full max-w-md bg-[#0a0a0a] border border-white/[0.07]">
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
                <h3 className="font-black text-sm uppercase tracking-tight text-white">
                  {modal === "add" ? "Add Driver" : "Edit Driver"}
                </h3>
                <button type="button" onClick={() => setModal(null)} className="text-white/30 hover:text-white"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-5 space-y-3">
                {[
                  { key: "name" as const, label: "Full Name *", type: "text", placeholder: "John Smith" },
                  { key: "phone" as const, label: "Phone *", type: "tel", placeholder: "+1 (347) 000-0000" },
                  { key: "email" as const, label: "Email", type: "email", placeholder: "driver@email.com" },
                  { key: "licenseNumber" as const, label: "License Number", type: "text", placeholder: "NJ12345678" },
                ].map(f => (
                  <div key={f.key}>
                    <label className="block text-[10px] font-bold tracking-widest uppercase text-white/20 mb-1.5">{f.label}</label>
                    <input
                      type={f.type} placeholder={f.placeholder}
                      className="w-full bg-[#111] border border-white/10 focus:border-[#F2E147] text-sm text-white placeholder-white/20 px-3 py-2.5 outline-none transition-colors"
                      value={form[f.key] as string}
                      onChange={e => inp(f.key, e.target.value)}
                    />
                  </div>
                ))}
                <div>
                  <label className="block text-[10px] font-bold tracking-widest uppercase text-white/20 mb-1.5">Assigned Vehicle</label>
                  <select value={form.vehicleId ?? ""} onChange={e => inp("vehicleId", e.target.value ? Number(e.target.value) : null)}
                    className="w-full bg-[#111] border border-white/10 focus:border-[#F2E147] text-sm text-white px-3 py-2.5 outline-none transition-colors"
                    style={{ colorScheme: "dark" }}>
                    <option value="">Not assigned</option>
                    {vehicles.map(v => <option key={v.id} value={v.id}>{v.name} · {v.plate ?? ""}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold tracking-widest uppercase text-white/20 mb-1.5">Status</label>
                  <select value={form.status} onChange={e => inp("status", e.target.value)}
                    className="w-full bg-[#111] border border-white/10 focus:border-[#F2E147] text-sm text-white px-3 py-2.5 outline-none transition-colors"
                    style={{ colorScheme: "dark" }}>
                    <option value="available">Available</option>
                    <option value="on_trip">On Trip</option>
                    <option value="off_duty">Off Duty</option>
                  </select>
                </div>
                {saveError && <p className="text-xs text-white/60 bg-white/5 border border-white/10 px-3 py-2">{saveError}</p>}
                <button type="button" onClick={save} disabled={saving}
                  className="w-full py-3.5 text-[11px] font-black tracking-widest uppercase text-black mt-2 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed transition-opacity"
                  style={{ background: YELLOW }}>
                  {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</> : "Save"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {modal === "pin" && pinDriver && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
            onClick={e => { if (e.target === e.currentTarget) setModal(null); }}>
            <motion.div initial={{ opacity: 0, scale: 0.97, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
              className="w-full max-w-md bg-[#0a0a0a] border border-white/[0.07]">
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
                <div>
                  <h3 className="font-black text-sm uppercase tracking-tight text-white">PIN Management</h3>
                  <p className="text-white/30 text-xs mt-0.5">{pinDriver.name}</p>
                </div>
                <button type="button" onClick={() => setModal(null)} className="text-white/30 hover:text-white"><X className="w-4 h-4" /></button>
              </div>

              <div className="p-5 space-y-5">
                <div>
                  <p className="text-[10px] font-bold tracking-widest uppercase text-white/20 mb-1.5">Verification Status</p>
                  <div className="flex items-center gap-2">
                    <span className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1.5 border ${VERIFY_COLORS[pinDriver.verificationStatus ?? "pending"]}`}>
                      {VERIFY_ICONS[pinDriver.verificationStatus ?? "pending"]}
                      {pinDriver.verificationStatus ?? "pending"}
                    </span>
                    <div className="flex gap-1.5 ml-auto">
                      <button type="button"
                        onClick={() => handleVerify(pinDriver.id, "verified")}
                        disabled={verifyBusy === pinDriver.id || pinDriver.verificationStatus === "verified"}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider border border-emerald-400/30 text-emerald-400/70 hover:text-emerald-400 hover:border-emerald-400/60 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                        <ShieldCheck className="w-3 h-3" /> Approve
                      </button>
                      <button type="button"
                        onClick={() => handleVerify(pinDriver.id, "rejected")}
                        disabled={verifyBusy === pinDriver.id || pinDriver.verificationStatus === "rejected"}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider border border-red-400/30 text-red-400/60 hover:text-red-400 hover:border-red-400/60 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                        <ShieldX className="w-3 h-3" /> Reject
                      </button>
                    </div>
                  </div>
                </div>

                <div className="border-t border-white/[0.05] pt-5">
                  <p className="text-[10px] font-bold tracking-widest uppercase text-white/20 mb-3">Access PIN</p>

                  {pinDriver.accessPin ? (
                    <div className="bg-[#111] border border-white/[0.07] p-4 mb-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[10px] text-white/30 mb-1">Current PIN</p>
                          <p className="font-mono font-black text-2xl tracking-[0.3em] text-white">
                            {pinVisible ? pinDriver.accessPin : "•".repeat(pinDriver.accessPin.length)}
                          </p>
                          {pinDriver.pinGeneratedAt && (
                            <p className="text-[10px] text-white/20 mt-1">
                              Generated {new Date(pinDriver.pinGeneratedAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col gap-2">
                          <button type="button" onClick={() => setPinVisible(v => !v)}
                            className="p-2 border border-white/10 text-white/40 hover:text-white hover:border-white/30 transition-colors"
                            title={pinVisible ? "Hide PIN" : "Show PIN"}>
                            {pinVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                          <button type="button" onClick={copyPin}
                            className="p-2 border border-white/10 text-white/40 hover:text-white hover:border-white/30 transition-colors"
                            title="Copy PIN">
                            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-[#111] border border-white/[0.07] p-4 mb-4 text-center">
                      <p className="text-white/30 text-sm">No PIN assigned yet.</p>
                      <p className="text-white/20 text-xs mt-1">Generate one below or set a custom PIN.</p>
                    </div>
                  )}

                  <button type="button" onClick={generatePin} disabled={pinSaving}
                    className="w-full flex items-center justify-center gap-2 py-3 text-[11px] font-black tracking-widest uppercase text-black mb-4 disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{ background: YELLOW }}>
                    {pinSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    {pinDriver.accessPin ? "Regenerate PIN" : "Generate PIN"}
                  </button>

                  <div>
                    <label className="block text-[10px] font-bold tracking-widest uppercase text-white/20 mb-1.5">Set Custom PIN (4–10 digits)</label>
                    <div className="flex gap-2">
                      <input
                        type="text" inputMode="numeric" pattern="\d*"
                        placeholder="e.g. 7291"
                        maxLength={10}
                        value={customPin}
                        onChange={e => setCustomPin(e.target.value.replace(/\D/g, ""))}
                        className="flex-1 bg-[#111] border border-white/10 focus:border-[#F2E147] text-sm text-white placeholder-white/20 px-3 py-2.5 outline-none transition-colors font-mono tracking-widest"
                      />
                      <button type="button" onClick={setCustomPinHandler} disabled={pinSaving || !customPin}
                        className="px-4 py-2.5 text-[11px] font-black tracking-widest uppercase border border-white/20 text-white/60 hover:text-white hover:border-white/40 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                        Set
                      </button>
                    </div>
                  </div>

                  {pinError && <p className="text-xs text-red-400/80 bg-red-400/5 border border-red-400/10 px-3 py-2 mt-3">{pinError}</p>}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
}
