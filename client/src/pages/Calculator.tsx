/*
 * DESIGN: Signal Deck — RCT Calculator
 * Interactive Red Candle Theory calculator with visual feedback
 */
import { motion } from "framer-motion";
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Calculator as CalcIcon,
  Target,
  Shield,
  TrendingUp,
  AlertTriangle,
  DollarSign,
  Info,
} from "lucide-react";

const RCT_IMG =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663392552309/VS9gyY9Ztpy3Frg32hxgmx/rct-pattern-kYdYtEGRCEEdSt6LUW6MAX.webp";

export default function Calculator() {
  const [candleOpen, setCandleOpen] = useState("");
  const [candleClose, setCandleClose] = useState("");
  const [shares, setShares] = useState("");
  const [customRR, setCustomRR] = useState("3");

  const calc = useMemo(() => {
    const open = parseFloat(candleOpen);
    const close = parseFloat(candleClose);
    const qty = parseInt(shares) || 100;
    const rr = parseFloat(customRR) || 3;

    if (isNaN(open) || isNaN(close) || open <= 0 || close <= 0) return null;

    // RCT: Entry = top of candle body, Stop = bottom of candle body
    const entry = Math.max(open, close);
    const stopLoss = Math.min(open, close);
    const risk = entry - stopLoss;

    if (risk <= 0) return null;

    const target1 = entry + risk * 3;
    const target2 = entry + risk * 5;
    const targetCustom = entry + risk * rr;
    const riskPerShare = risk;
    const totalRisk = risk * qty;
    const potentialGain3 = risk * 3 * qty;
    const potentialGain5 = risk * 5 * qty;
    const potentialGainCustom = risk * rr * qty;
    const riskPercent = (risk / entry) * 100;

    return {
      entry: entry.toFixed(2),
      stopLoss: stopLoss.toFixed(2),
      risk: risk.toFixed(2),
      riskPercent: riskPercent.toFixed(1),
      target1: target1.toFixed(2),
      target2: target2.toFixed(2),
      targetCustom: targetCustom.toFixed(2),
      riskPerShare: riskPerShare.toFixed(2),
      totalRisk: totalRisk.toFixed(2),
      potentialGain3: potentialGain3.toFixed(2),
      potentialGain5: potentialGain5.toFixed(2),
      potentialGainCustom: potentialGainCustom.toFixed(2),
      shares: qty,
      rrRatio: rr,
    };
  }, [candleOpen, candleClose, shares, customRR]);

  return (
    <div>
      {/* ── Header ── */}
      <section className="relative overflow-hidden border-b border-border/50">
        <div className="absolute inset-0">
          <img src={RCT_IMG} alt="" className="w-full h-full object-cover opacity-20" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/60 to-background" />
        </div>
        <div className="container relative z-10 pt-16 pb-12">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose/10 border border-rose/20 text-rose text-xs font-mono font-medium mb-4">
              <CalcIcon className="w-3 h-3" /> INTERACTIVE TOOL
            </span>
            <h1 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight mb-3">
              Red Candle Theory Calculator
            </h1>
            <p className="text-muted-foreground max-w-2xl text-lg">
              Plug in your first 5-minute red candle data and instantly get Oracle-style entry, stop loss, and profit targets.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="container py-12">
        <div className="grid lg:grid-cols-5 gap-8">
          {/* ── Input Panel ── */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-card border-border/60 signal-card-short">
              <CardHeader>
                <CardTitle className="font-heading text-base flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm bg-rose" />
                  Red Candle Data
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Candle Open Price ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 2.10"
                    value={candleOpen}
                    onChange={(e) => setCandleOpen(e.target.value)}
                    className="font-mono bg-secondary/50 border-border/40"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Candle Close Price ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 1.90"
                    value={candleClose}
                    onChange={(e) => setCandleClose(e.target.value)}
                    className="font-mono bg-secondary/50 border-border/40"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Number of Shares</Label>
                  <Input
                    type="number"
                    step="1"
                    placeholder="e.g. 500"
                    value={shares}
                    onChange={(e) => setShares(e.target.value)}
                    className="font-mono bg-secondary/50 border-border/40"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Custom R:R Ratio</Label>
                  <Input
                    type="number"
                    step="0.5"
                    min="1"
                    placeholder="e.g. 3"
                    value={customRR}
                    onChange={(e) => setCustomRR(e.target.value)}
                    className="font-mono bg-secondary/50 border-border/40"
                  />
                </div>
              </CardContent>
            </Card>

            {/* RCT Rules */}
            <Card className="bg-card border-border/60">
              <CardContent className="p-5">
                <h3 className="font-heading font-semibold text-sm mb-3 flex items-center gap-2">
                  <Info className="w-4 h-4 text-indigo" />
                  RCT Pattern Rules
                </h3>
                <ol className="space-y-2 text-xs text-muted-foreground">
                  {[
                    "Stock must be a low-float gapper (50%+ pre-market)",
                    "Ignore the initial parabolic spike at open",
                    "Wait for the FIRST 5-minute red candle",
                    "Entry = Top of candle BODY (ignore wicks)",
                    "Stop Loss = Bottom of candle BODY",
                    "Take half off at 3:1 R:R, move stop to breakeven",
                    "Let remaining shares ride for second leg",
                  ].map((rule, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="font-mono text-indigo shrink-0">{i + 1}.</span>
                      <span>{rule}</span>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          </div>

          {/* ── Results Panel ── */}
          <div className="lg:col-span-3 space-y-4">
            {calc ? (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                {/* Key Levels */}
                <div className="grid sm:grid-cols-3 gap-3">
                  <Card className="bg-card border-border/60 signal-card-long glow-emerald">
                    <CardContent className="p-5">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="w-4 h-4 text-emerald" />
                        <span className="text-xs text-muted-foreground">Entry Price</span>
                      </div>
                      <p className="font-mono text-2xl font-bold text-emerald">${calc.entry}</p>
                      <p className="text-xs text-muted-foreground mt-1">Top of candle body</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-card border-border/60 signal-card-short glow-rose">
                    <CardContent className="p-5">
                      <div className="flex items-center gap-2 mb-2">
                        <Shield className="w-4 h-4 text-rose" />
                        <span className="text-xs text-muted-foreground">Stop Loss</span>
                      </div>
                      <p className="font-mono text-2xl font-bold text-rose">${calc.stopLoss}</p>
                      <p className="text-xs text-muted-foreground mt-1">Bottom of candle body</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-card border-border/60 signal-card-neutral">
                    <CardContent className="p-5">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-4 h-4 text-amber" />
                        <span className="text-xs text-muted-foreground">Risk / Share</span>
                      </div>
                      <p className="font-mono text-2xl font-bold text-amber">${calc.risk}</p>
                      <p className="text-xs text-muted-foreground mt-1">{calc.riskPercent}% of entry</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Profit Targets */}
                <Card className="bg-card border-border/60">
                  <CardHeader className="border-b border-border/40">
                    <CardTitle className="text-base font-heading flex items-center gap-2">
                      <Target className="w-4 h-4 text-indigo" />
                      Profit Targets
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border/40">
                          <th className="text-left p-4 font-heading font-semibold text-xs text-muted-foreground">Target</th>
                          <th className="text-left p-4 font-heading font-semibold text-xs text-muted-foreground">Price</th>
                          <th className="text-left p-4 font-heading font-semibold text-xs text-muted-foreground">Gain / Share</th>
                          <th className="text-left p-4 font-heading font-semibold text-xs text-muted-foreground">Total Gain</th>
                          <th className="text-left p-4 font-heading font-semibold text-xs text-muted-foreground">R:R</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-border/20 bg-emerald/5">
                          <td className="p-4 font-medium">Target 1 (Standard)</td>
                          <td className="p-4 font-mono text-emerald">${calc.target1}</td>
                          <td className="p-4 font-mono">${(parseFloat(calc.target1) - parseFloat(calc.entry)).toFixed(2)}</td>
                          <td className="p-4 font-mono text-emerald">${calc.potentialGain3}</td>
                          <td className="p-4 font-mono font-bold text-indigo">3:1</td>
                        </tr>
                        <tr className="border-b border-border/20">
                          <td className="p-4 font-medium">Target 2 (Oracle)</td>
                          <td className="p-4 font-mono text-emerald">${calc.target2}</td>
                          <td className="p-4 font-mono">${(parseFloat(calc.target2) - parseFloat(calc.entry)).toFixed(2)}</td>
                          <td className="p-4 font-mono text-emerald">${calc.potentialGain5}</td>
                          <td className="p-4 font-mono font-bold text-indigo">5:1</td>
                        </tr>
                        <tr>
                          <td className="p-4 font-medium">Custom Target</td>
                          <td className="p-4 font-mono text-emerald">${calc.targetCustom}</td>
                          <td className="p-4 font-mono">${(parseFloat(calc.targetCustom) - parseFloat(calc.entry)).toFixed(2)}</td>
                          <td className="p-4 font-mono text-emerald">${calc.potentialGainCustom}</td>
                          <td className="p-4 font-mono font-bold text-indigo">{calc.rrRatio}:1</td>
                        </tr>
                      </tbody>
                    </table>
                  </CardContent>
                </Card>

                {/* Risk Summary */}
                <Card className="bg-card border-border/60">
                  <CardContent className="p-5">
                    <h3 className="font-heading font-semibold text-sm mb-4 flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-amber" />
                      Position Summary
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Shares</p>
                        <p className="font-mono font-bold text-foreground">{calc.shares}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Position Size</p>
                        <p className="font-mono font-bold text-foreground">
                          ${(parseFloat(calc.entry) * calc.shares).toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Total Risk</p>
                        <p className="font-mono font-bold text-rose">${calc.totalRisk}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Max Gain (5:1)</p>
                        <p className="font-mono font-bold text-emerald">${calc.potentialGain5}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Visual Level Bar */}
                <Card className="bg-card border-border/60">
                  <CardContent className="p-5">
                    <h3 className="font-heading font-semibold text-sm mb-4">Price Level Visualization</h3>
                    <div className="relative h-48 flex items-end">
                      {(() => {
                        const sl = parseFloat(calc.stopLoss);
                        const e = parseFloat(calc.entry);
                        const t1 = parseFloat(calc.target1);
                        const t2 = parseFloat(calc.target2);
                        const min = sl * 0.98;
                        const max = t2 * 1.02;
                        const range = max - min;
                        const pct = (v: number) => ((v - min) / range) * 100;

                        return (
                          <div className="w-full h-full relative">
                            {/* Stop Loss */}
                            <div
                              className="absolute left-0 right-0 border-t-2 border-dashed border-rose/60"
                              style={{ bottom: `${pct(sl)}%` }}
                            >
                              <span className="absolute right-0 -top-5 text-xs font-mono text-rose">
                                Stop ${calc.stopLoss}
                              </span>
                            </div>
                            {/* Entry */}
                            <div
                              className="absolute left-0 right-0 border-t-2 border-indigo"
                              style={{ bottom: `${pct(e)}%` }}
                            >
                              <span className="absolute left-0 -top-5 text-xs font-mono text-indigo">
                                Entry ${calc.entry}
                              </span>
                            </div>
                            {/* Target 1 */}
                            <div
                              className="absolute left-0 right-0 border-t-2 border-dashed border-emerald/60"
                              style={{ bottom: `${pct(t1)}%` }}
                            >
                              <span className="absolute left-0 -top-5 text-xs font-mono text-emerald">
                                T1 ${calc.target1}
                              </span>
                            </div>
                            {/* Target 2 */}
                            <div
                              className="absolute left-0 right-0 border-t-2 border-dashed border-emerald"
                              style={{ bottom: `${pct(t2)}%` }}
                            >
                              <span className="absolute right-0 -top-5 text-xs font-mono text-emerald">
                                T2 ${calc.target2}
                              </span>
                            </div>
                            {/* Risk zone */}
                            <div
                              className="absolute left-0 right-0 bg-rose/5"
                              style={{
                                bottom: `${pct(sl)}%`,
                                height: `${pct(e) - pct(sl)}%`,
                              }}
                            />
                            {/* Reward zone */}
                            <div
                              className="absolute left-0 right-0 bg-emerald/5"
                              style={{
                                bottom: `${pct(e)}%`,
                                height: `${pct(t2) - pct(e)}%`,
                              }}
                            />
                          </div>
                        );
                      })()}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <Card className="bg-card border-border/60 border-dashed">
                <CardContent className="p-12 text-center">
                  <CalcIcon className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                  <h3 className="font-heading font-semibold text-lg mb-2 text-muted-foreground">
                    Enter Your Candle Data
                  </h3>
                  <p className="text-sm text-muted-foreground/60 max-w-sm mx-auto">
                    Input the open and close prices of the first 5-minute red candle to calculate
                    Oracle-style entry, stop loss, and profit targets.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
