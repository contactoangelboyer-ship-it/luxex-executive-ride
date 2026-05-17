import { useEffect, useRef, useState } from "react";
  import { motion, AnimatePresence } from "framer-motion";
  import { Plus, Edit2, Trash2, X, Loader2, Star, Key, RefreshCw, Eye, EyeOff, Copy, Check, ShieldCheck, ShieldX, ShieldAlert, Camera, User, Share2, MessageCircle, Mail } from "lucide-react";
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

  type ModalType = "add" | "edit" | "pin" | "photo" | null;

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
    const [msgCopied, setMsgCopied]       = useState(false);
    const [verifyBusy, setVerifyBusy]     = useState<number | null>(null);

    const [photoDriver, setPhotoDriver]   = useState<any | null>(null);
    const [photoUrl, setPhotoUrl]         = useState("");
    const [photoFile, setPhotoFile]       = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [photoSaving, setPhotoSaving]   = useState(false);
    const [photoError, setPhotoError]     = useState("");
    const fileInputRef                    = useRef<HTMLInputElement>(null);

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

    const openPhoto = (d: any) => {
      setPhotoDriver(d); setPhotoUrl(d.photoUrl ?? ""); setPhotoFile(null); setPhotoPreview(d.photoUrl ?? null); setPhotoError(""); setModal("photo");
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

    const buildShareMessage = (driver: any): string => {
      return `Hola ${driver.name},\n\nAquí están tus datos de acceso a *Luxex Executive Ride*:\n\n🔑 PIN de acceso: *${driver.accessPin}*\n\nPara ingresar:\n1. Ve a https://luxexride.com/login\n2. Elige "Driver — Login with PIN"\n3. Ingresa tu PIN\n\nSi tienes dudas, contacta al administrador.`;
    };

    const copyShareMessage = async () => {
      if (!pinDriver?.accessPin) return;
      await navigator.clipboard.writeText(buildShareMessage(pinDriver));
      setMsgCopied(true);
      setTimeout(() => setMsgCopied(false), 2500);
    };

    const shareViaWhatsApp = () => {
      if (!pinDriver?.accessPin) return;
      const msg = encodeURIComponent(buildShareMessage(pinDriver));
      window.open(`https://wa.me/?text=${msg}`, "_blank");
    };

    const shareViaEmail = () => {
      if (!pinDriver?.accessPin) return;
      const subject = encodeURIComponent("Tus datos de acceso — Luxex Executive Ride");
      const body = encodeURIComponent(buildShareMessage(pinDriver).replace(/\*/g, ""));
      window.open(`mailto:${pinDriver.email ?? ""}?subject=${subject}&body=${body}`, "_blank");
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

    const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (!file.type.startsWith("image/")) { setPhotoError("Please select an image file."); return; }
      if (file.size > 5 * 1024 * 1024) { setPhotoError("Image must be under 5MB."); return; }
      setPhotoFile(file);
      setPhotoError("");
      const reader = new FileReader();
      reader.onload = ev => setPhotoPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    };

    const savePhoto = async () => {
      if (!photoDriver) return;
      setPhotoSaving(true); setPhotoError("");
      try {
        let finalUrl = photoUrl.trim();

        if (photoFile) {
          const uploadRes = await fetch("/api/storage/uploads/request-url", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("luxex_admin_token") ?? ""}` },
            body: JSON.stringify({ name: photoFile.name, size: photoFile.size, contentType: photoFile.type }),
          });
          if (!uploadRes.ok) throw new Error("Failed to get upload URL");
          const { uploadURL, objectPath } = await uploadRes.json();

          const putRes = await fetch(uploadURL, {
            method: "PUT",
            headers: { "Content-Type": photoFile.type },
            body: photoFile,
          });
          if (!putRes.ok) throw new Error("Failed to upload image");
          finalUrl = `/api/storage/public-objects/${objectPath.replace(/^\//, "")}`;
        }

        if (!finalUrl) { setPhotoError("Please upload a photo or enter a URL."); return; }

        const updated = await adminApi.drivers.updatePhoto(photoDriver.id, finalUrl);
        setDrivers(prev => prev.map(d => d.id === updated.id ? updated : d));
        setPhotoDriver(updated);
        setPhotoUrl(finalUrl);
      } catch (e: any) {
        setPhotoError(e?.message ?? "Failed to save photo.");
      } finally { setPhotoSaving(false); }
    };

    const removePhoto = async () => {
      if (!photoDriver || !confirm("Remove photo for this driver?")) return;
      setPhotoSaving(true); setPhotoError("");
      try {
        const updated = await adminApi.drivers.updatePhoto(photoDriver.id, "");
        setDrivers(prev => prev.map(d => d.id === updated.id ? updated : d));
        setPhotoDriver(updated);
        setPhotoUrl(""); setPhotoFile(null); setPhotoPreview(null);
      } catch (e: any) {
        setPhotoError(e?.message ?? "Failed to remove photo.");
      } finally { setPhotoSaving(false); }
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
                    {["Photo", "Name", "Phone", "License", "Vehicle", "Status", "Verification", "Rating", "Trips", "PIN", "Actions"].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-[10px] font-bold tracking-widest uppercase text-white/20 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={11} className="text-center py-10"><Loader2 className="w-5 h-5 animate-spin text-white/20 mx-auto" /></td></tr>
                  ) : drivers.length === 0 ? (
                    <tr><td colSpan={11} className="text-center py-10 text-white/20 text-xs">No drivers yet. Add the first one.</td></tr>
                  ) : drivers.map(d => {
                    const vehicle = vehicles.find(v => v.id === d.vehicleId);
                    const vs = d.verificationStatus ?? "pending";
                    return (
                      <tr key={d.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                        <td className="px-4 py-3">
                          <button type="button" onClick={() => openPhoto(d)} title="Manage photo"
                            className="relative w-9 h-9 border border-white/10 hover:border-[#F2E147]/40 transition-colors overflow-hidden group">
                            {d.photoUrl ? (
                              <img src={d.photoUrl} alt={d.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-white/[0.04] flex items-center justify-center">
                                <User className="w-4 h-4 text-white/20 group-hover:text-white/40 transition-colors" />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Camera className="w-3 h-3 text-white" />
                            </div>
                          </button>
                        </td>
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
                    { key: "licenseNumber" as const, label: "License Number", type: "text", placeholder: "D123456789" },
                  ].map(({ key, label, type, placeholder }) => (
                    <div key={key}>
                      <label className="block text-[10px] font-bold tracking-widest uppercase text-white/25 mb-1.5">{label}</label>
                      <input type={type} placeholder={placeholder} value={form[key] as string}
                        onChange={e => inp(key, e.target.value)}
                        className="w-full bg-[#111] border border-white/10 focus:border-[#F2E147] text-sm text-white placeholder-white/20 px-3 py-2.5 outline-none" />
                    </div>
                  ))}
                  <div>
                    <label className="block text-[10px] font-bold tracking-widest uppercase text-white/25 mb-1.5">Vehicle</label>
                    <select value={form.vehicleId ?? ""} onChange={e => inp("vehicleId", e.target.value ? Number(e.target.value) : null)}
                      className="w-full bg-[#111] border border-white/10 focus:border-[#F2E147] text-sm text-white px-3 py-2.5 outline-none">
                      <option value="">No vehicle assigned</option>
                      {vehicles.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold tracking-widest uppercase text-white/25 mb-1.5">Status</label>
                    <select value={form.status} onChange={e => inp("status", e.target.value)}
                      className="w-full bg-[#111] border border-white/10 focus:border-[#F2E147] text-sm text-white px-3 py-2.5 outline-none">
                      <option value="available">Available</option>
                      <option value="on_trip">On Trip</option>
                      <option value="off_duty">Off Duty</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold tracking-widest uppercase text-white/25 mb-1.5">Notes</label>
                    <textarea value={form.notes} onChange={e => inp("notes", e.target.value)} rows={2}
                      className="w-full bg-[#111] border border-white/10 focus:border-[#F2E147] text-sm text-white placeholder-white/20 px-3 py-2.5 outline-none resize-none" />
                  </div>
                  {saveError && <p className="text-xs text-red-400/80 bg-red-400/5 border border-red-400/10 px-3 py-2">{saveError}</p>}
                </div>
                <div className="px-5 pb-5 flex gap-2">
                  <button type="button" onClick={() => setModal(null)}
                    className="flex-1 px-4 py-2.5 text-[11px] font-bold tracking-widest uppercase border border-white/10 text-white/40 hover:text-white hover:border-white/30 transition-colors">
                    Cancel
                  </button>
                  <button type="button" onClick={save} disabled={saving}
                    className="flex-1 px-4 py-2.5 text-[11px] font-black tracking-widest uppercase text-black flex items-center justify-center gap-2 disabled:opacity-50"
                    style={{ background: YELLOW }}>
                    {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</> : "Save"}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}

          {modal === "photo" && photoDriver && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
              onClick={e => { if (e.target === e.currentTarget) setModal(null); }}>
              <motion.div initial={{ opacity: 0, scale: 0.97, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
                className="w-full max-w-sm bg-[#0a0a0a] border border-white/[0.07]">
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
                  <div>
                    <h3 className="font-black text-sm uppercase tracking-tight text-white">Profile Photo</h3>
                    <p className="text-white/30 text-xs mt-0.5">{photoDriver.name}</p>
                  </div>
                  <button type="button" onClick={() => setModal(null)} className="text-white/30 hover:text-white"><X className="w-4 h-4" /></button>
                </div>
                <div className="p-5 space-y-4">
                  <div className="flex flex-col items-center gap-3">
                    <div className="relative w-24 h-24 border border-white/10 overflow-hidden">
                      {photoPreview ? (
                        <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-white/[0.04] flex items-center justify-center">
                          <User className="w-10 h-10 text-white/15" />
                        </div>
                      )}
                    </div>
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoFileChange} className="hidden" />
                    <button type="button" onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 px-4 py-2 text-[11px] font-bold tracking-widest uppercase border border-white/15 text-white/60 hover:text-white hover:border-white/30 transition-colors">
                      <Camera className="w-3.5 h-3.5" /> Upload Photo
                    </button>
                    {photoFile && <p className="text-[10px] text-white/30">{photoFile.name}</p>}
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold tracking-widest uppercase text-white/25 mb-1.5">Or paste image URL</label>
                    <input type="url" placeholder="https://..." value={photoFile ? "" : photoUrl}
                      onChange={e => { setPhotoUrl(e.target.value); setPhotoFile(null); setPhotoPreview(e.target.value || null); }}
                      disabled={!!photoFile}
                      className="w-full bg-[#111] border border-white/10 focus:border-[#F2E147] text-sm text-white placeholder-white/20 px-3 py-2.5 outline-none disabled:opacity-30" />
                  </div>

                  {photoError && <p className="text-xs text-red-400/80 bg-red-400/5 border border-red-400/10 px-3 py-2">{photoError}</p>}
                </div>
                <div className="px-5 pb-5 flex gap-2">
                  {photoDriver.photoUrl && (
                    <button type="button" onClick={removePhoto} disabled={photoSaving}
                      className="px-4 py-2.5 text-[11px] font-bold tracking-widest uppercase border border-red-400/20 text-red-400/60 hover:text-red-400 hover:border-red-400/40 transition-colors disabled:opacity-40">
                      Remove
                    </button>
                  )}
                  <button type="button" onClick={() => setModal(null)}
                    className="flex-1 px-4 py-2.5 text-[11px] font-bold tracking-widest uppercase border border-white/10 text-white/40 hover:text-white hover:border-white/30 transition-colors">
                    Cancel
                  </button>
                  <button type="button" onClick={savePhoto} disabled={photoSaving || (!photoFile && !photoUrl.trim())}
                    className="flex-1 px-4 py-2.5 text-[11px] font-black tracking-widest uppercase text-black flex items-center justify-center gap-2 disabled:opacity-50"
                    style={{ background: YELLOW }}>
                    {photoSaving ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</> : "Save Photo"}
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
                className="w-full max-w-sm bg-[#0a0a0a] border border-white/[0.07]">
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
                  <div>
                    <h3 className="font-black text-sm uppercase tracking-tight text-white">PIN Management</h3>
                    <p className="text-white/30 text-xs mt-0.5">{pinDriver.name}</p>
                  </div>
                  <button type="button" onClick={() => setModal(null)} className="text-white/30 hover:text-white"><X className="w-4 h-4" /></button>
                </div>
                <div className="p-5 space-y-4">
                  <div className="flex items-center gap-3">
                    {pinDriver.photoUrl ? (
                      <img src={pinDriver.photoUrl} alt={pinDriver.name} className="w-10 h-10 border border-white/10 object-cover" />
                    ) : (
                      <div className="w-10 h-10 border border-white/10 bg-white/[0.04] flex items-center justify-center">
                        <User className="w-5 h-5 text-white/20" />
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-bold text-white">{pinDriver.name}</p>
                      <span className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1.5 border ${VERIFY_COLORS[pinDriver.verificationStatus ?? "pending"]}`}>
                        {VERIFY_ICONS[pinDriver.verificationStatus ?? "pending"]}
                        {pinDriver.verificationStatus ?? "pending"}
                      </span>
                    </div>
                    <div className="ml-auto flex gap-1.5">
                      <button type="button"
                        onClick={() => handleVerify(pinDriver.id, "verified")}
                        disabled={verifyBusy === pinDriver.id || pinDriver.verificationStatus === "verified"}
                        className="p-1.5 border border-emerald-400/20 text-emerald-400/60 hover:text-emerald-400 disabled:opacity-30 transition-colors">
                        <ShieldCheck className="w-3.5 h-3.5" />
                      </button>
                      <button type="button"
                        onClick={() => handleVerify(pinDriver.id, "rejected")}
                        disabled={verifyBusy === pinDriver.id || pinDriver.verificationStatus === "rejected"}
                        className="p-1.5 border border-red-400/20 text-red-400/40 hover:text-red-400 disabled:opacity-30 transition-colors">
                        <ShieldX className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-white/[0.04] pt-4">
                    <p className="text-[10px] font-bold tracking-widest uppercase text-white/20 mb-3">Access PIN</p>
                    {pinDriver.accessPin ? (
                      <div className="bg-white/[0.03] border border-white/[0.06] p-3 mb-3">
                        <p className="text-[10px] text-white/30 mb-1">Current PIN</p>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-lg font-black text-[#F2E147] tracking-widest">
                            {pinVisible ? pinDriver.accessPin : "•".repeat(pinDriver.accessPin.length)}
                          </span>
                          {pinDriver.pinGeneratedAt && (
                            <span className="text-[9px] text-white/20 ml-auto">
                              Generated {new Date(pinDriver.pinGeneratedAt).toLocaleDateString()}
                            </span>
                          )}
                          <button type="button" onClick={() => setPinVisible(v => !v)}
                            className="p-1 text-white/30 hover:text-white transition-colors"
                            title={pinVisible ? "Hide PIN" : "Show PIN"}>
                            {pinVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                          <button type="button" onClick={copyPin}
                            className="p-1 text-white/30 hover:text-white transition-colors"
                            title="Copy PIN">
                            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-3 mb-3">
                        <p className="text-white/30 text-sm">No PIN assigned yet.</p>
                        <p className="text-white/20 text-xs mt-1">Generate one below or set a custom PIN.</p>
                      </div>
                    )}

                    <button type="button" onClick={generatePin} disabled={pinSaving}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-[11px] font-black tracking-widest uppercase border border-[#F2E147]/20 text-[#F2E147]/70 hover:text-[#F2E147] hover:border-[#F2E147]/40 transition-colors disabled:opacity-40 mb-3">
                      {pinSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                      {pinDriver.accessPin ? "Regenerate PIN" : "Generate PIN"}
                    </button>

                    <label className="block text-[10px] font-bold tracking-widest uppercase text-white/20 mb-1.5">Set Custom PIN (4–10 digits)</label>
                    <div className="flex gap-2">
                      <input type="text" inputMode="numeric" maxLength={10} placeholder="e.g. 4729"
                        className="flex-1 bg-[#111] border border-white/10 focus:border-[#F2E147] text-sm text-white font-mono placeholder-white/20 px-3 py-2.5 outline-none"
                        value={customPin}
                        onChange={e => setCustomPin(e.target.value.replace(/\D/g, ""))} />
                      <button type="button" onClick={setCustomPinHandler} disabled={pinSaving || !customPin}
                        className="px-4 py-2.5 text-[11px] font-black tracking-widest uppercase text-black disabled:opacity-40"
                        style={{ background: customPin ? YELLOW : "#555" }}>
                        Set
                      </button>
                    </div>

                    {pinError && <p className="text-xs text-red-400/80 bg-red-400/5 border border-red-400/10 px-3 py-2 mt-3">{pinError}</p>}
                  </div>

                  {pinDriver.accessPin && (
                    <div className="border-t border-white/[0.04] pt-4 space-y-3">
                      <p className="text-[10px] font-bold tracking-widest uppercase text-white/20 flex items-center gap-1.5">
                        <Share2 className="w-3 h-3" /> Compartir Acceso
                      </p>
                      <div className="bg-white/[0.02] border border-white/[0.05] p-3 text-[11px] text-white/40 leading-relaxed font-mono whitespace-pre-line">
                        {`Hola ${pinDriver.name},\nPIN de acceso: ${pinVisible ? pinDriver.accessPin : "•".repeat(pinDriver.accessPin.length)}\nURL: https://luxexride.com/login`}
                      </div>
                      <div className="flex gap-2">
                        <button type="button" onClick={copyShareMessage}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-[10px] font-black tracking-widest uppercase border transition-colors"
                          style={msgCopied
                            ? { borderColor: "rgba(52,211,153,0.4)", color: "#34d399", background: "rgba(52,211,153,0.08)" }
                            : { borderColor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)", background: "transparent" }}
                          onMouseEnter={e => { if (!msgCopied) { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.25)"; (e.currentTarget as HTMLElement).style.color = "#fff"; } }}
                          onMouseLeave={e => { if (!msgCopied) { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.1)"; (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.5)"; } }}>
                          {msgCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          {msgCopied ? "Copiado!" : "Copiar mensaje"}
                        </button>
                        <button type="button" onClick={shareViaWhatsApp} title="Compartir por WhatsApp"
                          className="flex items-center justify-center gap-1.5 px-3 py-2 text-[10px] font-black tracking-widest uppercase border transition-colors"
                          style={{ borderColor: "rgba(37,211,102,0.3)", color: "rgba(37,211,102,0.8)", background: "rgba(37,211,102,0.05)" }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(37,211,102,0.12)"; (e.currentTarget as HTMLElement).style.color = "#25D366"; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(37,211,102,0.05)"; (e.currentTarget as HTMLElement).style.color = "rgba(37,211,102,0.8)"; }}>
                          <MessageCircle className="w-3 h-3" /> WA
                        </button>
                        <button type="button" onClick={shareViaEmail} title="Compartir por Email"
                          className="flex items-center justify-center gap-1.5 px-3 py-2 text-[10px] font-black tracking-widest uppercase border transition-colors"
                          style={{ borderColor: "rgba(96,165,250,0.25)", color: "rgba(96,165,250,0.7)", background: "rgba(96,165,250,0.05)" }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(96,165,250,0.12)"; (e.currentTarget as HTMLElement).style.color = "#60a5fa"; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(96,165,250,0.05)"; (e.currentTarget as HTMLElement).style.color = "rgba(96,165,250,0.7)"; }}>
                          <Mail className="w-3 h-3" /> Email
                        </button>
                      </div>
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
  