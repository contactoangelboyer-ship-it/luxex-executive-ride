import { useState, useRef } from "react";
import { motion, useInView } from "framer-motion";
import {
  ArrowLeft, Phone, Mail, MapPin, Send, CheckCircle2,
  Loader2, Shield, Clock, Star, Award, Users, Globe
} from "lucide-react";
import { BookingSystem } from "@/components/BookingSystem";

const YELLOW = "#C9A84C";

function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 24 }} animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }} className={className}>
      {children}
    </motion.div>
  );
}

const VALUES = [
  {
    icon: <Shield className="w-5 h-5" />,
    title: "Discretion",
    desc: "Your privacy is our priority. Every ride is confidential. Our chauffeurs are trained in client discretion and never share route information.",
  },
  {
    icon: <Clock className="w-5 h-5" />,
    title: "Punctuality",
    desc: "We monitor your flight in real-time and track traffic. Our drivers arrive early, every time — because your time is non-negotiable.",
  },
  {
    icon: <Star className="w-5 h-5" />,
    title: "Excellence",
    desc: "From the cleanliness of our vehicles to the professionalism of our drivers, we maintain standards that match the clients we serve.",
  },
  {
    icon: <Globe className="w-5 h-5" />,
    title: "Reliability",
    desc: "Available 24/7, 365 days a year. No surge pricing. No cancellations. When you book with LuxEx, you can count on us being there.",
  },
];

const STATS = [
  { value: "3+", label: "Years of service" },
  { value: "500+", label: "Rides completed" },
  { value: "4.9★", label: "Average rating" },
  { value: "24/7", label: "Available" },
];

export default function About() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    // Send via mailto or API
    await new Promise(r => setTimeout(r, 1000));
    setSent(true);
    setSending(false);
    setForm({ name: "", email: "", phone: "", message: "" });
  };

  return (
    <div className="min-h-screen bg-[#060606] text-white">
      {/* Top bar */}
      <div className="fixed top-0 inset-x-0 h-[2px] z-[60]" style={{ background: YELLOW }} />

      {/* Nav */}
      <header className="fixed inset-x-0 top-0 z-50 bg-[#060606]/95 backdrop-blur-md border-b border-white/[0.06]">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-12 h-[80px] flex items-center justify-between">
          <a href="/" className="flex items-center gap-3 group">
            <ArrowLeft className="w-4 h-4 text-white/30 group-hover:text-white transition-colors" />
            <img src="https://ik.imagekit.io/xnfnvsnut/1001351366-removebg-preview.png"
              alt="LuxEx" className="h-16 w-auto object-contain" />
          </a>
          <BookingSystem triggerClassName="text-[10px] font-bold tracking-[0.15em] uppercase px-5 py-2.5 btn-gold text-black transition-colors rounded-none" />
        </div>
      </header>

      <main className="pt-[80px]">

        {/* Hero */}
        <section className="relative py-24 md:py-32 border-b border-white/[0.06] overflow-hidden">
          <div className="absolute inset-0 opacity-[0.04]"
            style={{ backgroundImage: "radial-gradient(circle at 20% 50%, #C9A84C 0%, transparent 50%)" }} />
          <div className="max-w-[1200px] mx-auto px-6 lg:px-12">
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
              <div className="w-8 h-[2px] mb-6" style={{ background: YELLOW }} />
              <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-[1.05] mb-6 max-w-3xl">
                Executive transportation,<br />
                <span style={{ color: YELLOW }}>built for those</span><br />
                who can't afford delays.
              </h1>
              <p className="text-white/45 text-base md:text-lg max-w-xl leading-relaxed">
                LuxEx Executive Ride was founded to fill a gap in the luxury transportation
                market — a service that combines the professionalism of a private driver with
                the consistency of a premium brand.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Stats */}
        <section className="border-b border-white/[0.06]">
          <div className="max-w-[1200px] mx-auto px-6 lg:px-12">
            <div className="grid grid-cols-2 md:grid-cols-4">
              {STATS.map((s, i) => (
                <Reveal key={s.label} delay={i * 0.08}
                  className="py-10 px-6 border-r border-white/[0.06] last:border-r-0 text-center">
                  <p className="text-3xl md:text-4xl font-black mb-2" style={{ color: YELLOW }}>{s.value}</p>
                  <p className="text-[11px] font-semibold tracking-[0.15em] uppercase text-white/30">{s.label}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Story */}
        <section className="py-20 md:py-28 border-b border-white/[0.06]">
          <div className="max-w-[1200px] mx-auto px-6 lg:px-12">
            <div className="grid md:grid-cols-2 gap-16 items-start">
              <Reveal>
                <div className="w-8 h-[2px] mb-6" style={{ background: YELLOW }} />
                <h2 className="text-3xl md:text-4xl font-black leading-tight mb-6">
                  Our story.
                </h2>
                <div className="space-y-4 text-white/50 text-sm leading-relaxed">
                  <p>
                    LuxEx was built on a simple premise: the executives, professionals, and high-net-worth
                    individuals who drive the economy deserve transportation that matches their expectations —
                    not just their budget.
                  </p>
                  <p>
                    We serve the New York metropolitan area — Manhattan, New Jersey, Connecticut — covering
                    JFK, LaGuardia, Newark, and Teterboro airports with precision scheduling and real-time
                    flight monitoring.
                  </p>
                  <p>
                    Every detail matters to us. From the temperature of the cabin to the ambient lighting,
                    from the newspapers available on request to the speed of the Wi-Fi — we've thought about
                    every part of your ride.
                  </p>
                </div>
              </Reveal>
              <div className="space-y-4">
                {VALUES.map((v, i) => (
                  <Reveal key={v.title} delay={i * 0.1}>
                    <div className="border border-white/[0.07] p-6 bg-[#0a0a0a] group hover:border-[#C9A84C]/20 transition-colors">
                      <div className="flex items-start gap-4">
                        <div className="shrink-0 w-9 h-9 border border-white/10 flex items-center justify-center group-hover:border-[#C9A84C]/30 transition-colors"
                          style={{ color: YELLOW }}>
                          {v.icon}
                        </div>
                        <div>
                          <h3 className="font-bold text-sm tracking-wide mb-1.5">{v.title}</h3>
                          <p className="text-xs text-white/40 leading-relaxed">{v.desc}</p>
                        </div>
                      </div>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Service areas */}
        <section className="py-20 border-b border-white/[0.06]">
          <div className="max-w-[1200px] mx-auto px-6 lg:px-12">
            <Reveal>
              <div className="w-8 h-[2px] mb-6" style={{ background: YELLOW }} />
              <h2 className="text-3xl font-black mb-10">Where we operate.</h2>
            </Reveal>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-white/[0.06]">
              {[
                { area: "New York City", detail: "All 5 boroughs · JFK · LaGuardia" },
                { area: "New Jersey", detail: "Newark EWR · Jersey City · Hoboken" },
                { area: "Connecticut", detail: "Greenwich · Stamford · Westport" },
                { area: "Long Island", detail: "Nassau · Suffolk · The Hamptons" },
                { area: "Teterboro", detail: "TEB Private Aviation · FBOs" },
                { area: "Regional", detail: "Philadelphia · Boston (on request)" },
              ].map((loc) => (
                <Reveal key={loc.area}>
                  <div className="bg-[#060606] p-7 hover:bg-[#0d0d0d] transition-colors">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="w-3.5 h-3.5 shrink-0" style={{ color: YELLOW }} />
                      <h3 className="font-bold text-sm">{loc.area}</h3>
                    </div>
                    <p className="text-xs text-white/35 pl-5">{loc.detail}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Contact */}
        <section id="contact" className="py-20 md:py-28">
          <div className="max-w-[1200px] mx-auto px-6 lg:px-12">
            <div className="grid md:grid-cols-2 gap-16">

              {/* Info */}
              <Reveal>
                <div className="w-8 h-[2px] mb-6" style={{ background: YELLOW }} />
                <h2 className="text-3xl md:text-4xl font-black mb-4">Get in touch.</h2>
                <p className="text-white/40 text-sm leading-relaxed mb-10">
                  Whether you need a last-minute booking, corporate account setup, or have a question about
                  our services — we're available around the clock.
                </p>
                <div className="space-y-5">
                  {[
                    { icon: <Phone className="w-4 h-4" />, label: "Phone / WhatsApp", value: "+1 (848) 388-8817", href: "tel:+18483888817" },
                    { icon: <Mail className="w-4 h-4" />, label: "Email", value: "info@luxexride.com", href: "mailto:info@luxexride.com" },
                    { icon: <MapPin className="w-4 h-4" />, label: "Service Area", value: "New York Metro Area", href: null },
                    { icon: <Clock className="w-4 h-4" />, label: "Availability", value: "24 hours · 7 days a week · 365 days", href: null },
                  ].map(c => (
                    <div key={c.label} className="flex items-start gap-4">
                      <div className="w-9 h-9 border border-white/10 flex items-center justify-center shrink-0"
                        style={{ color: YELLOW }}>
                        {c.icon}
                      </div>
                      <div>
                        <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-white/25 mb-0.5">{c.label}</p>
                        {c.href ? (
                          <a href={c.href} className="text-sm text-white/75 hover:text-white transition-colors">{c.value}</a>
                        ) : (
                          <p className="text-sm text-white/75">{c.value}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Reveal>

              {/* Form */}
              <Reveal delay={0.1}>
                {sent ? (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                    className="h-full flex flex-col items-center justify-center text-center py-12">
                    <CheckCircle2 className="w-10 h-10 mb-4" style={{ color: YELLOW }} />
                    <h3 className="text-xl font-black mb-2">Message sent.</h3>
                    <p className="text-white/40 text-sm">We'll get back to you within a few hours.</p>
                    <button onClick={() => setSent(false)} className="mt-6 text-xs text-white/30 hover:text-white transition-colors underline">
                      Send another
                    </button>
                  </motion.div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {[
                      { key: "name", label: "Full Name", type: "text", placeholder: "John Smith", required: true },
                      { key: "email", label: "Email", type: "email", placeholder: "you@company.com", required: true },
                      { key: "phone", label: "Phone (optional)", type: "tel", placeholder: "+1 (347) 000-0000", required: false },
                    ].map(f => (
                      <div key={f.key}>
                        <label className="block text-[10px] font-bold tracking-[0.2em] uppercase text-white/30 mb-2">{f.label}</label>
                        <input type={f.type} placeholder={f.placeholder} required={f.required}
                          value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                          className="w-full bg-[#0f0f0f] border border-white/10 focus:border-[#C9A84C] text-sm text-white placeholder-white/20 px-4 py-3.5 outline-none transition-colors" />
                      </div>
                    ))}
                    <div>
                      <label className="block text-[10px] font-bold tracking-[0.2em] uppercase text-white/30 mb-2">Message</label>
                      <textarea rows={4} placeholder="How can we help you?" required
                        value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                        className="w-full bg-[#0f0f0f] border border-white/10 focus:border-[#C9A84C] text-sm text-white placeholder-white/20 px-4 py-3.5 outline-none transition-colors resize-none" />
                    </div>
                    <button type="submit" disabled={sending}
                      className="w-full py-4 flex items-center justify-center gap-2 font-black text-[11px] tracking-[0.15em] uppercase transition-all disabled:opacity-60"
                      style={{ background: "linear-gradient(135deg, #8B6914 0%, #C9A84C 30%, #F0D060 55%, #D4AF37 80%, #B8860B 100%)", color: "#0a0a0a" }}>
                      {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4" /> Send Message</>}
                    </button>
                  </form>
                )}
              </Reveal>
            </div>
          </div>
        </section>

        {/* Footer mini */}
        <div className="border-t border-white/[0.06] py-6">
          <div className="max-w-[1200px] mx-auto px-6 lg:px-12 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-[11px] text-white/20">© {new Date().getFullYear()} LuxEx Executive Ride. All rights reserved.</p>
            <a href="/" className="text-[11px] text-white/20 hover:text-white transition-colors">← Back to home</a>
          </div>
        </div>
      </main>
    </div>
  );
}
