import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Edit2, Trash2, X, Loader2, MapPin, Tag } from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { adminApi } from "@/lib/adminApi";

const YELLOW = "#F2E147";

export default function ZonesPromos() {
  const [tab, setTab] = useState<"zones" | "promos">("zones");
  const [zones, setZones] = useState<any[]>([]);
  const [promos, setPromos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<"zone-add" | "zone-edit" | "promo-add" | "promo-edit" | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const [zoneForm, setZoneForm] = useState({ name: "", city: "", state: "NJ", surchargePct: 0, flatFee: 0, active: true, notes: "" });
  const [promoForm, setPromoForm] = useState({ code: "", type: "percent", value: 10, minAmount: 0, maxUses: null as number | null, expiresAt: "", active: true, description: "" });

  useEffect(() => {
    Promise.all([adminApi.zones.list(), adminApi.promotions.list()])
      .then(([z, p]) => { setZones(z); setPromos(p); })
      .catch(console.error).finally(() => setLoading(false));
  }, []);

  const saveZone = async () => {
    setSaving(true);
    setSaveError("");
    try {
      if (modal === "zone-add") { const c = await adminApi.zones.create(zoneForm); setZones(p => [c, ...p]); }
      else if (editId) { const u = await adminApi.zones.update(editId, zoneForm); setZones(p => p.map(z => z.id === editId ? u : z)); }
      setModal(null);
    } catch (e: any) { setSaveError(e?.message ?? "Error saving zone. Please try again."); } finally { setSaving(false); }
  };

  const savePromo = async () => {
    setSaving(true);
    setSaveError("");
    try {
      const body = { ...promoForm, expiresAt: promoForm.expiresAt ? new Date(promoForm.expiresAt).toISOString() : null, maxUses: promoForm.maxUses || null };
      if (modal === "promo-add") { const c = await adminApi.promotions.create(body); setPromos(p => [c, ...p]); }
      else if (editId) { const u = await adminApi.promotions.update(editId, body); setPromos(p => p.map(pr => pr.id === editId ? u : pr)); }
      setModal(null);
    } catch (e: any) { setSaveError(e?.message ?? "Error saving promotion. Please try again."); } finally { setSaving(false); }
  };

  const delZone = async (id: number) => {
    if (!confirm("Delete this zone?")) return;
    try { await adminApi.zones.delete(id); setZones(p => p.filter(z => z.id !== id)); }
    catch { alert("Failed to delete zone. Please try again."); }
  };
  const delPromo = async (id: number) => {
    if (!confirm("Delete this promotion?")) return;
    try { await adminApi.promotions.delete(id); setPromos(p => p.filter(pr => pr.id !== id)); }
    catch { alert("Failed to delete promotion. Please try again."); }
  };

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="font-black text-xl uppercase tracking-tight text-white">{tab === "zones" ? "Zones & Cities" : "Promotions"}</h2>
            <p className="text-white/25 text-xs">{tab === "zones" ? `${zones.length} zones` : `${promos.filter(p => p.active).length} active codes`}</p>
          </div>
          <div className="flex gap-2">
            <div className="flex border border-white/[0.07]">
              {(["zones", "promos"] as const).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`px-4 py-2 text-[10px] font-bold tracking-widest uppercase flex items-center gap-1.5 transition-colors ${tab === t ? "text-black" : "text-white/30 hover:text-white"}`}
                  style={tab === t ? { background: YELLOW } : {}}>
                  {t === "zones" ? <MapPin className="w-3 h-3" /> : <Tag className="w-3 h-3" />}
                  {t === "zones" ? "Zones" : "Promos"}
                </button>
              ))}
            </div>
            <button onClick={() => { setEditId(null); setModal(tab === "zones" ? "zone-add" : "promo-add"); }}
              className="flex items-center gap-2 px-4 py-2.5 text-[11px] font-black tracking-widest uppercase text-black" style={{ background: YELLOW }}>
              <Plus className="w-3.5 h-3.5" /> Add
            </button>
          </div>
        </div>

        {tab === "zones" && (
          <div className="bg-[#0f0f0f] border border-white/[0.06] overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-white/[0.04]">
                {["Zone", "City", "State", "Surcharge %", "Flat Fee", "Status", ""].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[10px] font-bold tracking-widest uppercase text-white/20 whitespace-nowrap">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {loading ? <tr><td colSpan={7} className="text-center py-10"><Loader2 className="w-5 h-5 animate-spin text-white/20 mx-auto" /></td></tr>
                : zones.length === 0 ? <tr><td colSpan={7} className="text-center py-10 text-white/20 text-xs">No zones configured</td></tr>
                : zones.map(z => (
                  <tr key={z.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                    <td className="px-4 py-3 text-sm font-bold text-white">{z.name}</td>
                    <td className="px-4 py-3 text-xs text-white/50">{z.city ?? "—"}</td>
                    <td className="px-4 py-3 text-xs text-white/50">{z.state ?? "—"}</td>
                    <td className="px-4 py-3 text-xs font-bold text-[#F2E147]">{z.surchargePct}%</td>
                    <td className="px-4 py-3 text-xs text-white/50">{z.flatFee > 0 ? `$${z.flatFee}` : "—"}</td>
                    <td className="px-4 py-3"><span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-1 border ${z.active ? "text-green-400 bg-green-400/10 border-green-400/20" : "text-white/30 bg-white/5 border-white/10"}`}>{z.active ? "Active" : "Inactive"}</span></td>
                    <td className="px-4 py-3"><div className="flex gap-1.5">
                      <button onClick={() => { setZoneForm({ name: z.name, city: z.city ?? "", state: z.state ?? "NJ", surchargePct: z.surchargePct, flatFee: z.flatFee, active: z.active, notes: z.notes ?? "" }); setEditId(z.id); setModal("zone-edit"); }} className="p-1.5 border border-white/10 text-white/40 hover:text-white transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => delZone(z.id)} className="p-1.5 border border-red-400/10 text-red-400/50 hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === "promos" && (
          <div className="bg-[#0f0f0f] border border-white/[0.06] overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-white/[0.04]">
                {["Code", "Type", "Value", "Min. Amount", "Uses", "Expires", "Status", ""].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[10px] font-bold tracking-widest uppercase text-white/20 whitespace-nowrap">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {loading ? <tr><td colSpan={8} className="text-center py-10"><Loader2 className="w-5 h-5 animate-spin text-white/20 mx-auto" /></td></tr>
                : promos.length === 0 ? <tr><td colSpan={8} className="text-center py-10 text-white/20 text-xs">No promotions configured</td></tr>
                : promos.map(p => (
                  <tr key={p.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                    <td className="px-4 py-3 font-mono text-sm font-bold text-[#F2E147]">{p.code}</td>
                    <td className="px-4 py-3 text-xs text-white/50 capitalize">{p.type}</td>
                    <td className="px-4 py-3 text-xs font-bold text-white">{p.type === "percent" ? `${p.value}%` : `$${p.value}`}</td>
                    <td className="px-4 py-3 text-xs text-white/50">{p.minAmount > 0 ? `$${p.minAmount}` : "—"}</td>
                    <td className="px-4 py-3 text-xs text-white/50">{p.usedCount}{p.maxUses ? `/${p.maxUses}` : " uses"}</td>
                    <td className="px-4 py-3 text-xs text-white/50">{p.expiresAt ? new Date(p.expiresAt).toLocaleDateString() : "No expiry"}</td>
                    <td className="px-4 py-3"><span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-1 border ${p.active ? "text-green-400 bg-green-400/10 border-green-400/20" : "text-white/30 bg-white/5 border-white/10"}`}>{p.active ? "Active" : "Inactive"}</span></td>
                    <td className="px-4 py-3"><div className="flex gap-1.5">
                      <button onClick={() => { setPromoForm({ code: p.code, type: p.type, value: p.value, minAmount: p.minAmount, maxUses: p.maxUses, expiresAt: p.expiresAt ? p.expiresAt.split("T")[0] : "", active: p.active, description: p.description ?? "" }); setEditId(p.id); setModal("promo-edit"); }} className="p-1.5 border border-white/10 text-white/40 hover:text-white transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => delPromo(p.id)} className="p-1.5 border border-red-400/10 text-red-400/50 hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AnimatePresence>
        {modal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
            onClick={e => { if (e.target === e.currentTarget) setModal(null); }}>
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-md bg-[#0a0a0a] border border-white/[0.07]">
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
                <h3 className="font-black text-sm uppercase tracking-tight text-white">
                  {modal.includes("zone") ? (modal.includes("add") ? "New Zone" : "Edit Zone") : (modal.includes("add") ? "New Promotion" : "Edit Promotion")}
                </h3>
                <button onClick={() => setModal(null)} className="text-white/30 hover:text-white"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-5 space-y-3">
                {modal.includes("zone") ? (
                  <>
                    {[["name","Name","Newark Airport Zone",true],["city","City","Newark"],["state","State","NJ"]].map(([k,l,ph,req]) => (
                      <div key={String(k)}>
                        <label className="block text-[10px] font-bold tracking-widest uppercase text-white/20 mb-1.5">{String(l)}</label>
                        <input type="text" placeholder={String(ph)} required={!!req}
                          className="w-full bg-[#111] border border-white/10 focus:border-[#F2E147] text-sm text-white placeholder-white/20 px-3 py-2.5 outline-none"
                          value={(zoneForm as any)[k as string]} onChange={e => setZoneForm(p => ({ ...p, [k as string]: e.target.value }))} />
                      </div>
                    ))}
                    <div className="grid grid-cols-2 gap-2">
                      {[["surchargePct","Surcharge %"],["flatFee","Flat Fee $"]].map(([k,l]) => (
                        <div key={String(k)}>
                          <label className="block text-[10px] font-bold tracking-widest uppercase text-white/20 mb-1.5">{String(l)}</label>
                          <input type="number" step="1" min="0"
                            className="w-full bg-[#111] border border-white/10 focus:border-[#F2E147] text-sm text-white px-3 py-2.5 outline-none"
                            value={(zoneForm as any)[k as string]} onChange={e => setZoneForm(p => ({ ...p, [k as string]: Number(e.target.value) }))} />
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    {[["code","Promo Code","LUXEX20",true],["description","Description","Welcome discount"]].map(([k,l,ph,req]) => (
                      <div key={String(k)}>
                        <label className="block text-[10px] font-bold tracking-widest uppercase text-white/20 mb-1.5">{String(l)}</label>
                        <input type="text" placeholder={String(ph)} required={!!req}
                          className="w-full bg-[#111] border border-white/10 focus:border-[#F2E147] text-sm text-white placeholder-white/20 px-3 py-2.5 outline-none"
                          value={(promoForm as any)[k as string]} onChange={e => setPromoForm(p => ({ ...p, [k as string]: e.target.value }))} />
                      </div>
                    ))}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold tracking-widest uppercase text-white/20 mb-1.5">Type</label>
                        <select value={promoForm.type} onChange={e => setPromoForm(p => ({ ...p, type: e.target.value }))}
                          className="w-full bg-[#111] border border-white/10 text-sm text-white px-3 py-2.5 outline-none" style={{ colorScheme: "dark" }}>
                          <option value="percent">Percentage %</option>
                          <option value="flat">Fixed Amount $</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold tracking-widest uppercase text-white/20 mb-1.5">Value</label>
                        <input type="number" step="1" min="0"
                          className="w-full bg-[#111] border border-white/10 focus:border-[#F2E147] text-sm text-white px-3 py-2.5 outline-none"
                          value={promoForm.value} onChange={e => setPromoForm(p => ({ ...p, value: Number(e.target.value) }))} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold tracking-widest uppercase text-white/20 mb-1.5">Min. Amount</label>
                        <input type="number" step="5" min="0"
                          className="w-full bg-[#111] border border-white/10 text-sm text-white px-3 py-2.5 outline-none"
                          value={promoForm.minAmount} onChange={e => setPromoForm(p => ({ ...p, minAmount: Number(e.target.value) }))} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold tracking-widest uppercase text-white/20 mb-1.5">Max Uses</label>
                        <input type="number" step="1" min="0" placeholder="Unlimited"
                          className="w-full bg-[#111] border border-white/10 text-sm text-white placeholder-white/20 px-3 py-2.5 outline-none"
                          value={promoForm.maxUses ?? ""} onChange={e => setPromoForm(p => ({ ...p, maxUses: e.target.value ? Number(e.target.value) : null }))} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold tracking-widest uppercase text-white/20 mb-1.5">Expiration Date</label>
                      <input type="date"
                        className="w-full bg-[#111] border border-white/10 text-sm text-white px-3 py-2.5 outline-none"
                        style={{ colorScheme: "dark" }} value={promoForm.expiresAt} onChange={e => setPromoForm(p => ({ ...p, expiresAt: e.target.value }))} />
                    </div>
                  </>
                )}
                {saveError && <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 px-3 py-2">{saveError}</p>}
                <motion.button onClick={modal.includes("zone") ? saveZone : savePromo} disabled={saving} whileHover={{ scale: 1.01 }}
                  className="w-full py-3.5 text-[11px] font-black tracking-widest uppercase text-black flex items-center justify-center gap-2"
                  style={{ background: YELLOW }}>
                  {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</> : "Save"}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
}
