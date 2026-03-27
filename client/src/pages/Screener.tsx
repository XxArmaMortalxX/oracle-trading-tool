/*
 * DESIGN: Signal Deck — Live Stock Screener
 * Real-time Axiarch-style pre-market screener powered by Yahoo Finance
 */
import { motion, AnimatePresence } from "framer-motion";
import { useState, useMemo, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { trpc } from "@/lib/trpc";
import {
  Search,
  Filter,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  RotateCcw,
  Zap,
  Loader2,
  AlertCircle,
  RefreshCw,
  Activity,
  Clock,
  BarChart3,
} from "lucide-react";

function formatVolume(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + "B";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(0) + "K";
  return n.toString();
}

export default function Screener() {
  // ── Filter state ──
  const [priceMin, setPriceMin] = useState(0.5);
  const [priceMax, setPriceMax] = useState(20);
  const [maxFloat, setMaxFloat] = useState(50);
  const [minVolume, setMinVolume] = useState(50000);
  const [minGap, setMinGap] = useState(2);
  const [formerRunnersOnly, setFormerRunnersOnly] = useState(false);

  // ── Debounced query params ──
  const [debouncedParams, setDebouncedParams] = useState({
    priceMin, priceMax, minVolume, minGap, maxFloat, formerRunnersOnly,
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedParams({ priceMin, priceMax, minVolume, minGap, maxFloat, formerRunnersOnly });
    }, 500);
    return () => clearTimeout(timer);
  }, [priceMin, priceMax, minVolume, minGap, maxFloat, formerRunnersOnly]);

  // ── tRPC query ──
  const { data, isLoading, isRefetching, error, refetch } = trpc.screener.scan.useQuery(
    debouncedParams,
    {
      staleTime: 2 * 60 * 1000, // 2 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    }
  );

  const results = data?.results ?? [];
  const totalFetched = data?.totalFetched ?? 0;
  const scanTimeMs = data?.scanTimeMs ?? 0;
  const isCached = data?.cached ?? false;
  const cacheAge = data?.cacheAgeSeconds ?? 0;
  const apiErrors = data?.apiErrors ?? 0;
  const isRateLimited = totalFetched === 0 && apiErrors > 0 && !isLoading;

  // ── Sort state ──
  const [sortBy, setSortBy] = useState<"oracleScore" | "gapPercent" | "volume" | "price">("oracleScore");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const sorted = useMemo(() => {
    const arr = [...results];
    arr.sort((a, b) => {
      const va = a[sortBy] ?? 0;
      const vb = b[sortBy] ?? 0;
      return sortDir === "desc" ? vb - va : va - vb;
    });
    return arr;
  }, [results, sortBy, sortDir]);

  const toggleSort = useCallback((col: typeof sortBy) => {
    if (sortBy === col) {
      setSortDir(d => d === "desc" ? "asc" : "desc");
    } else {
      setSortBy(col);
      setSortDir("desc");
    }
  }, [sortBy]);

  const resetFilters = () => {
    setPriceMin(0.5);
    setPriceMax(20);
    setMaxFloat(50);
    setMinVolume(50000);
    setMinGap(2);
    setFormerRunnersOnly(false);
  };

  return (
    <div>
      {/* ── Header ── */}
      <section className="border-b border-border/50">
        <div className="container pt-16 pb-12">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald/10 border border-emerald/20 text-emerald text-xs font-mono font-medium mb-4">
              <Activity className="w-3 h-3" /> LIVE DATA
            </span>
            <h1 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight mb-3">
              Axiarch Stock Screener
            </h1>
            <p className="text-muted-foreground max-w-2xl text-lg">
              Real-time screening powered by Yahoo Finance. Adjust filters to narrow 200+ stocks down to Axiarch-quality picks.
            </p>
            {/* Scan stats bar */}
            {data && !isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-wrap items-center gap-4 mt-4 text-xs text-muted-foreground"
              >
                <span className="flex items-center gap-1">
                  <BarChart3 className="w-3 h-3 text-indigo" />
                  {totalFetched} stocks scanned
                </span>
                <span className="flex items-center gap-1">
                  <Filter className="w-3 h-3 text-emerald" />
                  {results.length} match filters
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-amber" />
                  {isCached ? `cached ${cacheAge}s ago` : `${(scanTimeMs / 1000).toFixed(1)}s scan time`}
                </span>
                {apiErrors > 0 && totalFetched > 0 && (
                  <span className="flex items-center gap-1 text-amber">
                    <AlertCircle className="w-3 h-3" />
                    {apiErrors} API errors (partial data)
                  </span>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => refetch()}
                  disabled={isRefetching}
                  className="h-6 text-xs gap-1 text-muted-foreground hover:text-foreground"
                >
                  <RefreshCw className={`w-3 h-3 ${isRefetching ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </motion.div>
            )}
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
                    max={500}
                    step={1}
                    className="mt-2"
                  />
                </div>

                {/* Min Volume */}
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 flex items-center justify-between">
                    <span>Min Volume</span>
                    <span className="font-mono text-foreground">{formatVolume(minVolume)}</span>
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

                {/* Min Gap / Change % */}
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 flex items-center justify-between">
                    <span>Min Gap / Change %</span>
                    <span className="font-mono text-foreground">{minGap}%</span>
                  </Label>
                  <Slider
                    value={[minGap]}
                    onValueChange={([v]) => setMinGap(v)}
                    min={0}
                    max={50}
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

            {/* Axiarch Criteria Reference */}
            <Card className="bg-card border-border/60">
              <CardContent className="p-5">
                <h3 className="font-heading font-semibold text-xs mb-3 flex items-center gap-2 text-muted-foreground">
                  <Zap className="w-3.5 h-3.5 text-indigo" />
                  AXIARCH DEFAULTS
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
                    <span className="font-mono text-foreground">&gt; 50K</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Gap / Change</span>
                    <span className="font-mono text-foreground">&gt; 2%</span>
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
                {!isLoading && (
                  <span className="text-xs font-mono text-muted-foreground bg-secondary px-2 py-0.5 rounded">
                    {results.length} / {totalFetched}
                  </span>
                )}
              </h2>
              {/* Sort controls */}
              {results.length > 0 && (
                <div className="flex items-center gap-1 text-xs">
                  <span className="text-muted-foreground mr-1">Sort:</span>
                  {(["oracleScore", "gapPercent", "volume", "price"] as const).map(col => (
                    <Button
                      key={col}
                      variant={sortBy === col ? "secondary" : "ghost"}
                      size="sm"
                      onClick={() => toggleSort(col)}
                      className="h-6 text-xs px-2"
                    >
                      {col === "oracleScore" ? "Score" : col === "gapPercent" ? "Gap" : col === "volume" ? "Vol" : "Price"}
                      {sortBy === col && (sortDir === "desc" ? " ↓" : " ↑")}
                    </Button>
                  ))}
                </div>
              )}
            </div>

            {/* Loading state */}
            {isLoading && (
              <Card className="bg-card border-border/60">
                <CardContent className="p-16 text-center">
                  <Loader2 className="w-10 h-10 text-indigo animate-spin mx-auto mb-4" />
                  <h3 className="font-heading font-semibold text-lg mb-2">Scanning Live Market Data</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    Fetching real-time prices from Yahoo Finance for 200+ tickers. This typically takes 30-60 seconds.
                  </p>
                  <div className="mt-4 flex items-center justify-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald animate-pulse" />
                    <span className="text-xs text-muted-foreground font-mono">Live connection active</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Refetching overlay */}
            {isRefetching && !isLoading && (
              <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin text-indigo" />
                Refreshing live data...
              </div>
            )}

            {/* Error state */}
            {error && !isLoading && (
              <Card className="bg-card border-rose/20">
                <CardContent className="p-12 text-center">
                  <AlertCircle className="w-10 h-10 text-rose mx-auto mb-4" />
                  <h3 className="font-heading font-semibold text-lg mb-2 text-rose">Scan Failed</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-4">
                    {error.message || "Failed to fetch live market data. The market may be closed or the API may be temporarily unavailable."}
                  </p>
                  <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1">
                    <RefreshCw className="w-3 h-3" /> Retry Scan
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Rate limited warning */}
            {isRateLimited && !error && (
              <Card className="bg-card border-amber/30">
                <CardContent className="p-12 text-center">
                  <AlertCircle className="w-10 h-10 text-amber mx-auto mb-4" />
                  <h3 className="font-heading font-semibold text-lg mb-2 text-amber">API Rate Limited</h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
                    The Yahoo Finance API has temporarily hit its usage limit. Data will be available again shortly.
                    Try refreshing in a few minutes.
                  </p>
                  <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1">
                    <RefreshCw className="w-3 h-3" /> Retry Scan
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Results table */}
            {!isLoading && !error && sorted.length > 0 && (
              <div className="space-y-2">
                {/* Table Header */}
                <div className="hidden sm:grid grid-cols-15 gap-2 px-4 py-2 text-xs font-heading font-semibold text-muted-foreground" style={{ gridTemplateColumns: 'repeat(15, minmax(0, 1fr))' }}>
                  <div className="col-span-2">Ticker</div>
                  <div className="col-span-1">Price</div>
                  <div className="col-span-1">Gap %</div>
                  <div className="col-span-1">Chg %</div>
                  <div className="col-span-2">Volume</div>
                  <div className="col-span-1">Float</div>
                  <div className="col-span-1">Rel Vol</div>
                  <div className="col-span-1">Score</div>
                  <div className="col-span-1">Sentiment</div>
                  <div className="col-span-1">Trend</div>
                  <div className="col-span-1">Crowd</div>
                  <div className="col-span-1">Signal</div>
                </div>

                <AnimatePresence mode="popLayout">
                  {sorted.map((stock, i) => (
                    <motion.div
                      key={stock.ticker}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ delay: Math.min(i * 0.03, 0.5) }}
                      layout
                    >
                      <Card
                        className={`bg-card border-border/40 hover:border-border/80 transition-all ${
                          stock.oracleScore >= 50 ? (stock.bias === "LONG" ? "signal-card-long glow-emerald" : "signal-card-short glow-rose") : ""
                        }`}
                      >
                        <CardContent className="p-4">
                          <div className="grid items-center gap-2" style={{ gridTemplateColumns: 'repeat(15, minmax(0, 1fr))' }}>
                            {/* Ticker + name */}
                            <div className="col-span-12 sm:col-span-2 flex items-center gap-2">
                              <span className="font-mono font-bold text-foreground">{stock.ticker}</span>
                              {stock.formerRunner && (
                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo/10 text-indigo">
                                  RUNNER
                                </span>
                              )}
                            </div>
                            {/* Price */}
                            <div className="col-span-4 sm:col-span-1 font-mono text-sm">${stock.price.toFixed(2)}</div>
                            {/* Gap % */}
                            <div className="col-span-4 sm:col-span-1">
                              <span className={`font-mono text-sm font-medium flex items-center gap-0.5 ${
                                stock.gapPercent > 0 ? "text-emerald" : stock.gapPercent < 0 ? "text-rose" : "text-muted-foreground"
                              }`}>
                                {stock.gapPercent > 0 ? <ArrowUpRight className="w-3 h-3" /> : stock.gapPercent < 0 ? <ArrowDownRight className="w-3 h-3" /> : null}
                                {stock.gapPercent > 0 ? "+" : ""}{stock.gapPercent.toFixed(1)}%
                              </span>
                            </div>
                            {/* Day Change % */}
                            <div className="col-span-4 sm:col-span-1">
                              <span className={`font-mono text-sm font-medium ${
                                stock.dayChangePercent > 0 ? "text-emerald" : stock.dayChangePercent < 0 ? "text-rose" : "text-muted-foreground"
                              }`}>
                                {stock.dayChangePercent > 0 ? "+" : ""}{stock.dayChangePercent.toFixed(1)}%
                              </span>
                            </div>
                            {/* Volume */}
                            <div className="col-span-4 sm:col-span-2 font-mono text-xs text-muted-foreground">
                              {formatVolume(stock.volume)}
                            </div>
                            {/* Float */}
                            <div className="hidden sm:block col-span-1 font-mono text-xs text-muted-foreground">
                              {stock.floatM != null ? `${stock.floatM}M` : "—"}
                            </div>
                            {/* Relative Volume */}
                            <div className="hidden sm:block col-span-1">
                              {stock.relativeVolume != null ? (
                                <span className={`font-mono text-xs ${stock.relativeVolume >= 2 ? "text-amber font-medium" : "text-muted-foreground"}`}>
                                  {stock.relativeVolume}x
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </div>
                            {/* Oracle Score */}
                            <div className="hidden sm:block col-span-1">
                              <span className={`font-mono text-xs font-bold px-1.5 py-0.5 rounded ${
                                stock.oracleScore >= 60 ? "bg-emerald/15 text-emerald" :
                                stock.oracleScore >= 40 ? "bg-amber/15 text-amber" :
                                "bg-secondary text-muted-foreground"
                              }`}>
                                {stock.oracleScore}
                              </span>
                            </div>
                            {/* Sentiment */}
                            <div className="hidden sm:block col-span-1">
                              {stock.sentimentLabel ? (
                                <span
                                  className={`inline-flex items-center gap-1 text-[10px] font-mono font-medium px-1.5 py-0.5 rounded-full ${
                                    stock.sentimentLabel === "Strong Bullish"
                                      ? "bg-emerald/15 text-emerald border border-emerald/20"
                                      : stock.sentimentLabel === "Bullish"
                                      ? "bg-emerald/10 text-emerald"
                                      : stock.sentimentLabel === "Neutral"
                                      ? "bg-secondary text-muted-foreground"
                                      : stock.sentimentLabel === "Bearish"
                                      ? "bg-rose/10 text-rose"
                                      : "bg-rose/15 text-rose border border-rose/20"
                                  }`}
                                >
                                  {stock.sentimentLabel === "Strong Bullish" || stock.sentimentLabel === "Bullish" ? (
                                    <TrendingUp className="w-2.5 h-2.5" />
                                  ) : stock.sentimentLabel === "Bearish" || stock.sentimentLabel === "Strong Bearish" ? (
                                    <TrendingDown className="w-2.5 h-2.5" />
                                  ) : null}
                                  {stock.sentimentLabel}
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground/40">—</span>
                              )}
                            </div>
                            {/* Sentiment Trend Arrow */}
                            <div className="hidden sm:block col-span-1">
                              {(stock as any).sentimentTrend ? (
                                <div className="flex flex-col items-start gap-0.5">
                                  <span
                                    className={`inline-flex items-center gap-0.5 text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-full ${
                                      (stock as any).sentimentTrend === "improving"
                                        ? "bg-emerald/15 text-emerald border border-emerald/20"
                                        : (stock as any).sentimentTrend === "declining"
                                        ? "bg-rose/15 text-rose border border-rose/20"
                                        : "bg-secondary/60 text-muted-foreground"
                                    }`}
                                  >
                                    {(stock as any).sentimentTrend === "improving" ? (
                                      <>↑+{(stock as any).sentimentDelta}</>
                                    ) : (stock as any).sentimentTrend === "declining" ? (
                                      <>↓{(stock as any).sentimentDelta}</>
                                    ) : (
                                      <>→ 0</>
                                    )}
                                  </span>
                                  {(stock as any).sentimentTransition && (
                                    <span className="text-[9px] font-mono text-muted-foreground/70 whitespace-nowrap">
                                      {(stock as any).sentimentTransition}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-[10px] font-mono text-muted-foreground/40 px-1.5 py-0.5 rounded-full bg-secondary/30">
                                  NEW
                                </span>
                              )}
                            </div>
                            {/* Reddit Crowd Sentiment */}
                            <div className="hidden sm:block col-span-1">
                              {(stock as any).redditSentimentCrowdBias ? (
                                <div className="flex flex-col items-start gap-0.5">
                                  <span className={`inline-flex items-center gap-1 text-[10px] font-mono font-medium ${
                                    (stock as any).redditSentimentCrowdBias === "LONG_BIAS" ? "text-emerald" :
                                    (stock as any).redditSentimentCrowdBias === "SHORT_BIAS" ? "text-rose" :
                                    "text-muted-foreground"
                                  }`}>
                                    {(stock as any).redditSentimentCrowdBias === "LONG_BIAS" ? "\ud83d\udfe2" :
                                     (stock as any).redditSentimentCrowdBias === "SHORT_BIAS" ? "\ud83d\udd34" : "\u26aa"}
                                    {" "}
                                    {(stock as any).redditSentimentCrowdBias === "LONG_BIAS" ? "Long" :
                                     (stock as any).redditSentimentCrowdBias === "SHORT_BIAS" ? "Short" : "Mixed"}
                                  </span>
                                  <span className="text-[9px] font-mono text-muted-foreground/60">
                                    {(stock as any).redditSentimentBullishPct ?? 0}%B / {(stock as any).redditSentimentBearishPct ?? 0}%S
                                  </span>
                                </div>
                              ) : (
                                <span className="text-[10px] text-muted-foreground/30">&mdash;</span>
                              )}
                            </div>
                            {/* Signal */}
                            <div className="hidden sm:block col-span-1">
                              <span className={`inline-flex items-center gap-1 text-xs font-mono px-2 py-1 rounded ${
                                stock.bias === "LONG"
                                  ? "bg-emerald/10 text-emerald"
                                  : "bg-rose/10 text-rose"
                              }`}>
                                {stock.bias === "LONG" ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                {stock.bias}
                              </span>
                            </div>
                          </div>
                          {/* Mobile-only extra info */}
                          <div className="sm:hidden mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                            <span className={`font-mono font-bold ${
                              stock.oracleScore >= 60 ? "text-emerald" : stock.oracleScore >= 40 ? "text-amber" : ""
                            }`}>
                              Score: {stock.oracleScore}
                            </span>
                            <span className={`inline-flex items-center gap-0.5 font-mono ${
                              stock.bias === "LONG" ? "text-emerald" : "text-rose"
                            }`}>
                              {stock.bias === "LONG" ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                              {stock.bias}
                            </span>
                            {stock.relativeVolume != null && stock.relativeVolume >= 2 && (
                              <span className="text-amber font-mono">{stock.relativeVolume}x vol</span>
                            )}
                            {stock.sentimentLabel && (
                              <span className={`font-mono ${
                                stock.sentimentLabel.includes("Bullish") ? "text-emerald" :
                                stock.sentimentLabel.includes("Bearish") ? "text-rose" : "text-muted-foreground"
                              }`}>
                                {stock.sentimentLabel}
                              </span>
                            )}
                            {(stock as any).redditSentimentCrowdBias && (
                              <span className={`font-mono ${
                                (stock as any).redditSentimentCrowdBias === "LONG_BIAS" ? "text-emerald" :
                                (stock as any).redditSentimentCrowdBias === "SHORT_BIAS" ? "text-rose" : "text-muted-foreground"
                              }`}>
                                {(stock as any).redditSentimentCrowdBias === "LONG_BIAS" ? "\ud83d\udfe2 Long" :
                                 (stock as any).redditSentimentCrowdBias === "SHORT_BIAS" ? "\ud83d\udd34 Short" : "\u26aa Mixed"}
                              </span>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}

            {/* Empty state */}
            {!isLoading && !error && sorted.length === 0 && data && (
              <Card className="bg-card border-border/60 border-dashed">
                <CardContent className="p-12 text-center">
                  <Search className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                  <h3 className="font-heading font-semibold text-lg mb-2 text-muted-foreground">
                    No Stocks Match
                  </h3>
                  <p className="text-sm text-muted-foreground/60 max-w-sm mx-auto">
                    Your filters are too restrictive. Try loosening the criteria or adjusting the price range to see more results.
                  </p>
                  <Button variant="outline" size="sm" onClick={resetFilters} className="mt-4 gap-1">
                    <RotateCcw className="w-3 h-3" /> Reset Filters
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Disclaimer */}
            <div className="mt-6 p-4 rounded-lg bg-amber/5 border border-amber/15">
              <p className="text-xs text-muted-foreground flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber shrink-0 mt-0.5" />
                <span>
                  This screener displays real-time market data from Yahoo Finance. Data may be delayed up to 15 minutes during market hours.
                  Axiarch scores and bias signals are for research purposes only — not financial advice.
                </span>
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
