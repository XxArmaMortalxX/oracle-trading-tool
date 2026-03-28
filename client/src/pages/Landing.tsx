/*
 * Landing Page — The Axiarch Trading Algorithm
 * Public marketing page with waitlist form and pricing CTA
 */
import { motion } from "framer-motion";
import { Link } from "wouter";
import { useState } from "react";
import {
  ArrowRight,
  BarChart3,
  Calculator,
  Check,
  Eye,
  Layers,
  Search,
  TrendingUp,
  Zap,
  Shield,
  Target,
  Activity,
  Bell,
  Flame,
  Lock,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";

const HERO_IMG =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663392552309/VS9gyY9Ztpy3Frg32hxgmx/hero-candlestick-NhJRVHJuCBPymrGi72nFzr.webp";

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0, 0, 0.2, 1] as const } },
};

const stats = [
  { value: "15,000", label: "Stocks scanned / sec", icon: Zap },
  { value: "5:1", label: "Risk-reward target", icon: Target },
  { value: "20", label: "Daily picks generated", icon: TrendingUp },
  { value: "82%", label: "Reported accuracy", icon: Shield },
];

const features = [
  {
    title: "Live Stock Screener",
    desc: "Real-time pre-market screening with Axiarch scoring. Filter by price, float, volume, and gap percentage.",
    icon: Search,
    color: "text-indigo",
  },
  {
    title: "Reddit Social Radar",
    desc: "Track mention velocity across r/wallstreetbets, r/pennystocks, and r/shortsqueeze with crowd sentiment analysis.",
    icon: Flame,
    color: "text-amber",
  },
  {
    title: "Sentiment Shift Alerts",
    desc: "Get notified when a ticker's crowd sentiment dramatically flips from bearish to bullish — a potential momentum signal.",
    icon: Bell,
    color: "text-emerald",
  },
  {
    title: "RCT Calculator",
    desc: "Red Candle Theory calculator with instant entry, stop loss, and profit targets with risk-reward ratios.",
    icon: Calculator,
    color: "text-rose",
  },
  {
    title: "Daily Pre-Market Picks",
    desc: "20 algorithmically selected stocks each morning with entry signals, support/resistance, and bias direction.",
    icon: TrendingUp,
    color: "text-indigo",
  },
  {
    title: "7-Step Framework",
    desc: "Interactive visualization of Tim Sykes' Pennystocking Framework — the psychological lifecycle every penny stock follows.",
    icon: BarChart3,
    color: "text-emerald",
  },
];

const proFeatures = [
  "Real-time stock screener with Axiarch scoring",
  "Reddit Social Radar with crowd sentiment",
  "Sentiment shift alerts (bearish to bullish)",
  "Red Candle Theory calculator",
  "Daily pre-market picks with notifications",
  "7-Step Pennystocking Framework",
  "Full methodology deep-dive",
  "Priority access to new features",
];

export default function Landing() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");

  const joinWaitlist = trpc.waitlist.join.useMutation({
    onSuccess: (data) => {
      if (data.alreadyExists) {
        toast.info("You're already on the waitlist! We'll notify you soon.");
      } else {
        toast.success("Welcome to the waitlist! We'll be in touch.");
      }
      setEmail("");
      setName("");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to join waitlist. Please try again.");
    },
  });

  const handleWaitlistSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    joinWaitlist.mutate({ email, name: name || undefined, source: "landing" });
  };

  return (
    <div>
      {/* ── Hero Section ── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={HERO_IMG} alt="" className="w-full h-full object-cover opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/80 to-background" />
        </div>

        <div className="container relative z-10 pt-20 pb-28 lg:pt-28 lg:pb-36">
          <motion.div variants={stagger} initial="hidden" animate="show" className="max-w-3xl">
            <motion.div variants={fadeUp} className="flex items-center gap-2 mb-6">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo/10 border border-indigo/20 text-indigo text-xs font-mono font-medium tracking-wide">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo animate-pulse" />
                ALGORITHMIC TRADING INTELLIGENCE
              </span>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="font-heading text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.1] tracking-tight mb-6"
            >
              The{" "}
              <span className="text-gradient">Axiarch Algorithm</span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="text-lg sm:text-xl text-muted-foreground leading-relaxed max-w-2xl mb-10"
            >
              A complete day trading research platform — live screener, Reddit sentiment radar,
              shift alerts, and pre-market picks. All powered by algorithmic analysis.
            </motion.p>

            <motion.div variants={fadeUp} className="flex flex-wrap gap-3">
              <a href={getLoginUrl("/pricing")}>
                <Button size="lg" className="gap-2 bg-indigo hover:bg-indigo/90 text-white">
                  Get Started — $29.99/mo
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </a>
              <a href="#waitlist">
                <Button size="lg" variant="outline" className="gap-2 border-border/60">
                  Join the Waitlist
                </Button>
              </a>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── Stats Bar ── */}
      <section className="border-y border-border/50 bg-card/50">
        <div className="container py-8">
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-50px" }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {stats.map((s) => {
              const Icon = s.icon;
              return (
                <motion.div key={s.label} variants={fadeUp} className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-indigo/10 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-indigo" />
                  </div>
                  <div>
                    <p className="font-mono font-bold text-xl text-foreground">{s.value}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ── Features Grid ── */}
      <section className="container py-20">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <h2 className="font-heading text-3xl font-bold tracking-tight mb-3">
            Everything a Day Trader Needs
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Six integrated tools working together to give you an edge before the market opens.
          </p>
        </motion.div>

        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-50px" }}
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <motion.div key={f.title} variants={fadeUp}>
                <Card className="bg-card hover:bg-secondary/40 transition-all duration-300 h-full border-border/40">
                  <CardContent className="p-6">
                    <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center mb-4">
                      <Icon className={`w-5 h-5 ${f.color}`} />
                    </div>
                    <h3 className="font-heading font-semibold text-lg mb-2 text-foreground">
                      {f.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      </section>

      {/* ── Signal Preview ── */}
      <section className="bg-card/30 border-y border-border/30 py-20">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="font-heading text-3xl font-bold tracking-tight mb-6">
                Three Engines. One Algorithm.
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-8">
                Axiarch isn't magic — it's a cleverly automated version of Tim Sykes' 20-year-old
                penny stock playbook, turbocharged with social media sentiment tracking and strict
                risk-reward math.
              </p>
              <div className="space-y-4">
                {[
                  { num: "01", title: "Pre-Market Quantitative Screener", desc: "Scans all stocks for low float, high gap, unusual volume before the bell." },
                  { num: "02", title: "Catalyst & Sentiment Engine", desc: "Monitors social media hype velocity and news catalysts to detect momentum shifts." },
                  { num: "03", title: "Intraday Signal Generator", desc: "Locks 20 stocks at open, calculates entry signals, support/resistance, and bias." },
                ].map((item) => (
                  <div key={item.num} className="flex gap-4 p-4 rounded-lg bg-card/60 border border-border/40 hover:border-indigo/30 transition-colors">
                    <span className="font-mono text-sm font-bold text-indigo/60 mt-0.5">{item.num}</span>
                    <div>
                      <h4 className="font-heading font-semibold text-sm mb-1 text-foreground">{item.title}</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="hidden lg:block"
            >
              <div className="bg-card border border-border/60 rounded-xl p-6 glow-indigo">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-heading font-semibold text-sm text-foreground">Signal Preview</h3>
                  <span className="flex items-center gap-1.5 text-xs font-mono text-emerald">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald animate-pulse" />
                    LIVE
                  </span>
                </div>
                <div className="space-y-3">
                  {[
                    { ticker: "MVTX", bias: "LONG", entry: "$2.45", target: "$3.89", rr: "4.8:1", color: "emerald" },
                    { ticker: "RSLS", bias: "LONG", entry: "$1.12", target: "$1.87", rr: "5.0:1", color: "emerald" },
                    { ticker: "GXAI", bias: "SHORT", entry: "$3.20", target: "$2.15", rr: "3.5:1", color: "rose" },
                  ].map((s) => (
                    <div key={s.ticker} className={`flex items-center justify-between p-3 rounded-lg bg-secondary/50 ${s.color === "emerald" ? "signal-card-long" : "signal-card-short"}`}>
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-sm text-foreground">{s.ticker}</span>
                        <span className={`text-xs font-mono font-medium px-2 py-0.5 rounded ${s.color === "emerald" ? "bg-emerald/10 text-emerald" : "bg-rose/10 text-rose"}`}>{s.bias}</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs font-mono">
                        <span className="text-muted-foreground">Entry <span className="text-foreground">{s.entry}</span></span>
                        <span className="text-muted-foreground">Target <span className="text-foreground">{s.target}</span></span>
                        <span className="text-indigo font-medium">{s.rr}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-border/40 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Simulated data for illustration</span>
                  <Eye className="w-3.5 h-3.5 text-muted-foreground/50" />
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="container py-20">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <h2 className="font-heading text-3xl font-bold tracking-tight mb-3">
            Simple, Transparent Pricing
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            One plan. Full access. Cancel anytime.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="max-w-md mx-auto"
        >
          <Card className="border-indigo/40 bg-card relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo via-amber to-indigo" />
            <CardContent className="p-8">
              <div className="text-center mb-8">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo/10 border border-indigo/20 text-indigo text-xs font-mono font-medium tracking-wide mb-4">
                  AXIARCH PRO
                </span>
                <div className="flex items-baseline justify-center gap-1 mb-2">
                  <span className="font-heading text-5xl font-bold text-foreground">$29</span>
                  <span className="font-heading text-2xl font-bold text-muted-foreground">.99</span>
                  <span className="text-muted-foreground text-sm ml-1">/month</span>
                </div>
                <p className="text-sm text-muted-foreground">Full access to all tools and features</p>
              </div>

              <div className="space-y-3 mb-8">
                {proFeatures.map((feature) => (
                  <div key={feature} className="flex items-start gap-3">
                    <Check className="w-4 h-4 text-emerald mt-0.5 shrink-0" />
                    <span className="text-sm text-foreground">{feature}</span>
                  </div>
                ))}
              </div>

              <a href={getLoginUrl("/pricing")}>
                <Button className="w-full gap-2 bg-indigo hover:bg-indigo/90 text-white" size="lg">
                  <Lock className="w-4 h-4" />
                  Subscribe Now
                </Button>
              </a>
              <p className="text-xs text-muted-foreground text-center mt-3">
                Cancel anytime. No long-term commitment.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </section>

      {/* ── Waitlist ── */}
      <section id="waitlist" className="bg-card/30 border-y border-border/30 py-20">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="max-w-lg mx-auto text-center"
          >
            <h2 className="font-heading text-3xl font-bold tracking-tight mb-3">
              Not Ready Yet?
            </h2>
            <p className="text-muted-foreground mb-8">
              Join the waitlist and we'll notify you when we launch new features or offer promotions.
            </p>

            <form onSubmit={handleWaitlistSubmit} className="space-y-3">
              <Input
                type="text"
                placeholder="Your name (optional)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-background border-border/60"
              />
              <Input
                type="email"
                placeholder="Your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-background border-border/60"
              />
              <Button
                type="submit"
                className="w-full gap-2 bg-indigo hover:bg-indigo/90 text-white"
                disabled={joinWaitlist.isPending}
              >
                {joinWaitlist.isPending ? "Joining..." : "Join the Waitlist"}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </form>

            <p className="text-xs text-muted-foreground mt-4">
              No spam. Unsubscribe anytime.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="container py-20">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-2xl mx-auto"
        >
          <h2 className="font-heading text-3xl font-bold tracking-tight mb-4">
            Ready to trade smarter?
          </h2>
          <p className="text-muted-foreground mb-8">
            Get algorithmic trading intelligence delivered to your screen every morning before the market opens.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <a href={getLoginUrl("/pricing")}>
              <Button size="lg" className="gap-2 bg-indigo hover:bg-indigo/90 text-white">
                Start Your Subscription
                <ArrowRight className="w-4 h-4" />
              </Button>
            </a>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
