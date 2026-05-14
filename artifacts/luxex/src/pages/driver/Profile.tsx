import { useState } from "react";
import { motion } from "framer-motion";
import { Phone, Mail, Save, Check, Car, FileText } from "lucide-react";
import { PortalLayout } from "@/components/PortalLayout";
import { getCurrentUser, setCurrentUser, type AuthUser } from "@/hooks/useAuth";

const YELLOW = "#F2E147";

export default function DriverProfile() {
  const user = getCurrentUser()!;
  const [form, setForm] = useState({
    firstName: user.firstName, lastName: user.lastName, phone: user.phone ?? "",
    licenseNumber: "", vehicleModel: "", vehiclePlate: "",
  });
  const [saved, setSaved] = useState(false);
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentUser({ ...user, firstName: form.firstName, lastName: form.lastName, phone: form.phone } as AuthUser);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <PortalLayout user={user} onLogout={() => window.location.href = "/"}>
      <div className="max-w-lg mx-auto space-y-5">
        <h2 className="text-2xl font-black text-white">Driver Profile</h2>

        <div style={{ background: "#111", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="flex items-center gap-4 px-6 py-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="w-14 h-14 rounded-full flex items-center justify-center text-black text-xl font-black shrink-0"
              style={{ background: YELLOW }}>
              {user.firstName[0]}{user.lastName[0]}
            </div>
            <div>
              <p className="font-black text-white text-lg">{user.firstName} {user.lastName}</p>
              <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>
                Chauffeur · Member since {new Date(user.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </p>
            </div>
          </div>

          <form onSubmit={handleSave} className="px-6 py-5 space-y-4">
            <p className="text-[10px] font-bold tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.4)" }}>Personal Info</p>
            <div className="grid grid-cols-2 gap-4">
              <DarkField label="First Name" value={form.firstName} onChange={v => set("firstName", v)} />
              <DarkField label="Last Name" value={form.lastName} onChange={v => set("lastName", v)} />
            </div>

            <div>
              <label className="block text-[11px] font-bold tracking-wider uppercase mb-1.5" style={{ color: "rgba(255,255,255,0.5)" }}>Email</label>
              <div className="flex items-center gap-2 px-4 py-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <Mail className="w-4 h-4 shrink-0" style={{ color: "rgba(255,255,255,0.3)" }} />
                <span className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>{user.email}</span>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold tracking-wider uppercase mb-1.5" style={{ color: "rgba(255,255,255,0.5)" }}>Phone</label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "rgba(255,255,255,0.3)" }} />
                <input type="tel" value={form.phone} onChange={e => set("phone", e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full pl-10 pr-4 py-3 text-sm text-white outline-none transition-all"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                  onFocus={e => { (e.target as HTMLElement).style.borderColor = YELLOW; }}
                  onBlur={e => { (e.target as HTMLElement).style.borderColor = "rgba(255,255,255,0.08)"; }} />
              </div>
            </div>

            <div className="pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <p className="text-[10px] font-bold tracking-widest uppercase mb-4" style={{ color: "rgba(255,255,255,0.4)" }}>Driver Details</p>
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold tracking-wider uppercase mb-1.5" style={{ color: "rgba(255,255,255,0.5)" }}>Driver's License Number</label>
                  <div className="relative">
                    <FileText className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "rgba(255,255,255,0.3)" }} />
                    <input value={form.licenseNumber} onChange={e => set("licenseNumber", e.target.value)}
                      placeholder="e.g. D1234567"
                      className="w-full pl-10 pr-4 py-3 text-sm text-white outline-none transition-all"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                      onFocus={e => { (e.target as HTMLElement).style.borderColor = YELLOW; }}
                      onBlur={e => { (e.target as HTMLElement).style.borderColor = "rgba(255,255,255,0.08)"; }} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold tracking-wider uppercase mb-1.5" style={{ color: "rgba(255,255,255,0.5)" }}>Vehicle Model</label>
                    <div className="relative">
                      <Car className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "rgba(255,255,255,0.3)" }} />
                      <input value={form.vehicleModel} onChange={e => set("vehicleModel", e.target.value)}
                        placeholder="e.g. S-Class 580"
                        className="w-full pl-10 pr-4 py-3 text-sm text-white outline-none transition-all"
                        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                        onFocus={e => { (e.target as HTMLElement).style.borderColor = YELLOW; }}
                        onBlur={e => { (e.target as HTMLElement).style.borderColor = "rgba(255,255,255,0.08)"; }} />
                    </div>
                  </div>
                  <DarkField label="License Plate" value={form.vehiclePlate} onChange={v => set("vehiclePlate", v)} placeholder="e.g. ABC-1234" />
                </div>
              </div>
            </div>

            <motion.button type="submit" whileTap={{ scale: 0.98 }}
              className="w-full flex items-center justify-center gap-2 py-3 text-sm font-black uppercase tracking-widest transition-all"
              style={saved ? { background: "#34d399", color: "#000" } : { background: YELLOW, color: "#000" }}>
              {saved ? <><Check className="w-4 h-4" /> Saved!</> : <><Save className="w-4 h-4" /> Save Changes</>}
            </motion.button>
          </form>
        </div>

        <div className="px-5 py-4" style={{ background: "rgba(167,139,250,0.08)", border: "1px solid rgba(167,139,250,0.25)" }}>
          <p className="text-xs font-bold mb-1" style={{ color: "#a78bfa" }}>Driver Verification</p>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>
            Your driver account is under review. Our team will verify your documents and contact you within 24 hours.
          </p>
        </div>
      </div>
    </PortalLayout>
  );
}

function DarkField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  const YELLOW = "#F2E147";
  return (
    <div>
      <label className="block text-[11px] font-bold tracking-wider uppercase mb-1.5" style={{ color: "rgba(255,255,255,0.5)" }}>{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-4 py-3 text-sm text-white outline-none transition-all"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
        onFocus={e => { (e.target as HTMLElement).style.borderColor = YELLOW; }}
        onBlur={e => { (e.target as HTMLElement).style.borderColor = "rgba(255,255,255,0.08)"; }} />
    </div>
  );
}
