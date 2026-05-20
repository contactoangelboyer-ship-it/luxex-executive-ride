import { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, ClipboardList, UserCog, Car, DollarSign,
  MapPin, Tag, LogOut, Menu, X, ChevronRight, BarChart3
} from "lucide-react";
import { adminApi } from "@/lib/adminApi";

const YELLOW = "#C9A84C";

const NAV = [
  { href: "/admin/dashboard", label: "Dashboard",   icon: LayoutDashboard },
  { href: "/admin/bookings",  label: "Bookings",     icon: ClipboardList   },
  { href: "/admin/drivers",   label: "Drivers",      icon: UserCog         },
  { href: "/admin/vehicles",  label: "Vehicles",     icon: Car             },
  { href: "/admin/pricing",   label: "Pricing",      icon: DollarSign      },
  { href: "/admin/zones",     label: "Zones",        icon: MapPin          },
  { href: "/admin/promos",    label: "Promotions",   icon: Tag             },
  { href: "/admin/reports",   label: "Reports",      icon: BarChart3       },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location, navigate] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const logout = () => { adminApi.logout(); navigate("/admin/login"); };

  const Sidebar = () => (
    <nav className="flex flex-col h-full">
      <div className="px-6 py-6 border-b border-white/[0.06]">
        <div className="flex flex-col gap-2">
          <img
            src="https://ik.imagekit.io/xnfnvsnut/1001351366-removebg-preview.png"
            alt="Luxex Executive Ride"
            className="h-16 w-auto object-contain drop-shadow-[0_0_14px_rgba(201,168,76,0.3)]"
          />
          <p className="text-[9px] tracking-widest uppercase text-white/25">Admin Panel</p>
        </div>
      </div>

      <div className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV.map(item => {
          const Icon = item.icon;
          const active = location === item.href || location.startsWith(item.href + "/");
          return (
            <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}>
              <a className={`flex items-center gap-3 px-3 py-2.5 transition-all duration-150 group ${active ? "bg-[#C9A84C]/10 text-[#C9A84C]" : "text-white/35 hover:text-white hover:bg-white/[0.04]"}`}>
                <Icon className="w-4 h-4 shrink-0" />
                <span className="text-xs font-semibold tracking-wide">{item.label}</span>
                {active && <ChevronRight className="w-3 h-3 ml-auto" />}
              </a>
            </Link>
          );
        })}
      </div>

      <div className="px-3 py-4 border-t border-white/[0.06]">
        <button onClick={logout} className="w-full flex items-center gap-3 px-3 py-2.5 text-white/25 hover:text-red-400 transition-colors">
          <LogOut className="w-4 h-4" />
          <span className="text-xs font-semibold tracking-wide">Sign Out</span>
        </button>
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen bg-[#060606] text-white flex" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="hidden lg:flex flex-col w-56 border-r border-white/[0.06] bg-[#0a0a0a] shrink-0">
        <Sidebar />
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
            <motion.div initial={{ x: -240 }} animate={{ x: 0 }} exit={{ x: -240 }} transition={{ duration: 0.25 }}
              className="fixed left-0 top-0 bottom-0 w-56 bg-[#0a0a0a] border-r border-white/[0.06] z-50 lg:hidden flex flex-col">
              <Sidebar />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="h-14 flex items-center justify-between px-4 lg:px-6 border-b border-white/[0.06] bg-[#0a0a0a] shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="lg:hidden text-white/40 hover:text-white p-1">
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-sm font-bold text-white/60">
              {NAV.find(n => location === n.href || location.startsWith(n.href + "/"))?.label ?? "Admin"}
            </h1>
          </div>
          <a href="/" target="_blank" className="text-[10px] font-bold tracking-widest uppercase text-white/20 hover:text-white/50 transition-colors hidden md:block">
            View Site →
          </a>
        </div>

        <div className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
