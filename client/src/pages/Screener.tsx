/*
 * DESIGN: Signal Deck — Stock Screener Simulator
 * Interactive Oracle-style pre-market screener with filters
 */
import { motion } from "framer-motion";
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Search,
  Filter,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  RotateCcw,
  Zap,
  Info,
} from "lucide-react";

// Simulated stock data for demonstration
const mockStocks = [
  { ticker: "MVTX", price: 2.45, float: 3.2, volume: 1850000, gap: 47.3, catalyst: "FDA Approval", sector: "Biotech", formerRunner: true },
  { ticker: "RSLS", price: 1.12, float: 5.1, volume: 2300000, gap: 127.0, catalyst: "Patent Grant", sector: "Tech", formerRunner: true },
  { ticker: "GXAI", price: 3.20, float: 2.8, volume: 4500000, gap: 85.2, catalyst: "AI Partnership", sector: "Tech", formerRunner: true },
  { ticker: "NXGL", price: 0.85, float: 8.5, volume: 890000, gap: 23.5, catalyst: "Earnings Beat", sector: "Consumer", formerRunner: false },
  { ticker: "BFRG", price: 4.10, float: 1.9, volume: 3200000, gap: 62.8, catalyst: "Contract Win", sector: "Defense", formerRunner: true },
  { ticker: "PRPH", price: 7.50, float: 6.3, volume: 1200000, gap: 18.4, catalyst: "Analyst Upgrade", sector: "Pharma", formerRunner: false },
  { ticker: "XTIA", price: 1.65, float: 4.7, volume: 5600000, gap: 95.1, catalyst: "Merger News", sector: "Finance", formerRunner: true },
  { ticker: "CXDO", price: 12.30, float: 9.8, volume: 780000, gap: 12.7, catalyst: "Revenue Growth", sector: "SaaS", formerRunner: false },
  { ticker: "WBUY", price: 0.55, float: 7.2, volume: 3400000, gap: 210.5, catalyst: "Reddit Hype", sector: "Retail", formerRunner: false },
  { ticker: "HPNN", price: 2.90, float: 2.1, volume: 6700000, gap: 73.6, catalyst: "FDA Phase 3", sector: "Biotech", formerRunner: true },
  { ticker: "SNTI", price: 5.80, float: 3.5, volume: 1900000, gap: 34.2, catalyst: "New Product", sector: "Tech", formerRunner: true },
  { ticker: "LMFA", price: 1.35, float: 11.2, volume: 450000, gap: 8.3, catalyst: "None", sector: "Finance", formerRunner: false },
  { ticker: "DRUG", price: 8.90, float: 4.1, volume: 2800000, gap: 41.7, catalyst: "Clinical Trial", sector: "Pharma", formerRunner: true },
  { ticker: "BNGO", price: 0.72, float: 15.3, volume: 12000000, gap: 5.2, catalyst: "Social Media", sector: "Biotech", formerRunner: false },
  { ticker: "MVIS", price: 3.45, float: 8.9, volume: 980000, gap: 15.8, catalyst: "Partnership", sector: "Tech", formerRunner: true },
];

export default function Screener() {
  const [priceMin, setPriceMin] = useState(0.5);
  const [priceMax, setPriceMax] = useState(20);
  const [maxFloat, setMaxFloat] = useState(10);
  const [minVolume, setMinVolume] = useState(500000);
  const [minGap, setMinGap] = useState(5);
  const [formerRunnersOnly, setFormerRunnersOnly] = useState(false);

  const filtered = useMemo(() => {
    return mockStocks
      .filter((s) => {
        if (s.price < priceMin || s.price > priceMax) return false;
        if (s.float > maxFloat) return false;
        if (s.volume < minVolume) return false;
        if (s.gap < minGap) return false;
        if (formerRunnersOnly && !s.formerRunner) return false;
        return true;
      })
      .sort((a, b) => b.gap - a.gap);
  }, [priceMin, priceMax, maxFloat, minVolume, minGap, formerRunnersOnly]);

  const resetFilters = () => {
    setPriceMin(0.5);
    setPriceMax(20);
    setMaxFloat(10);
    setMinVolume(500000);
    setMinGap(5);
    setFormerRunnersOnly(false);
  };

  return (
    <div>
      {/* ── Header ── */}
      <section className="border-b border-border/50">
        <div className="container pt-16 pb-12">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber/10 border border-amber/20 text-amber text-xs font-mono font-medium mb-4">
              <Search className="w-3 h-3" /> SIMULATOR
            </span>
            <h1 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight mb-3">
              Oracle Stock Screener
            </h1>
            <p className="text-muted-foreground max-w-2xl text-lg">
              Simulate Oracle's pre-market screening criteria against sample data. Adjust the filters to see how Oracle narrows 15,000 stocks down to 20 daily picks.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="container py-12">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* ── Filters ── */}
          <div className="lg:col-span-1 space-y-4">
            <Card className="bg-card border-border/60">
              <CardHeader className="border-b border-border/40">
                <CardTitle className="text-base font-heading flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-indigo" /> Filters
                  </span>
                  <Button variant="ghost" size="sm" onClick={resetFilters} className="h-7 text-xs gap-1 text-muted-foreground">
                    <RotateCcw className="w-3 h-3" /> Reset
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-5">
                {/* Price Range */}
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 flex items-center justify-between">
                    <span>Price Range</span>
                    <span className="font-mono text-foreground">${priceMin.toFixed(2)} – ${priceMax.toFixed(2)}</span>
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      value={priceMin}
                      onChange={(e) => setPriceMin(parseFloat(e.target.value) || 0)}
                      className="font-mono text-xs bg-secondary/50 border-border/40"
                      placeholder="Min"
                    />
                    <Input
                      type="number"
                      step="0.1"
                      value={priceMax}
                      onChange={(e) => setPriceMax(parseFloat(e.target.value) || 20)}
                      className="font-mono text-xs bg-secondary/50 border-border/40"
                      placeholder="Max"
                    />
                  </div>
                </div>

                {/* Max Float */}
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 flex items-center justify-between">
                    <span>Max Float (M shares)</span>
                    <span className="font-mono text-foreground">{maxFloat}M</span>
                  </Label>
                  <Slider
                    value={[maxFloat]}
                    onValueChange={([v]) => setMaxFloat(v)}
                    min={1}
                    max={50}
                    step={1}
                    className="mt-2"
                  />
                </div>

                {/* Min Volume */}
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 flex items-center justify-between">
                    <span>Min Volume</span>
                    <span className="font-mono text-foreground">{(minVolume / 1000).toFixed(0)}K</span>
                  </Label>
                  <Slider
                    value={[minVolume]}
                    onValueChange={([v]) => setMinVolume(v)}
                    min={5000}
                    max={5000000}
                    step={50000}
                    className="mt-2"
                  />
                </div>

                {/* Min Gap % */}
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 flex items-center justify-between">
                    <span>Min Gap %</span>
                    <span className="font-mono text-foreground">{minGap}%</span>
                  </Label>
                  <Slider
                    value={[minGap]}
                    onValueChange={([v]) => setMinGap(v)}
                    min={1}
                    max={100}
                    step={1}
                    className="mt-2"
                  />
                </div>

                {/* Former Runners */}
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">Former Runners Only</Label>
                  <button
                    onClick={() => setFormerRunnersOnly(!formerRunnersOnly)}
                    className={`w-10 h-5 rounded-full transition-colors relative ${
                      formerRunnersOnly ? "bg-indigo" : "bg-secondary"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${
                        formerRunnersOnly ? "translate-x-5" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </div>
              </CardContent>
            </Card>

            {/* Oracle Criteria Reference */}
            <Card className="bg-card border-border/60">
              <CardContent className="p-5">
                <h3 className="font-heading font-semibold text-xs mb-3 flex items-center gap-2 text-muted-foreground">
                  <Zap className="w-3.5 h-3.5 text-indigo" />
                  ORACLE DEFAULTS
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Price</span>
                    <span className="font-mono text-foreground">$0.50 – $20</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Float</span>
                    <span className="font-mono text-foreground">&lt; 10M</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Volume</span>
                    <span className="font-mono text-foreground">&gt; 5K (pre)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Gap</span>
                    <span className="font-mono text-foreground">&gt; 5%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── Results ── */}
          <div className="lg:col-span-3">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading font-semibold text-lg flex items-center gap-2">
                Scan Results
                <span className="text-xs font-mono text-muted-foreground bg-secondary px-2 py-0.5 rounded">
                  {filtered.length} / {mockStocks.length}
                </span>
              </h2>
            </div>

            {filtered.length > 0 ? (
              <div className="space-y-2">
                {/* Table Header */}
                <div className="hidden sm:grid grid-cols-12 gap-2 px-4 py-2 text-xs font-heading font-semibold text-muted-foreground">
                  <div className="col-span-2">Ticker</div>
                  <div className="col-span-1">Price</div>
                  <div className="col-span-1">Gap %</div>
                  <div className="col-span-2">Volume</div>
                  <div className="col-span-1">Float</div>
                  <div className="col-span-2">Catalyst</div>
                  <div className="col-span-1">Sector</div>
                  <div className="col-span-2">Signal</div>
                </div>

                {filtered.map((stock, i) => (
                  <motion.div
                    key={stock.ticker}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <Card
                      className={`bg-card border-border/40 hover:border-border/80 transition-all ${
                        stock.gap > 50 ? "signal-card-long glow-emerald" : "signal-card-long"
                      }`}
                    >
                      <CardContent className="p-4">
                        <div className="grid grid-cols-12 gap-2 items-center">
                          <div className="col-span-12 sm:col-span-2 flex items-center gap-2">
                            <span className="font-mono font-bold text-foreground">{stock.ticker}</span>
                            {stock.formerRunner && (
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo/10 text-indigo">
                                RUNNER
                              </span>
                            )}
                          </div>
                          <div className="col-span-4 sm:col-span-1 font-mono text-sm">${stock.price.toFixed(2)}</div>
                          <div className="col-span-4 sm:col-span-1">
                            <span className={`font-mono text-sm font-medium flex items-center gap-0.5 ${stock.gap > 50 ? "text-emerald" : "text-emerald/70"}`}>
                              <ArrowUpRight className="w-3 h-3" />
                              {stock.gap.toFixed(1)}%
                            </span>
                          </div>
                          <div className="col-span-4 sm:col-span-2 font-mono text-xs text-muted-foreground">
                            {(stock.volume / 1000000).toFixed(1)}M
                          </div>
                          <div className="hidden sm:block col-span-1 font-mono text-xs text-muted-foreground">
                            {stock.float.toFixed(1)}M
                          </div>
                          <div className="hidden sm:block col-span-2 text-xs text-muted-foreground">
                            {stock.catalyst}
                          </div>
                          <div className="hidden sm:block col-span-1 text-xs text-muted-foreground">
                            {stock.sector}
                          </div>
                          <div className="hidden sm:block col-span-2">
                            <span className="inline-flex items-center gap-1 text-xs font-mono px-2 py-1 rounded bg-emerald/10 text-emerald">
                              <TrendingUp className="w-3 h-3" /> LONG
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            ) : (
              <Card className="bg-card border-border/60 border-dashed">
                <CardContent className="p-12 text-center">
                  <Search className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                  <h3 className="font-heading font-semibold text-lg mb-2 text-muted-foreground">
                    No Stocks Match
                  </h3>
                  <p className="text-sm text-muted-foreground/60 max-w-sm mx-auto">
                    Your filters are too restrictive. Try loosening the criteria to see more results.
                  </p>
                  <Button variant="outline" size="sm" onClick={resetFilters} className="mt-4 gap-1">
                    <RotateCcw className="w-3 h-3" /> Reset Filters
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Info Note */}
            <div className="mt-6 p-4 rounded-lg bg-amber/5 border border-amber/15">
              <p className="text-xs text-muted-foreground flex items-start gap-2">
                <Info className="w-4 h-4 text-amber shrink-0 mt-0.5" />
                <span>
                  This screener uses simulated sample data for demonstration purposes. In a production implementation,
                  you would connect to a real-time market data API (such as Yahoo Finance, Polygon.io, or Alpha Vantage)
                  to scan live pre-market data against these Oracle-derived criteria.
                </span>
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
