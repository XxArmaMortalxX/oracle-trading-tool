/*
 * DESIGN: Signal Deck — Methodology Deep Dive
 * Three engines breakdown, screening criteria table, technical indicators
 */
import { motion } from "framer-motion";
import {
  Activity,
  BarChart3,
  Eye,
  Filter,
  Globe,
  Layers,
  MessageSquare,
  Radio,
  TrendingUp,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const SIGNAL_IMG =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663392552309/VS9gyY9Ztpy3Frg32hxgmx/signal-abstract-gk3urAnmhrbkpyEZE3CdJ3.webp";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45 } },
};
const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};

const screeningCriteria = [
  { metric: "Price", range: "$0.50 – $20.00", rationale: "Avoids ultra-micro caps while maintaining high percentage volatility potential." },
  { metric: "Float", range: "< 10 million shares", rationale: "Low supply means any surge in demand causes parabolic price action." },
  { metric: "Pre-Market Volume", range: "Min 5,000 shares", rationale: "Ensures early liquidity and interest before the opening bell." },
  { metric: "Pre-Market % Change", range: "+5% to +10%", rationale: "Confirms the stock is already exhibiting abnormal momentum." },
  { metric: "Historical Action", range: '"Former Runners"', rationale: "Stocks with a history of explosive multi-day runs are prioritized." },
];

const technicalIndicators = [
  { name: "VWAP", desc: "Volume Weighted Average Price — the ultimate intraday trend indicator. Above VWAP = Green bias.", weight: "Primary" },
  { name: "Relative Volume", desc: "Compares current volume to historical averages to confirm breakout legitimacy.", weight: "Primary" },
  { name: "Pivot Points", desc: "Calculates automated Support and Resistance levels on the Axiarch Bar.", weight: "Primary" },
  { name: "MACD", desc: "12-period EMA minus 26-period EMA with 9-period signal line for momentum.", weight: "Secondary" },
  { name: "RSI", desc: "Relative Strength Index measures overbought/oversold conditions.", weight: "Secondary" },
  { name: "Bollinger Bands", desc: "20-period SMA with 2 standard deviation bands for volatility.", weight: "Secondary" },
  { name: "EMA (9/20)", desc: "Short-term exponential moving averages for trend direction.", weight: "Supporting" },
  { name: "OBV", desc: "On-Balance Volume confirms price moves with volume flow.", weight: "Supporting" },
];

const axiarchOutputs = [
  { label: "Bias", desc: "Green (Long) or Red (Short) directional bias based on early momentum", icon: TrendingUp, color: "text-emerald" },
  { label: "Signal Price", desc: "Exact price level the stock must cross to confirm a breakout", icon: Zap, color: "text-indigo" },
  { label: "Support & Resistance", desc: "Algorithmic calculations of bounce and selling pressure levels", icon: Activity, color: "text-amber" },
  { label: "Deltas", desc: "Distance between S/R levels and signal prices — shows proximity to trigger", icon: BarChart3, color: "text-indigo" },
  { label: "Min & Max", desc: "Percentage change from signal price showing prediction performance", icon: Radio, color: "text-emerald" },
  { label: "Stock Data", desc: "Current price, % change, volume, float, and market cap", icon: Eye, color: "text-muted-foreground" },
];

export default function Methodology() {
  return (
    <div>
      {/* ── Page Header ── */}
      <section className="relative overflow-hidden border-b border-border/50">
        <div className="absolute inset-0">
          <img src={SIGNAL_IMG} alt="" className="w-full h-full object-cover opacity-15" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/70 to-background" />
        </div>
        <div className="container relative z-10 pt-16 pb-12">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo/10 border border-indigo/20 text-indigo text-xs font-mono font-medium mb-4">
              <Layers className="w-3 h-3" /> DEEP DIVE
            </span>
            <h1 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight mb-3">
              Axiarch Methodology
            </h1>
            <p className="text-muted-foreground max-w-2xl text-lg">
              How a "$60 million algorithm" actually works under the hood — broken down into three core engines.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── Three Engines ── */}
      <section className="container py-16">
        <Tabs defaultValue="screener" className="w-full">
          <TabsList className="w-full justify-start bg-secondary/50 mb-8 overflow-x-auto">
            <TabsTrigger value="screener" className="gap-2 data-[state=active]:bg-card">
              <Filter className="w-4 h-4" /> Pre-Market Screener
            </TabsTrigger>
            <TabsTrigger value="sentiment" className="gap-2 data-[state=active]:bg-card">
              <MessageSquare className="w-4 h-4" /> Sentiment Engine
            </TabsTrigger>
            <TabsTrigger value="signal" className="gap-2 data-[state=active]:bg-card">
              <Zap className="w-4 h-4" /> Signal Generator
            </TabsTrigger>
          </TabsList>

          {/* Engine 1: Pre-Market Screener */}
          <TabsContent value="screener">
            <motion.div variants={stagger} initial="hidden" animate="show">
              <motion.div variants={fadeUp} className="mb-8">
                <h2 className="font-heading text-2xl font-bold mb-3">Engine 1: Pre-Market Quantitative Screener</h2>
                <p className="text-muted-foreground leading-relaxed max-w-3xl">
                  During pre-market hours, Axiarch scans the entire universe of available stocks looking for specific
                  quantitative criteria that have historically preceded "big percent movers" — the foundational criteria
                  used to identify potential "low float runners."
                </p>
              </motion.div>

              <motion.div variants={fadeUp}>
                <Card className="bg-card border-border/60 overflow-hidden">
                  <CardHeader className="bg-secondary/30 border-b border-border/40">
                    <CardTitle className="text-base font-heading">Axiarch Screening Criteria</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border/40">
                            <th className="text-left p-4 font-heading font-semibold text-foreground">Metric</th>
                            <th className="text-left p-4 font-heading font-semibold text-foreground">Target Range</th>
                            <th className="text-left p-4 font-heading font-semibold text-foreground hidden md:table-cell">Rationale</th>
                          </tr>
                        </thead>
                        <tbody>
                          {screeningCriteria.map((c, i) => (
                            <tr key={c.metric} className={`border-b border-border/20 ${i % 2 === 0 ? "bg-secondary/10" : ""}`}>
                              <td className="p-4 font-medium text-foreground">{c.metric}</td>
                              <td className="p-4 font-mono text-sm text-emerald">{c.range}</td>
                              <td className="p-4 text-muted-foreground hidden md:table-cell">{c.rationale}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={fadeUp} className="mt-6 p-4 rounded-lg bg-indigo/5 border border-indigo/15">
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold text-indigo">Key Insight:</span> Backtesting shows that 2/3 to 3/4 of
                  tickers found manually by experienced traders also appear on Axiarch — confirming the algorithm effectively codifies
                  trader intuition into systematic rules.
                </p>
              </motion.div>
            </motion.div>
          </TabsContent>

          {/* Engine 2: Sentiment Engine */}
          <TabsContent value="sentiment">
            <motion.div variants={stagger} initial="hidden" animate="show">
              <motion.div variants={fadeUp} className="mb-8">
                <h2 className="font-heading text-2xl font-bold mb-3">Engine 2: Catalyst & Sentiment Engine</h2>
                <p className="text-muted-foreground leading-relaxed max-w-3xl">
                  Axiarch doesn't just look at price and volume — it ingests qualitative data to gauge human emotion
                  and social momentum around individual tickers.
                </p>
              </motion.div>

              <motion.div variants={fadeUp}>
                <Card className="bg-card border-border/60 mb-6">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4 mb-6">
                      <div className="w-10 h-10 rounded-lg bg-rose/10 flex items-center justify-center shrink-0">
                        <MessageSquare className="w-5 h-5 text-rose" />
                      </div>
                      <div>
                        <h3 className="font-heading font-semibold mb-2">Core Philosophy</h3>
                        <blockquote className="border-l-2 border-rose/50 pl-4 text-muted-foreground italic">
                          "It's all based on the social-media hype surrounding stocks. The algorithm tracks crowd
                          sentiment across Reddit, X, and TikTok to identify momentum before price catches up."
                        </blockquote>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={fadeUp} className="grid sm:grid-cols-2 gap-4">
                {[
                  {
                    title: "Social Media Velocity",
                    desc: "Monitors the rate of ticker mentions across Twitter/X, Reddit, StockTwits, and chat rooms. A sudden acceleration in mentions signals retail interest building.",
                    icon: Globe,
                    color: "text-indigo",
                  },
                  {
                    title: "News Catalyst Detection",
                    desc: "Real-time scanning of news feeds for catalysts: patent approvals, earnings beats, FDA decisions, contract wins — anything that can trigger a spike.",
                    icon: Radio,
                    color: "text-amber",
                  },
                  {
                    title: "Fear & Greed Tracking",
                    desc: "Based on Tim Sykes' 7-Step Framework, Axiarch models the psychological cycle of fear and greed that drives penny stock price action.",
                    icon: TrendingUp,
                    color: "text-emerald",
                  },
                  {
                    title: "Hype Source Identification",
                    desc: "Distinguishes between organic retail interest and coordinated pump activity (bot accounts, paid promotions) to assess signal quality.",
                    icon: Eye,
                    color: "text-rose",
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <Card key={item.title} className="bg-card border-border/60">
                      <CardContent className="p-5">
                        <div className="flex items-center gap-3 mb-3">
                          <Icon className={`w-5 h-5 ${item.color}`} />
                          <h4 className="font-heading font-semibold text-sm">{item.title}</h4>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                      </CardContent>
                    </Card>
                  );
                })}
              </motion.div>
            </motion.div>
          </TabsContent>

          {/* Engine 3: Signal Generator */}
          <TabsContent value="signal">
            <motion.div variants={stagger} initial="hidden" animate="show">
              <motion.div variants={fadeUp} className="mb-8">
                <h2 className="font-heading text-2xl font-bold mb-3">Engine 3: Intraday Signal Generator</h2>
                <p className="text-muted-foreground leading-relaxed max-w-3xl">
                  Once the market opens, Axiarch observes the initial chaotic price action for 2 to 5 minutes.
                  It then locks in its top 20 stocks for the day and calculates specific actionable data points for each.
                </p>
              </motion.div>

              <motion.div variants={fadeUp} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                {axiarchOutputs.map((o) => {
                  const Icon = o.icon;
                  return (
                    <Card key={o.label} className="bg-card border-border/60">
                      <CardContent className="p-5">
                        <div className="flex items-center gap-2.5 mb-2">
                          <Icon className={`w-4 h-4 ${o.color}`} />
                          <h4 className="font-heading font-semibold text-sm">{o.label}</h4>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">{o.desc}</p>
                      </CardContent>
                    </Card>
                  );
                })}
              </motion.div>

              <motion.div variants={fadeUp}>
                <Card className="bg-card border-border/60">
                  <CardHeader className="border-b border-border/40">
                    <CardTitle className="text-base font-heading flex items-center gap-2">
                      <Activity className="w-4 h-4 text-indigo" />
                      Axiarch Daily Timeline
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-0">
                      {[
                        { time: "4:00 AM", event: "Pre-market scanning begins", detail: "Axiarch scans all available stocks against quantitative criteria" },
                        { time: "9:29 AM", event: "Hottest potentials identified", detail: "Top candidates locked based on pre-market momentum + sentiment" },
                        { time: "9:30 AM", event: "Market opens", detail: "Axiarch observes initial price action and volatility" },
                        { time: "9:32-35 AM", event: "Signals locked", detail: "20 stocks finalized with entry prices, bias, S/R levels" },
                        { time: "10:00 AM", event: "Daily Direction Alerts", detail: "Team curates top 3 picks with deeper analysis" },
                        { time: "All Day", event: "Bias updates", detail: "Green/Red bias can flip based on intraday momentum shifts" },
                      ].map((step, i) => (
                        <div key={i} className="flex gap-4 relative">
                          <div className="flex flex-col items-center">
                            <div className="w-2.5 h-2.5 rounded-full bg-indigo shrink-0 mt-1.5" />
                            {i < 5 && <div className="w-px flex-1 bg-border/40 my-1" />}
                          </div>
                          <div className="pb-6">
                            <span className="font-mono text-xs text-indigo">{step.time}</span>
                            <h4 className="font-heading font-semibold text-sm mt-0.5">{step.event}</h4>
                            <p className="text-xs text-muted-foreground mt-0.5">{step.detail}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          </TabsContent>
        </Tabs>
      </section>

      {/* ── Technical Indicators ── */}
      <section className="container pb-16">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-8"
        >
          <h2 className="font-heading text-2xl font-bold tracking-tight mb-3">Technical Indicator Weighting</h2>
          <p className="text-muted-foreground max-w-2xl">
            Axiarch's proprietary formula relies on a specific confluence of momentum and volume indicators
            to determine its Green/Red bias and Support/Resistance levels.
          </p>
        </motion.div>

        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3"
        >
          {technicalIndicators.map((ind) => (
            <motion.div key={ind.name} variants={fadeUp}>
              <Card className="bg-card border-border/60 h-full">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono font-bold text-sm text-foreground">{ind.name}</span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                        ind.weight === "Primary"
                          ? "bg-emerald/10 text-emerald"
                          : ind.weight === "Secondary"
                          ? "bg-amber/10 text-amber"
                          : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {ind.weight}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{ind.desc}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </section>
    </div>
  );
}
