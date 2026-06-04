import Link from "next/link";
import Navbar from "@/components/Navbar";
import { HeroCTA, BannerCTA } from "@/components/LandingCTA";

const stats = [
  { value: "100,000", label: "Claims Processed" },
  { value: "600,000", label: "Lives Insured" },
  { value: "6,000", label: "Companies Covered" },
];

const steps = [
  {
    num: "01",
    icon: "📤",
    title: "Upload Documents",
    desc: "Drag-and-drop bills, prescriptions, and diagnostic reports — JPG, PNG, or PDF.",
  },
  {
    num: "02",
    icon: "🤖",
    title: "AI Extraction",
    desc: "Gemini Vision reads every field: diagnosis, doctor details, itemized costs, and more.",
  },
  {
    num: "03",
    icon: "⚖️",
    title: "Policy Validation",
    desc: "A deterministic rule engine checks limits, waiting periods, and coverage exclusions.",
  },
  {
    num: "04",
    icon: "✅",
    title: "Instant Decision",
    desc: "Get an APPROVED, PARTIAL, REJECTED, or MANUAL_REVIEW verdict with clear reasoning.",
  },
];

const coverage = [
  { icon: "💊", label: "Pharmacy", limit: "₹15,000" },
  { icon: "🔬", label: "Diagnostics", limit: "₹10,000" },
  { icon: "🦷", label: "Dental", limit: "₹10,000" },
  { icon: "🌿", label: "Alt. Medicine", limit: "₹8,000" },
  { icon: "👁️", label: "Vision", limit: "₹5,000" },
  { icon: "🩺", label: "Consultation", limit: "₹2,000" },
];

const clients = [
  "Zomato", "Swiggy", "Urban Company", "CRED",
  "TATA", "tinder", "ATLASSIAN", "HubSpot",
  "Notion", "WeWork", "Remote", "Twilio",
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1">
        {/* ── Hero ─────────────────────────────────────────────────── */}
        <section
          id="hero"
          className="relative flex min-h-[90vh] items-center justify-center overflow-hidden px-4 py-24 text-center"
        >
          {/* Starfield / gradient background */}
          <div
            className="pointer-events-none absolute inset-0"
            aria-hidden="true"
          >
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_#2d1550_0%,_#1a0a2e_50%,_#12061f_100%)]" />
            <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-plum-purple/10 blur-3xl" />
            <div className="absolute -right-16 top-24 h-80 w-80 rounded-full bg-plum-red/8 blur-3xl" />
          </div>

          <div className="relative z-10 max-w-4xl">
         
            {/* Headline */}
            <h1 className="text-5xl font-black leading-tight tracking-tight text-white sm:text-6xl lg:text-7xl">
              Employee benefits your
              <br />
              team{" "}
              <em className="not-italic gradient-text-red">deserves</em>
            </h1>

            <p className="mx-auto mt-6 max-w-xl text-base text-white/55">
              Submit OPD claim documents and receive an instant, AI-powered
              adjudication decision - in seconds, not days.
            </p>

            {/* Auth-aware CTA (client component) */}
            <HeroCTA />
           
          </div>
        </section>

        {/* ── Stats bar ────────────────────────────────────────────── */}
        <section className="border-y border-white/6 bg-plum-900/60 py-10">
          <div className="mx-auto max-w-4xl px-4">
            <div className="grid grid-cols-3 divide-x divide-white/8 text-center">
              {stats.map((s) => (
                <div key={s.label} className="px-4 py-2">
                  <p className="text-3xl font-black text-white sm:text-4xl">
                    {s.value}
                  </p>
                  <p className="mt-1 text-xs text-white/50">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── How it works ─────────────────────────────────────────── */}
        <section id="how-it-works" className="py-24 px-4">
          <div className="mx-auto max-w-6xl">
            <div className="text-center mb-14">
              <p className="text-xs font-semibold uppercase tracking-widest text-plum-red mb-3">
                How It Works
              </p>
              <h2 className="text-3xl font-bold text-white sm:text-4xl">
                From documents to decision in{" "}
                <span className="gradient-text">seconds</span>
              </h2>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map((step) => (
                <div
                  key={step.num}
                  className="glass rounded-2xl p-6 transition-all hover:border-white/15 hover:bg-white/5 group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <span className="text-3xl">{step.icon}</span>
                    <span className="text-4xl font-black text-white/6 group-hover:text-white/10 transition-colors tabular-nums">
                      {step.num}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-white mb-2">
                    {step.title}
                  </h3>
                  <p className="text-xs leading-relaxed text-white/50">
                    {step.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Coverage ─────────────────────────────────────────────── */}
        <section id="coverage" className="py-20 px-4 bg-plum-900/30">
          <div className="mx-auto max-w-6xl">
            <div className="text-center mb-14">
              <p className="text-xs font-semibold uppercase tracking-widest text-plum-purple-light mb-3">
                Coverage
              </p>
              <h2 className="text-3xl font-bold text-white sm:text-4xl">
                Comprehensive OPD benefits
              </h2>
              <p className="mt-3 text-sm text-white/50">
                Annual limit of ₹50,000 per member · Per-claim limit ₹5,000
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {coverage.map((c) => (
                <div
                  key={c.label}
                  className="glass rounded-xl p-5 text-center transition-all hover:border-white/15 hover:bg-white/5 hover:scale-105"
                >
                  <span className="text-3xl">{c.icon}</span>
                  <p className="mt-2 text-xs font-semibold text-white/80">
                    {c.label}
                  </p>
                  <p className="text-xs text-plum-purple-light font-medium">
                    {c.limit}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Clients grid ─────────────────────────────────────────── */}
        <section className="py-20 px-4 border-t border-white/6">
          <div className="mx-auto max-w-5xl">
            <p className="text-center text-xs uppercase tracking-widest text-white/30 mb-10">
              Trusted by India&apos;s best companies
            </p>
            <div className="grid grid-cols-4 border-l border-t border-white/8">
              {clients.map((client) => (
                <div
                  key={client}
                  className="flex items-center justify-center border-b border-r border-white/8 py-7 px-4 text-center text-sm font-semibold text-white/40 transition-colors hover:text-white/70 hover:bg-white/3"
                >
                  {client}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA Banner ───────────────────────────────────────────── */}
        <section className="py-24 px-4">
          <div className="mx-auto max-w-3xl text-center">
            <div className="glass rounded-3xl px-8 py-14 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-plum-purple/10 to-plum-red/5 pointer-events-none" />
              <div className="relative">
                <h2 className="text-3xl font-bold text-white sm:text-4xl">
                  The best{" "}
                  <span className="gradient-text-red">Claims Experience</span>
                  <br />
                  in the world
                </h2>
                <p className="mt-4 text-sm text-white/50">
                  Join thousands of employees who get their claims processed in under a minute.
                </p>
                <div className="mt-8">
                  <BannerCTA />
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer className="border-t border-white/6 py-8 px-4">
        <div className="mx-auto flex max-w-7xl flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/30">
          <span className="font-black text-xl text-plum-red">plum</span>
          <p>© {new Date().getFullYear()} Plum Benefits. All rights reserved.</p>
          <p>
            <Link href="/dashboard" className="hover:text-white/60 transition-colors">
              Claims Portal
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
