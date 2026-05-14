import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Edit2, Trash2, X, Loader2 } from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { adminApi } from "@/lib/adminApi";

const YELLOW = "#F2E147";

const STATUS_COLORS: Record<string, string> = {
  active:      "text-[#F2E147] bg-[#F2E147]/10 border-[#F2E147]/20",
  maintenance: "text-white/60 bg-white/10 border-white/20",
  inactive:    "text-white/25 bg-white/[0.03] border-white/[0.06]",
};

const EMPTY = { type: "sedan", name: "", model: "", plate: "", color: "", year: new Date().getFullYear(), maxPassengers: 3, maxBags: 3, status: "active", notes: "" };

export default function Vehicles() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [form, setForm] = useState<typeof EMPTY>({ ...EMPTY });
  const [editId, setEditId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    Promise.all([adminApi.vehicles.list(), adminApi.drivers.list()])
      .then(([v, d]) => { setVehicles(v); setDrivers(d); })
      .catch(console.error).finally(() => setLoading(false));
  }, []);

  const openAdd = () => { setForm({ ...EMPTY }); setEditId(null); setSaveError(""); setModal("add"); };
  const openEdit = (v: any) => {
    setForm({ type: v.type, name: v.name, model: v.model ?? "", plate: v.plate ?? "", color: v.color ?? "", year: v.year ?? new Date().getFullYear(), maxPassengers: v.maxPassengers, maxBags: v.maxBags, status: v.status, notes: v.notes ?? "" });
    setEditId(v.id); setSaveError(""); setModal("edit");
  };

  const save = async () => {
    setSaving(true);
    setSaveError("");
    try {
      if (modal === "add") { const c = await adminApi.vehicles.create(form); setVehicles(p => [c, ...p]); }
      else if (editId) { const u = await adminApi.vehicles.update(editId, form); setVehicles(p => p.map(v => v.id === editId ? u : v)); }
      setModal(null);
    } catch (e: any) { setSaveError(e?.message ?? "Error saving vehicle. Please try again."); } finally { setSaving(false); }
  };

  const del = async (id: number) => {
    if (!confirm("Delete this vehicle?")) return;
    try {
      await adminApi.vehicles.delete(id);
      setVehicles(p => p.filter(v => v.id !== id));
    } catch { alert("Failed to delete vehicle. Please try again."); }
  };

  const inp = (key: keyof typeof EMPTY, val: any) => setForm(p => ({ ...p, [key]: val }));

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-black text-xl uppercase tracking-tight text-white">Vehicles</h2>
            <p className="text-white/25 text-xs">{vehicles.length} registered</p>
          </div>
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2.5 text-[11px] font-black tracking-widest uppercase text-black" style={{ background: YELLOW }}>
            <Plus className="w-3.5 h-3.5" /> Add Vehicle
          </button>
        </div>

        <div className="bg-[#0f0f0f] border border-white/[0.06] overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.04]">
                {["Type", "Name", "Model", "Plate", "Color", "Year", "Pax", "Bags", "Status", "Driver", ""].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[10px] font-bold tracking-widest uppercase text-white/20 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan={11} className="text-center py-10"><Loader2 className="w-5 h-5 animate-spin text-white/20 mx-auto" /></td></tr>
              : vehicles.length === 0 ? <tr><td colSpan={11} className="text-center py-10 text-white/20 text-xs">No vehicles yet. Add the first one.</td></tr>
              : vehicles.map(v => {
                const driver = drivers.find(d => d.id === v.driverId);
                return (
                  <tr key={v.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                    <td className="px-4 py-3 text-xs capitalize text-white/50 font-bold">{v.type}</td>
                    <td className="px-4 py-3 text-sm font-bold text-white">{v.name}</td>
                    <td className="px-4 py-3 text-xs text-white/50">{v.model ?? "—"}</td>
                    <td className="px-4 py-3 text-xs text-white/50 font-mono">{v.plate ?? "—"}</td>
                    <td className="px-4 py-3 text-xs text-white/50">{v.color ?? "—"}</td>
                    <td className="px-4 py-3 text-xs text-white/50">{v.year ?? "—"}</td>
                    <td className="px-4 py-3 text-xs text-white/50">{v.maxPassengers}</td>
                    <td className="px-4 py-3 text-xs text-white/50">{v.maxBags}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-1 border ${STATUS_COLORS[v.status] ?? "border-white/10 text-white/30"}`}>
                        {v.status === "active" ? "Active" : v.status === "maintenance" ? "Maintenance" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-white/40">{driver?.name ?? "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5">
                        <button onClick={() => openEdit(v)} className="p-1.5 border border-white/10 text-white/40 hover:text-white hover:border-white/30 transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                        <button onClick={() => del(v.id)} className="p-1.5 border border-white/[0.06] text-white/25 hover:text-white/70 hover:border-white/20 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {modal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
            onClick={e => { if (e.target === e.currentTarget) setModal(null); }}>
            <motion.div initial={{ opacity: 0, scale: 0.97, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              className="w-full max-w-md bg-[#0a0a0a] border border-white/[0.07] max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
                <h3 className="font-black text-sm uppercase tracking-tight text-white">{modal === "add" ? "Add Vehicle" : "Edit Vehicle"}</h3>
                <button onClick={() => setModal(null)} className="text-white/30 hover:text-white"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-5 space-y-3">
                <div>
                  <label className="block text-[10px] font-bold tracking-widest uppercase text-white/20 mb-1.5">Type</label>
                  <select value={form.type} onChange={e => inp("type", e.target.value)}
                    className="w-full bg-[#111] border border-white/10 focus:border-[#F2E147] text-sm text-white px-3 py-2.5 outline-none" style={{ colorScheme: "dark" }}>
                    <option value="sedan">Executive Sedan</option>
                    <option value="suv">Luxury SUV</option>
                    <option value="van">Premium Van</option>
                  </select>
                </div>
                {[
                  { key: "name" as const, label: "Name", placeholder: "Mercedes-Benz S580" },
                  { key: "model" as const, label: "Specific Model", placeholder: "S580 4MATIC 2024" },
                  { key: "plate" as const, label: "License Plate", placeholder: "NJX-1234" },
                  { key: "color" as const, label: "Color", placeholder: "Obsidian Black" },
                ].map(f => (
                  <div key={f.key}>
                    <label className="block text-[10px] font-bold tracking-widest uppercase text-white/20 mb-1.5">{f.label}</label>
                    <input type="text" placeholder={f.placeholder}
                      className="w-full bg-[#111] border border-white/10 focus:border-[#F2E147] text-sm text-white placeholder-white/20 px-3 py-2.5 outline-none"
                      value={form[f.key]} onChange={e => inp(f.key, e.target.value)} />
                  </div>
                ))}
                <div className="grid grid-cols-3 gap-2">
                  {([["year", "Year", 1990, 2030], ["maxPassengers", "Passengers", 1, 20], ["maxBags", "Bags", 0, 20]] as const).map(([k, l, mn, mx]) => (
                    <div key={k}>
                      <label className="block text-[10px] font-bold tracking-widest uppercase text-white/20 mb-1.5">{l}</label>
                      <input type="number" min={mn} max={mx}
                        className="w-full bg-[#111] border border-white/10 focus:border-[#F2E147] text-sm text-white px-3 py-2.5 outline-none"
                        value={form[k]} onChange={e => inp(k, Number(e.target.value))} />
                    </div>
                  ))}
                </div>
                <div>
                  <label className="block text-[10px] font-bold tracking-widest uppercase text-white/20 mb-1.5">Status</label>
                  <select value={form.status} onChange={e => inp("status", e.target.value)}
                    className="w-full bg-[#111] border border-white/10 focus:border-[#F2E147] text-sm text-white px-3 py-2.5 outline-none" style={{ colorScheme: "dark" }}>
                    <option value="active">Active</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                {saveError && <p className="text-xs text-white/60 bg-white/5 border border-white/10 px-3 py-2">{saveError}</p>}
                <button onClick={save} disabled={saving}
                  className="w-full py-3.5 text-[11px] font-black tracking-widest uppercase text-black flex items-center justify-center gap-2 disabled:opacity-60 transition-opacity"
                  style={{ background: YELLOW }}>
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
