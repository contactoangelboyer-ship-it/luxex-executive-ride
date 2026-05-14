import { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutDashboard, Calendar, User, List, LogOut, Menu, X, ChevronRight } from "lucide-react";
import { logoutUser, type AuthUser } from "@/hooks/useAuth";

const YELLOW = "#F2E147";
const LOGO = "https://ik.imagekit.io/xnfnvsnut/1001351366-removebg-preview.png";

const PASSENGER_NAV = [
  { href: "/passenger/dashboard", label: "Dashboard",   icon: LayoutDashboard },
  { href: "/passenger/bookings",  label: "My Bookings", icon: Calendar },
  { href: "/passenger/profile",   label: "Profile",     icon: User },
];

const DRIVER_NAV = [
  { href: "/driver/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/driver/rides",     label: "My Rides",  icon: List },
  { href: "/driver/profile",   label: "Profile",   icon: User },
];

interface Props { user: AuthUser; children: React.ReactNode; onLogout: () => void; }

export function PortalLayout({ user, children, onLogout }: Props) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const nav = user.role === "driver" ? DRIVER_NAV : PASSENGER_NAV;

  const handleLogout = () => { logoutUser(); onLogout(); };

  const Sidebar = () => (
    <nav className="flex flex-col h-full" style={{ background: "#060606", borderRight: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="px-5 pt-6 pb-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <a href="/">
          <img src={LOGO} alt="Luxex" className="h-16 w-auto object-contain" />
        </a>
        <div className="mt-5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-black text-sm font-black shrink-0"
            style={{ background: YELLOW }}>
            {user.firstName[0]}{user.lastName[0]}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-white truncate">{user.firstName} {user.lastName}</p>
            <p className="text-xs capitalize" style={{ color: "rgba(255,255,255,0.4)" }}>{user.role}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {nav.map(item => {
          const Icon = item.icon;
          const active = location === item.href || location.startsWith(item.href + "/");
          return (
            <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}>
              <a className="flex items-center gap-3 px-3 py-2.5 transition-all duration-150"
                style={active
                  ? { background: "rgba(242,225,71,0.1)", color: YELLOW, borderLeft: `2px solid ${YELLOW}` }
                  : { color: "rgba(255,255,255,0.5)", borderLeft: "2px solid transparent" }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.color = "#fff"; }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.5)"; }}>
                <Icon className="w-4 h-4 shrink-0" />
                <span className="text-sm font-semibold">{item.label}</span>
                {active && <ChevronRight className="w-3.5 h-3.5 ml-auto" />}
              </a>
            </Link>
          );
        })}
      </div>

      <div className="px-3 py-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <button onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 transition-colors"
          style={{ color: "rgba(255,255,255,0.35)" }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#f87171"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.35)"; }}>
          <LogOut className="w-4 h-4" />
          <span className="text-sm font-semibold">Sign Out</span>
        </button>
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen flex" style={{ fontFamily: "'DM Sans', sans-serif", background: "#0c0c0c" }}>
      <div className="hidden lg:flex flex-col w-60 shrink-0 fixed top-0 bottom-0 left-0 z-30">
        <Sidebar />
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
            <motion.div initial={{ x: -240 }} animate={{ x: 0 }} exit={{ x: -240 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="fixed left-0 top-0 bottom-0 w-60 z-50 lg:hidden flex flex-col">
              <Sidebar />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col min-w-0 lg:ml-60">
        <div className="h-14 flex items-center justify-between px-4 lg:px-6 shrink-0 sticky top-0 z-20"
          style={{ background: "#0c0c0c", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="lg:hidden p-1 transition-colors"
              style={{ color: "rgba(255,255,255,0.4)" }}>
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-sm font-bold text-white">
              {nav.find(n => location === n.href || location.startsWith(n.href + "/"))?.label ?? "Portal"}
            </h1>
          </div>
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-black text-xs font-black"
            style={{ background: YELLOW }}>
            {user.firstName[0]}{user.lastName[0]}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
