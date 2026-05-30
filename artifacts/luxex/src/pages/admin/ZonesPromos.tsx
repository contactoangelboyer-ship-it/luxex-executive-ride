import { useEffect, useState } from "react";
  import { motion, AnimatePresence } from "framer-motion";
  import { Plus, Edit2, Trash2, X, Loader2, MapPin, Tag, Shuffle, Power } from "lucide-react";
  import { AdminLayout } from "@/components/AdminLayout";
  import { adminApi } from "@/lib/adminApi";

  const YELLOW = "#C9A84C";

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
    const defaultPromoForm = { code: "", type: "percent", value: 10, minAmount: 0, maxUses: null as number | null, expiresAt: "", active: true, description: "" };
    const [promoForm, setPromoForm] = useState(defaultPromoForm);

    useEffect(() => {
      Promise.all([adminApi.zones.list(), adminApi.promotions.list()])
        .then(([z, p]) => { setZones(z); setPromos(p); })
        .catch(console.error).finally(() => setLoading(false));
    }, []);

    const openPromoAdd = () => { setPromoForm(defaultPromoForm); setEditId(null); setModal("promo-add"); };
    const openPromoEdit = (p: any) => {
      setPromoForm({ code: p.code, type: p.type, value: p.value, minAmount: p.minAmount, maxUses: p.maxUses, expiresAt: p.expiresAt ? p.expiresAt.split("T")[0] : "", active: p.active, description: p.description ?? "" });
      setEditId(p.id);
      setModal("promo-edit");
    };

    const saveZone = async () => {
      setSaving(true); setSaveError("");
      try {
        if (modal === "zone-add") { const c = await adminApi.zones.create(zoneForm); setZones(prev => [c, ...prev]); }
        else if (editId) { const u = await adminApi.zones.update(editId, zoneForm); setZones(prev => prev.map(z => z.id === editId ? u : z)); }
        setModal(null);
      } catch (e: any) { setSaveError(e?.message ?? "Error saving zone."); } finally { setSaving(false); }
    };

    const savePromo = async () => {
      setSaving(true); setSaveError("");
      try {
        const body = { ...promoForm, expiresAt: promoForm.expiresAt ? new Date(promoForm.expiresAt).toISOString() : null, maxUses: promoForm.maxUses || null };
        if (modal === "promo-add") { const c = await adminApi.promotions.create(body); setPromos(prev => [c, ...prev]); }
        else if (editId) { const u = await adminApi.promotions.update(editId, body); setPromos(prev => prev.map(pr => pr.id === editId ? u : pr)); }
        setModal(null);
      } catch (e: any) { setSaveError(e?.message ?? "Error saving promotion."); } finally { setSaving(false); }
    };

    const delZone = async (id: number) => {
      if (!confirm("Delete this zone?")) return;
      try { await adminApi.zones.delete(id); setZones(prev => prev.filter(z => z.id !== id)); }
      catch { alert("Failed to delete zone."); }
    };

    const delPromo = async (id: number) => {
      if (!confirm("Delete this promotion?")) return;
      try { await adminApi.promotions.delete(id); setPromos(prev => prev.filter(pr => pr.id !== id)); }
      catch { alert("Failed to delete promotion."); }
    };

    const togglePromoActive = async (id: number, active: boolean) => {
      try {
        const updated = await adminApi.promotions.update(id, { active });
        setPromos(prev => prev.map(pr => pr.id === id ? { ...pr, ...updated } : pr));
      } catch { alert("Failed to update promotion."); }
    };

    const generateCode = () => {
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      const code = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
      setPromoForm(p => ({ ...p, code }));
    };

    const isExpired = (p: any) => p.expiresAt && new Date(p.expiresAt) < new Date();
    const isFull    = (p: any) => p.maxUses && p.usedCount >= p.maxUses;

    const inputCls = "w-full bg-[#111] border border-white/10 focus:border-[#C9A84C] text-sm text-white placeholder-white/20 px-3 py-2.5 outline-none transition-colors";

    return (
      <AdminLayout>
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="font-black text-xl uppercase tracking-tight text-white">
                {tab === "zones" ? "Zones & Cities" : "Promo Codes"}
              </h2>
              <p className="text-white/25 text-xs">
                {tab === "zones" ? `${zones.length} zones` : `${promos.filter(p => p.active).length} active · ${promos.length} total`}
              </p>
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
              <button
                onClick={() => { setEditId(null); setSaveError(""); tab === "zones" ? setModal("zone-add") : openPromoAdd(); }}
                className="flex items-center gap-2 px-4 py-2.5 text-[11px] font-black tracking-widest uppercase text-black"
                style={{ background: YELLOW }}>
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>
          </div>

          {/* ── Zones Table ─────────────────────────────────────────────────────── */}
          {tab === "zones" && (
            <div className="bg-[#0f0f0f] border border-white/[0.06] overflow-x-auto">
              <table className="w-full">
                <thead><tr className="border-b border-white/[0.04]">
                  {["Zone", "City", "State", "Surcharge %", "Flat Fee", "Status", ""].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[10px] font-bold tracking-widest uppercase text-white/20 whitespace-nowrap">{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {loading
                    ? <tr><td colSpan={7} className="text-center py-10"><Loader2 className="w-5 h-5 animate-spin text-white/20 mx-auto" /></td></tr>
                    : zones.length === 0
                      ? <tr><td colSpan={7} className="text-center py-10 text-white/20 text-xs">No zones configured</td></tr>
                      : zones.map(z => (
                        <tr key={z.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                          <td className="px-4 py-3 text-sm font-bold text-white">{z.name}</td>
                          <td className="px-4 py-3 text-xs text-white/50">{z.city ?? "—"}</td>
                          <td className="px-4 py-3 text-xs text-white/50">{z.state ?? "—"}</td>
                          <td className="px-4 py-3 text-xs font-bold" style={{ color: YELLOW }}>{z.surchargePct}%</td>
                          <td className="px-4 py-3 text-xs text-white/50">{z.flatFee > 0 ? `$${z.flatFee}` : "—"}</td>
                          <td className="px-4 py-3">
                            <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-1 border ${z.active ? "text-green-400 bg-green-400/10 border-green-400/20" : "text-white/30 bg-white/5 border-white/10"}`}>
                              {z.active ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1.5">
                              <button onClick={() => { setZoneForm({ name: z.name, city: z.city ?? "", state: z.state ?? "NJ", surchargePct: z.surchargePct, flatFee: z.flatFee, active: z.active, notes: z.notes ?? "" }); setEditId(z.id); setModal("zone-edit"); }} className="p-1.5 border border-white/10 text-white/40 hover:text-white transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                              <button onClick={() => delZone(z.id)} className="p-1.5 border border-red-400/10 text-red-400/50 hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                          </td>
                        </tr>
                      ))
                  }
                </tbody>
              </table>
            </div>
          )}

          {/* ── Promos Table ─────────────────────────────────────────────────────── */}
          {tab === "promos" && (
            <div className="bg-[#0f0f0f] border border-white/[0.06] overflow-x-auto">
              <table className="w-full">
                <thead><tr className="border-b border-white/[0.04]">
                  {["Code", "Type", "Value", "Min. Amount", "Uses", "Expires", "Status", ""].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[10px] font-bold tracking-widest uppercase text-white/20 whitespace-nowrap">{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {loading
                    ? <tr><td colSpan={8} className="text-center py-10"><Loader2 className="w-5 h-5 animate-spin text-white/20 mx-auto" /></td></tr>
                    : promos.length === 0
                      ? <tr><td colSpan={8} className="text-center py-10 text-white/20 text-xs">No promo codes yet — click Add to create one</td></tr>
                      : promos.map(p => (
                        <tr key={p.id} className={`border-b border-white/[0.03] hover:bg-white/[0.02] ${!p.active || isExpired(p) ? "opacity-50" : ""}`}>
                          <td className="px-4 py-3">
                            <span className="font-mono text-sm font-bold" style={{ color: YELLOW }}>{p.code}</span>
                            {p.description && <p className="text-[10px] text-white/30 mt-0.5 max-w-[140px] truncate">{p.description}</p>}
                          </td>
                          <td className="px-4 py-3 text-xs text-white/50 capitalize">{p.type}</td>
                          <td className="px-4 py-3 text-xs font-bold text-white">
                            {p.type === "percent" ? `${p.value}%` : `$${p.value}`}
                          </td>
                          <td className="px-4 py-3 text-xs text-white/50">{p.minAmount > 0 ? `$${p.minAmount}` : "—"}</td>
                          <td className="px-4 py-3 text-xs text-white/50">
                            <span className={isFull(p) ? "text-red-400/70" : ""}>{p.usedCount}</span>
                            {p.maxUses ? <span className={isFull(p) ? "text-red-400/70" : ""}>`/${p.maxUses}`</span> : " uses"}
                            {isFull(p) && <span className="ml-1 text-[8px] font-bold text-red-400/60 uppercase">Full</span>}
                          </td>
                          <td className="px-4 py-3 text-xs text-white/50">
                            {p.expiresAt ? new Date(p.expiresAt).toLocaleDateString() : "No expiry"}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col gap-1">
                              <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-1 border ${p.active ? "text-green-400 bg-green-400/10 border-green-400/20" : "text-white/30 bg-white/5 border-white/10"}`}>
                                {p.active ? "Active" : "Inactive"}
                              </span>
                              {isExpired(p) && (
                                <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-1 border text-orange-400/70 bg-orange-400/5 border-orange-400/15">
                                  Expired
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1.5">
                              <button onClick={() => openPromoEdit(p)} title="Edit"
                                className="p-1.5 border border-white/10 text-white/40 hover:text-white transition-colors">
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => togglePromoActive(p.id, !p.active)} title={p.active ? "Deactivate" : "Activate"}
                                className={`p-1.5 border transition-colors ${p.active ? "border-green-400/20 text-green-400/50 hover:text-green-400" : "border-white/10 text-white/20 hover:text-white/60"}`}>
                                <Power className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => delPromo(p.id)} title="Delete"
                                className="p-1.5 border border-red-400/10 text-red-400/50 hover:text-red-400 transition-colors">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                  }
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Modal ────────────────────────────────────────────────────────────── */}
        <AnimatePresence>
          {modal && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
              onClick={e => { if (e.target === e.currentTarget) setModal(null); }}>
              <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md bg-[#0a0a0a] border border-white/[0.07]">
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
                  <h3 className="font-black text-sm uppercase tracking-tight text-white">
                    {modal === "zone-add" ? "New Zone" : modal === "zone-edit" ? "Edit Zone" : modal === "promo-add" ? "New Promo Code" : "Edit Promo Code"}
                  </h3>
                  <button onClick={() => setModal(null)} className="text-white/30 hover:text-white"><X className="w-4 h-4" /></button>
                </div>

                <div className="p-5 space-y-3 max-h-[80vh] overflow-y-auto">
                  {/* ── Zone Form ── */}
                  {modal.includes("zone") ? (
                    <>
                      {([["name","Name","Newark Airport Zone",true],["city","City","Newark",false],["state","State","NJ",false]] as [string,string,string,boolean][]).map(([k,l,ph,req]) => (
                        <div key={k}>
                          <label className="block text-[10px] font-bold tracking-widest uppercase text-white/20 mb-1.5">{l}</label>
                          <input type="text" placeholder={ph} required={req} className={inputCls}
                            value={(zoneForm as any)[k]} onChange={e => setZoneForm(p => ({ ...p, [k]: e.target.value }))} />
                        </div>
                      ))}
                      <div className="grid grid-cols-2 gap-2">
                        {([["surchargePct","Surcharge %"],["flatFee","Flat Fee $"]] as [string,string][]).map(([k,l]) => (
                          <div key={k}>
                            <label className="block text-[10px] font-bold tracking-widest uppercase text-white/20 mb-1.5">{l}</label>
                            <input type="number" step="1" min="0" className={inputCls}
                              value={(zoneForm as any)[k]} onChange={e => setZoneForm(p => ({ ...p, [k]: Number(e.target.value) }))} />
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    /* ── Promo Form ── */
                    <>
                      {/* Code field with generate button */}
                      <div>
                        <label className="block text-[10px] font-bold tracking-widest uppercase text-white/20 mb-1.5">Promo Code</label>
                        <div className="flex gap-2">
                          <input type="text" placeholder="LUXEX20" required
                            className="flex-1 bg-[#111] border border-white/10 focus:border-[#C9A84C] text-sm text-white placeholder-white/20 px-3 py-2.5 outline-none font-mono tracking-widest uppercase transition-colors"
                            value={promoForm.code}
                            onChange={e => setPromoForm(p => ({ ...p, code: e.target.value.toUpperCase() }))} />
                          <button type="button" onClick={generateCode} title="Generate random code"
                            className="px-3 py-2.5 border border-white/10 text-white/40 hover:text-white hover:border-white/30 transition-colors flex items-center gap-1.5 text-[10px] font-bold tracking-wider">
                            <Shuffle className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Description */}
                      <div>
                        <label className="block text-[10px] font-bold tracking-widest uppercase text-white/20 mb-1.5">Description</label>
                        <input type="text" placeholder="e.g. Welcome discount" className={inputCls}
                          value={promoForm.description}
                          onChange={e => setPromoForm(p => ({ ...p, description: e.target.value }))} />
                      </div>

                      {/* Type + Value */}
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
                          <label className="block text-[10px] font-bold tracking-widest uppercase text-white/20 mb-1.5">
                            {promoForm.type === "percent" ? "Percentage" : "Amount $"}
                          </label>
                          <input type="number" step="1" min="1" max={promoForm.type === "percent" ? 100 : undefined}
                            className={inputCls} value={promoForm.value}
                            onChange={e => setPromoForm(p => ({ ...p, value: Number(e.target.value) }))} />
                        </div>
                      </div>

                      {/* Min Amount + Max Uses */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold tracking-widest uppercase text-white/20 mb-1.5">Min. Order $</label>
                          <input type="number" step="5" min="0" className={inputCls}
                            value={promoForm.minAmount}
                            onChange={e => setPromoForm(p => ({ ...p, minAmount: Number(e.target.value) }))} />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold tracking-widest uppercase text-white/20 mb-1.5">Max Uses</label>
                          <input type="number" step="1" min="1" placeholder="Unlimited"
                            className={inputCls}
                            value={promoForm.maxUses ?? ""}
                            onChange={e => setPromoForm(p => ({ ...p, maxUses: e.target.value ? Number(e.target.value) : null }))} />
                        </div>
                      </div>

                      {/* Expiration date */}
                      <div>
                        <label className="block text-[10px] font-bold tracking-widest uppercase text-white/20 mb-1.5">Expiration Date</label>
                        <input type="date" className={inputCls} style={{ colorScheme: "dark" }}
                          value={promoForm.expiresAt}
                          onChange={e => setPromoForm(p => ({ ...p, expiresAt: e.target.value }))} />
                      </div>

                      {/* Active toggle */}
                      <div className="flex items-center justify-between py-1 border-t border-white/[0.06] pt-3 mt-1">
                        <div>
                          <p className="text-[10px] font-bold tracking-widest uppercase text-white/20">Active</p>
                          <p className="text-[9px] text-white/15 mt-0.5">
                            {promoForm.active ? "Code is live and usable at checkout" : "Code is disabled and won't be accepted"}
                          </p>
                        </div>
                        <button type="button" onClick={() => setPromoForm(p => ({ ...p, active: !p.active }))}
                          className="relative w-11 h-6 flex-shrink-0 transition-colors"
                          style={{ background: promoForm.active ? YELLOW : "rgba(255,255,255,0.1)" }}>
                          <span className={`absolute top-1 w-4 h-4 bg-white transition-all ${promoForm.active ? "right-1" : "left-1"}`} />
                        </button>
                      </div>
                    </>
                  )}

                  {saveError && (
                    <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 px-3 py-2">{saveError}</p>
                  )}

                  <motion.button
                    onClick={modal.includes("zone") ? saveZone : savePromo}
                    disabled={saving}
                    whileHover={{ scale: 1.01 }}
                    className="w-full py-3.5 text-[11px] font-black tracking-widest uppercase text-black flex items-center justify-center gap-2"
                    style={{ background: YELLOW }}>
                    {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : "Save"}
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </AdminLayout>
    );
  }
  