/**
 * SocialRadarDemo — Animated mock of the Social Radar for the landing page.
 * Shows realistic ticker data with cycling animations to demonstrate the product.
 * No auth or API calls required — purely presentational.
 */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Radio, Zap, TrendingUp, RefreshCw } from "lucide-react";

/* ── Platform Icons ── */
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

/* ── Mock Data ── */
interface MockTicker {
  ticker: string;
  reddit: number;
  x: number;
  tiktok: number;
  totalMentions: number;
  velocityPct: number;
  velocitySignal: string;
  bullishPct: number;
  bearishPct: number;
  neutralPct: number;
  bias: string;
  crossPlatform: boolean;
}

const mockDataSets: MockTicker[][] = [
  [
    { ticker: "NVDA", reddit: 87, x: 124, tiktok: 45, totalMentions: 256, velocityPct: 340, velocitySignal: "EXPLODING", bullishPct: 78, bearishPct: 14, neutralPct: 8, bias: "LONG_BIAS", crossPlatform: true },
    { ticker: "TSLA", reddit: 65, x: 98, tiktok: 72, totalMentions: 235, velocityPct: 180, velocitySignal: "SURGING", bullishPct: 52, bearishPct: 38, neutralPct: 10, bias: "MIXED", crossPlatform: true },
    { ticker: "PLTR", reddit: 54, x: 32, tiktok: 8, totalMentions: 94, velocityPct: 95, velocitySignal: "RISING", bullishPct: 71, bearishPct: 18, neutralPct: 11, bias: "LONG_BIAS", crossPlatform: true },
    { ticker: "GME", reddit: 112, x: 15, tiktok: 3, totalMentions: 130, velocityPct: 520, velocitySignal: "EXPLODING", bullishPct: 85, bearishPct: 10, neutralPct: 5, bias: "LONG_BIAS", crossPlatform: false },
    { ticker: "SOFI", reddit: 38, x: 22, tiktok: 14, totalMentions: 74, velocityPct: 45, velocitySignal: "RISING", bullishPct: 62, bearishPct: 25, neutralPct: 13, bias: "LONG_BIAS", crossPlatform: true },
    { ticker: "AMC", reddit: 72, x: 18, tiktok: 5, totalMentions: 95, velocityPct: -15, velocitySignal: "FADING", bullishPct: 35, bearishPct: 52, neutralPct: 13, bias: "SHORT_BIAS", crossPlatform: false },
    { ticker: "MARA", reddit: 29, x: 41, tiktok: 0, totalMentions: 70, velocityPct: 120, velocitySignal: "SURGING", bullishPct: 68, bearishPct: 22, neutralPct: 10, bias: "LONG_BIAS", crossPlatform: false },
  ],
  [
    { ticker: "AAPL", reddit: 42, x: 156, tiktok: 38, totalMentions: 236, velocityPct: 65, velocitySignal: "RISING", bullishPct: 64, bearishPct: 24, neutralPct: 12, bias: "LONG_BIAS", crossPlatform: true },
    { ticker: "RIVN", reddit: 88, x: 45, tiktok: 62, totalMentions: 195, velocityPct: 280, velocitySignal: "EXPLODING", bullishPct: 42, bearishPct: 48, neutralPct: 10, bias: "SHORT_BIAS", crossPlatform: true },
    { ticker: "NIO", reddit: 35, x: 67, tiktok: 28, totalMentions: 130, velocityPct: 150, velocitySignal: "SURGING", bullishPct: 73, bearishPct: 17, neutralPct: 10, bias: "LONG_BIAS", crossPlatform: true },
    { ticker: "BBBY", reddit: 95, x: 8, tiktok: 2, totalMentions: 105, velocityPct: 410, velocitySignal: "EXPLODING", bullishPct: 88, bearishPct: 8, neutralPct: 4, bias: "LONG_BIAS", crossPlatform: false },
    { ticker: "LCID", reddit: 27, x: 34, tiktok: 19, totalMentions: 80, velocityPct: 30, velocitySignal: "RISING", bullishPct: 55, bearishPct: 32, neutralPct: 13, bias: "MIXED", crossPlatform: true },
    { ticker: "DKNG", reddit: 18, x: 52, tiktok: 6, totalMentions: 76, velocityPct: -25, velocitySignal: "FADING", bullishPct: 40, bearishPct: 45, neutralPct: 15, bias: "SHORT_BIAS", crossPlatform: false },
    { ticker: "COIN", reddit: 44, x: 28, tiktok: 0, totalMentions: 72, velocityPct: 88, velocitySignal: "RISING", bullishPct: 60, bearishPct: 28, neutralPct: 12, bias: "LONG_BIAS", crossPlatform: false },
  ],
];

/* ── Sub-components ── */

function PlatformBadge({ platform, mentions }: { platform: string; mentions: number }) {
  const config = {
    reddit: { icon: RedditIcon, label: "Reddit", color: "text-orange-400 bg-orange-400/10 border-orange-400/20" },
    x: { icon: XIcon, label: "X", color: "text-blue-400 bg-blue-400/10 border-blue-400/20" },
    tiktok: { icon: TikTokIcon, label: "TikTok", color: "text-pink-400 bg-pink-400/10 border-pink-400/20" },
  }[platform] || { icon: Radio, label: platform, color: "text-muted-foreground bg-muted/10 border-border/20" };
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono border ${config.color}`}>
      <Icon className="w-2.5 h-2.5" />
      {mentions}
    </span>
  );
}

function VelocityBadge({ signal }: { signal: string }) {
  const config: Record<string, { className: string }> = {
    EXPLODING: { className: "bg-rose/20 text-rose border-rose/30 animate-pulse" },
    SURGING: { className: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
    RISING: { className: "bg-emerald/20 text-emerald border-emerald/30" },
    FADING: { className: "bg-indigo/10 text-indigo/60 border-indigo/20" },
  };
  const c = config[signal] || { className: "bg-secondary text-muted-foreground border-border/30" };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${c.className}`}>
      {signal === "EXPLODING" && <Zap className="w-2.5 h-2.5" />}
      {signal}
    </span>
  );
}

function SentimentBar({ bullishPct, bearishPct, neutralPct }: { bullishPct: number; bearishPct: number; neutralPct: number }) {
  return (
    <div className="flex h-1.5 rounded-full overflow-hidden bg-secondary/50 w-full min-w-[80px]">
      {bullishPct > 0 && <div className="bg-emerald h-full transition-all duration-1000" style={{ width: `${bullishPct}%` }} />}
      {neutralPct > 0 && <div className="bg-muted-foreground/30 h-full transition-all duration-1000" style={{ width: `${neutralPct}%` }} />}
      {bearishPct > 0 && <div className="bg-rose h-full transition-all duration-1000" style={{ width: `${bearishPct}%` }} />}
    </div>
  );
}

function CrowdBiasBadge({ bias }: { bias: string }) {
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

/* ── Main Demo Component ── */

export default function SocialRadarDemo() {
  const [dataSetIndex, setDataSetIndex] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Cycle data sets every 8 seconds to simulate live updates
  useEffect(() => {
    const interval = setInterval(() => {
      setIsRefreshing(true);
      setTimeout(() => {
        setDataSetIndex((prev) => (prev + 1) % mockDataSets.length);
        setIsRefreshing(false);
      }, 600);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  const tickers = mockDataSets[dataSetIndex];

  return (
    <div className="rounded-2xl border border-border/60 bg-card overflow-hidden glow-indigo">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/40">
        <div className="flex items-center gap-2.5">
          <Radio className="w-4 h-4 text-indigo" />
          <span className="text-sm font-semibold text-foreground">Social Radar</span>
          <div className="flex items-center gap-1">
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono border border-orange-400/30 text-orange-400">
              <RedditIcon className="w-2.5 h-2.5" />Reddit
            </span>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono border border-blue-400/30 text-blue-400">
              <XIcon className="w-2.5 h-2.5" />X
            </span>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono border border-pink-400/30 text-pink-400">
              <TikTokIcon className="w-2.5 h-2.5" />TikTok
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-muted-foreground/50">
            1,247 posts scanned
          </span>
          <span className="flex items-center gap-1.5 text-xs font-mono text-emerald">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald animate-pulse" />
            LIVE
          </span>
        </div>
      </div>

      {/* Platform stats bar */}
      <div className="flex items-center gap-3 px-5 py-2 border-b border-border/20 bg-secondary/20">
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-orange-400">
          <RedditIcon className="w-3 h-3" />
          <span>487 posts</span>
        </div>
        <div className="w-px h-3 bg-border/30" />
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-blue-400">
          <XIcon className="w-3 h-3" />
          <span>512 tweets</span>
        </div>
        <div className="w-px h-3 bg-border/30" />
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-pink-400">
          <TikTokIcon className="w-3 h-3" />
          <span>248 videos</span>
        </div>
        <div className="w-px h-3 bg-border/30" />
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-foreground">
          <TrendingUp className="w-3 h-3" />
          <span>{tickers.length} tickers</span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border/40">
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
          <AnimatePresence mode="wait">
            <motion.tbody
              key={dataSetIndex}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              {tickers.map((t, idx) => (
                <tr
                  key={t.ticker}
                  className={`border-b border-border/20 ${
                    t.velocitySignal === "EXPLODING" ? "bg-rose/[0.03]" :
                    t.velocitySignal === "SURGING" ? "bg-amber/[0.03]" : ""
                  }`}
                >
                  {/* Rank */}
                  <td className="py-2 px-3">
                    <span className="font-mono text-xs text-muted-foreground">{idx + 1}</span>
                  </td>

                  {/* Ticker */}
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-foreground">{t.ticker}</span>
                      {t.crossPlatform && (
                        <span className="text-[8px] px-1 py-0 rounded bg-indigo/20 text-indigo font-mono font-bold">
                          CROSS-PLATFORM
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Platform Badges */}
                  <td className="py-2 px-3">
                    <div className="flex items-center justify-center gap-1 flex-wrap">
                      {t.reddit > 0 && <PlatformBadge platform="reddit" mentions={t.reddit} />}
                      {t.x > 0 && <PlatformBadge platform="x" mentions={t.x} />}
                      {t.tiktok > 0 && <PlatformBadge platform="tiktok" mentions={t.tiktok} />}
                    </div>
                  </td>

                  {/* Total Mentions */}
                  <td className="py-2 px-3 text-right">
                    <span className="font-mono text-sm font-medium text-foreground">{t.totalMentions}</span>
                  </td>

                  {/* Velocity */}
                  <td className="py-2 px-3 text-right">
                    <span className={`font-mono text-xs font-bold ${
                      t.velocityPct > 100 ? "text-rose" :
                      t.velocityPct > 30 ? "text-emerald" :
                      t.velocityPct > -30 ? "text-muted-foreground" : "text-indigo/60"
                    }`}>
                      {t.velocityPct > 0 ? `+${t.velocityPct}%` : `${t.velocityPct}%`}
                    </span>
                  </td>

                  {/* Signal */}
                  <td className="py-2 px-3 text-center">
                    <VelocityBadge signal={t.velocitySignal} />
                  </td>

                  {/* Crowd Sentiment */}
                  <td className="py-2 px-3">
                    <div className="flex flex-col gap-1">
                      <SentimentBar bullishPct={t.bullishPct} bearishPct={t.bearishPct} neutralPct={t.neutralPct} />
                      <div className="flex items-center gap-1.5 text-[9px] font-mono">
                        <span className="text-emerald">{t.bullishPct}%</span>
                        <span className="text-muted-foreground/30">/</span>
                        <span className="text-rose">{t.bearishPct}%</span>
                      </div>
                    </div>
                  </td>

                  {/* Bias */}
                  <td className="py-2 px-3 text-center">
                    <CrowdBiasBadge bias={t.bias} />
                  </td>
                </tr>
              ))}
            </motion.tbody>
          </AnimatePresence>
        </table>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-5 py-3 border-t border-border/40 bg-secondary/10">
        <span className="text-[10px] text-muted-foreground">
          Simulated data for illustration — real radar scans Reddit, X, and TikTok every 10 minutes
        </span>
        <div className="flex items-center gap-1.5">
          <RefreshCw className={`w-3 h-3 text-indigo/50 ${isRefreshing ? "animate-spin" : ""}`} />
          <span className="text-[10px] font-mono text-indigo/50">
            {isRefreshing ? "Scanning..." : "Auto-refresh"}
          </span>
        </div>
      </div>
    </div>
  );
}
