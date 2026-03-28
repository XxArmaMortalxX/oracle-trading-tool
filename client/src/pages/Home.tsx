/*
 * DESIGN: Signal Deck — Home / Landing Page
 * Hero with candlestick background, overview signal cards, quick stats
 */
import { motion } from "framer-motion";
import { Link } from "wouter";
import {
  ArrowRight,
  BarChart3,
  Calculator,
  Eye,
  Layers,
  Search,
  TrendingUp,
  Zap,
  Shield,
  Target,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";

const HERO_IMG =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663392552309/VS9gyY9Ztpy3Frg32hxgmx/hero-candlestick-NhJRVHJuCBPymrGi72nFzr.webp";
const SIGNAL_IMG =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663392552309/VS9gyY9Ztpy3Frg32hxgmx/signal-abstract-gk3urAnmhrbkpyEZE3CdJ3.webp";

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
    title: "Axiarch Methodology",
    desc: "Deep dive into the three engines powering Axiarch: Pre-Market Screener, Catalyst & Sentiment Engine, and Intraday Signal Generator.",
    icon: Layers,
    href: "/methodology",
    color: "text-indigo",
    border: "signal-card-neutral",
  },
  {
    title: "7-Step Framework",
    desc: "Interactive visualization of Tim Sykes' Pennystocking Framework — the psychological lifecycle every penny stock follows.",
    icon: BarChart3,
    href: "/framework",
    color: "text-emerald",
    border: "signal-card-long",
  },
  {
    title: "RCT Calculator",
    desc: "Plug in your Red Candle Theory numbers and instantly get entry, stop loss, and profit targets with risk-reward ratios.",
    icon: Calculator,
    href: "/calculator",
    color: "text-rose",
    border: "signal-card-short",
  },
  {
    title: "Stock Screener",
    desc: "Simulate Axiarch's pre-market screening criteria. Filter by price, float, volume, and gap percentage to find potential runners.",
    icon: Search,
    href: "/screener",
    color: "text-amber",
    border: "signal-card-neutral",
  },
];

export default function Home() {
  // The userAuth hooks provides authentication state
  // To implement login/logout functionality, simply call logout() or redirect to getLoginUrl()
  let { user, loading, error, isAuthenticated, logout } = useAuth();

  return (
    <div>
      {/* ── Hero Section ── */}
      <section className="relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0">
          <img
            src={HERO_IMG}
            alt=""
            className="w-full h-full object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/80 to-background" />
        </div>

        <div className="container relative z-10 pt-20 pb-28 lg:pt-28 lg:pb-36">
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="show"
            className="max-w-3xl"
          >
            <motion.div variants={fadeUp} className="flex items-center gap-2 mb-6">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo/10 border border-indigo/20 text-indigo text-xs font-mono font-medium tracking-wide">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo animate-pulse" />
                REVERSE ENGINEERED
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
              An independent research tool that breaks down how the Axiarch
              algorithm picks day trading stocks — and gives you the tools to
              replicate its methodology yourself.
            </motion.p>

            <motion.div variants={fadeUp} className="flex flex-wrap gap-3">
              <Link href="/methodology">
                <Button size="lg" className="gap-2 bg-indigo hover:bg-indigo/90 text-white">
                  Explore Methodology
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link href="/calculator">
                <Button size="lg" variant="outline" className="gap-2 border-border/60">
                  <Calculator className="w-4 h-4" />
                  Try the Calculator
                </Button>
              </Link>
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
                <motion.div
                  key={s.label}
                  variants={fadeUp}
                  className="flex items-center gap-4"
                >
                  <div className="w-10 h-10 rounded-lg bg-indigo/10 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-indigo" />
                  </div>
                  <div>
                    <p className="font-mono font-bold text-xl text-foreground">
                      {s.value}
                    </p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ── Feature Cards ── */}
      <section className="container py-20">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-12"
        >
          <h2 className="font-heading text-3xl font-bold tracking-tight mb-3">
            Research Tools
          </h2>
          <p className="text-muted-foreground max-w-xl">
            Everything you need to understand, replicate, and apply Axiarch's
            day trading methodology.
          </p>
        </motion.div>

        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-50px" }}
          className="grid sm:grid-cols-2 gap-4"
        >
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <motion.div key={f.title} variants={fadeUp}>
                <Link href={f.href}>
                  <Card
                    className={`${f.border} bg-card hover:bg-secondary/40 transition-all duration-300 group cursor-pointer h-full`}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div
                          className={`w-10 h-10 rounded-lg bg-secondary flex items-center justify-center`}
                        >
                          <Icon className={`w-5 h-5 ${f.color}`} />
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300" />
                      </div>
                      <h3 className="font-heading font-semibold text-lg mb-2 text-foreground">
                        {f.title}
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {f.desc}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      </section>

      {/* ── How Oracle Works Overview ── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={SIGNAL_IMG}
            alt=""
            className="w-full h-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/95 to-background/80" />
        </div>
        <div className="container relative z-10 py-20">
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
                Axiarch isn't magic — it's a cleverly automated version of
                Tim Sykes' 20-year-old penny stock playbook, turbocharged with
                social media sentiment tracking and strict risk-reward math.
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
                    desc: 'Monitors social media hype velocity and news catalysts to "predict the next Reddit pump."',
                  },
                  {
                    num: "03",
                    title: "Intraday Signal Generator",
                    desc: "Locks 20 stocks at open, calculates entry signals, support/resistance, and bias.",
                  },
                ].map((item) => (
                  <div
                    key={item.num}
                    className="flex gap-4 p-4 rounded-lg bg-card/60 border border-border/40 hover:border-indigo/30 transition-colors"
                  >
                    <span className="font-mono text-sm font-bold text-indigo shrink-0 mt-0.5">
                      {item.num}
                    </span>
                    <div>
                      <h4 className="font-heading font-semibold text-sm mb-1 text-foreground">
                        {item.title}
                      </h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {item.desc}
                      </p>
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
              {/* Signal Preview Mock */}
              <div className="bg-card border border-border/60 rounded-xl p-6 glow-indigo">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-heading font-semibold text-sm text-foreground">
                    Axiarch Signal Preview
                  </h3>
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
                    <div
                      key={s.ticker}
                      className={`flex items-center justify-between p-3 rounded-lg bg-secondary/50 ${
                        s.color === "emerald" ? "signal-card-long" : "signal-card-short"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-sm text-foreground">
                          {s.ticker}
                        </span>
                        <span
                          className={`text-xs font-mono font-medium px-2 py-0.5 rounded ${
                            s.color === "emerald"
                              ? "bg-emerald/10 text-emerald"
                              : "bg-rose/10 text-rose"
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

                <div className="mt-4 pt-4 border-t border-border/40 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    Simulated data for illustration
                  </span>
                  <Eye className="w-3.5 h-3.5 text-muted-foreground/50" />
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="container py-20">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-2xl mx-auto"
        >
          <h2 className="font-heading text-3xl font-bold tracking-tight mb-4">
            Ready to decode the signals?
          </h2>
          <p className="text-muted-foreground mb-8">
            Explore each component of Axiarch's methodology, run the numbers
            through our calculators, and build your own screening criteria.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/methodology">
              <Button size="lg" className="gap-2 bg-indigo hover:bg-indigo/90 text-white">
                Start with Methodology
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/screener">
              <Button size="lg" variant="outline" className="gap-2 border-border/60">
                <Search className="w-4 h-4" />
                Try the Screener
              </Button>
            </Link>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
