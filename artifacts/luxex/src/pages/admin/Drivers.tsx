import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Edit2, Trash2, X, Loader2, Star } from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { adminApi } from "@/lib/adminApi";

const YELLOW = "#F2E147";

const STATUS_COLORS: Record<string, string> = {
  available: "text-[#F2E147] bg-[#F2E147]/10 border-[#F2E147]/20",
  on_trip:   "text-white/80 bg-white/10 border-white/20",
  off_duty:  "text-white/25 bg-white/[0.03] border-white/[0.06]",
};

const EMPTY = { name: "", phone: "", email: "", licenseNumber: "", vehicleId: null as number | null, status: "available", notes: "" };

export default function Drivers() {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [form, setForm] = useState<typeof EMPTY>({ ...EMPTY });
  const [editId, setEditId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const load = () => {
    Promise.all([adminApi.drivers.list(), adminApi.vehicles.list()])
      .then(([d, v]) => { setDrivers(d); setVehicles(v); })
      .catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => { setForm({ ...EMPTY }); setEditId(null); setSaveError(""); setModal("add"); };
  const openEdit = (d: any) => {
    setForm({
      name: d.name,
      phone: d.phone,
      email: d.email ?? "",
      licenseNumber: d.licenseNumber ?? "",
      vehicleId: d.vehicleId ?? null,
      status: d.status,
      notes: d.notes ?? "",
    });
    setEditId(d.id);
    setSaveError("");
    setModal("edit");
  };

  const save = async () => {
    if (!form.name.trim()) { setSaveError("Full name is required."); return; }
    if (!form.phone.trim()) { setSaveError("Phone number is required."); return; }
    setSaving(true);
    setSaveError("");
    try {
      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || null,
        licenseNumber: form.licenseNumber.trim() || null,
        vehicleId: form.vehicleId ?? null,
        status: form.status,
        notes: form.notes.trim() || null,
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
      setSaveError(e?.message ?? "Error saving driver. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const del = async (id: number) => {
    if (!confirm("Delete this driver?")) return;
    try {
      await adminApi.drivers.delete(id);
      setDrivers(prev => prev.filter(d => d.id !== id));
    } catch { alert("Failed to delete driver. Please try again."); }
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
          <button type="button" onClick={openAdd} className="flex items-center gap-2 px-4 py-2.5 text-[11px] font-black tracking-widest uppercase text-black" style={{ background: YELLOW }}>
            <Plus className="w-3.5 h-3.5" /> Add Driver
          </button>
        </div>

        <div className="bg-[#0f0f0f] border border-white/[0.06] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.04]">
                  {["Name", "Phone", "License", "Vehicle", "Status", "Rating", "Trips", "Actions"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[10px] font-bold tracking-widest uppercase text-white/20 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="text-center py-10"><Loader2 className="w-5 h-5 animate-spin text-white/20 mx-auto" /></td></tr>
                ) : drivers.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-10 text-white/20 text-xs">No drivers yet. Add the first one.</td></tr>
                ) : drivers.map(d => {
                  const vehicle = vehicles.find(v => v.id === d.vehicleId);
                  return (
                    <tr key={d.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                      <td className="px-4 py-3 text-sm font-bold text-white">{d.name}</td>
                      <td className="px-4 py-3 text-xs text-white/50">{d.phone}</td>
                      <td className="px-4 py-3 text-xs text-white/50 font-mono">{d.licenseNumber ?? "—"}</td>
                      <td className="px-4 py-3 text-xs text-white/50">{vehicle ? `${vehicle.name}` : "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-1 border ${STATUS_COLORS[d.status] ?? "text-white/30 border-white/10"}`}>
                          {d.status === "available" ? "Available" : d.status === "on_trip" ? "On Trip" : "Off Duty"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1 text-xs text-[#F2E147]">
                          <Star className="w-3 h-3 fill-current" />{(d.rating ?? 5.0).toFixed(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-white/40">{d.totalTrips ?? 0}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5">
                          <button type="button" onClick={() => openEdit(d)} className="p-1.5 border border-white/10 text-white/40 hover:text-white hover:border-white/30 transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                          <button type="button" onClick={() => del(d.id)} className="p-1.5 border border-white/[0.06] text-white/25 hover:text-white/70 hover:border-white/20 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
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
        {modal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
            onClick={e => { if (e.target === e.currentTarget) setModal(null); }}>
            <motion.div initial={{ opacity: 0, scale: 0.97, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
              className="w-full max-w-md bg-[#0a0a0a] border border-white/[0.07]">
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
                <h3 className="font-black text-sm uppercase tracking-tight text-white">{modal === "add" ? "Add Driver" : "Edit Driver"}</h3>
                <button type="button" onClick={() => setModal(null)} className="text-white/30 hover:text-white"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-5 space-y-3">
                {[
                  { key: "name" as const, label: "Full Name *", type: "text", placeholder: "John Smith", required: true },
                  { key: "phone" as const, label: "Phone *", type: "tel", placeholder: "+1 (347) 000-0000", required: true },
                  { key: "email" as const, label: "Email", type: "email", placeholder: "driver@email.com" },
                  { key: "licenseNumber" as const, label: "License Number", type: "text", placeholder: "NJ12345678" },
                ].map(f => (
                  <div key={f.key}>
                    <label className="block text-[10px] font-bold tracking-widest uppercase text-white/20 mb-1.5">{f.label}</label>
                    <input
                      type={f.type}
                      placeholder={f.placeholder}
                      required={f.required}
                      className="w-full bg-[#111] border border-white/10 focus:border-[#F2E147] text-sm text-white placeholder-white/20 px-3 py-2.5 outline-none transition-colors"
                      value={form[f.key] as string}
                      onChange={e => inp(f.key, e.target.value)}
                    />
                  </div>
                ))}
                <div>
                  <label className="block text-[10px] font-bold tracking-widest uppercase text-white/20 mb-1.5">Assigned Vehicle</label>
                  <select
                    value={form.vehicleId ?? ""}
                    onChange={e => inp("vehicleId", e.target.value ? Number(e.target.value) : null)}
                    className="w-full bg-[#111] border border-white/10 focus:border-[#F2E147] text-sm text-white px-3 py-2.5 outline-none transition-colors"
                    style={{ colorScheme: "dark" }}
                  >
                    <option value="">Not assigned</option>
                    {vehicles.map(v => <option key={v.id} value={v.id}>{v.name} · {v.plate ?? ""}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold tracking-widest uppercase text-white/20 mb-1.5">Status</label>
                  <select
                    value={form.status}
                    onChange={e => inp("status", e.target.value)}
                    className="w-full bg-[#111] border border-white/10 focus:border-[#F2E147] text-sm text-white px-3 py-2.5 outline-none transition-colors"
                    style={{ colorScheme: "dark" }}
                  >
                    <option value="available">Available</option>
                    <option value="on_trip">On Trip</option>
                    <option value="off_duty">Off Duty</option>
                  </select>
                </div>
                {saveError && <p className="text-xs text-white/60 bg-white/5 border border-white/10 px-3 py-2">{saveError}</p>}
                <button
                  type="button"
                  onClick={save}
                  disabled={saving}
                  className="w-full py-3.5 text-[11px] font-black tracking-widest uppercase text-black mt-2 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed transition-opacity"
                  style={{ background: YELLOW }}
                >
                  {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</> : "Save"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
}
