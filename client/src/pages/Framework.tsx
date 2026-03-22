/*
 * DESIGN: Signal Deck — 7-Step Pennystocking Framework
 * Interactive step-by-step visualization with animated chart
 */
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const PATTERN_IMG =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663392552309/VS9gyY9Ztpy3Frg32hxgmx/pattern-framework-TigrHynuquRxMvdpnSkucj.webp";

interface Step {
  id: number;
  name: string;
  subtitle: string;
  description: string;
  psychology: string;
  tradingAction: string;
  bias: "bullish" | "bearish" | "neutral";
  oracleRelevance: string;
  chartPoints: number[];
}

const steps: Step[] = [
  {
    id: 1,
    name: "Pre-Pump / Promotion",
    subtitle: "The Quiet Accumulation",
    description:
      "At step 1, the stock is unknown to most traders. Early promoters or insiders begin accumulating shares at rock-bottom prices. Volume is low, price is flat. This is the calm before the storm.",
    psychology: "Greed is building among insiders. The general public is unaware. Smart money is positioning.",
    tradingAction: "Difficult to identify in real-time. Requires patience and sector awareness. Best for experienced traders with small accounts.",
    bias: "neutral",
    oracleRelevance: "Oracle tracks 'former runners' — stocks that have completed this cycle before and may be setting up for another run.",
    chartPoints: [10, 12, 11, 13, 12, 14, 15, 14],
  },
  {
    id: 2,
    name: "Ramp",
    subtitle: "The Hype Machine Activates",
    description:
      "The run-up accelerates. Social media buzz increases, volume spikes, and the stock begins breaking out of consolidation. Chat rooms light up. This is where Oracle's sentiment engine kicks in.",
    psychology: "FOMO begins. Early buyers feel validated. New buyers rush in. Social media amplifies the excitement.",
    tradingAction: "Look for consolidation breakouts with increasing volume. Oracle flags these stocks when social media velocity accelerates.",
    bias: "bullish",
    oracleRelevance: "Oracle's Catalyst & Sentiment Engine detects the acceleration in social media mentions and flags the stock for the daily watchlist.",
    chartPoints: [14, 16, 18, 22, 25, 30, 35, 42],
  },
  {
    id: 3,
    name: "Supernova",
    subtitle: "The Explosive Spike",
    description:
      "This is the most explosive phase. The stock goes parabolic — sometimes gaining 100%+ in a single day. Volume is massive. Everyone is talking about it. This is where Oracle generates its LONG signals.",
    psychology: "Peak greed. Euphoria takes over. Traders believe it will 'never come down.' This is the most dangerous time to buy.",
    tradingAction: "Oracle provides specific entry signals and profit targets. The Red Candle Theory (RCT) pattern is used to time entries during this phase.",
    bias: "bullish",
    oracleRelevance: "Oracle's Signal Generator calculates precise entry prices, stop losses, and 5:1 risk-reward targets during the supernova phase.",
    chartPoints: [42, 55, 68, 82, 90, 95, 92, 88],
  },
  {
    id: 4,
    name: "Cliff Dive",
    subtitle: "The Inevitable Crash",
    description:
      "What goes up must come down. The promotion stops, early buyers take profits, and the stock collapses. Drops of 50%+ in a single day are common. This is where Oracle flips to SHORT bias.",
    psychology: "Panic sets in. Bag holders refuse to sell, hoping for a bounce. Fear dominates. The crowd that was euphoric is now in denial.",
    tradingAction: "Oracle switches to RED (short) bias. Short sellers enter. This is the most profitable phase for shorts but also the hardest to time.",
    bias: "bearish",
    oracleRelevance: "Oracle's bias indicator flips from Green to Red. Short signal prices are calculated for traders looking to profit from the decline.",
    chartPoints: [88, 75, 60, 45, 35, 28, 25, 22],
  },
  {
    id: 5,
    name: "Dip Buy",
    subtitle: "The Panic Bounce",
    description:
      "After the crash, bargain hunters step in. The stock bounces off support levels. This is Tim Sykes' favorite pattern for small accounts — buying the panic dip when there's still momentum.",
    psychology: "A mix of hope and fear. Dip buyers see opportunity. Bag holders feel relief. Short sellers cover positions.",
    tradingAction: "Oracle identifies key support levels where dip buys are likely. Look for volume confirmation on the bounce.",
    bias: "bullish",
    oracleRelevance: "Oracle recalculates support levels and may generate new LONG signals if the bounce shows sufficient volume and momentum.",
    chartPoints: [22, 20, 18, 20, 25, 30, 35, 38],
  },
  {
    id: 6,
    name: "Dead Pump Bounce",
    subtitle: "The False Hope",
    description:
      "A smaller, weaker bounce. Less volume, less conviction. Traders who missed the first run try to catch this one, but momentum is fading. The bounce typically fails to reach previous highs.",
    psychology: "Diminishing hope. Each bounce is weaker. Smart money has already exited. Only retail stragglers remain.",
    tradingAction: "Experienced traders short the bounce. Oracle may show mixed signals — weaker Green bias or neutral.",
    bias: "neutral",
    oracleRelevance: "Oracle's delta calculations show widening gaps between signal prices and actual S/R levels, indicating weakening momentum.",
    chartPoints: [38, 35, 32, 34, 36, 33, 30, 28],
  },
  {
    id: 7,
    name: "The Long Kiss Goodnight",
    subtitle: "The Fade to Obscurity",
    description:
      "The stock slowly fades into irrelevance. Volume dries up. No more social media buzz. The stock returns to its pre-pump levels or lower. The cycle is complete.",
    psychology: "Apathy. Bag holders have given up. The stock is forgotten. Until the next catalyst arrives and the cycle begins again.",
    tradingAction: "No active trading. Oracle removes the stock from its watchlist. However, it's added to the 'former runners' database for future monitoring.",
    bias: "bearish",
    oracleRelevance: "Oracle archives the stock as a 'former runner' — if a new catalyst appears months later, it will be flagged again at Step 1.",
    chartPoints: [28, 25, 22, 20, 18, 16, 14, 12],
  },
];

function MiniChart({ points, bias, active }: { points: number[]; bias: string; active: boolean }) {
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;
  const h = 120;
  const w = 280;
  const padding = 10;

  const pathPoints = points.map((p, i) => {
    const x = padding + (i / (points.length - 1)) * (w - 2 * padding);
    const y = h - padding - ((p - min) / range) * (h - 2 * padding);
    return `${x},${y}`;
  });

  const lineColor =
    bias === "bullish" ? "oklch(0.696 0.17 162.48)" : bias === "bearish" ? "oklch(0.645 0.246 16.439)" : "oklch(0.585 0.233 277.117)";
  const fillColor =
    bias === "bullish" ? "oklch(0.696 0.17 162.48 / 0.1)" : bias === "bearish" ? "oklch(0.645 0.246 16.439 / 0.1)" : "oklch(0.585 0.233 277.117 / 0.1)";

  const areaPath = `M${pathPoints[0]} ${pathPoints.map((p) => `L${p}`).join(" ")} L${w - padding},${h - padding} L${padding},${h - padding} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full max-w-[280px]">
      <path d={areaPath} fill={fillColor} />
      <polyline points={pathPoints.join(" ")} fill="none" stroke={lineColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {active &&
        pathPoints.map((p, i) => {
          const [cx, cy] = p.split(",").map(Number);
          return <circle key={i} cx={cx} cy={cy} r="3" fill={lineColor} opacity={0.7} />;
        })}
    </svg>
  );
}

export default function Framework() {
  const [activeStep, setActiveStep] = useState(0);
  const step = steps[activeStep];

  return (
    <div>
      {/* ── Header ── */}
      <section className="relative overflow-hidden border-b border-border/50">
        <div className="absolute inset-0">
          <img src={PATTERN_IMG} alt="" className="w-full h-full object-cover opacity-20" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/60 to-background" />
        </div>
        <div className="container relative z-10 pt-16 pb-12">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald/10 border border-emerald/20 text-emerald text-xs font-mono font-medium mb-4">
              <TrendingUp className="w-3 h-3" /> PATTERN RECOGNITION
            </span>
            <h1 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight mb-3">
              The 7-Step Pennystocking Framework
            </h1>
            <p className="text-muted-foreground max-w-2xl text-lg">
              Tim Sykes' foundational "pattern of patterns" — the psychological lifecycle that Oracle is programmed to identify and trade.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── Step Navigator ── */}
      <section className="container py-8">
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {steps.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setActiveStep(i)}
              className={`shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                i === activeStep
                  ? s.bias === "bullish"
                    ? "bg-emerald/10 text-emerald border border-emerald/20"
                    : s.bias === "bearish"
                    ? "bg-rose/10 text-rose border border-rose/20"
                    : "bg-indigo/10 text-indigo border border-indigo/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              }`}
            >
              <span className="font-mono text-xs">{s.id}</span>
              <span className="hidden sm:inline">{s.name}</span>
            </button>
          ))}
        </div>
      </section>

      {/* ── Active Step Detail ── */}
      <section className="container pb-16">
        <AnimatePresence mode="wait">
          <motion.div
            key={step.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
          >
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-4">
                <Card
                  className={`bg-card border-border/60 ${
                    step.bias === "bullish" ? "signal-card-long" : step.bias === "bearish" ? "signal-card-short" : "signal-card-neutral"
                  }`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-xs text-muted-foreground">STEP {step.id} OF 7</span>
                          <span
                            className={`text-xs font-mono px-2 py-0.5 rounded ${
                              step.bias === "bullish"
                                ? "bg-emerald/10 text-emerald"
                                : step.bias === "bearish"
                                ? "bg-rose/10 text-rose"
                                : "bg-indigo/10 text-indigo"
                            }`}
                          >
                            {step.bias.toUpperCase()}
                          </span>
                        </div>
                        <h2 className="font-heading text-2xl font-bold">{step.name}</h2>
                        <p className="text-sm text-muted-foreground">{step.subtitle}</p>
                      </div>
                      <div className="hidden sm:block">
                        <MiniChart points={step.chartPoints} bias={step.bias} active={true} />
                      </div>
                    </div>

                    <p className="text-muted-foreground leading-relaxed mb-6">{step.description}</p>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="p-4 rounded-lg bg-secondary/30 border border-border/30">
                        <h4 className="font-heading font-semibold text-sm mb-2 flex items-center gap-2">
                          {step.bias === "bullish" ? (
                            <ArrowUp className="w-4 h-4 text-emerald" />
                          ) : step.bias === "bearish" ? (
                            <ArrowDown className="w-4 h-4 text-rose" />
                          ) : (
                            <TrendingUp className="w-4 h-4 text-indigo" />
                          )}
                          Market Psychology
                        </h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">{step.psychology}</p>
                      </div>
                      <div className="p-4 rounded-lg bg-secondary/30 border border-border/30">
                        <h4 className="font-heading font-semibold text-sm mb-2 flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-amber" />
                          Trading Action
                        </h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">{step.tradingAction}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Navigation */}
                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveStep(Math.max(0, activeStep - 1))}
                    disabled={activeStep === 0}
                    className="gap-1"
                  >
                    <ChevronLeft className="w-4 h-4" /> Previous
                  </Button>
                  <span className="text-xs text-muted-foreground font-mono">
                    {activeStep + 1} / {steps.length}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveStep(Math.min(steps.length - 1, activeStep + 1))}
                    disabled={activeStep === steps.length - 1}
                    className="gap-1"
                  >
                    Next <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Sidebar — Oracle Relevance */}
              <div className="space-y-4">
                <Card className="bg-card border-border/60 glow-indigo">
                  <CardContent className="p-5">
                    <h3 className="font-heading font-semibold text-sm mb-3 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-indigo" />
                      Oracle Relevance
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{step.oracleRelevance}</p>
                  </CardContent>
                </Card>

                {/* All Steps Mini Overview */}
                <Card className="bg-card border-border/60">
                  <CardContent className="p-5">
                    <h3 className="font-heading font-semibold text-sm mb-3">Full Lifecycle</h3>
                    <div className="space-y-1.5">
                      {steps.map((s, i) => (
                        <button
                          key={s.id}
                          onClick={() => setActiveStep(i)}
                          className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded text-xs transition-colors text-left ${
                            i === activeStep ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                          }`}
                        >
                          <span className="font-mono w-4 shrink-0">{s.id}</span>
                          <span className="truncate">{s.name}</span>
                          <span
                            className={`ml-auto w-1.5 h-1.5 rounded-full shrink-0 ${
                              s.bias === "bullish" ? "bg-emerald" : s.bias === "bearish" ? "bg-rose" : "bg-indigo"
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </section>
    </div>
  );
}
