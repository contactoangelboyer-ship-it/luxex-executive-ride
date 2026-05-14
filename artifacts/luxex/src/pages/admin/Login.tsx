import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { adminApi } from "@/lib/adminApi";

const YELLOW = "#F2E147";

export default function AdminLogin() {
  const [, navigate] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await adminApi.login(username, password);
      adminApi.setToken(data.token);
      navigate("/admin/dashboard");
    } catch (err: any) {
      setError(err.message ?? "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#060606] flex flex-col" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <header className="px-8 py-6">
        <a href="/">
          <img
            src="https://ik.imagekit.io/xnfnvsnut/1001351366-removebg-preview.png"
            alt="Luxex Executive Ride"
            className="h-12 w-auto object-contain drop-shadow-[0_0_14px_rgba(242,225,71,0.3)]"
          />
        </a>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-[380px]"
        >
          <div className="mb-8">
            <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/25 mb-2">Admin Access</p>
            <h1 className="text-2xl font-black text-white tracking-tight">Operations Center</h1>
            <p className="text-sm text-white/30 mt-1">Authorized personnel only.</p>
          </div>

          <div className="bg-[#0a0a0a] border border-white/[0.07] p-6">
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold tracking-widest uppercase text-white/25 mb-2">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={e => { setUsername(e.target.value); setError(""); }}
                  placeholder="admin"
                  required
                  autoFocus
                  autoComplete="username"
                  className="w-full bg-[#111] border border-white/10 focus:border-[#F2E147] px-4 py-3 text-sm text-white placeholder-white/20 outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold tracking-widest uppercase text-white/25 mb-2">Password</label>
                <div className="relative">
                  <input
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError(""); }}
                    placeholder="••••••••••"
                    required
                    autoComplete="current-password"
                    className="w-full bg-[#111] border border-white/10 focus:border-[#F2E147] px-4 py-3 pr-12 text-sm text-white placeholder-white/20 outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60 transition-colors"
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {error && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 px-3 py-2.5"
                  >
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 text-[11px] font-black tracking-widest uppercase text-black flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity mt-2"
                style={{ background: YELLOW }}
              >
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in…</> : "Sign In"}
              </button>
            </form>
          </div>

          <div className="mt-5 flex items-center justify-between px-1">
            <span className="text-[11px] text-white/20">Not an admin?</span>
            <a href="/login" className="text-[11px] font-bold text-white/30 hover:text-white/60 transition-colors">
              Passenger / Driver login →
            </a>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
