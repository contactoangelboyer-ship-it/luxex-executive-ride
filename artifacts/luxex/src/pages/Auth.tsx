import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Loader2, ArrowLeft, Car, User, ChevronRight, KeyRound, Mail } from "lucide-react";
import { registerUser, loginUser, loginWithPin, setCurrentUser, type UserRole } from "@/hooks/useAuth";

type Mode = "select" | "login" | "register" | "pin-login";

const LOGO = "https://ik.imagekit.io/xnfnvsnut/1001351366-removebg-preview.png";
const YELLOW = "#C9A84C";
const BG = "#060606";

export default function Auth({ initialMode = "select" }: { initialMode?: Mode }) {
  const [, navigate] = useLocation();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [role, setRole] = useState<UserRole>("passenger");
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", phone: "", password: "", confirmPassword: "",
  });

  const [pin, setPin] = useState("");

  const set = (k: string, v: string) => { setForm(p => ({ ...p, [k]: v })); setError(""); };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const user = loginUser(form.email, form.password);
      setCurrentUser(user);
      navigate(user.role === "driver" ? "/driver/dashboard" : "/passenger/dashboard");
    } catch (err: any) {
      setError(err.message);
    } finally { setLoading(false); }
  };

  const handlePinLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const cleanPin = pin.replace(/\s/g, "");
      if (!/^\d{4,10}$/.test(cleanPin)) {
        setError("El PIN debe tener entre 4 y 10 dígitos.");
        setLoading(false);
        return;
      }
      const user = await loginWithPin(cleanPin);
      setCurrentUser(user);
      navigate("/driver/dashboard");
    } catch (err: any) {
      setError(err.message ?? "PIN incorrecto. Contacta a tu administrador.");
    } finally { setLoading(false); }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirmPassword) { setError("Passwords do not match."); return; }
    if (form.password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setLoading(true);
    try {
      const user = registerUser({ ...form, role });
      setCurrentUser(user);
      navigate(role === "driver" ? "/driver/dashboard" : "/passenger/dashboard");
    } catch (err: any) {
      setError(err.message);
    } finally { setLoading(false); }
  };

  const goBack = () => { setMode("select"); setError(""); setPin(""); };

  return (
    <div className="min-h-screen flex" style={{ fontFamily: "'DM Sans', sans-serif", background: BG }}>

      {/* ── Left panel — brand ── */}
      <div className="hidden lg:flex lg:w-[52%] flex-col relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #0a0a0a 0%, #111111 100%)" }}>
        <div className="absolute inset-0" style={{
          backgroundImage: "radial-gradient(circle at 30% 50%, rgba(201,168,76,0.06) 0%, transparent 60%)",
        }} />
        <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(201,168,76,0.3), transparent)" }} />

        <div className="relative z-10 flex flex-col h-full px-16 py-14">
          <a href="/">
            <img src={LOGO} alt="Luxex Executive Ride" className="h-40 w-auto object-contain" />
          </a>

          <div className="flex-1 flex flex-col justify-center">
            <div className="h-px w-12 mb-8" style={{ background: YELLOW }} />
            <p className="text-[11px] font-bold tracking-[0.25em] uppercase mb-4" style={{ color: YELLOW }}>
              Premium Chauffeur Service
            </p>
            <h2 className="text-5xl font-black leading-tight tracking-tighter text-white mb-6 uppercase">
              Always<br /><span style={{ color: YELLOW }}>on time.</span>
            </h2>
            <p className="text-[15px] font-light leading-relaxed max-w-xs" style={{ color: "rgba(255,255,255,0.75)" }}>
              Executive ground transportation for those who set the standard.
            </p>
          </div>

          <div className="flex items-center gap-6">
            {["Luxury Fleet", "24/7 Service", "Professional Drivers"].map((tag) => (
              <div key={tag} className="flex items-center gap-2">
                <div className="w-1 h-1 rounded-full" style={{ background: YELLOW }} />
                <span className="text-[11px] font-semibold tracking-wider uppercase" style={{ color: "rgba(255,255,255,0.65)" }}>{tag}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right panel — forms ── */}
      <div className="flex-1 flex flex-col min-h-screen" style={{ background: "#0c0c0c" }}>

        {/* Mobile logo */}
        <div className="lg:hidden flex items-center justify-between px-6 pt-8 pb-4">
          <a href="/">
            <img src={LOGO} alt="Luxex" className="h-28 w-auto object-contain" />
          </a>
          {mode !== "select" && (
            <button onClick={goBack}
              className="flex items-center gap-1 text-sm font-semibold hover:text-white transition-colors" style={{ color: "rgba(255,255,255,0.7)" }}>
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          )}
        </div>

        {/* Desktop back */}
        {mode !== "select" && (
          <div className="hidden lg:flex px-12 pt-10">
            <button onClick={goBack}
              className="flex items-center gap-1.5 text-sm font-semibold hover:text-white transition-colors" style={{ color: "rgba(255,255,255,0.65)" }}>
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          </div>
        )}

        <div className="flex-1 flex items-center justify-center px-6 py-10">
          <div className="w-full max-w-[400px]">
            <AnimatePresence mode="wait">

              {/* ── Select role ── */}
              {mode === "select" && (
                <motion.div key="select" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>

                  <div className="h-px w-8 mb-6" style={{ background: YELLOW }} />
                  <h1 className="text-3xl font-black text-white tracking-tight mb-1">Welcome back</h1>
                  <p className="text-sm mb-10" style={{ color: "rgba(255,255,255,0.7)" }}>Sign in to your Luxex account.</p>

                  <div className="space-y-3 mb-8">
                    <RoleCard
                      icon={<User className="w-5 h-5" />}
                      title="I'm a Passenger"
                      subtitle="Book rides and manage reservations"
                      onClick={() => { setRole("passenger"); setMode("login"); }}
                    />
                    <RoleCard
                      icon={<Car className="w-5 h-5" />}
                      title="I'm a Driver"
                      subtitle="Manage rides and your schedule"
                      onClick={() => { setRole("driver"); setMode("login"); }}
                    />
                    <RoleCard
                      icon={<KeyRound className="w-5 h-5" />}
                      title="Driver — Login with PIN"
                      subtitle="Access with the PIN assigned by your admin"
                      onClick={() => { setRole("driver"); setMode("pin-login"); }}
                      accent
                    />
                  </div>

                  <div className="flex items-center gap-3 mb-8">
                    <div className="flex-1 h-px bg-white/[0.06]" />
                    <span className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.5)" }}>or</span>
                    <div className="flex-1 h-px bg-white/[0.06]" />
                  </div>

                  <p className="text-center text-sm" style={{ color: "rgba(255,255,255,0.65)" }}>
                    New here?{" "}
                    <button onClick={() => setMode("register")}
                      className="font-bold hover:opacity-80 transition-opacity"
                      style={{ color: YELLOW }}>
                      Create an account
                    </button>
                  </p>
                </motion.div>
              )}

              {/* ── Login (email + password) ── */}
              {mode === "login" && (
                <motion.div key="login" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>

                  <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: YELLOW }}>
                      {role === "passenger"
                        ? <User className="w-[18px] h-[18px] text-black" />
                        : <Car className="w-[18px] h-[18px] text-black" />}
                    </div>
                    <div>
                      <h1 className="text-2xl font-black text-white tracking-tight">Sign In</h1>
                      <p className="text-xs capitalize tracking-wide" style={{ color: "rgba(255,255,255,0.65)" }}>{role} account</p>
                    </div>
                  </div>

                  <form onSubmit={handleLogin} className="space-y-4">
                    <DarkField label="Email address" type="email" value={form.email}
                      onChange={v => set("email", v)} placeholder="you@example.com" />
                    <DarkPasswordField label="Password" value={form.password}
                      onChange={v => set("password", v)} show={showPass} onToggle={() => setShowPass(!showPass)} />

                    <AnimatePresence>
                      {error && <ErrorMsg msg={error} />}
                    </AnimatePresence>

                    <YellowBtn loading={loading} label="Sign In" />
                  </form>

                  {role === "driver" && (
                    <div className="mt-5">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="flex-1 h-px bg-white/[0.06]" />
                        <span className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.4)" }}>or</span>
                        <div className="flex-1 h-px bg-white/[0.06]" />
                      </div>
                      <button type="button"
                        onClick={() => { setMode("pin-login"); setError(""); }}
                        className="w-full flex items-center justify-center gap-2 py-3 text-sm font-bold tracking-wide transition-all"
                        style={{ background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.2)", color: YELLOW }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(201,168,76,0.1)"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(201,168,76,0.06)"; }}>
                        <KeyRound className="w-4 h-4" />
                        Ingresar con PIN
                      </button>
                    </div>
                  )}

                  <p className="text-center text-sm mt-6" style={{ color: "rgba(255,255,255,0.65)" }}>
                    No account?{" "}
                    <button onClick={() => setMode("register")}
                      className="font-bold hover:opacity-80 transition-opacity"
                      style={{ color: YELLOW }}>
                      Register
                    </button>
                  </p>
                </motion.div>
              )}

              {/* ── PIN Login ── */}
              {mode === "pin-login" && (
                <motion.div key="pin-login" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>

                  <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 flex items-center justify-center flex-shrink-0"
                      style={{ background: YELLOW }}>
                      <KeyRound className="w-[18px] h-[18px] text-black" />
                    </div>
                    <div>
                      <h1 className="text-2xl font-black text-white tracking-tight">Acceso con PIN</h1>
                      <p className="text-xs tracking-wide" style={{ color: "rgba(255,255,255,0.65)" }}>Ingresa el PIN asignado por tu administrador</p>
                    </div>
                  </div>

                  <form onSubmit={handlePinLogin} className="space-y-4">
                    <div>
                      <label className="block text-[11px] font-bold tracking-wider uppercase mb-1.5" style={{ color: "rgba(255,255,255,0.65)" }}>
                        PIN de acceso
                      </label>
                      <input
                        type="password"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={10}
                        value={pin}
                        onChange={e => { setPin(e.target.value.replace(/\D/g, "")); setError(""); }}
                        placeholder="••••••"
                        required
                        autoComplete="one-time-code"
                        className="w-full px-4 py-3 text-2xl text-white font-mono tracking-[0.5em] text-center placeholder-white/20 outline-none transition-all duration-200"
                        style={{
                          background: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          borderRadius: 0,
                          letterSpacing: pin ? "0.5em" : undefined,
                        }}
                        onFocus={e => { (e.target as HTMLElement).style.borderColor = YELLOW; (e.target as HTMLElement).style.background = "rgba(201,168,76,0.04)"; }}
                        onBlur={e => { (e.target as HTMLElement).style.borderColor = "rgba(255,255,255,0.08)"; (e.target as HTMLElement).style.background = "rgba(255,255,255,0.04)"; }}
                      />
                      <p className="mt-1.5 text-[11px]" style={{ color: "rgba(255,255,255,0.35)" }}>
                        Solo números · 4 a 10 dígitos
                      </p>
                    </div>

                    <AnimatePresence>
                      {error && <ErrorMsg msg={error} />}
                    </AnimatePresence>

                    <YellowBtn loading={loading} label="Ingresar" />
                  </form>

                  <div className="mt-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex-1 h-px bg-white/[0.06]" />
                      <span className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.4)" }}>o también</span>
                      <div className="flex-1 h-px bg-white/[0.06]" />
                    </div>
                    <button type="button"
                      onClick={() => { setMode("login"); setRole("driver"); setError(""); setPin(""); }}
                      className="w-full flex items-center justify-center gap-2 py-3 text-sm font-bold tracking-wide transition-all"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.08)"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"; }}>
                      <Mail className="w-4 h-4" />
                      Ingresar con email y contraseña
                    </button>
                  </div>

                  <p className="text-center text-xs mt-6 px-4" style={{ color: "rgba(255,255,255,0.35)" }}>
                    Si no tienes un PIN, contacta a tu administrador para que te asigne uno.
                  </p>
                </motion.div>
              )}

              {/* ── Register ── */}
              {mode === "register" && (
                <motion.div key="register" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>

                  <div className="h-px w-8 mb-6" style={{ background: YELLOW }} />
                  <h1 className="text-2xl font-black text-white tracking-tight mb-1">Create Account</h1>
                  <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.7)" }}>Choose your role and fill in your details.</p>

                  {/* Role toggle */}
                  <div className="flex gap-2 mb-6 p-1 rounded-lg" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    {(["passenger", "driver"] as UserRole[]).map(r => (
                      <button key={r} onClick={() => setRole(r)}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-xs font-bold tracking-wide transition-all duration-200"
                        style={role === r
                          ? { background: YELLOW, color: "#000" }
                          : { color: "rgba(255,255,255,0.6)" }}>
                        {r === "passenger" ? <User className="w-3.5 h-3.5" /> : <Car className="w-3.5 h-3.5" />}
                        {r === "passenger" ? "Passenger" : "Driver"}
                      </button>
                    ))}
                  </div>

                  <form onSubmit={handleRegister} className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <DarkField label="First Name" value={form.firstName} onChange={v => set("firstName", v)} placeholder="John" />
                      <DarkField label="Last Name" value={form.lastName} onChange={v => set("lastName", v)} placeholder="Doe" />
                    </div>
                    <DarkField label="Email address" type="email" value={form.email}
                      onChange={v => set("email", v)} placeholder="you@example.com" />
                    <DarkField label="Phone" type="tel" value={form.phone}
                      onChange={v => set("phone", v)} placeholder="+1 (555) 000-0000" />
                    <DarkPasswordField label="Password" value={form.password}
                      onChange={v => set("password", v)} show={showPass} onToggle={() => setShowPass(!showPass)} />
                    <DarkPasswordField label="Confirm Password" value={form.confirmPassword}
                      onChange={v => set("confirmPassword", v)} show={showConfirm} onToggle={() => setShowConfirm(!showConfirm)} />

                    <AnimatePresence>
                      {error && <ErrorMsg msg={error} />}
                    </AnimatePresence>

                    <YellowBtn loading={loading} label="Create Account" />
                  </form>

                  <p className="text-center text-sm mt-6" style={{ color: "rgba(255,255,255,0.65)" }}>
                    Already have an account?{" "}
                    <button onClick={() => setMode("login")}
                      className="font-bold hover:opacity-80 transition-opacity"
                      style={{ color: YELLOW }}>
                      Sign in
                    </button>
                  </p>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </div>

        <footer className="px-6 py-5 text-center">
          <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.45)" }}>© 2025 Luxex Executive Ride. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
}

function RoleCard({ icon, title, subtitle, onClick, accent }: {
  icon: React.ReactNode; title: string; subtitle: string; onClick: () => void; accent?: boolean;
}) {
  return (
    <motion.button whileHover={{ x: 4 }} whileTap={{ scale: 0.98 }} onClick={onClick}
      className="w-full flex items-center gap-4 px-5 py-4 text-left transition-all duration-200 rounded-none group"
      style={{
        background: accent ? "rgba(201,168,76,0.04)" : "rgba(255,255,255,0.03)",
        border: accent ? "1px solid rgba(201,168,76,0.2)" : "1px solid rgba(255,255,255,0.07)",
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.borderColor = "rgba(201,168,76,0.4)";
        (e.currentTarget as HTMLElement).style.background = "rgba(201,168,76,0.07)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.borderColor = accent ? "rgba(201,168,76,0.2)" : "rgba(255,255,255,0.07)";
        (e.currentTarget as HTMLElement).style.background = accent ? "rgba(201,168,76,0.04)" : "rgba(255,255,255,0.03)";
      }}>
      <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-200"
        style={{ background: "rgba(201,168,76,0.1)", color: YELLOW }}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-white">{title}</p>
        <p className="text-xs" style={{ color: "rgba(255,255,255,0.7)" }}>{subtitle}</p>
      </div>
      <ChevronRight className="w-4 h-4 transition-colors flex-shrink-0" style={{ color: "rgba(255,255,255,0.5)" }} />
    </motion.button>
  );
}

function DarkField({ label, type = "text", value, onChange, placeholder }: {
  label: string; type?: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-[11px] font-bold tracking-wider uppercase mb-1.5" style={{ color: "rgba(255,255,255,0.65)" }}>
        {label}
      </label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} required
        className="w-full px-4 py-3 text-sm text-white placeholder-white/40 outline-none transition-all duration-200"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 0,
        }}
        onFocus={e => { (e.target as HTMLElement).style.borderColor = YELLOW; (e.target as HTMLElement).style.background = "rgba(201,168,76,0.04)"; }}
        onBlur={e => { (e.target as HTMLElement).style.borderColor = "rgba(255,255,255,0.08)"; (e.target as HTMLElement).style.background = "rgba(255,255,255,0.04)"; }}
      />
    </div>
  );
}

function DarkPasswordField({ label, value, onChange, show, onToggle }: {
  label: string; value: string; onChange: (v: string) => void; show: boolean; onToggle: () => void;
}) {
  return (
    <div>
      <label className="block text-[11px] font-bold tracking-wider uppercase mb-1.5" style={{ color: "rgba(255,255,255,0.65)" }}>
        {label}
      </label>
      <div className="relative">
        <input type={show ? "text" : "password"} value={value} onChange={e => onChange(e.target.value)} required
          className="w-full px-4 py-3 pr-11 text-sm text-white outline-none transition-all duration-200"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 0,
          }}
          onFocus={e => { (e.target as HTMLElement).style.borderColor = YELLOW; (e.target as HTMLElement).style.background = "rgba(201,168,76,0.04)"; }}
          onBlur={e => { (e.target as HTMLElement).style.borderColor = "rgba(255,255,255,0.08)"; (e.target as HTMLElement).style.background = "rgba(255,255,255,0.04)"; }}
        />
        <button type="button" onClick={onToggle}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors"
          style={{ color: "rgba(255,255,255,0.55)" }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = YELLOW; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.55)"; }}>
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

function ErrorMsg({ msg }: { msg: string }) {
  return (
    <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
      className="text-xs px-3 py-2.5"
      style={{ color: "#f87171", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.15)" }}>
      {msg}
    </motion.p>
  );
}

function YellowBtn({ loading, label }: { loading: boolean; label: string }) {
  return (
    <motion.button type="submit" disabled={loading} whileTap={!loading ? { scale: 0.98 } : {}}
      className="w-full py-3.5 text-sm font-black uppercase tracking-widest disabled:opacity-50 transition-all duration-200 flex items-center justify-center gap-2 mt-2"
      style={{ background: YELLOW, color: "#000", borderRadius: 0 }}
      onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLElement).style.background = "#ffffff"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = YELLOW; }}>
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {label}
    </motion.button>
  );
}
