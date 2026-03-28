/*
 * Landing Page — The Axiarch Trading Algorithm
 * Conversion-optimized marketing page with waitlist, pricing, and social proof
 */
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { Link } from "wouter";
import { useState, useEffect, useRef } from "react";
import {
  ArrowRight,
  BarChart3,
  Calculator,
  Check,
  ChevronDown,
  Eye,
  Flame,
  Layers,
  Lock,
  Search,
  Shield,
  Target,
  TrendingUp,
  Zap,
  Bell,
  Activity,
  Clock,
  Users,
  BarChart,
  MessageCircle,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";

const HERO_IMG =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663392552309/VS9gyY9Ztpy3Frg32hxgmx/hero-candlestick-NhJRVHJuCBPymrGi72nFzr.webp";

/* ── Animation variants ── */
const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] as const } },
};
const fadeIn = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.6 } },
};

/* ── Animated counter hook ── */
function AnimatedNumber({ target, duration = 2 }: { target: number; duration?: number }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => Math.round(v).toLocaleString());
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const controls = animate(count, target, { duration, ease: "easeOut" });
    return controls.stop;
  }, [target, duration, count]);

  return <motion.span ref={ref}>{rounded}</motion.span>;
}

/* ── Scrolling ticker tape ── */
const tickerTape = [
  { sym: "AAPL", chg: "+2.4%", up: true },
  { sym: "TSLA", chg: "-1.8%", up: false },
  { sym: "NVDA", chg: "+5.1%", up: true },
  { sym: "AMC", chg: "+12.3%", up: true },
  { sym: "GME", chg: "+8.7%", up: true },
  { sym: "PLTR", chg: "-0.9%", up: false },
  { sym: "SOFI", chg: "+3.2%", up: true },
  { sym: "NIO", chg: "-2.1%", up: false },
  { sym: "MARA", chg: "+6.5%", up: true },
  { sym: "RIVN", chg: "-3.4%", up: false },
  { sym: "LCID", chg: "+4.8%", up: true },
  { sym: "DKNG", chg: "+1.9%", up: true },
];

function TickerTape() {
  const items = [...tickerTape, ...tickerTape]; // duplicate for seamless loop
  return (
    <div className="overflow-hidden border-y border-border/30 bg-card/30 backdrop-blur-sm">
      <motion.div
        className="flex gap-8 py-2.5 whitespace-nowrap"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
      >
        {items.map((t, i) => (
          <span key={i} className="flex items-center gap-2 text-xs font-mono">
            <span className="text-foreground/80 font-medium">{t.sym}</span>
            <span className={t.up ? "text-emerald" : "text-rose"}>{t.chg}</span>
          </span>
        ))}
      </motion.div>
    </div>
  );
}

/* ── Data ── */
const features = [
  {
    title: "Live Stock Screener",
    desc: "Scan the entire market pre-market. Filter by float, gap %, volume, and get an Axiarch score for every stock — before the bell rings.",
    icon: Search,
    color: "text-indigo",
    bg: "bg-indigo/10",
  },
  {
    title: "Reddit Social Radar",
    desc: "See which tickers are exploding on r/wallstreetbets and r/pennystocks. Track mention velocity and crowd sentiment in real-time.",
    icon: Flame,
    color: "text-amber",
    bg: "bg-amber/10",
  },
  {
    title: "Sentiment Shift Alerts",
    desc: "Get instant alerts when a ticker's crowd sentiment flips from bearish to bullish — often a leading indicator of momentum.",
    icon: Bell,
    color: "text-emerald",
    bg: "bg-emerald/10",
  },
  {
    title: "RCT Calculator",
    desc: "Plug in any red candle and get instant entry, stop loss, and profit targets with precise risk-reward ratios. No guesswork.",
    icon: Calculator,
    color: "text-rose",
    bg: "bg-rose/10",
  },
  {
    title: "Daily Pre-Market Picks",
    desc: "20 algorithmically selected stocks every morning. Each with entry signals, support/resistance levels, and directional bias.",
    icon: TrendingUp,
    color: "text-indigo",
    bg: "bg-indigo/10",
  },
  {
    title: "7-Step Framework",
    desc: "Interactive visualization of the penny stock lifecycle — see exactly where a stock is in its pattern and what comes next.",
    icon: BarChart3,
    color: "text-emerald",
    bg: "bg-emerald/10",
  },
];

const howItWorks = [
  {
    step: "01",
    title: "Algorithm Scans",
    desc: "Every morning, Axiarch scans thousands of stocks for low float, high gap, unusual volume, and social media momentum.",
    icon: Search,
  },
  {
    step: "02",
    title: "Signals Generated",
    desc: "The scoring engine ranks each stock, calculates entry/exit levels, and assigns a directional bias with risk-reward ratios.",
    icon: Zap,
  },
  {
    step: "03",
    title: "You Execute",
    desc: "Review the picks, check the sentiment radar, and make informed decisions with data — not emotions — before the market opens.",
    icon: Target,
  },
];

const proFeatures = [
  "Real-time stock screener with Axiarch scoring",
  "Reddit Social Radar with crowd sentiment split",
  "Bearish-to-bullish sentiment shift alerts",
  "Red Candle Theory calculator",
  "20 daily pre-market picks with entry signals",
  "7-Step Pennystocking Framework",
  "Full methodology deep-dive",
  "Priority access to new features",
];

const faqs = [
  {
    q: "Is this a signal service or financial advice?",
    a: "No. Axiarch is a research and analysis platform. It provides algorithmic screening, sentiment data, and educational frameworks to help you make your own informed decisions. We never tell you to buy or sell.",
  },
  {
    q: "How are the daily picks generated?",
    a: "The algorithm scans all US-listed stocks pre-market for specific criteria: low float, high gap percentage, unusual volume, and social media momentum. It then scores and ranks them using the Axiarch scoring engine.",
  },
  {
    q: "What's the Reddit Social Radar?",
    a: "It monitors mention velocity across r/wallstreetbets, r/pennystocks, and r/shortsqueeze. For each ticker, it classifies mentions as bullish, bearish, or neutral and shows you the crowd sentiment split.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Cancel with one click from your billing page. No contracts, no hidden fees, no questions asked. Your access continues until the end of your billing period.",
  },
  {
    q: "What makes this different from other screeners?",
    a: "Axiarch combines quantitative screening with social sentiment analysis and Tim Sykes' proven penny stock framework — all in one platform. Most screeners only give you numbers. We give you context.",
  },
];

export default function Landing() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    document.title = "Axiarch Trading Algorithm | AI Stock Screener";
  }, []);

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
          <img src={HERO_IMG} alt="Stock market candlestick chart background showing trading data" className="w-full h-full object-cover opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/80 to-background" />
          {/* Subtle grid overlay */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
              backgroundSize: "60px 60px",
            }}
          />
        </div>

        <div className="container relative z-10 pt-24 pb-32 lg:pt-32 lg:pb-40">
          <motion.div variants={stagger} initial="hidden" animate="show" className="max-w-3xl">
            <motion.div variants={fadeUp} className="flex items-center gap-3 mb-8">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo/10 border border-indigo/20 text-indigo text-xs font-mono font-medium tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo animate-pulse" />
                ALGORITHMIC TRADING INTELLIGENCE
              </span>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="font-heading text-5xl sm:text-6xl lg:text-7xl font-bold leading-[1.05] tracking-tight mb-6"
            >
              Stop Guessing.{" "}
              <br className="hidden sm:block" />
              <span className="text-gradient">Start Knowing.</span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="text-lg sm:text-xl text-muted-foreground leading-relaxed max-w-2xl mb-4"
            >
              Axiarch scans thousands of stocks, tracks Reddit sentiment in real-time, and delivers
              20 algorithmically scored picks to your screen — every morning before the bell.
            </motion.p>

            <motion.p
              variants={fadeUp}
              className="text-sm text-muted-foreground/70 mb-10"
            >
              Used by day traders who want data, not opinions.
            </motion.p>

            <motion.div variants={fadeUp} className="flex flex-wrap items-center gap-4">
              <a href={getLoginUrl("/pricing")}>
                <Button size="lg" className="gap-2 bg-indigo hover:bg-indigo/90 text-white h-12 px-8 text-base">
                  Get Started — $29.99/mo
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </a>
              <a href="#waitlist">
                <Button size="lg" variant="outline" className="gap-2 border-border/60 h-12 px-8 text-base">
                  Join the Waitlist
                </Button>
              </a>
            </motion.div>

            <motion.div variants={fadeUp} className="flex items-center gap-6 mt-8 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" />
                Cancel anytime
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Setup in 60 seconds
              </span>
              <span className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" />
                Secure checkout
              </span>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── Ticker Tape ── */}
      <TickerTape />

      {/* ── Platform Stats ── */}
      <section className="border-b border-border/30 bg-card/40">
        <div className="container py-10">
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-50px" }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-8"
          >
            {[
              { value: 149, suffix: "+", label: "Stocks scanned daily", icon: BarChart },
              { value: 20, suffix: "", label: "Picks generated per scan", icon: Target },
              { value: 3, suffix: "", label: "Reddit subs monitored", icon: MessageCircle },
              { value: 6, suffix: "", label: "Integrated trading tools", icon: Layers },
            ].map((s) => {
              const Icon = s.icon;
              return (
                <motion.div key={s.label} variants={fadeUp} className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-indigo/10 border border-indigo/10 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-indigo" />
                  </div>
                  <div>
                    <p className="font-mono font-bold text-2xl text-foreground">
                      <AnimatedNumber target={s.value} />{s.suffix}
                    </p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="container py-24">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo/10 border border-indigo/20 text-indigo text-xs font-mono font-medium tracking-wider mb-4">
            HOW IT WORKS
          </span>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight mb-3">
            From Scan to Signal in Seconds
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Three steps. Zero guesswork. Every morning before the market opens.
          </p>
        </motion.div>

        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-50px" }}
          className="grid md:grid-cols-3 gap-6"
        >
          {howItWorks.map((item, i) => {
            const Icon = item.icon;
            return (
              <motion.div key={item.step} variants={fadeUp}>
                <div className="relative group">
                  <Card className="bg-card/80 border-border/40 hover:border-indigo/30 transition-all duration-300 h-full">
                    <CardContent className="p-8">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 rounded-xl bg-indigo/10 border border-indigo/20 flex items-center justify-center">
                          <Icon className="w-5 h-5 text-indigo" />
                        </div>
                        <span className="font-mono text-4xl font-bold text-indigo/20">{item.step}</span>
                      </div>
                      <h3 className="font-heading font-semibold text-lg mb-3 text-foreground">{item.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                    </CardContent>
                  </Card>
                  {/* Connector arrow (not on last) */}
                  {i < howItWorks.length - 1 && (
                    <div className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10">
                      <ChevronRight className="w-6 h-6 text-indigo/30" />
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </section>

      {/* ── Features Grid ── */}
      <section className="bg-card/20 border-y border-border/30 py-24">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald/10 border border-emerald/20 text-emerald text-xs font-mono font-medium tracking-wider mb-4">
              PLATFORM FEATURES
            </span>
            <h2 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight mb-3">
              Six Tools. One Edge.
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Everything a day trader needs — integrated into a single platform that works together.
            </p>
          </motion.div>

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-50px" }}
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5"
          >
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <motion.div key={f.title} variants={fadeUp}>
                  <Card className="bg-card/60 hover:bg-card transition-all duration-300 h-full border-border/40 hover:border-indigo/20 group">
                    <CardContent className="p-7">
                      <div className={`w-11 h-11 rounded-xl ${f.bg} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300`}>
                        <Icon className={`w-5 h-5 ${f.color}`} />
                      </div>
                      <h3 className="font-heading font-semibold text-lg mb-2.5 text-foreground">
                        {f.title}
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ── Signal Preview ── */}
      <section className="container py-24">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber/10 border border-amber/20 text-amber text-xs font-mono font-medium tracking-wider mb-4">
              SIGNAL ENGINE
            </span>
            <h2 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight mb-6">
              Three Engines.{" "}
              <span className="text-gradient">One Algorithm.</span>
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-8">
              Axiarch automates Tim Sykes' 20-year penny stock playbook, then layers on
              social media sentiment tracking and strict risk-reward math. The result: a
              research platform that does in seconds what takes most traders hours.
            </p>
            <div className="space-y-4">
              {[
                {
                  num: "01",
                  title: "Pre-Market Quantitative Screener",
                  desc: "Scans all stocks for low float, high gap, unusual volume before the bell.",
                },
                {
                  num: "02",
                  title: "Catalyst & Sentiment Engine",
                  desc: "Monitors Reddit hype velocity and crowd sentiment to detect momentum shifts.",
                },
                {
                  num: "03",
                  title: "Intraday Signal Generator",
                  desc: "Locks 20 stocks at open, calculates entry signals, support/resistance, and bias.",
                },
              ].map((item) => (
                <div
                  key={item.num}
                  className="flex gap-4 p-4 rounded-xl bg-card/60 border border-border/40 hover:border-indigo/30 transition-colors"
                >
                  <span className="font-mono text-sm font-bold text-indigo/50 mt-0.5 shrink-0">
                    {item.num}
                  </span>
                  <div>
                    <h4 className="font-heading font-semibold text-sm mb-1 text-foreground">
                      {item.title}
                    </h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="hidden lg:block"
          >
            <div className="bg-card border border-border/60 rounded-2xl p-7 glow-indigo">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-heading font-semibold text-sm text-foreground">
                  Signal Preview
                </h3>
                <span className="flex items-center gap-1.5 text-xs font-mono text-emerald">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald animate-pulse" />
                  LIVE
                </span>
              </div>
              <div className="space-y-3">
                {[
                  { ticker: "MVTX", bias: "LONG", entry: "$2.45", target: "$3.89", rr: "4.8:1", score: 87, color: "emerald" },
                  { ticker: "RSLS", bias: "LONG", entry: "$1.12", target: "$1.87", rr: "5.0:1", score: 82, color: "emerald" },
                  { ticker: "GXAI", bias: "SHORT", entry: "$3.20", target: "$2.15", rr: "3.5:1", score: 74, color: "rose" },
                  { ticker: "NKLA", bias: "SHORT", entry: "$0.85", target: "$0.52", rr: "4.1:1", score: 79, color: "rose" },
                ].map((s) => (
                  <div
                    key={s.ticker}
                    className={`flex items-center justify-between p-3.5 rounded-lg bg-secondary/40 ${s.color === "emerald" ? "signal-card-long" : "signal-card-short"}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-sm text-foreground">{s.ticker}</span>
                      <span
                        className={`text-xs font-mono font-medium px-2 py-0.5 rounded ${
                          s.color === "emerald" ? "bg-emerald/10 text-emerald" : "bg-rose/10 text-rose"
                        }`}
                      >
                        {s.bias}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-mono">
                      <span className="text-muted-foreground">
                        Entry <span className="text-foreground">{s.entry}</span>
                      </span>
                      <span className="text-muted-foreground">
                        Target <span className="text-foreground">{s.target}</span>
                      </span>
                      <span className="text-indigo font-medium">{s.rr}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-5 pt-4 border-t border-border/40 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Simulated data for illustration
                </span>
                <Eye className="w-3.5 h-3.5 text-muted-foreground/50" />
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="bg-card/20 border-y border-border/30 py-24">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-14"
          >
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo/10 border border-indigo/20 text-indigo text-xs font-mono font-medium tracking-wider mb-4">
              PRICING
            </span>
            <h2 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight mb-3">
              One Plan. Full Access. No Surprises.
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Everything included. Cancel with one click. No contracts.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="max-w-md mx-auto"
          >
            <Card className="border-indigo/30 bg-card relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo via-amber to-indigo" />
              <CardContent className="p-10">
                <div className="text-center mb-8">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo/10 border border-indigo/20 text-indigo text-xs font-mono font-medium tracking-wider mb-5">
                    AXIARCH PRO
                  </span>
                  <div className="flex items-baseline justify-center gap-1 mb-2">
                    <span className="font-heading text-6xl font-bold text-foreground">$29</span>
                    <span className="font-heading text-2xl font-bold text-muted-foreground">.99</span>
                    <span className="text-muted-foreground text-sm ml-1">/month</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Full access to every tool and feature
                  </p>
                </div>

                <div className="space-y-3.5 mb-10">
                  {proFeatures.map((feature) => (
                    <div key={feature} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-emerald/10 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-3 h-3 text-emerald" />
                      </div>
                      <span className="text-sm text-foreground">{feature}</span>
                    </div>
                  ))}
                </div>

                <a href={getLoginUrl("/pricing")}>
                  <Button className="w-full gap-2 bg-indigo hover:bg-indigo/90 text-white h-12 text-base" size="lg">
                    Get Started Now
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </a>
                <p className="text-xs text-muted-foreground text-center mt-4">
                  Cancel anytime. No long-term commitment. Secure Stripe checkout.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="container py-24">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo/10 border border-indigo/20 text-indigo text-xs font-mono font-medium tracking-wider mb-4">
            FAQ
          </span>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight mb-3">
            Common Questions
          </h2>
        </motion.div>

        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-50px" }}
          className="max-w-2xl mx-auto space-y-3"
        >
          {faqs.map((faq, i) => (
            <motion.div key={i} variants={fadeUp}>
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full text-left p-5 rounded-xl bg-card/60 border border-border/40 hover:border-indigo/20 transition-colors"
              >
                <div className="flex items-center justify-between gap-4">
                  <h3 className="font-heading font-semibold text-sm text-foreground">{faq.q}</h3>
                  <ChevronDown
                    className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200 ${
                      openFaq === i ? "rotate-180" : ""
                    }`}
                  />
                </div>
                {openFaq === i && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="text-sm text-muted-foreground leading-relaxed mt-3 pr-8"
                  >
                    {faq.a}
                  </motion.p>
                )}
              </button>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ── Waitlist ── */}
      <section id="waitlist" className="bg-card/20 border-y border-border/30 py-24">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="max-w-lg mx-auto text-center"
          >
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber/10 border border-amber/20 text-amber text-xs font-mono font-medium tracking-wider mb-4">
              WAITLIST
            </span>
            <h2 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight mb-3">
              Not Ready to Commit?
            </h2>
            <p className="text-muted-foreground mb-8">
              Join the waitlist. We'll notify you about new features, promotions, and early-bird pricing.
            </p>

            <form onSubmit={handleWaitlistSubmit} className="space-y-3">
              <Input
                type="text"
                placeholder="Your name (optional)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-background border-border/60 h-11"
              />
              <Input
                type="email"
                placeholder="Your best email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-background border-border/60 h-11"
              />
              <Button
                type="submit"
                className="w-full gap-2 bg-indigo hover:bg-indigo/90 text-white h-11"
                disabled={joinWaitlist.isPending}
              >
                {joinWaitlist.isPending ? "Joining..." : "Join the Waitlist"}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </form>

            <p className="text-xs text-muted-foreground mt-4">
              No spam. No selling your data. Unsubscribe anytime.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="container py-24">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-2xl mx-auto"
        >
          <h2 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            The Market Doesn't Wait.{" "}
            <span className="text-gradient">Neither Should You.</span>
          </h2>
          <p className="text-muted-foreground mb-10 text-lg">
            Get algorithmic trading intelligence delivered to your screen every morning before the bell.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <a href={getLoginUrl("/pricing")}>
              <Button size="lg" className="gap-2 bg-indigo hover:bg-indigo/90 text-white h-12 px-8 text-base">
                Start Your Subscription
                <ArrowRight className="w-4 h-4" />
              </Button>
            </a>
            <a href="#waitlist">
              <Button size="lg" variant="outline" className="gap-2 border-border/60 h-12 px-8 text-base">
                Join the Waitlist
              </Button>
            </a>
          </div>
          <p className="text-xs text-muted-foreground mt-6">
            $29.99/month. Cancel anytime. Secure Stripe checkout.
          </p>
        </motion.div>
      </section>
    </div>
  );
}
