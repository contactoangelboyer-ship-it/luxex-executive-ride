import { useState, useEffect, useRef, useCallback } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  motion,
  useInView,
  AnimatePresence,
  useScroll,
  useTransform,
  useSpring,
  useMotionValue,
  animate,
} from "framer-motion";
import {
  ArrowRight, X, Menu, Phone, Mail, MapPin, ChevronDown,
  Plane, Briefcase, Clock, Calendar, Star, ChevronLeft,
  ChevronRight as ChevronRightIcon, Shield, Check, MessageCircle, Plus,
} from "lucide-react";
import { BookingSystem } from "@/components/BookingSystem";

const YELLOW = "#C9A84C";
const GOLD_GRADIENT = "linear-gradient(135deg, #8B6914 0%, #C9A84C 30%, #F0D060 55%, #D4AF37 80%, #B8860B 100%)";
const BG_IMG = "https://ik.imagekit.io/xnfnvsnut/12b7a4f0-708e-41f4-a2ec-82db1e5dc1ab.png?updatedAt=1775643651934";
const BG_IMG_MOBILE = "https://ik.imagekit.io/xnfnvsnut/tr:w-700,h-1100,fo-face,cm-extract/12b7a4f0-708e-41f4-a2ec-82db1e5dc1ab.png";

function CustomCursor() {
  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);
  const springX = useSpring(cursorX, { stiffness: 500, damping: 40 });
  const springY = useSpring(cursorY, { stiffness: 500, damping: 40 });
  const trailX = useSpring(cursorX, { stiffness: 120, damping: 28 });
  const trailY = useSpring(cursorY, { stiffness: 120, damping: 28 });
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const move = (e: MouseEvent) => { cursorX.set(e.clientX); cursorY.set(e.clientY); };
    const over = (e: MouseEvent) => { if ((e.target as HTMLElement).closest("a,button,[data-cursor]")) setHovered(true); };
    const out = () => setHovered(false);
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseover", over);
    window.addEventListener("mouseout", out);
    return () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseover", over); window.removeEventListener("mouseout", out); };
  }, [cursorX, cursorY]);

  return (
    <>
      <motion.div className="fixed top-0 left-0 z-[9999] pointer-events-none hidden lg:block"
        style={{ x: springX, y: springY, translateX: "-50%", translateY: "-50%" }}>
        <motion.div animate={{ scale: hovered ? 0 : 1 }} transition={{ duration: 0.15 }}
          className="w-1.5 h-1.5 rounded-full" style={{ background: YELLOW }} />
      </motion.div>
      <motion.div className="fixed top-0 left-0 z-[9998] pointer-events-none hidden lg:block"
        style={{ x: trailX, y: trailY, translateX: "-50%", translateY: "-50%" }}>
        <motion.div animate={{ scale: hovered ? 2.2 : 1, borderColor: hovered ? YELLOW : "rgba(201,168,76,0.3)" }}
          transition={{ duration: 0.25 }}
          className="w-8 h-8 rounded-full border" style={{ borderColor: "rgba(201,168,76,0.25)" }} />
      </motion.div>
    </>
  );
}

function ProgressBar() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 200, damping: 30 });
  return <motion.div className="fixed top-0 left-0 right-0 h-[2px] z-[9997] origin-left" style={{ scaleX, background: GOLD_GRADIENT }} />;
}

function CountUp({ to, suffix = "" }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  useEffect(() => {
    if (!inView || !ref.current) return;
    const ctrl = animate(0, to, {
      duration: 1.6, ease: "easeOut",
      onUpdate: (v) => { if (ref.current) ref.current.textContent = Math.floor(v) + suffix; },
    });
    return ctrl.stop;
  }, [inView, to, suffix]);
  return <span ref={ref}>0{suffix}</span>;
}

function Reveal({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 28 }} animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }} className={className}>
      {children}
    </motion.div>
  );
}

function Magnetic({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 200, damping: 20 });
  const sy = useSpring(y, { stiffness: 200, damping: 20 });

  const handleMove = useCallback((e: React.MouseEvent) => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    x.set((e.clientX - r.left - r.width / 2) * 0.35);
    y.set((e.clientY - r.top - r.height / 2) * 0.35);
  }, [x, y]);

  const handleLeave = useCallback(() => { x.set(0); y.set(0); }, [x, y]);

  return (
    <motion.div ref={ref} style={{ x: sx, y: sy }} onMouseMove={handleMove} onMouseLeave={handleLeave}>
      {children}
    </motion.div>
  );
}

const TESTIMONIALS = [
  {
    name: "Michael R.",
    role: "VP of Operations, Goldman Sachs",
    location: "New York, NY",
    rating: 5,
    text: "I've used every luxury car service in the tristate area over the past 15 years. Luxex is in a different class. The driver was at the terminal before my flight landed — not circling, actually there. Immaculate S-Class, no small talk unless I wanted it. This is how executive transportation should work.",
    date: "March 2025",
    initial: "M",
  },
  {
    name: "Sandra L.",
    role: "Managing Director, BlackRock",
    location: "Hoboken, NJ",
    rating: 5,
    text: "Our firm uses Luxex for all client-facing airport runs and board dinner transfers. Zero missed pickups in 18 months. The vehicles are spotless and the chauffeurs understand discretion. When you're moving clients worth nine figures, you can't afford to cut corners on transport.",
    date: "January 2025",
    initial: "S",
  },
  {
    name: "James T.",
    role: "Founder & CEO",
    location: "Westchester, NY",
    rating: 5,
    text: "Flew in from London at 2am, my regular driver canceled last minute. Called Luxex on a whim — had an Escalade at JFK in 28 minutes. Professional, clean, quiet. I was responding to emails the whole ride. Switched our entire executive team over the next day.",
    date: "February 2025",
    initial: "J",
  },
  {
    name: "Elena V.",
    role: "Event Director, Private Events NYC",
    location: "Manhattan, NY",
    rating: 5,
    text: "We coordinated 14 VIP transfers over a single gala weekend and Luxex executed every single one on time and to standard. Their fleet coordinator was responsive throughout. I've already locked them in for our fall season. Absolutely the best in the region.",
    date: "April 2025",
    initial: "E",
  },
  {
    name: "David M.",
    role: "Partner, Sullivan & Cromwell LLP",
    location: "Short Hills, NJ",
    rating: 5,
    text: "Fixed pricing was the dealbreaker for me. I was tired of surge charges showing up on my card after business dinners. With Luxex, I know exactly what I'm paying before I step in the car. The value for the quality is exceptional.",
    date: "March 2025",
    initial: "D",
  },
  {
    name: "Priya K.",
    role: "Chief of Staff",
    location: "Greenwich, CT",
    rating: 5,
    text: "I schedule all travel for our executive team. Luxex is the only car service where I've never had to follow up. Confirmations come instantly, driver info arrives an hour before pickup, and there's always someone reachable. It runs itself.",
    date: "February 2025",
    initial: "P",
  },
];

function TestimonialsSection() {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(0);
  const autoRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const resetAuto = () => {
    if (autoRef.current) clearInterval(autoRef.current);
    autoRef.current = setInterval(() => {
      setDirection(1);
      setCurrent(c => (c + 1) % TESTIMONIALS.length);
    }, 6000);
  };

  useEffect(() => {
    resetAuto();
    return () => { if (autoRef.current) clearInterval(autoRef.current); };
  }, []);

  const go = (dir: number) => {
    setDirection(dir);
    setCurrent(c => (c + dir + TESTIMONIALS.length) % TESTIMONIALS.length);
    resetAuto();
  };

  const t = TESTIMONIALS[current];

  const variants = {
    enter: (d: number) => ({ x: d > 0 ? 60 : -60, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? -60 : 60, opacity: 0 }),
  };

  return (
    <section id="testimonials" className="bg-[#060606] py-28 md:py-36 px-6 lg:px-20 overflow-hidden">
      <div className="max-w-[1280px] mx-auto">
        <Reveal className="mb-16">
          <p className="text-[11px] font-bold tracking-[0.25em] uppercase mb-4" style={{ color: YELLOW }}>Client Reviews</p>
          <h2 className="font-black uppercase leading-[0.92] tracking-tight mb-5" style={{ fontSize: "clamp(2.5rem,6vw,5rem)" }}>
            Trusted by<br />executives.
          </h2>
          <div className="flex items-center gap-3">
            <div className="flex gap-0.5">
              {Array(5).fill(null).map((_, i) => (
                <Star key={i} className="w-3.5 h-3.5 fill-current" style={{ color: YELLOW }} />
              ))}
            </div>
            <span className="text-[11px] text-white/40 font-light tracking-wide">Verified client reviews · 4.9 avg</span>
            <a href="https://g.page/r/luxexride/review" target="_blank" rel="noopener noreferrer"
              className="text-[10px] font-semibold tracking-[0.15em] uppercase text-white/20 hover:text-white/50 transition-colors border-b border-white/10 hover:border-white/30 pb-px">
              Leave a review
            </a>
          </div>
        </Reveal>

        <div className="relative">
          <div className="overflow-hidden">
            <AnimatePresence custom={direction} mode="wait">
              <motion.div
                key={current}
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-10 lg:gap-20"
              >
                <div className="flex flex-col gap-7">
                  <div className="flex gap-1">
                    {Array(t.rating).fill(null).map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-current" style={{ color: YELLOW }} />
                    ))}
                  </div>
                  <blockquote className="font-light leading-relaxed text-white/85" style={{ fontSize: "clamp(1rem,2.2vw,1.25rem)" }}>
                    "{t.text}"
                  </blockquote>
                  <div className="flex items-center gap-4 pt-2 border-t border-white/[0.06]">
                    <div className="w-11 h-11 rounded-full flex items-center justify-center font-black text-black text-sm shrink-0"
                      style={{ background: GOLD_GRADIENT }}>
                      {t.initial}
                    </div>
                    <div>
                      <p className="font-bold text-sm text-white">{t.name}</p>
                      <p className="text-xs text-white/45 font-light">{t.role} · {t.location}</p>
                    </div>
                    <p className="text-[10px] text-white/25 ml-auto font-light tracking-wide">{t.date}</p>
                  </div>
                </div>

                <div className="hidden lg:flex flex-col gap-3 justify-center">
                  {TESTIMONIALS.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => { setDirection(i > current ? 1 : -1); setCurrent(i); resetAuto(); }}
                      className="w-1 rounded-full transition-all duration-300 focus:outline-none"
                      style={{
                        height: i === current ? 32 : 12,
                        background: i === current ? YELLOW : "rgba(255,255,255,0.15)",
                      }}
                    />
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="flex items-center justify-between mt-10 pt-8 border-t border-white/[0.05]">
            <div className="flex gap-3">
              <button
                onClick={() => go(-1)}
                className="w-10 h-10 flex items-center justify-center border border-white/10 text-white/50 hover:text-white hover:border-white/30 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => go(1)}
                className="w-10 h-10 flex items-center justify-center border border-white/10 text-white/50 hover:text-white hover:border-white/30 transition-colors"
              >
                <ChevronRightIcon className="w-4 h-4" />
              </button>
            </div>
            <div className="flex gap-2 lg:hidden">
              {TESTIMONIALS.map((_, i) => (
                <button key={i} onClick={() => { setDirection(i > current ? 1 : -1); setCurrent(i); resetAuto(); }}
                  className="w-6 h-1 rounded-full transition-all duration-300"
                  style={{ background: i === current ? YELLOW : "rgba(255,255,255,0.15)" }} />
              ))}
            </div>
            <p className="text-[11px] font-semibold tracking-widest uppercase text-white/25">
              {current + 1} / {TESTIMONIALS.length}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  const steps = [
    {
      n: "01",
      title: "Reserve Online",
      desc: "Book in under 2 minutes. Choose your service, vehicle, pickup and drop-off. Fixed pricing shown upfront — no surprises.",
      icon: <Calendar className="w-5 h-5" />,
    },
    {
      n: "02",
      title: "We Confirm Instantly",
      desc: "A confirmation code hits your inbox right away. If you booked an airport transfer, we start monitoring your flight in real time.",
      icon: <Check className="w-5 h-5" />,
    },
    {
      n: "03",
      title: "Your Chauffeur Arrives",
      desc: "Professional, suited chauffeur arrives early. Track them live. No waiting, no circling. Meet-and-greet at the gate on request.",
      icon: <MapPin className="w-5 h-5" />,
    },
  ];

  return (
    <section className="bg-[#0a0a0a] py-28 md:py-36 px-6 lg:px-20">
      <div className="max-w-[1280px] mx-auto">
        <Reveal className="mb-16">
          <p className="text-[11px] font-bold tracking-[0.25em] uppercase mb-4" style={{ color: YELLOW }}>How It Works</p>
          <h2 className="font-black uppercase leading-[0.92] tracking-tight" style={{ fontSize: "clamp(2.5rem,6vw,5rem)" }}>
            Simple.<br />Effortless.
          </h2>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-white/[0.04]">
          {steps.map((s, i) => (
            <Reveal key={i} delay={i * 0.12}>
              <div className="bg-[#0a0a0a] p-10 group">
                <div className="flex items-start justify-between mb-8">
                  <span className="font-black text-[11px] tracking-widest" style={{ color: YELLOW }}>{s.n}</span>
                  <motion.span
                    className="text-white/20 group-hover:text-[#C9A84C] transition-colors duration-300"
                    whileHover={{ scale: 1.1 }}
                  >
                    {s.icon}
                  </motion.span>
                </div>
                <h3 className="font-black text-xl uppercase tracking-tight text-white mb-4 group-hover:text-[#C9A84C] transition-colors duration-300">
                  {s.title}
                </h3>
                <p className="text-sm text-white/55 font-light leading-relaxed">{s.desc}</p>
                <motion.div className="h-px mt-8 origin-left" style={{ background: GOLD_GRADIENT }}
                  initial={{ scaleX: 0 }}
                  whileInView={{ scaleX: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, delay: i * 0.15, ease: [0.22, 1, 0.36, 1] }} />
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function TrustBadges() {
  const badges = [
    { icon: <Shield className="w-5 h-5" />, label: "Fully Licensed & Insured" },
    { icon: <Star className="w-5 h-5" />, label: "Background-Checked Chauffeurs" },
    { icon: <Check className="w-5 h-5" />, label: "Fixed Rates — No Surge Pricing" },
    { icon: <Plane className="w-5 h-5" />, label: "Live Flight Tracking" },
    { icon: <Clock className="w-5 h-5" />, label: "24 / 7 Availability" },
    { icon: <MapPin className="w-5 h-5" />, label: "NY · NJ · CT · PA Coverage" },
  ];

  return (
    <div className="border-y border-white/[0.05] py-8 px-6 lg:px-20 overflow-x-auto">
      <div className="max-w-[1280px] mx-auto flex items-center justify-between gap-8 min-w-max px-2">
        {badges.map((b, i) => (
          <div key={i} className="flex items-center gap-2.5 text-white/40 shrink-0">
            <span style={{ color: YELLOW }}>{b.icon}</span>
            <span className="text-[11px] font-semibold tracking-wide whitespace-nowrap">{b.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function WhatsAppFloat() {
  return (
    <motion.a
      href="https://wa.me/18483888817"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Contact via WhatsApp"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 2.5, type: "spring", stiffness: 260, damping: 20 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      className="fixed right-5 z-50 rounded-full flex items-center justify-center shadow-2xl"
      style={{ background: "#25D366", width: 52, height: 52, bottom: "88px" }}
    >
      <MessageCircle className="w-6 h-6 text-white fill-white" />
    </motion.a>
  );
}

function LoadingScreen({ onDone }: { onDone: () => void }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setTimeout(onDone, 1800);
    const id = setInterval(() => setProgress(p => Math.min(p + 6, 100)), 60);
    return () => { clearTimeout(timer); clearInterval(id); };
  }, [onDone]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.02 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-0 z-[10000] flex flex-col items-center justify-center"
      style={{ background: "#030303" }}
    >
      <motion.img
        src="https://ik.imagekit.io/xnfnvsnut/1001351366-removebg-preview.png"
        alt="Luxex Executive Ride"
        initial={{ opacity: 0, y: 12, scale: 0.92 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="h-28 md:h-36 w-auto object-contain mb-14"
        style={{ filter: "drop-shadow(0 0 36px rgba(201,168,76,0.45))" }}
      />
      <div className="w-44 h-[2px] bg-white/5 overflow-hidden">
        <motion.div
          className="h-full"
          style={{ background: GOLD_GRADIENT, width: `${progress}%` }}
        />
      </div>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-[10px] font-bold tracking-[0.3em] uppercase mt-5"
        style={{ color: "rgba(255,255,255,0.2)" }}
      >
        Executive Ride
      </motion.p>
    </motion.div>
  );
}

const FAQS = [
  { q: "How far in advance do I need to book?", a: "We recommend booking at least 2 hours in advance. For airport transfers, 24 hours is ideal so we can monitor your flight. Last-minute bookings are accommodated based on availability — call us directly for urgent requests." },
  { q: "What happens if my flight is delayed?", a: "We track your flight in real time using live flight data. If your flight is delayed, we automatically adjust your pickup time at no extra charge. Our chauffeur will be there when you land — not when you were scheduled to land." },
  { q: "Is the pricing really fixed — no surge charges?", a: "Absolutely. The price you see before booking is the exact price you pay. We never apply surge pricing regardless of time, demand, weather, or traffic. Fixed rates, always." },
  { q: "What areas do you serve?", a: "We operate throughout New Jersey, New York, Connecticut, and Pennsylvania. We cover all major airports (JFK, EWR, LGA, PHL) and corporate hubs in Manhattan, Hoboken, Stamford, Greenwich, Philadelphia, and more." },
  { q: "Can I request a specific vehicle?", a: "Yes. Choose from our Executive Sedan (Mercedes S-Class / BMW 7 Series), Luxury SUV (Cadillac Escalade / Lincoln Navigator), or Premium Van (Mercedes Sprinter Executive). Your vehicle is confirmed at booking." },
  { q: "Do you offer corporate accounts?", a: "Yes. We work with companies to set up managed corporate accounts with consolidated monthly invoicing, ride reporting, and priority dispatch. Contact us at info@luxexride.com to get started." },
];

function FAQSection() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section id="faq" className="bg-[#030303] py-28 md:py-36 px-6 lg:px-20">
      <div className="max-w-[1280px] mx-auto">
        <Reveal className="mb-16">
          <p className="text-[11px] font-bold tracking-[0.25em] uppercase mb-4" style={{ color: YELLOW }}>FAQ</p>
          <h2 className="font-black uppercase leading-[0.92] tracking-tight" style={{ fontSize: "clamp(2.5rem,6vw,5rem)" }}>
            Common<br />questions.
          </h2>
        </Reveal>

        <div className="divide-y divide-white/[0.05]">
          {FAQS.map((faq, i) => (
            <div key={i}>
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-start justify-between gap-6 py-7 text-left group"
              >
                <h3 className="font-bold text-base md:text-lg text-white group-hover:text-[#C9A84C] transition-colors duration-200 leading-snug">
                  {faq.q}
                </h3>
                <motion.div
                  animate={{ rotate: open === i ? 45 : 0 }}
                  transition={{ duration: 0.25 }}
                  className="shrink-0 mt-1"
                >
                  <Plus className="w-4 h-4 text-white/30 group-hover:text-[#C9A84C] transition-colors duration-200" />
                </motion.div>
              </button>
              <AnimatePresence>
                {open === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden"
                  >
                    <p className="pb-8 text-sm text-white/55 font-light leading-relaxed max-w-[680px]">
                      {faq.a}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>

        <Reveal className="mt-16 pt-10 border-t border-white/[0.05]">
          <p className="text-sm text-white/50 font-light mb-4">Still have questions? We're available 24/7.</p>
          <div className="flex flex-wrap gap-4">
            <a href="tel:+18483888817"
              className="flex items-center gap-2 text-[11px] font-bold tracking-[0.15em] uppercase px-5 py-3 border border-white/10 text-white/70 hover:border-[#C9A84C]/40 hover:text-white transition-colors">
              <Phone className="w-3.5 h-3.5" style={{ color: YELLOW }} />
              +1 (848) 388-8817
            </a>
            <a href="https://wa.me/18483888817" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 text-[11px] font-bold tracking-[0.15em] uppercase px-5 py-3 border border-white/10 text-white/70 hover:border-[#C9A84C]/40 hover:text-white transition-colors">
              <MessageCircle className="w-3.5 h-3.5" style={{ color: YELLOW }} />
              WhatsApp
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function ServiceAreasSection() {
  const areas = [
    { state: "New Jersey", cities: "Newark · Hoboken · Jersey City · Princeton · Short Hills · Morristown", abbr: "NJ" },
    { state: "New York", cities: "Manhattan · Brooklyn · Queens · Westchester · Long Island · Buffalo", abbr: "NY" },
    { state: "Connecticut", cities: "Stamford · Greenwich · Hartford · New Haven · Fairfield · Bridgeport", abbr: "CT" },
    { state: "Pennsylvania", cities: "Philadelphia · Pittsburgh · Allentown · King of Prussia · Wayne", abbr: "PA" },
  ];

  return (
    <section className="bg-[#060606] py-20 px-6 lg:px-20 border-t border-white/[0.04]">
      <div className="max-w-[1280px] mx-auto">
        <Reveal className="mb-12">
          <p className="text-[11px] font-bold tracking-[0.25em] uppercase mb-4" style={{ color: YELLOW }}>Coverage</p>
          <h2 className="font-black uppercase leading-[0.92] tracking-tight" style={{ fontSize: "clamp(2rem,4vw,3.5rem)" }}>
            Where we operate.
          </h2>
        </Reveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-white/[0.04]">
          {areas.map((a, i) => (
            <Reveal key={i} delay={i * 0.08}>
              <div className="bg-[#060606] p-8 group hover:bg-[#0a0a0a] transition-colors duration-300">
                <p className="font-black text-5xl mb-4 transition-colors duration-300 group-hover:text-[#C9A84C]"
                  style={{ color: "rgba(255,255,255,0.08)" }}>
                  {a.abbr}
                </p>
                <h3 className="font-black text-base uppercase tracking-tight text-white mb-3">{a.state}</h3>
                <p className="text-xs text-white/35 font-light leading-relaxed">{a.cities}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal className="mt-8">
          <p className="text-[11px] text-white/25 font-light tracking-wide">
            <MapPin className="w-3 h-3 inline mr-1.5" style={{ color: YELLOW }} />
            All major airports covered — JFK · EWR · LGA · PHL · BOS · PIT
          </p>
        </Reveal>
      </div>
    </section>
  );
}

export default function Landing() {
  const isMobile = useIsMobile();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showSticky, setShowSticky] = useState(false);
  const [cookieDismissed, setCookieDismissed] = useState(() => {
    try { return !!localStorage.getItem("luxex_cookies"); } catch { return false; }
  });
  const [cookieVisible, setCookieVisible] = useState(false);
  const acceptCookies = () => {
    try { localStorage.setItem("luxex_cookies", "1"); } catch {}
    setCookieDismissed(true);
  };
  const [activeService, setActiveService] = useState<number | null>(null);
  const [showLoading, setShowLoading] = useState(() => !sessionStorage.getItem("luxex_loaded"));
  const heroRef = useRef<HTMLElement>(null);
  const { scrollY } = useScroll();
  const bgY = useTransform(scrollY, [0, 600], [0, 120]);

  const handleLoadDone = useCallback(() => {
    sessionStorage.setItem("luxex_loaded", "1");
    setShowLoading(false);
  }, []);

  useEffect(() => {
    document.documentElement.classList.add("dark");
    if (!cookieDismissed) { const t = setTimeout(() => setCookieVisible(true), 3500); return () => clearTimeout(t); }
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (!isTouch) document.body.style.cursor = "none";
    const fn = () => {
      setScrolled(window.scrollY > 50);
      setShowSticky(window.scrollY > window.innerHeight * 0.8);
    };
    window.addEventListener("scroll", fn);
    return () => { window.removeEventListener("scroll", fn); document.body.style.cursor = ""; };
  }, []);

  const services = [
    { n: "01", title: "Airport Transfers", body: "Real-time flight tracking. Terminal meet-and-greet. Zero downtime.", detail: "We track your flight live. If it's delayed, we adjust. If it lands early, we're already there. JFK, EWR, LGA, and all major airports.", icon: <Plane className="w-5 h-5" /> },
    { n: "02", title: "Corporate Travel", body: "Discreet, reliable service for executives, meetings, and roadshows.", detail: "Onboarding, roadshows, board meetings. Your time in the car is productive time. Wi-Fi equipped, privacy guaranteed.", icon: <Briefcase className="w-5 h-5" /> },
    { n: "03", title: "Hourly Service", body: "Your personal chauffeur, on-call for the full duration of your day.", detail: "Multi-stop itineraries, client entertainment, city tours. One chauffeur, your full schedule, total flexibility.", icon: <Clock className="w-5 h-5" /> },
    { n: "04", title: "Special Events", body: "Galas, celebrations, and private occasions handled with full discretion.", detail: "Weddings, galas, VIP events. Fleet coordination for large groups. Arrive exactly as you intend to.", icon: <Calendar className="w-5 h-5" /> },
  ];

  const fleet = [
    {
      type: "Executive Sedan",
      models: "2025 Mercedes-Benz S580 · BMW 7 Series · Genesis G90",
      pax: "Up to 3 Passengers",
      lug: "3 Bags",
      tag: "Most Popular",
      img: "/fleet_sedan.png",
      fallbackImg: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800&q=80",
    },
    {
      type: "Luxury SUV",
      models: "2025 Cadillac Escalade · Lincoln Navigator · GMC Yukon Denali",
      pax: "Up to 6 Passengers",
      lug: "6 Bags",
      tag: "",
      img: "/fleet_suv.png",
      fallbackImg: "https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800&q=80",
    },
    {
      type: "Premium Van",
      models: "2026 Mercedes Sprinter Executive",
      pax: "Up to 14 Passengers",
      lug: "10 Bags",
      tag: "Groups",
      img: "/fleet_van.png",
      fallbackImg: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80",
    },
  ];

  return (
    <>
      <AnimatePresence>
        {showLoading && <LoadingScreen onDone={handleLoadDone} />}
      </AnimatePresence>

      <div className="bg-[#060606] text-white min-h-screen" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <CustomCursor />
      <ProgressBar />
      <WhatsAppFloat />

      <header className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${scrolled ? "bg-[#060606]/95 backdrop-blur-md" : ""}`}>
        <div className="max-w-[1280px] mx-auto px-6 lg:px-12 flex items-center justify-between h-[88px] md:h-[96px]">
          <a href="#" className="flex items-center group">
            <motion.img
              src="https://ik.imagekit.io/xnfnvsnut/1001351366-removebg-preview.png"
              alt="Luxex Executive Ride"
              whileHover={{ scale: 1.04 }}
              transition={{ duration: 0.2 }}
              className="h-24 sm:h-28 md:h-28 w-auto object-contain drop-shadow-[0_0_22px_rgba(201,168,76,0.45)]"
            />
          </a>

          <nav className="hidden md:flex items-center gap-8">
            {["Services", "Fleet", "FAQ"].map((l) => (
              <a key={l} href={`#${l.toLowerCase()}`}
                className="relative text-[11px] font-semibold tracking-[0.18em] uppercase text-white/60 hover:text-white transition-colors duration-200 group">
                {l}
                <span className="absolute -bottom-0.5 left-0 h-px w-0 group-hover:w-full transition-all duration-300" style={{ background: YELLOW }} />
              </a>
            ))}
            <a href="/about"
              className="relative text-[11px] font-semibold tracking-[0.18em] uppercase text-white/60 hover:text-white transition-colors duration-200 group">
              About
              <span className="absolute -bottom-0.5 left-0 h-px w-0 group-hover:w-full transition-all duration-300" style={{ background: YELLOW }} />
            </a>
            <a href="/track"
              className="relative text-[11px] font-semibold tracking-[0.18em] uppercase transition-colors duration-200 group"
              style={{ color: YELLOW + "cc" }}>
              Track Booking
              <span className="absolute -bottom-0.5 left-0 h-px w-0 group-hover:w-full transition-all duration-300" style={{ background: YELLOW }} />
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <a href="/login" className="hidden md:flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.15em] uppercase text-white/50 hover:text-white transition-colors duration-200">
              Sign In
            </a>
            <BookingSystem triggerClassName="hidden md:block text-[11px] font-bold tracking-[0.15em] uppercase px-6 py-2.5 btn-gold text-black transition-colors duration-200 rounded-none" />
            <motion.button whileTap={{ scale: 0.92 }} onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden w-9 h-9 flex items-center justify-center border border-white/10 text-white/60 hover:text-white">
              {menuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </motion.button>
          </div>
        </div>

        <AnimatePresence>
          {menuOpen && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-[#0a0a0a] border-t border-white/5 px-6 py-8 flex flex-col gap-6 overflow-hidden">
              {["Services", "Fleet", "FAQ"].map((l, i) => (
                <motion.a key={l} href={`#${l.toLowerCase()}`} onClick={() => setMenuOpen(false)}
                  initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                  className="text-sm font-semibold tracking-[0.18em] uppercase text-white/65 hover:text-white transition-colors">{l}</motion.a>
              ))}
              <motion.a href="/about" onClick={() => setMenuOpen(false)}
                initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.18 }}
                className="text-sm font-semibold tracking-[0.18em] uppercase text-white/65 hover:text-white transition-colors">About</motion.a>
              <motion.a href="/track" onClick={() => setMenuOpen(false)}
                initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.22 }}
                className="text-sm font-semibold tracking-[0.18em] uppercase" style={{ color: YELLOW }}>Track Booking</motion.a>
              <BookingSystem triggerClassName="w-fit text-[11px] font-bold tracking-[0.15em] uppercase px-6 py-3 bg-[#C9A84C] text-black rounded-none" />
              <div className="border-t border-white/5 pt-4 mt-2 flex flex-col gap-3">
                <motion.a href="/login" onClick={() => setMenuOpen(false)}
                  initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.28 }}
                  className="text-[11px] font-semibold tracking-[0.18em] uppercase text-white/50 hover:text-white transition-colors">
                  Sign In / Register
                </motion.a>
                <motion.a href="/admin/login" onClick={() => setMenuOpen(false)}
                  initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.32 }}
                  className="text-[11px] font-semibold tracking-[0.18em] uppercase text-white/20 hover:text-white/40 transition-colors">
                  Admin Login
                </motion.a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ── Hero ── */}
      <section ref={heroRef} className="relative min-h-[100svh] grid lg:grid-cols-2 overflow-hidden">
        <div className="absolute inset-0 z-0 overflow-hidden">
          {/* Mobile image: ImageKit auto-crops to portrait, focusing on the subject */}
          <motion.img
            src={isMobile ? BG_IMG_MOBILE : BG_IMG}
            alt=""
            style={{ y: bgY }}
            className="w-full h-full object-cover object-center absolute inset-0"
          />
          {/* Mobile gradient: dark top (nav), clear middle (driver), dark bottom (text) */}
          <div
            className="absolute inset-0 md:hidden"
            style={{ background: "linear-gradient(to bottom, rgba(6,6,6,0.65) 0%, rgba(6,6,6,0.1) 18%, transparent 35%, rgba(6,6,6,0.55) 62%, rgba(6,6,6,0.92) 80%, rgba(6,6,6,1) 100%)" }}
          />
          {/* Desktop: left-to-right + top gradients to keep text readable */}
          <div className="absolute inset-0 hidden md:block bg-gradient-to-r from-[#060606] via-[#060606]/80 to-[#060606]/10" />
          <div className="absolute inset-0 hidden md:block bg-gradient-to-t from-[#060606] via-transparent to-[#060606]/50" />
        </div>

        {/* Left: headline + CTA — bottom on mobile, centered on desktop */}
        <div className="relative z-10 flex flex-col justify-end md:justify-center pt-24 md:pt-28 pb-10 md:pb-12 px-6 lg:px-16 lg:pl-20">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
            <motion.div initial={{ width: 0 }} animate={{ width: 48 }} transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="h-px mb-7" style={{ background: GOLD_GRADIENT }} />

            <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.5 }}
              className="text-[11px] font-bold tracking-[0.25em] uppercase text-white/65 mb-5">
              Premium Chauffeur Service
            </motion.p>

            <div className="overflow-hidden mb-2">
              <motion.h1 initial={{ y: "100%" }} animate={{ y: 0 }} transition={{ delay: 0.5, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                className="font-black leading-[0.88] tracking-tighter uppercase"
                style={{ fontSize: "clamp(3.5rem, 9vw, 7.5rem)" }}>
                Always
              </motion.h1>
            </div>
            <div className="overflow-hidden mb-7">
              <motion.h1 initial={{ y: "100%" }} animate={{ y: 0 }} transition={{ delay: 0.62, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                className="font-black leading-[0.88] tracking-tighter uppercase" style={{ fontSize: "clamp(3.5rem, 9vw, 7.5rem)", color: YELLOW }}>
                on time.
              </motion.h1>
            </div>

            <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.78, duration: 0.6 }}
              className="text-white/65 text-[15px] font-light leading-relaxed mb-9 max-w-[340px]">
              Executive ground transportation for those who set the standard.
            </motion.p>

            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.88, duration: 0.6 }}
              className="flex flex-col gap-4 mb-10">
              <div className="flex items-center gap-5">
                <BookingSystem triggerClassName="text-[11px] font-bold tracking-[0.18em] uppercase px-8 py-4 btn-gold text-black transition-colors duration-200 rounded-none" />
                <a href="#services"
                  className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.15em] uppercase text-white/55 hover:text-white transition-colors group">
                  Our services
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                </a>
              </div>
              <div className="flex items-center gap-5">
                <a href="tel:+18483888817" className="flex items-center gap-2 text-[13px] font-light text-white/50 hover:text-white transition-colors duration-200">
                  <Phone className="w-3.5 h-3.5 shrink-0" style={{ color: YELLOW }} />
                  +1 (848) 388-8817
                  <span className="text-white/25 text-[11px] tracking-wide">· 24 / 7</span>
                </a>
                <a href="https://wa.me/18483888817" target="_blank" rel="noopener noreferrer"
                  className="text-[11px] font-semibold tracking-[0.15em] uppercase text-white/25 hover:text-white/60 transition-colors duration-200">
                  WhatsApp
                </a>
              </div>
            </motion.div>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.05, duration: 0.6 }}
            className="pt-7 border-t border-white/[0.07] grid grid-cols-3 gap-6">
            {[["10", "+", "Years"], ["24", "/7", "Available"], ["100", "%", "On-time"]].map(([n, s, l], i) => (
              <motion.div key={l} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.1 + i * 0.08 }}>
                <p className="font-black text-2xl md:text-3xl" style={{ color: YELLOW }}>
                  <CountUp to={parseInt(n)} suffix={s} />
                </p>
                <p className="text-[10px] tracking-[0.2em] uppercase text-white/50 mt-1">{l}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Right: service quick-links panel — visible on desktop only */}
        <div className="relative hidden lg:flex items-center justify-end z-10 pr-12 xl:pr-20">
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1.0, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="w-[300px] xl:w-[320px] bg-[#060606]/80 backdrop-blur-md border border-white/[0.07]"
          >
            {/* Card header */}
            <div className="px-7 py-5 border-b border-white/[0.06]">
              <div className="flex items-center gap-2 mb-0.5">
                <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: YELLOW }} />
                <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-white/50">Available Now</p>
              </div>
            </div>

            {/* Services list */}
            <div className="divide-y divide-white/[0.05]">
              {[
                { icon: <Plane className="w-4 h-4" />, label: "Airport Transfers", sub: "JFK · EWR · LGA" },
                { icon: <Briefcase className="w-4 h-4" />, label: "Corporate Travel", sub: "Executive transport" },
                { icon: <Clock className="w-4 h-4" />, label: "Hourly / As-Directed", sub: "Full-day chauffeur" },
                { icon: <Calendar className="w-4 h-4" />, label: "Special Events", sub: "Galas & celebrations" },
              ].map((item, i) => (
                <motion.a
                  key={i}
                  href="#services"
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1.15 + i * 0.07, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className="flex items-center gap-4 px-7 py-4 group hover:bg-white/[0.03] transition-colors duration-200"
                >
                  <span className="text-white/30 group-hover:text-[#C9A84C] transition-colors duration-200 shrink-0">{item.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-bold text-white/80 group-hover:text-white transition-colors duration-200 truncate">{item.label}</p>
                    <p className="text-[10px] text-white/30 font-light tracking-wide">{item.sub}</p>
                  </div>
                  <ArrowRight className="w-3 h-3 text-white/15 group-hover:text-[#C9A84C] transition-colors duration-200 shrink-0" />
                </motion.a>
              ))}
            </div>

            {/* Card footer — phone */}
            <div className="px-7 py-5 border-t border-white/[0.06]">
              <a href="tel:+18483888817" className="flex items-center gap-3 group">
                <Phone className="w-3.5 h-3.5 shrink-0" style={{ color: YELLOW }} />
                <span className="text-[12px] font-semibold text-white/70 group-hover:text-white transition-colors tracking-wide">
                  +1 (848) 388-8817
                </span>
              </a>
            </div>
          </motion.div>
        </div>

        <div className="absolute bottom-7 left-1/2 -translate-x-1/2 hidden md:flex flex-col items-center gap-2 z-10">
          <motion.div animate={{ y: [0, 7, 0] }} transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}>
            <ChevronDown className="w-4 h-4 text-white/40" />
          </motion.div>
        </div>
      </section>

      {/* ── Ticker ── */}
      <div className="overflow-hidden" style={{ background: GOLD_GRADIENT }}>
        <motion.div animate={{ x: ["0%", "-50%"] }} transition={{ repeat: Infinity, duration: 22, ease: "linear" }}
          className="flex whitespace-nowrap py-3">
          {Array(8).fill(null).map((_, i) => (
            <span key={i} className="text-[10px] font-black tracking-[0.25em] uppercase text-black/50 shrink-0 px-8">
              Airport Transfers &nbsp;·&nbsp; Corporate Travel &nbsp;·&nbsp; Hourly Service &nbsp;·&nbsp; 24/7 Available &nbsp;·&nbsp; Flight Tracking &nbsp;·&nbsp; Meet & Greet &nbsp;&nbsp;
            </span>
          ))}
        </motion.div>
      </div>

      {/* ── Trust Badges ── */}
      <TrustBadges />

      {/* ── Services ── */}
      <section id="services" className="py-28 md:py-36 px-6 lg:px-20">
        <div className="max-w-[1280px] mx-auto">
          <Reveal className="mb-16">
            <p className="text-[11px] font-bold tracking-[0.25em] uppercase mb-4" style={{ color: YELLOW }}>Services</p>
            <h2 className="font-black uppercase leading-[0.92] tracking-tight" style={{ fontSize: "clamp(2.5rem,6vw,5rem)" }}>
              Built around<br />your schedule.
            </h2>
          </Reveal>

          <div className="divide-y divide-white/[0.06]">
            {services.map((s, i) => (
              <motion.div key={i} layout
                className="group overflow-hidden cursor-pointer"
                onClick={() => setActiveService(activeService === i ? null : i)}>
                <div className="py-7 md:py-9 flex flex-col md:flex-row md:items-center gap-4 md:gap-10">
                  <span className="font-black text-[11px] tracking-widest w-8 shrink-0" style={{ color: YELLOW }}>{s.n}</span>
                  <div className="flex items-center gap-4 flex-1">
                    <motion.span animate={{ color: activeService === i ? YELLOW : "rgba(255,255,255,0.40)" }} className="shrink-0">
                      {s.icon}
                    </motion.span>
                    <h3 className="font-black text-2xl md:text-3xl uppercase tracking-tight group-hover:text-[#C9A84C] transition-colors duration-300">
                      {s.title}
                    </h3>
                  </div>
                  <p className="text-white/65 text-sm font-light leading-relaxed md:max-w-[280px]">{s.body}</p>
                  <motion.div animate={{ rotate: activeService === i ? 90 : 0 }} transition={{ duration: 0.3 }} className="hidden md:block shrink-0">
                    <ArrowRight className="w-4 h-4 text-white/45 group-hover:text-[#C9A84C] transition-colors" />
                  </motion.div>
                </div>

                <AnimatePresence>
                  {activeService === i && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }} className="overflow-hidden">
                      <div className="pb-7 pl-0 md:pl-[4.5rem] flex flex-col md:flex-row items-start gap-6">
                        <p className="text-white/75 text-sm font-light leading-relaxed max-w-[440px]">{s.detail}</p>
                        <div onClick={(e) => e.stopPropagation()}>
                          <BookingSystem
                            triggerClassName="shrink-0 text-[10px] font-bold tracking-[0.2em] uppercase px-6 py-3 border border-[#C9A84C] text-[#C9A84C] hover:bg-[#C9A84C] hover:text-black transition-colors rounded-none"
                            triggerText="Book this service"
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.div className="h-px origin-left" style={{ background: GOLD_GRADIENT }}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: activeService === i ? 1 : 0 }}
                  transition={{ duration: 0.4 }} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <HowItWorksSection />

      {/* ── Fleet ── */}
      <section id="fleet" className="bg-[#060606] py-28 md:py-36 px-6 lg:px-20">
        <div className="max-w-[1280px] mx-auto">
          <Reveal className="mb-16">
            <p className="text-[11px] font-bold tracking-[0.25em] uppercase mb-4" style={{ color: YELLOW }}>Our Fleet</p>
            <h2 className="font-black uppercase leading-[0.92] tracking-tight" style={{ fontSize: "clamp(2.5rem,6vw,5rem)" }}>
              The right vehicle,<br />every time.
            </h2>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-white/5">
            {fleet.map((v, i) => (
              <Reveal key={i} delay={i * 0.1}>
                <motion.div whileHover="hovered" initial="rest" animate="rest"
                  className="bg-[#060606] group relative overflow-hidden flex flex-col cursor-pointer">
                  <motion.div className="absolute inset-0 z-0 origin-bottom"
                    variants={{ rest: { scaleY: 0 }, hovered: { scaleY: 1 } }}
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    style={{ background: "linear-gradient(to top, rgba(201,168,76,0.08), transparent)" }} />

                  {/* Image — solid black bg, object-contain so the full car is always visible */}
                  <div className="relative w-full overflow-hidden bg-black flex items-center justify-center" style={{ aspectRatio: "16/10" }}>
                    <img
                      src={v.img}
                      alt={v.type}
                      loading={i < 2 ? "eager" : "lazy"}
                      className="w-full h-full object-contain object-center"
                      onError={(e) => {
                        const el = e.currentTarget;
                        el.src = v.fallbackImg;
                        el.className = "w-full h-full object-cover object-center";
                      }}
                    />
                    {/* Subtle bottom fade to blend into card body */}
                    <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-black to-transparent pointer-events-none" />
                    {v.tag && (
                      <span className="absolute top-4 left-4 text-[9px] font-bold tracking-widest uppercase px-2.5 py-1 text-black font-black" style={{ background: GOLD_GRADIENT }}>{v.tag}</span>
                    )}
                  </div>

                  <div className="relative z-10 flex flex-col gap-5 p-8 flex-1">
                    <motion.div className="h-px" style={{ background: GOLD_GRADIENT }}
                      variants={{ rest: { width: 32 }, hovered: { width: 56 } }}
                      transition={{ duration: 0.3 }} />
                    <div className="flex-1">
                      <motion.p className="font-black text-2xl uppercase tracking-tight mb-2"
                        variants={{ rest: { color: "#ffffff" }, hovered: { color: YELLOW } }}
                        transition={{ duration: 0.25 }}>{v.type}</motion.p>
                      <p className="text-xs text-white/65 font-light leading-relaxed">{v.models}</p>
                      <div className="flex gap-5 mt-4">
                        <span className="text-[10px] text-white/55 tracking-wide">{v.pax}</span>
                        <span className="text-[10px] text-white/55 tracking-wide">{v.lug}</span>
                      </div>
                    </div>
                    <motion.div variants={{ rest: { opacity: 0, y: 8 }, hovered: { opacity: 1, y: 0 } }} transition={{ duration: 0.25 }}>
                      <BookingSystem
                        triggerClassName="w-fit p-0 bg-transparent border-none shadow-none text-[10px] font-bold tracking-[0.2em] uppercase flex items-center gap-1.5 text-[#C9A84C]"
                        triggerText="Reserve this vehicle →"
                      />
                    </motion.div>
                  </div>
                </motion.div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <TestimonialsSection />

      {/* ── About ── */}
      <section id="about" className="bg-[#0a0a0a] py-28 md:py-36 px-6 lg:px-20">
        <div className="max-w-[1280px] mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
            <Reveal>
              <p className="text-[11px] font-bold tracking-[0.25em] uppercase mb-5" style={{ color: YELLOW }}>Why Luxex</p>
              <h2 className="font-black uppercase leading-[0.92] tracking-tight mb-10" style={{ fontSize: "clamp(2.2rem,5vw,4.5rem)" }}>
                We deliver<br />more than rides.
              </h2>
              <div className="space-y-0 divide-y divide-white/[0.06]">
                {[
                  ["24 / 7", "Around the clock, every day of the year."],
                  ["Flight Tracking", "We monitor your flight and adjust your pickup automatically."],
                  ["Meet & Greet", "Your chauffeur is at the gate before you land."],
                  ["Fixed Rates", "No surge pricing. No surprises. Ever."],
                  ["Fully Insured", "Licensed, vetted, and fully insured chauffeurs."],
                ].map(([label, desc], i) => (
                  <motion.div key={i} className="flex gap-6 py-5 group cursor-default"
                    whileHover={{ x: 6 }} transition={{ duration: 0.2 }}>
                    <span className="font-black text-sm uppercase text-white w-32 shrink-0 pt-0.5 group-hover:text-[#C9A84C] transition-colors duration-200">{label}</span>
                    <span className="text-sm text-white/65 font-light leading-relaxed group-hover:text-white/85 transition-colors duration-200">{desc}</span>
                  </motion.div>
                ))}
              </div>
            </Reveal>

            <Reveal delay={0.15}>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { value: "10+", label: "Years of Service" },
                  { value: "5,000+", label: "Trips Completed" },
                  { value: "100%", label: "On-time Rate" },
                  { value: "4.9★", label: "Average Rating" },
                ].map((stat, i) => (
                  <div key={i} className="border border-white/[0.07] p-7 group hover:border-[#C9A84C]/30 transition-colors duration-300">
                    <p className="font-black text-3xl mb-2 group-hover:text-[#C9A84C] transition-colors duration-300" style={{ color: i === 0 ? YELLOW : "white" }}>
                      {stat.value}
                    </p>
                    <p className="text-[11px] tracking-widest uppercase text-white/35 font-semibold">{stat.label}</p>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={BG_IMG} alt="" className="w-full h-full object-cover object-center opacity-10" />
          <div className="absolute inset-0 bg-[#060606]/85" />
        </div>
        <div className="relative z-10 max-w-[1280px] mx-auto px-6 lg:px-20 py-28 md:py-40">
          <Reveal>
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-10">
              <div>
                <motion.div initial={{ width: 0 }} whileInView={{ width: 48 }} viewport={{ once: true }}
                  transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} className="h-px mb-8" style={{ background: GOLD_GRADIENT }} />
                <h2 className="font-black uppercase leading-[0.9] tracking-tight" style={{ fontSize: "clamp(3rem,8vw,7rem)" }}>
                  Book your<br /><span style={{ color: YELLOW }}>ride now.</span>
                </h2>
              </div>
              <div className="flex flex-col gap-4 items-start lg:items-end">
                <p className="text-white/65 text-sm font-light max-w-[240px] lg:text-right">
                  Fast, secure reservations. A concierge responds within minutes.
                </p>
                <BookingSystem triggerClassName="text-[11px] font-bold tracking-[0.18em] uppercase px-10 py-5 btn-gold text-black transition-colors duration-200 rounded-none" />
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Service Areas ── */}
      <ServiceAreasSection />

      {/* ── FAQ ── */}
      <FAQSection />

      {/* ── Footer ── */}
      <footer id="contact" className="bg-[#030303] border-t border-white/5 px-6 lg:px-20 py-16">
        <div className="max-w-[1280px] mx-auto">
          <div className="flex flex-col lg:flex-row justify-between gap-12 mb-12">
            <div className="max-w-[200px]">
              <img
                src="https://ik.imagekit.io/xnfnvsnut/1001351366-removebg-preview.png"
                alt="Luxex Executive Ride"
                className="h-20 md:h-24 w-auto object-contain mb-4 drop-shadow-[0_0_18px_rgba(201,168,76,0.35)]"
              />
              <p className="text-sm text-white/80 font-light leading-relaxed">
                Premium executive transportation. New York, New Jersey, Connecticut & Pennsylvania.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-10 lg:gap-16">
              <div>
                <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/60 mb-5">Services</p>
                <ul className="space-y-3">
                  {["Airport Transfers", "Corporate Travel", "Hourly Service", "Special Events"].map((s) => (
                    <li key={s}><a href="#services" className="text-sm text-white/75 hover:text-white transition-colors font-light">{s}</a></li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/60 mb-5">Company</p>
                <ul className="space-y-3">
                  <li><a href="#about" className="text-sm text-white/75 hover:text-white transition-colors font-light">About Us</a></li>
                  <li><a href="#fleet" className="text-sm text-white/75 hover:text-white transition-colors font-light">Our Fleet</a></li>
                  <li><a href="mailto:info@luxexride.com?subject=Corporate Account Inquiry" className="text-sm text-white/75 hover:text-white transition-colors font-light">Corporate Accounts</a></li>
                  <li><a href="https://g.page/r/luxexride/review" target="_blank" rel="noopener noreferrer" className="text-sm text-white/75 hover:text-white transition-colors font-light">Google Reviews</a></li>
                </ul>
              </div>
              <div>
                <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/60 mb-5">Contact</p>
                <ul className="space-y-3">
                  <li><a href="tel:+18483888817" className="flex items-center gap-2 text-sm text-white/75 hover:text-white transition-colors font-light"><Phone className="w-3 h-3 text-[#C9A84C]" />+1 (848) 388-8817</a></li>
                  <li><a href="mailto:info@luxexride.com" className="flex items-center gap-2 text-sm text-white/75 hover:text-white transition-colors font-light"><Mail className="w-3 h-3 text-[#C9A84C]" />info@luxexride.com</a></li>
                  <li className="flex items-center gap-2 text-sm text-white/75 font-light"><MapPin className="w-3 h-3 text-[#C9A84C] shrink-0" />New Jersey, USA</li>
                  <li>
                    <a href="https://wa.me/18483888817" target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-white/75 hover:text-white transition-colors font-light">
                      <MessageCircle className="w-3 h-3 text-[#C9A84C]" />WhatsApp
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-xs text-white/65">&copy; {new Date().getFullYear()} Luxex Executive Ride. All rights reserved.</p>
            <div className="flex items-center gap-6">
              {/* Social links */}
              <div className="flex items-center gap-3">
                <a href="https://www.instagram.com/luxexride" target="_blank" rel="noopener noreferrer" aria-label="Instagram"
                  className="w-7 h-7 border border-white/10 flex items-center justify-center text-white/30 hover:text-white hover:border-white/30 transition-colors duration-200">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                    <circle cx="12" cy="12" r="4"/>
                    <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none"/>
                  </svg>
                </a>
                <a href="https://www.linkedin.com/company/luxexride" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn"
                  className="w-7 h-7 border border-white/10 flex items-center justify-center text-white/30 hover:text-white hover:border-white/30 transition-colors duration-200">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
                    <rect x="2" y="9" width="4" height="12"/>
                    <circle cx="4" cy="4" r="2"/>
                  </svg>
                </a>
                <a href="https://g.page/r/luxexride" target="_blank" rel="noopener noreferrer" aria-label="Google Reviews"
                  className="w-7 h-7 border border-white/10 flex items-center justify-center text-white/30 hover:text-white hover:border-white/30 transition-colors duration-200">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                    <path d="M12 11h8.533c.072.482.107.975.107 1.467C20.64 17.84 17 22 12 22 6.477 22 2 17.523 2 12S6.477 2 12 2c2.7 0 5.15 1.024 6.993 2.7l-2.839 2.84C15.016 6.52 13.564 6 12 6c-3.314 0-6 2.686-6 6s2.686 6 6 6c2.954 0 5.445-2.007 6.175-4.733H12V11z"/>
                  </svg>
                </a>
              </div>
              <div className="flex gap-6">
                <a href="#" className="text-xs text-white/40 hover:text-white/70 transition-colors">Privacy Policy</a>
                <a href="#" className="text-xs text-white/40 hover:text-white/70 transition-colors">Terms of Service</a>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* ── WhatsApp floating button ── */}
      <motion.a
        href="https://wa.me/18483888817?text=Hello%20LuxEx%2C%20I%27d%20like%20to%20inquire%20about%20a%20booking."
        target="_blank" rel="noopener noreferrer" aria-label="Chat on WhatsApp"
        initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 2.5, duration: 0.4 }}
        whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}
        className="fixed bottom-24 right-5 z-50 w-12 h-12 flex items-center justify-center shadow-2xl rounded-full"
        style={{ background: "#25D366" }}>
        <svg viewBox="0 0 24 24" fill="white" className="w-6 h-6">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
      </motion.a>

      {/* ── Cookie consent ── */}
      <AnimatePresence>
        {cookieVisible && !cookieDismissed && (
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-sm z-[9990] bg-[#111] border border-white/10 p-5 shadow-2xl">
            <p className="text-xs text-white/60 leading-relaxed mb-4">
              We use cookies to enhance your experience and analyze traffic.
              By continuing, you agree to our{" "}
              <a href="#" className="underline hover:text-white/90 transition-colors">privacy policy</a>.
            </p>
            <div className="flex gap-2">
              <button onClick={acceptCookies}
                className="flex-1 py-2 text-[10px] font-bold tracking-[0.15em] uppercase transition-colors"
                style={{ background: GOLD_GRADIENT, color: "#0a0a0a" }}>
                Accept
              </button>
              <button onClick={acceptCookies}
                className="flex-1 py-2 text-[10px] font-bold tracking-[0.15em] uppercase border border-white/10 text-white/40 hover:text-white hover:border-white/30 transition-colors">
                Decline
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Sticky CTA bar ── */}
      <AnimatePresence>
        {showSticky && (
          <motion.div initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="fixed bottom-0 left-0 right-0 z-40 bg-[#0d0d0d] border-t border-white/10">
            <div className="max-w-[1280px] mx-auto px-6 lg:px-12 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: YELLOW }} />
                <p className="text-[11px] font-semibold tracking-[0.15em] uppercase text-white/80">
                  Ready to book your executive ride?
                </p>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <a href="tel:+18483888817" className="flex items-center gap-2 text-[11px] font-semibold tracking-wide text-white/70 hover:text-white transition-colors">
                  <Phone className="w-3.5 h-3.5" style={{ color: YELLOW }} />
                  +1 (848) 388-8817
                </a>
                <BookingSystem
                  triggerClassName="text-[10px] font-bold tracking-[0.18em] uppercase px-6 py-2.5 btn-gold text-black transition-colors rounded-none"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </>
  );
}
