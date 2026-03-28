import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  RefreshCw,
  Loader2,
  TrendingUp,
  MessageCircle,
  ThumbsUp,
  ChevronDown,
  ChevronUp,
  Zap,
  Radio,
} from "lucide-react";
import { toast } from "sonner";

// ── Platform Icons ──

function RedditIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/>
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  );
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.8a8.26 8.26 0 0 0 4.76 1.5V6.85a4.79 4.79 0 0 1-1-.16z"/>
    </svg>
  );
}

// ── Sub-components ──

function PlatformBadge({ platform, mentions }: { platform: string; mentions: number }) {
  const config = {
    reddit: { icon: RedditIcon, label: "Reddit", color: "text-orange-400 bg-orange-400/10 border-orange-400/20" },
    x: { icon: XIcon, label: "X", color: "text-blue-400 bg-blue-400/10 border-blue-400/20" },
    tiktok: { icon: TikTokIcon, label: "TikTok", color: "text-pink-400 bg-pink-400/10 border-pink-400/20" },
  }[platform] || { icon: MessageCircle, label: platform, color: "text-muted-foreground bg-muted/10 border-border/20" };

  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono border ${config.color}`}>
      <Icon className="w-2.5 h-2.5" />
      {mentions}
    </span>
  );
}

function VelocityBadge({ signal }: { signal: string }) {
  const config: Record<string, { label: string; className: string }> = {
    EXPLODING: { label: "EXPLODING", className: "bg-rose/20 text-rose border-rose/30 animate-pulse" },
    SURGING: { label: "SURGING", className: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
    RISING: { label: "RISING", className: "bg-emerald/20 text-emerald border-emerald/30" },
    STABLE: { label: "STABLE", className: "bg-secondary text-muted-foreground border-border/30" },
    FADING: { label: "FADING", className: "bg-indigo/10 text-indigo/60 border-indigo/20" },
    COLD: { label: "COLD", className: "bg-secondary text-muted-foreground/40 border-border/20" },
  };
  const c = config[signal] || config.STABLE;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${c.className}`}>
      {signal === "EXPLODING" && <Zap className="w-2.5 h-2.5" />}
      {c.label}
    </span>
  );
}

function SentimentBar({ bullishPct, bearishPct, neutralPct }: { bullishPct: number; bearishPct: number; neutralPct: number }) {
  return (
    <div className="flex h-1.5 rounded-full overflow-hidden bg-secondary/50 w-full min-w-[80px]">
      {bullishPct > 0 && (
        <div className="bg-emerald h-full transition-all" style={{ width: `${bullishPct}%` }} />
      )}
      {neutralPct > 0 && (
        <div className="bg-muted-foreground/30 h-full transition-all" style={{ width: `${neutralPct}%` }} />
      )}
      {bearishPct > 0 && (
        <div className="bg-rose h-full transition-all" style={{ width: `${bearishPct}%` }} />
      )}
    </div>
  );
}

function SentimentSplitText({ bullishPct, bearishPct }: { bullishPct: number; bearishPct: number }) {
  return (
    <div className="flex items-center gap-1.5 text-[9px] font-mono">
      <span className="text-emerald">{bullishPct}%</span>
      <span className="text-muted-foreground/30">/</span>
      <span className="text-rose">{bearishPct}%</span>
    </div>
  );
}

function CrowdBiasBadge({ bias }: { bias: string | null | undefined }) {
  if (!bias) return <span className="text-[10px] font-mono text-muted-foreground/30">—</span>;
  const config: Record<string, { emoji: string; label: string; className: string }> = {
    LONG_BIAS: { emoji: "🟢", label: "Long", className: "text-emerald bg-emerald/10 border-emerald/20" },
    SHORT_BIAS: { emoji: "🔴", label: "Short", className: "text-rose bg-rose/10 border-rose/20" },
    MIXED: { emoji: "⚪", label: "Mixed", className: "text-muted-foreground bg-secondary border-border/30" },
  };
  const c = config[bias] || config.MIXED;
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium border ${c.className}`}>
      {c.emoji} {c.label}
    </span>
  );
}

function RankChange({ current, previous }: { current: number; previous: number }) {
  if (!previous || previous === current) return <span className="text-[10px] font-mono text-muted-foreground/30">—</span>;
  const diff = previous - current;
  if (diff > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-emerald text-[10px] font-mono font-bold">
        <ChevronUp className="w-3 h-3" />+{diff}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-rose text-[10px] font-mono font-bold">
      <ChevronDown className="w-3 h-3" />{diff}
    </span>
  );
}

function formatMentions(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function formatVelocity(pct: number): string {
  if (pct > 0) return `+${pct.toFixed(0)}%`;
  return `${pct.toFixed(0)}%`;
}

// ── Main Component ──

export default function SocialRadar() {
  const [showAll, setShowAll] = useState(false);
  const utils = trpc.useUtils();

  // Use the unified radar endpoint
  const unified = trpc.socialRadar.unified.useQuery(undefined, {
    refetchInterval: 5 * 60 * 1000,
    staleTime: 2 * 60 * 1000,
  });

  // Also get Reddit velocity data for velocity signals
  const redditTrending = trpc.reddit.trending.useQuery(undefined, {
    refetchInterval: 5 * 60 * 1000,
    staleTime: 2 * 60 * 1000,
  });

  const refreshRadar = trpc.socialRadar.refresh.useMutation({
    onSuccess: (data) => {
      utils.socialRadar.unified.invalidate();
      utils.reddit.trending.invalidate();
      utils.alerts.recent.invalidate();
      utils.alerts.count.invalidate();

      const parts = [];
      if (data.platformResults.reddit.totalPosts > 0) parts.push(`Reddit: ${data.platformResults.reddit.totalTickers} tickers`);
      if (data.platformResults.x.totalTweets > 0) parts.push(`X: ${data.platformResults.x.totalTickers} tickers`);
      if (data.platformResults.tiktok.totalVideos > 0) parts.push(`TikTok: ${data.platformResults.tiktok.totalTickers} tickers`);

      let msg = `Scanned ${data.totalContentScanned.total} posts across 3 platforms. ${data.totalTickers} unique tickers found.`;
      if (parts.length > 0) msg += ` (${parts.join(", ")})`;
      if (data.shiftsDetected > 0) {
        msg += ` ${data.shiftsDetected} sentiment shift(s) detected!`;
      }
      toast.success(msg);
    },
    onError: (err) => {
      toast.error(`Refresh failed: ${err.message}`);
    },
  });

  const isRefreshing = refreshRadar.isPending;
  const isLoading = unified.isLoading;

  // Build a velocity lookup from Reddit data
  const velocityMap = new Map<string, any>();
  if (redditTrending.data?.tickers) {
    for (const t of redditTrending.data.tickers) {
      velocityMap.set(t.ticker, t);
    }
  }

  // Merge unified data with velocity data
  const tickers = (unified.data?.tickers || []).map(t => {
    const rv = velocityMap.get(t.ticker) || t.redditVelocity;
    return {
      ...t,
      velocityPct: rv?.velocityPct ?? 0,
      velocitySignal: rv?.velocitySignal ?? "STABLE",
      mentions24hAgo: rv?.mentions24hAgo ?? 0,
      rank: rv?.rank ?? 0,
      rank24hAgo: rv?.rank24hAgo ?? rv?.rank24hAgo ?? 0,
      upvotes: rv?.upvotes ?? 0,
    };
  });

  const displayTickers = showAll ? tickers : tickers.slice(0, 15);

  const contentScanned = unified.data?.totalContentScanned;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-indigo" />
          <h3 className="text-sm font-semibold text-foreground">Social Radar</h3>
          <div className="flex items-center gap-1">
            <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-mono border-orange-400/30 text-orange-400">
              <RedditIcon className="w-2.5 h-2.5 mr-0.5" />Reddit
            </Badge>
            <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-mono border-blue-400/30 text-blue-400">
              <XIcon className="w-2.5 h-2.5 mr-0.5" />X
            </Badge>
            <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-mono border-pink-400/30 text-pink-400">
              <TikTokIcon className="w-2.5 h-2.5 mr-0.5" />TikTok
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {contentScanned && (
            <span className="text-[10px] font-mono text-muted-foreground/50">
              {contentScanned.total} posts scanned
            </span>
          )}
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-xs h-7 border-indigo/30 text-indigo hover:bg-indigo/10"
            onClick={() => refreshRadar.mutate()}
            disabled={isRefreshing}
          >
            {isRefreshing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            Refresh All
          </Button>
        </div>
      </div>

      {/* Platform Stats Bar */}
      {contentScanned && contentScanned.total > 0 && (
        <div className="flex items-center gap-3 px-3 py-1.5 rounded-lg bg-secondary/30 border border-border/20">
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-orange-400">
            <RedditIcon className="w-3 h-3" />
            <span>{contentScanned.reddit} posts</span>
          </div>
          <div className="w-px h-3 bg-border/30" />
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-blue-400">
            <XIcon className="w-3 h-3" />
            <span>{contentScanned.x} tweets</span>
          </div>
          <div className="w-px h-3 bg-border/30" />
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-pink-400">
            <TikTokIcon className="w-3 h-3" />
            <span>{contentScanned.tiktok} videos</span>
          </div>
          <div className="w-px h-3 bg-border/30" />
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-foreground">
            <TrendingUp className="w-3 h-3" />
            <span>{unified.data?.totalTickers ?? 0} tickers</span>
          </div>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <Card className="bg-card border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Loader2 className="w-4 h-4 animate-spin text-indigo" />
              <span className="text-sm text-muted-foreground">Loading social radar data...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data table */}
      {!isLoading && tickers.length > 0 && (
        <Card className="bg-card border-border/50 overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left py-2.5 px-3 text-[10px] font-mono text-muted-foreground font-medium">#</th>
                    <th className="text-left py-2.5 px-3 text-[10px] font-mono text-muted-foreground font-medium">TICKER</th>
                    <th className="text-center py-2.5 px-3 text-[10px] font-mono text-muted-foreground font-medium">PLATFORMS</th>
                    <th className="text-right py-2.5 px-3 text-[10px] font-mono text-muted-foreground font-medium">MENTIONS</th>
                    <th className="text-right py-2.5 px-3 text-[10px] font-mono text-muted-foreground font-medium">VELOCITY</th>
                    <th className="text-center py-2.5 px-3 text-[10px] font-mono text-muted-foreground font-medium">SIGNAL</th>
                    <th className="text-center py-2.5 px-3 text-[10px] font-mono text-muted-foreground font-medium min-w-[140px]">CROWD SENTIMENT</th>
                    <th className="text-center py-2.5 px-3 text-[10px] font-mono text-muted-foreground font-medium">BIAS</th>
                  </tr>
                </thead>
                <tbody>
                  {displayTickers.map((t, idx) => {
                    const hasSentiment = t.combinedSentiment.totalMentions > 0;
                    return (
                      <tr
                        key={t.ticker}
                        className={`border-b border-border/20 hover:bg-secondary/20 transition-colors ${
                          t.velocitySignal === "EXPLODING" ? "bg-rose/[0.03]" :
                          t.velocitySignal === "SURGING" ? "bg-amber/[0.03]" : ""
                        }`}
                      >
                        {/* Rank */}
                        <td className="py-2 px-3">
                          <span className="font-mono text-xs text-muted-foreground">
                            {idx + 1}
                          </span>
                        </td>

                        {/* Ticker */}
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-sm text-foreground">
                              {t.ticker}
                            </span>
                            {t.platformCount >= 3 && (
                              <span className="text-[8px] px-1 py-0 rounded bg-indigo/20 text-indigo font-mono font-bold">
                                CROSS-PLATFORM
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Platform Badges */}
                        <td className="py-2 px-3">
                          <div className="flex items-center justify-center gap-1 flex-wrap">
                            {t.platforms.map((p: any) => (
                              <PlatformBadge key={p.platform} platform={p.platform} mentions={p.mentions} />
                            ))}
                          </div>
                        </td>

                        {/* Total Mentions */}
                        <td className="py-2 px-3 text-right">
                          <div className="flex flex-col items-end">
                            <span className="font-mono text-sm font-medium text-foreground">
                              {formatMentions(t.totalMentions)}
                            </span>
                            {t.mentions24hAgo > 0 && (
                              <span className="font-mono text-[10px] text-muted-foreground/50">
                                was {formatMentions(t.mentions24hAgo)}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Velocity */}
                        <td className="py-2 px-3 text-right">
                          <span
                            className={`font-mono text-xs font-bold ${
                              t.velocityPct > 100 ? "text-rose" :
                              t.velocityPct > 30 ? "text-emerald" :
                              t.velocityPct > -30 ? "text-muted-foreground" :
                              "text-indigo/60"
                            }`}
                          >
                            {t.velocityPct !== 0 ? formatVelocity(t.velocityPct) : "—"}
                          </span>
                        </td>

                        {/* Signal */}
                        <td className="py-2 px-3 text-center">
                          {t.velocitySignal !== "STABLE" || t.velocityPct !== 0 ? (
                            <VelocityBadge signal={t.velocitySignal} />
                          ) : (
                            <span className="text-[10px] font-mono text-muted-foreground/30">—</span>
                          )}
                        </td>

                        {/* Crowd Sentiment — split bar + percentages */}
                        <td className="py-2 px-3">
                          {hasSentiment ? (
                            <div className="flex flex-col gap-1">
                              <SentimentBar
                                bullishPct={t.combinedSentiment.bullishPct}
                                bearishPct={t.combinedSentiment.bearishPct}
                                neutralPct={t.combinedSentiment.neutralPct}
                              />
                              <SentimentSplitText
                                bullishPct={t.combinedSentiment.bullishPct}
                                bearishPct={t.combinedSentiment.bearishPct}
                              />
                            </div>
                          ) : (
                            <span className="text-[10px] font-mono text-muted-foreground/30">—</span>
                          )}
                        </td>

                        {/* Crowd Bias Badge */}
                        <td className="py-2 px-3 text-center">
                          {hasSentiment ? (
                            <CrowdBiasBadge bias={t.combinedSentiment.crowdBias} />
                          ) : (
                            <span className="text-[10px] font-mono text-muted-foreground/30">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {tickers.length > 15 && (
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
      {!isLoading && tickers.length === 0 && (
        <Card className="bg-card border-border/50">
          <CardContent className="p-8 text-center">
            <Radio className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-1">
              No social radar data yet.
            </p>
            <p className="text-xs text-muted-foreground/60 mb-4">
              Click "Refresh All" to scan Reddit, X, and TikTok for trending stock mentions.
            </p>
            <Button
              size="sm"
              className="gap-2 bg-indigo hover:bg-indigo/90 text-white"
              onClick={() => refreshRadar.mutate()}
              disabled={isRefreshing}
            >
              {isRefreshing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
              Scan All Platforms
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
