import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Edit2, Save, X, Loader2 } from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { adminApi } from "@/lib/adminApi";

const YELLOW = "#F2E147";
const LABELS: Record<string, string> = { sedan: "Executive Sedan", suv: "Luxury SUV", van: "Premium Van" };

export default function Pricing() {
  const [configs, setConfigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    adminApi.pricing.list().then(d => setConfigs(d)).catch(console.error).finally(() => setLoading(false));
  }, []);

  const startEdit = (c: any) => { setEditing(c.vehicleType); setDraft({ ...c }); };
  const cancelEdit = () => { setEditing(null); setDraft({}); };

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    setSaveError("");
    try {
      const updated = await adminApi.pricing.update(editing, draft);
      setConfigs(p => p.map(c => c.vehicleType === editing ? updated : c));
      setEditing(null);
    } catch (e: any) { setSaveError(e?.message ?? "Error saving pricing. Please try again."); } finally { setSaving(false); }
  };

  const fields: { key: string; label: string; prefix: string; step: string }[] = [
    { key: "baseRate",      label: "Base Rate",     prefix: "$", step: "1"    },
    { key: "perMile",       label: "Per Mile",      prefix: "$", step: "0.25" },
    { key: "hourlyRate",    label: "Hourly Rate",   prefix: "$", step: "5"    },
    { key: "minMiles",      label: "Min. Miles",    prefix: "",  step: "1"    },
    { key: "airportFee",    label: "Airport Fee",   prefix: "$", step: "5"    },
    { key: "afterHoursPct", label: "After-Hours %", prefix: "%", step: "1"    },
    { key: "weekendPct",    label: "Weekend %",     prefix: "%", step: "1"    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div>
          <h2 className="font-black text-xl uppercase tracking-tight text-white">Pricing & Rates</h2>
          <p className="text-white/25 text-xs">Configure the pricing algorithm per vehicle type</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-white/20" /></div>
        ) : (
          <div className="grid gap-4">
            {configs.map(c => {
              const isEditing = editing === c.vehicleType;
              const data = isEditing ? draft : c;
              return (
                <motion.div key={c.vehicleType} layout className="bg-[#0f0f0f] border border-white/[0.06] overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.04]">
                    <div>
                      <h3 className="font-black text-sm uppercase tracking-tight text-white">{LABELS[c.vehicleType] ?? c.vehicleType}</h3>
                      <p className="text-[10px] text-white/25 mt-0.5">Type: {c.vehicleType}</p>
                    </div>
                    <div className="flex gap-2">
                      {isEditing ? (
                        <>
                          <button onClick={cancelEdit} className="p-2 border border-white/10 text-white/30 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
                          <button onClick={save} disabled={saving}
                            className="flex items-center gap-2 px-4 py-2 text-[10px] font-black tracking-widest uppercase text-black"
                            style={{ background: YELLOW }}>
                            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                            Save
                          </button>
                        </>
                      ) : (
                        <button onClick={() => startEdit(c)}
                          className="flex items-center gap-2 px-4 py-2 text-[10px] font-bold tracking-widest uppercase border border-white/10 text-white/40 hover:text-white hover:border-white/30 transition-colors">
                          <Edit2 className="w-3.5 h-3.5" /> Edit
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-white/[0.04]">
                    {fields.map(f => (
                      <div key={f.key} className="bg-[#0f0f0f] px-4 py-3">
                        <p className="text-[9px] font-bold tracking-widest uppercase text-white/20 mb-2">{f.label}</p>
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            {f.prefix && <span className="text-white/30 text-sm">{f.prefix}</span>}
                            <input type="number" step={f.step}
                              className="bg-transparent border-b border-[#F2E147]/40 text-[#F2E147] font-bold text-sm outline-none w-full"
                              value={draft[f.key] ?? ""} onChange={e => setDraft((p: any) => ({ ...p, [f.key]: Number(e.target.value) }))} />
                          </div>
                        ) : (
                          <p className="font-bold text-lg text-white">
                            {f.prefix === "$" ? `$${(data[f.key] ?? 0).toFixed(f.step === "0.25" ? 2 : 0)}` : `${data[f.key] ?? 0}${f.prefix}`}
                          </p>
                        )}
                      </div>
                    ))}
                    <div className="bg-[#0f0f0f] px-4 py-3">
                      <p className="text-[9px] font-bold tracking-widest uppercase text-white/20 mb-2">Last Updated</p>
                      <p className="text-xs text-white/30">{c.updatedAt ? new Date(c.updatedAt).toLocaleDateString() : "—"}</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {saveError && <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 px-3 py-2">{saveError}</p>}

        <div className="bg-[#111] border border-[#F2E147]/10 p-4">
          <p className="text-[10px] uppercase tracking-widest text-[#F2E147]/40 mb-1 font-bold">How the algorithm works</p>
          <p className="text-xs text-white/30 leading-relaxed">
            Price = Base Rate + (Distance × Per Mile) + Airport Fee (if applicable) + After-Hours Surcharge (10pm–6am) + Weekend Surcharge + Estimated Tolls. Minimum charge is "Min. Miles" × per-mile rate.
          </p>
        </div>
      </div>
    </AdminLayout>
  );
}
