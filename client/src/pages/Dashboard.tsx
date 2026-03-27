/**
 * DESIGN: Signal Deck — Live Picks Dashboard
 * Shows latest Oracle scan results, scan history, and notification preferences
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Bell,
  BellOff,
  Clock,
  Loader2,
  Play,
  RefreshCw,
  Shield,
  Target,
  TrendingUp,
  TrendingDown,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import SocialRadar from "@/components/SocialRadar";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0, 0, 0.2, 1] as const } },
};

function formatNumber(n: number | null | undefined): string {
  if (n == null) return "N/A";
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + "B";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toString();
}

function formatPrice(n: number | null | undefined): string {
  if (n == null) return "N/A";
  return "$" + n.toFixed(2);
}

export default function Dashboard() {
  const { user, isAuthenticated } = useAuth();
  const utils = trpc.useUtils();

  // Queries
  const latestSession = trpc.scan.latestSession.useQuery();
  const latestPicks = trpc.scan.latestPicks.useQuery();
  const recentSessions = trpc.scan.recentSessions.useQuery();

  // Notification prefs (only if authenticated)
  const notifPrefs = trpc.notifications.getPrefs.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
  });

  // ── Refresh Picks mutation — fetches fresh real-time data from Yahoo Finance ──
  const refreshPicks = trpc.scan.refreshPicks.useMutation({
    onSuccess: (data) => {
      toast.success(
        data.picksCount > 0
          ? `Refreshed! ${data.picksCount} live picks from Yahoo Finance.`
          : "Scan complete — no stocks matched Oracle criteria right now."
      );
      // Invalidate all scan queries to show fresh data
      utils.scan.latestSession.invalidate();
      utils.scan.latestPicks.invalidate();
      utils.scan.recentSessions.invalidate();
    },
    onError: (err) => {
      toast.error(`Refresh failed: ${err.message}`);
    },
  });

  // ── Trigger Scan mutation (admin only) ──
  const triggerScan = trpc.scan.triggerScan.useMutation({
    onSuccess: (data) => {
      toast.success(`Scan complete! ${data.picksCount} picks generated.${data.notified ? " Notification sent!" : ""}`);
      utils.scan.latestSession.invalidate();
      utils.scan.latestPicks.invalidate();
      utils.scan.recentSessions.invalidate();
    },
    onError: (err) => {
      toast.error(`Scan failed: ${err.message}`);
    },
  });

  const updatePrefs = trpc.notifications.updatePrefs.useMutation({
    onSuccess: () => {
      toast.success("Notification preferences updated!");
      utils.notifications.getPrefs.invalidate();
    },
    onError: (err) => {
      toast.error(`Failed to update: ${err.message}`);
    },
  });

  const [minScore, setMinScore] = useState(60);
  const [biasFilter, setBiasFilter] = useState<"ALL" | "LONG" | "SHORT">("ALL");

  const picks = latestPicks.data || [];
  const session = latestSession.data;
  const sessions = recentSessions.data || [];
  const longs = picks.filter((p) => p.bias === "LONG");
  const shorts = picks.filter((p) => p.bias === "SHORT");

  const isRefreshing = refreshPicks.isPending;
  const isScanning = triggerScan.isPending;

  return (
    <div className="container py-12">
      <motion.div variants={fadeUp} initial="hidden" animate="show">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald/10 border border-emerald/20 text-emerald text-xs font-mono font-medium tracking-wide">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald animate-pulse" />
                LIVE DATA
              </span>
              {isRefreshing && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo/10 border border-indigo/20 text-indigo text-xs font-mono font-medium tracking-wide">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  SCANNING MARKET
                </span>
              )}
            </div>
            <h1 className="font-heading text-3xl font-bold tracking-tight">
              Oracle <span className="text-gradient">Live Picks</span>
            </h1>
            <p className="text-muted-foreground mt-1">
              Real-time stock screening powered by Oracle-style methodology
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 border-border/60"
              onClick={() => refreshPicks.mutate()}
              disabled={isRefreshing || isScanning}
            >
              {isRefreshing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              {isRefreshing ? "Scanning..." : "Refresh"}
            </Button>
            {user?.role === "admin" && (
              <Button
                size="sm"
                className="gap-2 bg-indigo hover:bg-indigo/90 text-white"
                onClick={() => triggerScan.mutate()}
                disabled={isScanning || isRefreshing}
              >
                {isScanning ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                Run Scan
              </Button>
            )}
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="bg-card border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo/10 flex items-center justify-center">
                <Zap className="w-5 h-5 text-indigo" />
              </div>
              <div>
                <p className="font-mono font-bold text-xl text-foreground">
                  {session?.totalStocksScanned ?? "—"}
                </p>
                <p className="text-xs text-muted-foreground">Stocks Scanned</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-emerald" />
              </div>
              <div>
                <p className="font-mono font-bold text-xl text-foreground">{longs.length}</p>
                <p className="text-xs text-muted-foreground">Long Picks</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-rose/10 flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-rose" />
              </div>
              <div>
                <p className="font-mono font-bold text-xl text-foreground">{shorts.length}</p>
                <p className="text-xs text-muted-foreground">Short Picks</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber" />
              </div>
              <div>
                <p className="font-mono font-bold text-xl text-foreground">
                  {session?.scanDate ?? "—"}
                </p>
                <p className="text-xs text-muted-foreground">Last Scan</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Loading state */}
        {(latestPicks.isLoading || isRefreshing) && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-indigo mb-4" />
            <span className="text-muted-foreground font-medium">
              {isRefreshing
                ? "Fetching real-time data from Yahoo Finance..."
                : "Loading latest picks..."}
            </span>
            {isRefreshing && (
              <span className="text-xs text-muted-foreground/60 mt-2">
                Scanning 200+ tickers. This may take 30-60 seconds.
              </span>
            )}
          </div>
        )}

        {/* No data state */}
        {!latestPicks.isLoading && !isRefreshing && picks.length === 0 && (
          <Card className="bg-card border-border/50 mb-8">
            <CardContent className="p-12 text-center">
              <Activity className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="font-heading text-lg font-semibold mb-2">No Scan Data Yet</h3>
              <p className="text-muted-foreground text-sm max-w-md mx-auto mb-6">
                The Oracle scanner hasn't run yet. Click "Refresh" to fetch real-time market data
                from Yahoo Finance, or {user?.role === "admin"
                  ? "click 'Run Scan' to trigger a full scan with notifications."
                  : "wait for the daily 8:00 AM ET pre-market scan."}
              </p>
              <Button
                className="gap-2 bg-indigo hover:bg-indigo/90 text-white"
                onClick={() => refreshPicks.mutate()}
                disabled={isRefreshing}
              >
                {isRefreshing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                {isRefreshing ? "Scanning Market..." : "Fetch Live Data"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Picks Table */}
        {!isRefreshing && picks.length > 0 && (
          <div className="mb-8">
            <h2 className="font-heading text-xl font-bold mb-4">Today's Oracle Picks</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left py-3 px-3 text-xs font-mono text-muted-foreground font-medium">TICKER</th>
                    <th className="text-left py-3 px-3 text-xs font-mono text-muted-foreground font-medium">BIAS</th>
                    <th className="text-right py-3 px-3 text-xs font-mono text-muted-foreground font-medium">SCORE</th>
                    <th className="text-right py-3 px-3 text-xs font-mono text-muted-foreground font-medium">PRICE</th>
                    <th className="text-right py-3 px-3 text-xs font-mono text-muted-foreground font-medium">ENTRY</th>
                    <th className="text-right py-3 px-3 text-xs font-mono text-muted-foreground font-medium">STOP</th>
                    <th className="text-right py-3 px-3 text-xs font-mono text-muted-foreground font-medium">TARGET</th>
                    <th className="text-right py-3 px-3 text-xs font-mono text-muted-foreground font-medium">R/R</th>
                    <th className="text-right py-3 px-3 text-xs font-mono text-muted-foreground font-medium">GAP %</th>
                    <th className="text-right py-3 px-3 text-xs font-mono text-muted-foreground font-medium">VOLUME</th>
                    <th className="text-center py-3 px-3 text-xs font-mono text-muted-foreground font-medium">SENTIMENT</th>
                    <th className="text-center py-3 px-3 text-xs font-mono text-muted-foreground font-medium">TREND</th>
                    <th className="text-center py-3 px-3 text-xs font-mono text-muted-foreground font-medium">REDDIT</th>
                  </tr>
                </thead>
                <tbody>
                  {picks.map((pick) => (
                    <tr
                      key={pick.id}
                      className={`border-b border-border/30 hover:bg-secondary/30 transition-colors ${
                        pick.bias === "LONG" ? "signal-card-long" : "signal-card-short"
                      }`}
                    >
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm text-foreground">
                            {pick.ticker}
                          </span>
                          {pick.companyName && (
                            <span className="text-xs text-muted-foreground hidden lg:inline truncate max-w-[120px]">
                              {pick.companyName}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-mono font-medium px-2 py-0.5 rounded ${
                            pick.bias === "LONG"
                              ? "bg-emerald/10 text-emerald"
                              : "bg-rose/10 text-rose"
                          }`}
                        >
                          {pick.bias === "LONG" ? (
                            <ArrowUpRight className="w-3 h-3" />
                          ) : (
                            <ArrowDownRight className="w-3 h-3" />
                          )}
                          {pick.bias}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <div className="w-16 h-1.5 rounded-full bg-secondary overflow-hidden">
                            <div
                              className="h-full rounded-full bg-indigo"
                              style={{ width: `${pick.oracleScore}%` }}
                            />
                          </div>
                          <span className="font-mono text-xs text-foreground font-medium">
                            {pick.oracleScore}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-sm text-foreground">
                        {formatPrice(pick.currentPrice)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-sm text-indigo">
                        {formatPrice(pick.entryPrice)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-sm text-rose">
                        {formatPrice(pick.stopLoss)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-sm text-emerald">
                        {formatPrice(pick.target1)}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span className="font-mono text-xs font-medium text-amber">
                          {pick.riskRewardRatio}:1
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span
                          className={`font-mono text-xs ${
                            (pick.gapPercent ?? 0) >= 0 ? "text-emerald" : "text-rose"
                          }`}
                        >
                          {(pick.gapPercent ?? 0) >= 0 ? "+" : ""}
                          {(pick.gapPercent ?? 0).toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-xs text-muted-foreground">
                        {formatNumber(pick.volume)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {pick.sentimentLabel ? (
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-mono font-medium px-2 py-0.5 rounded-full ${
                              pick.sentimentLabel === "Strong Bullish"
                                ? "bg-emerald/15 text-emerald border border-emerald/20"
                                : pick.sentimentLabel === "Bullish"
                                ? "bg-emerald/10 text-emerald"
                                : pick.sentimentLabel === "Neutral"
                                ? "bg-secondary text-muted-foreground"
                                : pick.sentimentLabel === "Bearish"
                                ? "bg-rose/10 text-rose"
                                : "bg-rose/15 text-rose border border-rose/20"
                            }`}
                          >
                            {pick.sentimentLabel === "Strong Bullish" || pick.sentimentLabel === "Bullish" ? (
                              <TrendingUp className="w-2.5 h-2.5" />
                            ) : pick.sentimentLabel === "Bearish" || pick.sentimentLabel === "Strong Bearish" ? (
                              <TrendingDown className="w-2.5 h-2.5" />
                            ) : null}
                            {pick.sentimentLabel}
                            <span className="opacity-60">({pick.sentimentScore ?? 0})</span>
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground/40">—</span>
                        )}
                      </td>
                      {/* Sentiment Trend Arrow */}
                      <td className="py-3 px-3 text-center">
                        {(pick as any).sentimentTrend ? (
                          <div className="flex flex-col items-center gap-0.5">
                            <span
                              className={`inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full ${
                                (pick as any).sentimentTrend === "improving"
                                  ? "bg-emerald/15 text-emerald border border-emerald/20"
                                  : (pick as any).sentimentTrend === "declining"
                                  ? "bg-rose/15 text-rose border border-rose/20"
                                  : "bg-secondary/60 text-muted-foreground"
                              }`}
                            >
                              {(pick as any).sentimentTrend === "improving" ? (
                                <>↑ +{(pick as any).sentimentDelta}</>
                              ) : (pick as any).sentimentTrend === "declining" ? (
                                <>↓ {(pick as any).sentimentDelta}</>
                              ) : (
                                <>→ 0</>
                              )}
                            </span>
                            {(pick as any).sentimentTransition && (
                              <span className="text-[9px] font-mono text-muted-foreground/70 whitespace-nowrap">
                                {(pick as any).sentimentTransition}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono text-muted-foreground/40 px-2 py-0.5 rounded-full bg-secondary/30">
                            NEW
                          </span>
                        )}
                      </td>
                      {/* Reddit Mention Velocity + Crowd Sentiment */}
                      <td className="py-3 px-3 text-center">
                        {(pick as any).redditMentions != null ? (
                          <div className="flex flex-col items-center gap-0.5">
                            <span
                              className={`inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border ${
                                (pick as any).redditVelocitySignal === "EXPLODING"
                                  ? "bg-rose/15 text-rose border-rose/20"
                                  : (pick as any).redditVelocitySignal === "SURGING"
                                  ? "bg-amber/15 text-amber border-amber/20"
                                  : (pick as any).redditVelocitySignal === "RISING"
                                  ? "bg-emerald/15 text-emerald border-emerald/20"
                                  : "bg-secondary/40 text-muted-foreground border-border/20"
                              }`}
                            >
                              {(pick as any).redditMentions} mentions
                            </span>
                            <span className={`text-[9px] font-mono ${
                              (pick as any).redditVelocityPct > 50 ? "text-rose" :
                              (pick as any).redditVelocityPct > 0 ? "text-emerald" :
                              "text-muted-foreground/50"
                            }`}>
                              {(pick as any).redditVelocityPct > 0 ? "+" : ""}{((pick as any).redditVelocityPct ?? 0).toFixed(0)}%
                            </span>
                            {/* Crowd Sentiment Bias */}
                            {(pick as any).redditSentimentCrowdBias && (
                              <span className={`text-[9px] font-mono font-medium ${
                                (pick as any).redditSentimentCrowdBias === "LONG_BIAS" ? "text-emerald" :
                                (pick as any).redditSentimentCrowdBias === "SHORT_BIAS" ? "text-rose" :
                                "text-muted-foreground"
                              }`}>
                                {(pick as any).redditSentimentCrowdBias === "LONG_BIAS" ? "🟢" :
                                 (pick as any).redditSentimentCrowdBias === "SHORT_BIAS" ? "🔴" : "⚪"}
                                {" "}
                                {(pick as any).redditSentimentBullishPct ?? 0}% Bull
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] text-muted-foreground/30">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Social Radar — Reddit Mention Velocity */}
        <SocialRadar />

        {/* Bottom Row: Scan History + Notification Settings */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Scan History */}
          <Card className="bg-card border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="font-heading text-lg flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo" />
                Scan History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sessions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No scan history yet.</p>
              ) : (
                <div className="space-y-2">
                  {sessions.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border/30"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            s.status === "completed"
                              ? "bg-emerald"
                              : s.status === "running"
                              ? "bg-amber animate-pulse"
                              : "bg-rose"
                          }`}
                        />
                        <span className="font-mono text-sm text-foreground">{s.scanDate}</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground">
                        <span>{s.picksGenerated} picks</span>
                        <span>{s.totalStocksScanned} scanned</span>
                        {s.notificationSent === 1 && (
                          <Bell className="w-3 h-3 text-emerald" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notification Settings */}
          <Card className="bg-card border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="font-heading text-lg flex items-center gap-2">
                <Bell className="w-4 h-4 text-indigo" />
                Notification Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!isAuthenticated ? (
                <div className="text-center py-6">
                  <BellOff className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground mb-4">
                    Sign in to enable daily stock pick notifications
                  </p>
                  <Button
                    size="sm"
                    className="gap-2 bg-indigo hover:bg-indigo/90 text-white"
                    onClick={() => {
                      window.location.href = getLoginUrl();
                    }}
                  >
                    Sign In
                  </Button>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Daily Notifications</Label>
                    <Switch
                      checked={notifPrefs.data?.enabled === 1}
                      onCheckedChange={(checked) => {
                        updatePrefs.mutate({ enabled: checked ? 1 : 0 });
                      }}
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-medium mb-2 block">
                      Minimum Oracle Score: {notifPrefs.data?.minOracleScore ?? minScore}
                    </Label>
                    <Slider
                      value={[notifPrefs.data?.minOracleScore ?? minScore]}
                      min={0}
                      max={100}
                      step={5}
                      onValueChange={([val]) => {
                        setMinScore(val);
                      }}
                      onValueCommit={([val]) => {
                        updatePrefs.mutate({ minOracleScore: val });
                      }}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Only get notified for picks scoring above this threshold
                    </p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium mb-2 block">Bias Filter</Label>
                    <div className="flex gap-2">
                      {(["ALL", "LONG", "SHORT"] as const).map((b) => (
                        <Button
                          key={b}
                          size="sm"
                          variant={
                            (notifPrefs.data?.biasFilter ?? biasFilter) === b
                              ? "default"
                              : "outline"
                          }
                          className={
                            (notifPrefs.data?.biasFilter ?? biasFilter) === b
                              ? b === "LONG"
                                ? "bg-emerald hover:bg-emerald/90 text-white"
                                : b === "SHORT"
                                ? "bg-rose hover:bg-rose/90 text-white"
                                : "bg-indigo hover:bg-indigo/90 text-white"
                              : "border-border/60"
                          }
                          onClick={() => {
                            setBiasFilter(b);
                            updatePrefs.mutate({ biasFilter: b });
                          }}
                        >
                          {b}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border/30">
                    <p className="text-xs text-muted-foreground">
                      Notifications are sent daily at 8:00 AM ET when new picks are available.
                      You'll receive alerts in your Manus notification center.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Disclaimer */}
        <div className="mt-8 p-4 rounded-lg bg-amber/5 border border-amber/20">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-amber shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber mb-1">Disclaimer</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Oracle Decoded is an independent research tool for educational purposes only.
                Stock picks are generated algorithmically and should not be considered financial advice.
                Always do your own due diligence before making any trading decisions.
                Past performance does not guarantee future results. Day trading involves substantial risk.
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
