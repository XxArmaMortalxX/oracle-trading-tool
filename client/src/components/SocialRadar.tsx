/**
 * Social Radar — Reddit Mention Velocity + Sentiment Tracker
 * Shows stocks with accelerating Reddit mentions from r/wallstreetbets,
 * r/pennystocks, r/shortsqueeze, etc.
 * 
 * Detects mention velocity: not just "how many mentions" but
 * "how fast are mentions accelerating."
 * 
 * NEW: Sentiment classification — analyzes post titles to classify
 * each mention as Bullish/Bearish/Neutral, showing sentiment splits
 * and crowd bias indicators.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Flame,
  Loader2,
  MessageCircle,
  RefreshCw,
  Rocket,
  TrendingUp,
  TrendingDown,
  ArrowUp,
  ArrowDown,
  Minus,
  Zap,
  ThumbsUp,
} from "lucide-react";
import { toast } from "sonner";

const VELOCITY_CONFIG = {
  EXPLODING: { label: "EXPLODING", color: "bg-rose/20 text-rose border-rose/30", icon: Rocket },
  SURGING: { label: "SURGING", color: "bg-amber/20 text-amber border-amber/30", icon: Flame },
  RISING: { label: "RISING", color: "bg-emerald/20 text-emerald border-emerald/30", icon: TrendingUp },
  STABLE: { label: "STABLE", color: "bg-secondary/60 text-muted-foreground border-border/30", icon: Minus },
  FADING: { label: "FADING", color: "bg-indigo/10 text-indigo/60 border-indigo/20", icon: TrendingDown },
  COLD: { label: "COLD", color: "bg-secondary/30 text-muted-foreground/40 border-border/20", icon: Minus },
} as const;

const BIAS_CONFIG = {
  LONG_BIAS: { emoji: "🟢", label: "Long Bias", color: "text-emerald" },
  SHORT_BIAS: { emoji: "🔴", label: "Short Bias", color: "text-rose" },
  MIXED: { emoji: "⚪", label: "Mixed", color: "text-muted-foreground" },
} as const;

function formatVelocity(pct: number): string {
  if (pct > 999) return "+999%";
  if (pct >= 0) return `+${pct.toFixed(0)}%`;
  return `${pct.toFixed(0)}%`;
}

function formatMentions(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toString();
}

function VelocityBadge({ signal }: { signal: string }) {
  const config = VELOCITY_CONFIG[signal as keyof typeof VELOCITY_CONFIG] || VELOCITY_CONFIG.STABLE;
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border ${config.color}`}>
      <Icon className="w-2.5 h-2.5" />
      {config.label}
    </span>
  );
}

function RankChange({ current, previous }: { current: number; previous: number }) {
  const delta = previous - current; // positive = rank improved (lower number = better)
  if (delta > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-mono text-emerald">
        <ArrowUp className="w-2.5 h-2.5" />
        {delta}
      </span>
    );
  }
  if (delta < 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-mono text-rose">
        <ArrowDown className="w-2.5 h-2.5" />
        {Math.abs(delta)}
      </span>
    );
  }
  return <span className="text-[10px] font-mono text-muted-foreground/40">—</span>;
}

/** Sentiment split bar — visual representation of bullish/bearish/neutral ratio */
function SentimentBar({
  bullishPct,
  bearishPct,
  neutralPct,
}: {
  bullishPct: number;
  bearishPct: number;
  neutralPct: number;
}) {
  return (
    <div className="flex items-center gap-1.5 w-full">
      <div className="flex-1 h-2 rounded-full overflow-hidden bg-secondary/30 flex">
        {bullishPct > 0 && (
          <div
            className="h-full bg-emerald transition-all duration-300"
            style={{ width: `${bullishPct}%` }}
          />
        )}
        {neutralPct > 0 && (
          <div
            className="h-full bg-indigo/40 transition-all duration-300"
            style={{ width: `${neutralPct}%` }}
          />
        )}
        {bearishPct > 0 && (
          <div
            className="h-full bg-rose transition-all duration-300"
            style={{ width: `${bearishPct}%` }}
          />
        )}
      </div>
    </div>
  );
}

/** Crowd bias badge */
function CrowdBiasBadge({ bias }: { bias: string | null }) {
  if (!bias) return null;
  const config = BIAS_CONFIG[bias as keyof typeof BIAS_CONFIG] || BIAS_CONFIG.MIXED;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-mono font-medium ${config.color}`}>
      <span>{config.emoji}</span>
      {config.label}
    </span>
  );
}

/** Compact sentiment split text */
function SentimentSplitText({
  bullishPct,
  bearishPct,
}: {
  bullishPct: number;
  bearishPct: number;
}) {
  return (
    <span className="text-[10px] font-mono">
      <span className="text-emerald">{bullishPct}%</span>
      <span className="text-muted-foreground/40"> / </span>
      <span className="text-rose">{bearishPct}%</span>
    </span>
  );
}

export default function SocialRadar() {
  const utils = trpc.useUtils();
  const [showAll, setShowAll] = useState(false);

  // Fetch trending Reddit data (now includes sentiment classification)
  const trending = trpc.reddit.trending.useQuery(undefined, {
    refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 minutes
  });

  // Refresh mutation
  const refreshReddit = trpc.reddit.refresh.useMutation({
    onSuccess: (data) => {
      toast.success(`Reddit scan complete! ${data.totalTickers} tickers tracked.`);
      utils.reddit.trending.invalidate();
    },
    onError: (err) => {
      toast.error(`Reddit refresh failed: ${err.message}`);
    },
  });

  const tickers = trending.data?.tickers || [];
  const displayTickers = showAll ? tickers : tickers.slice(0, 10);
  const isRefreshing = refreshReddit.isPending;
  const totalTracked = trending.data?.totalTracked || 0;
  const isCached = trending.data?.cached || false;

  // Count signals
  const exploding = tickers.filter(t => t.velocitySignal === "EXPLODING").length;
  const surging = tickers.filter(t => t.velocitySignal === "SURGING").length;
  const rising = tickers.filter(t => t.velocitySignal === "RISING").length;

  // Count crowd biases
  const longBias = tickers.filter(t => t.redditSentimentCrowdBias === "LONG_BIAS").length;
  const shortBias = tickers.filter(t => t.redditSentimentCrowdBias === "SHORT_BIAS").length;

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="font-heading text-xl font-bold flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-indigo" />
            Social Radar
          </h2>
          <span className="text-xs font-mono text-muted-foreground/60">
            r/wallstreetbets · r/pennystocks · r/shortsqueeze
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isCached && (
            <span className="text-[10px] font-mono text-muted-foreground/50">
              cached
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 h-7 text-xs border-border/60"
            onClick={() => refreshReddit.mutate()}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <RefreshCw className="w-3 h-3" />
            )}
            {isRefreshing ? "Scanning..." : "Refresh"}
          </Button>
        </div>
      </div>

      {/* Signal Summary */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose/5 border border-rose/10">
          <Rocket className="w-3.5 h-3.5 text-rose" />
          <span className="font-mono text-sm font-bold text-rose">{exploding}</span>
          <span className="text-[10px] text-muted-foreground">Exploding</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber/5 border border-amber/10">
          <Flame className="w-3.5 h-3.5 text-amber" />
          <span className="font-mono text-sm font-bold text-amber">{surging}</span>
          <span className="text-[10px] text-muted-foreground">Surging</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald/5 border border-emerald/10">
          <TrendingUp className="w-3.5 h-3.5 text-emerald" />
          <span className="font-mono text-sm font-bold text-emerald">{rising}</span>
          <span className="text-[10px] text-muted-foreground">Rising</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo/5 border border-indigo/10">
          <Zap className="w-3.5 h-3.5 text-indigo" />
          <span className="font-mono text-sm font-bold text-indigo">{totalTracked}</span>
          <span className="text-[10px] text-muted-foreground">Tracked</span>
        </div>
        {/* Crowd Bias Summary */}
        {(longBias > 0 || shortBias > 0) && (
          <>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald/5 border border-emerald/10">
              <span className="text-sm">🟢</span>
              <span className="font-mono text-sm font-bold text-emerald">{longBias}</span>
              <span className="text-[10px] text-muted-foreground">Long Bias</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose/5 border border-rose/10">
              <span className="text-sm">🔴</span>
              <span className="font-mono text-sm font-bold text-rose">{shortBias}</span>
              <span className="text-[10px] text-muted-foreground">Short Bias</span>
            </div>
          </>
        )}
      </div>

      {/* Loading state */}
      {trending.isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-indigo mr-2" />
          <span className="text-sm text-muted-foreground">Loading Reddit data...</span>
        </div>
      )}

      {/* Trending Table */}
      {!trending.isLoading && tickers.length > 0 && (
        <Card className="bg-card border-border/50">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left py-2.5 px-3 text-[10px] font-mono text-muted-foreground font-medium">RANK</th>
                    <th className="text-left py-2.5 px-3 text-[10px] font-mono text-muted-foreground font-medium">TICKER</th>
                    <th className="text-right py-2.5 px-3 text-[10px] font-mono text-muted-foreground font-medium">MENTIONS</th>
                    <th className="text-right py-2.5 px-3 text-[10px] font-mono text-muted-foreground font-medium">VELOCITY</th>
                    <th className="text-center py-2.5 px-3 text-[10px] font-mono text-muted-foreground font-medium">SIGNAL</th>
                    <th className="text-center py-2.5 px-3 text-[10px] font-mono text-muted-foreground font-medium min-w-[140px]">CROWD SENTIMENT</th>
                    <th className="text-center py-2.5 px-3 text-[10px] font-mono text-muted-foreground font-medium">BIAS</th>
                    <th className="text-right py-2.5 px-3 text-[10px] font-mono text-muted-foreground font-medium">UPVOTES</th>
                    <th className="text-center py-2.5 px-3 text-[10px] font-mono text-muted-foreground font-medium">RANK Δ</th>
                  </tr>
                </thead>
                <tbody>
                  {displayTickers.map((t) => {
                    const hasSentiment = t.redditSentimentMentions != null && t.redditSentimentMentions > 0;
                    return (
                      <tr
                        key={t.ticker}
                        className={`border-b border-border/20 hover:bg-secondary/20 transition-colors ${
                          t.velocitySignal === "EXPLODING" ? "bg-rose/[0.03]" :
                          t.velocitySignal === "SURGING" ? "bg-amber/[0.03]" : ""
                        }`}
                      >
                        <td className="py-2 px-3">
                          <span className="font-mono text-xs text-muted-foreground">
                            #{t.rank}
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-sm text-foreground">
                              {t.ticker}
                            </span>
                            <span className="text-[10px] text-muted-foreground/60 hidden lg:inline truncate max-w-[140px]">
                              {t.name}
                            </span>
                          </div>
                        </td>
                        <td className="py-2 px-3 text-right">
                          <div className="flex flex-col items-end">
                            <span className="font-mono text-sm font-medium text-foreground">
                              {formatMentions(t.mentions)}
                            </span>
                            <span className="font-mono text-[10px] text-muted-foreground/50">
                              was {formatMentions(t.mentions24hAgo)}
                            </span>
                          </div>
                        </td>
                        <td className="py-2 px-3 text-right">
                          <span
                            className={`font-mono text-xs font-bold ${
                              t.velocityPct > 100 ? "text-rose" :
                              t.velocityPct > 30 ? "text-emerald" :
                              t.velocityPct > -30 ? "text-muted-foreground" :
                              "text-indigo/60"
                            }`}
                          >
                            {formatVelocity(t.velocityPct)}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center">
                          <VelocityBadge signal={t.velocitySignal} />
                        </td>
                        {/* Crowd Sentiment — split bar + percentages */}
                        <td className="py-2 px-3">
                          {hasSentiment ? (
                            <div className="flex flex-col gap-1">
                              <SentimentBar
                                bullishPct={t.redditSentimentBullishPct ?? 0}
                                bearishPct={t.redditSentimentBearishPct ?? 0}
                                neutralPct={t.redditSentimentNeutralPct ?? 0}
                              />
                              <SentimentSplitText
                                bullishPct={t.redditSentimentBullishPct ?? 0}
                                bearishPct={t.redditSentimentBearishPct ?? 0}
                              />
                            </div>
                          ) : (
                            <span className="text-[10px] font-mono text-muted-foreground/30">—</span>
                          )}
                        </td>
                        {/* Crowd Bias Badge */}
                        <td className="py-2 px-3 text-center">
                          {hasSentiment ? (
                            <CrowdBiasBadge bias={t.redditSentimentCrowdBias} />
                          ) : (
                            <span className="text-[10px] font-mono text-muted-foreground/30">—</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right">
                          <span className="inline-flex items-center gap-0.5 font-mono text-xs text-muted-foreground">
                            <ThumbsUp className="w-2.5 h-2.5" />
                            {formatMentions(t.upvotes)}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center">
                          <RankChange current={t.rank} previous={t.rank24hAgo} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {tickers.length > 10 && (
              <div className="px-4 py-2 border-t border-border/30 text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setShowAll(!showAll)}
                >
                  {showAll ? "Show Less" : `Show All ${tickers.length} Tickers`}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!trending.isLoading && tickers.length === 0 && (
        <Card className="bg-card border-border/50">
          <CardContent className="p-8 text-center">
            <MessageCircle className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-3">
              No Reddit mention data yet. Click "Refresh" to scan Reddit for trending tickers.
            </p>
            <Button
              size="sm"
              className="gap-2 bg-indigo hover:bg-indigo/90 text-white"
              onClick={() => refreshReddit.mutate()}
              disabled={isRefreshing}
            >
              {isRefreshing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
              Scan Reddit
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
