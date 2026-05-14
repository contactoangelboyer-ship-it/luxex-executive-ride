import { motion } from "framer-motion";
import { ArrowLeft, Phone } from "lucide-react";
import { BookingSystem } from "@/components/BookingSystem";

const YELLOW = "#F2E147";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#060606] text-white flex flex-col items-center justify-center px-6 relative overflow-hidden">
      <div className="absolute top-0 inset-x-0 h-[2px]" style={{ background: YELLOW }} />
      <div className="absolute inset-0 opacity-[0.03]"
        style={{ backgroundImage: "radial-gradient(circle at 50% 40%, #F2E147 0%, transparent 55%)" }} />

      <motion.div initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 text-center max-w-md">

        <a href="/">
          <img src="https://ik.imagekit.io/xnfnvsnut/1001351366-removebg-preview.png"
            alt="LuxEx" className="h-20 w-auto object-contain mx-auto mb-12 opacity-60 hover:opacity-100 transition-opacity" />
        </a>

        <p className="text-[110px] font-black leading-none tracking-tighter select-none"
          style={{ color: YELLOW, opacity: 0.1 }}>404</p>

        <div className="-mt-8 mb-4">
          <div className="w-8 h-[2px] mx-auto mb-4" style={{ background: YELLOW }} />
          <h1 className="text-2xl font-black tracking-tight">Page not found.</h1>
        </div>
        <p className="text-white/35 text-sm leading-relaxed mb-10">
          The page you're looking for doesn't exist or has been moved.<br />
          Let us take you back on track.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <a href="/" className="flex items-center gap-2 text-[11px] font-bold tracking-[0.15em] uppercase px-6 py-3 border border-white/15 hover:border-white/35 text-white/60 hover:text-white transition-all">
            <ArrowLeft className="w-3.5 h-3.5" />
            Go Home
          </a>
          <BookingSystem triggerClassName="text-[10px] font-bold tracking-[0.15em] uppercase px-6 py-3 bg-[#F2E147] text-black hover:bg-white transition-colors rounded-none" />
        </div>

        <div className="mt-10 pt-8 border-t border-white/[0.06]">
          <a href="tel:+18483888817" className="inline-flex items-center gap-2 text-xs text-white/25 hover:text-white/60 transition-colors">
            <Phone className="w-3.5 h-3.5" style={{ color: YELLOW + "66" }} />
            +1 (848) 388-8817 · Available 24/7
          </a>
        </div>
      </motion.div>
    </div>
  );
}
