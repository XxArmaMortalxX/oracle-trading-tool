/**
 * Sentiment Shift Alerts Panel
 * 
 * Displays detected Reddit crowd sentiment shifts (bearish → bullish).
 * Shows alert cards with shift details, severity badges, and dismiss actions.
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  ArrowRight,
  Bell,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

function timeAgo(dateStr: string | Date): string {
  const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  const now = Date.now();
  const diff = now - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function severityConfig(severity: string) {
  switch (severity) {
    case "DRAMATIC":
      return {
        label: "DRAMATIC",
        bg: "bg-rose/15 border-rose/30",
        text: "text-rose",
        icon: "🚨",
        glow: "shadow-rose/10",
      };
    case "MODERATE":
      return {
        label: "MODERATE",
        bg: "bg-amber/15 border-amber/30",
        text: "text-amber",
        icon: "⚠️",
        glow: "shadow-amber/10",
      };
    default:
      return {
        label: "MINOR",
        bg: "bg-indigo/15 border-indigo/30",
        text: "text-indigo",
        icon: "ℹ️",
        glow: "",
      };
  }
}

function directionLabel(direction: string): { label: string; emoji: string; color: string } {
  switch (direction) {
    case "BEARISH_TO_BULLISH":
      return { label: "Bearish → Bullish", emoji: "🔴→🟢", color: "text-emerald" };
    case "MIXED_TO_BULLISH":
      return { label: "Mixed → Bullish", emoji: "⚪→🟢", color: "text-emerald" };
    case "BULLISH_TO_BEARISH":
      return { label: "Bullish → Bearish", emoji: "🟢→🔴", color: "text-rose" };
    case "MIXED_TO_BEARISH":
      return { label: "Mixed → Bearish", emoji: "⚪→🔴", color: "text-rose" };
    case "BULLISH_TO_MIXED":
      return { label: "Bullish → Mixed", emoji: "🟢→⚪", color: "text-muted-foreground" };
    case "BEARISH_TO_MIXED":
      return { label: "Bearish → Mixed", emoji: "🔴→⚪", color: "text-muted-foreground" };
    default:
      return { label: direction.replace(/_/g, " "), emoji: "🔄", color: "text-muted-foreground" };
  }
}

export default function SentimentShiftAlerts() {
  const [showHistory, setShowHistory] = useState(false);
  const utils = trpc.useUtils();

  const recentAlerts = trpc.alerts.recent.useQuery(undefined, {
    refetchInterval: 60000, // Refresh every minute
  });

  const alertCount = trpc.alerts.count.useQuery(undefined, {
    refetchInterval: 60000,
  });

  const alertHistory = trpc.alerts.history.useQuery(
    { limit: 50, offset: 0 },
    { enabled: showHistory }
  );

  const dismissMutation = trpc.alerts.dismiss.useMutation({
    onSuccess: () => {
      toast.success("Alert dismissed");
      utils.alerts.recent.invalidate();
      utils.alerts.count.invalidate();
    },
    onError: (err) => {
      toast.error(`Failed to dismiss: ${err.message}`);
    },
  });

  const alerts = recentAlerts.data || [];
  const count = alertCount.data?.count ?? 0;
  const history = alertHistory.data || [];

  // Separate bullish shifts (primary) from others
  const bullishShifts = alerts.filter(
    (a) => a.direction === "BEARISH_TO_BULLISH" || a.direction === "MIXED_TO_BULLISH"
  );
  const otherShifts = alerts.filter(
    (a) => a.direction !== "BEARISH_TO_BULLISH" && a.direction !== "MIXED_TO_BULLISH"
  );

  if (alerts.length === 0 && !showHistory) {
    return (
      <Card className="bg-card/80 border-border/40">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-heading">
            <Bell className="w-4 h-4 text-indigo" />
            Sentiment Shift Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground/60">
            <Zap className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm font-mono">No sentiment shifts detected yet</p>
            <p className="text-xs mt-1">
              Alerts appear when Reddit crowd sentiment dramatically shifts direction.
              <br />
              Refresh Social Radar to scan for shifts.
            </p>
          </div>
          <div className="flex justify-center mt-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground/60 hover:text-foreground"
              onClick={() => setShowHistory(!showHistory)}
            >
              {showHistory ? (
                <>
                  <ChevronUp className="w-3 h-3 mr-1" /> Hide History
                </>
              ) : (
                <>
                  <ChevronDown className="w-3 h-3 mr-1" /> View History
                </>
              )}
            </Button>
          </div>
          {showHistory && history.length > 0 && (
            <div className="mt-4 space-y-2">
              {history.map((alert) => (
                <AlertCard key={alert.id} alert={alert} compact dismissed />
              ))}
            </div>
          )}
          {showHistory && history.length === 0 && (
            <p className="text-center text-xs text-muted-foreground/40 mt-4">
              No alert history found. Shift detection runs on each Reddit refresh.
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/80 border-border/40">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-heading">
            <Bell className="w-4 h-4 text-indigo" />
            Sentiment Shift Alerts
            {count > 0 && (
              <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-rose/20 border border-rose/30 text-rose text-[10px] font-mono font-bold">
                {count}
              </span>
            )}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground/60 hover:text-foreground"
            onClick={() => setShowHistory(!showHistory)}
          >
            {showHistory ? (
              <>
                <ChevronUp className="w-3 h-3 mr-1" /> Hide History
              </>
            ) : (
              <>
                <ChevronDown className="w-3 h-3 mr-1" /> View History
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Primary: Bearish → Bullish shifts */}
        {bullishShifts.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-mono font-semibold text-emerald uppercase tracking-wider">
              Turning Bullish
            </p>
            <AnimatePresence mode="popLayout">
              {bullishShifts.map((alert) => (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  layout
                >
                  <AlertCard
                    alert={alert}
                    onDismiss={() => dismissMutation.mutate({ alertId: alert.id })}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Other shifts */}
        {otherShifts.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-mono font-semibold text-muted-foreground uppercase tracking-wider">
              Other Shifts
            </p>
            <AnimatePresence mode="popLayout">
              {otherShifts.map((alert) => (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  layout
                >
                  <AlertCard
                    alert={alert}
                    onDismiss={() => dismissMutation.mutate({ alertId: alert.id })}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* History section */}
        {showHistory && (
          <div className="space-y-2 pt-2 border-t border-border/30">
            <p className="text-[10px] font-mono font-semibold text-muted-foreground/60 uppercase tracking-wider">
              Alert History
            </p>
            {history.length > 0 ? (
              history.map((alert) => (
                <AlertCard key={alert.id} alert={alert} compact dismissed={alert.dismissed === 1} />
              ))
            ) : (
              <p className="text-xs text-muted-foreground/40 text-center py-2">
                No history yet
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Alert Card Component ──

interface AlertCardProps {
  alert: {
    id: number;
    ticker: string;
    previousBias: string;
    newBias: string;
    previousBullishPct: number;
    newBullishPct: number;
    previousBearishPct: number;
    newBearishPct: number;
    shiftMagnitude: number;
    severity: string;
    direction: string;
    totalMentions: number | null;
    notified: number | null;
    dismissed: number | null;
    createdAt: Date | string;
  };
  onDismiss?: () => void;
  compact?: boolean;
  dismissed?: boolean;
}

function AlertCard({ alert, onDismiss, compact, dismissed }: AlertCardProps) {
  const sev = severityConfig(alert.severity);
  const dir = directionLabel(alert.direction);
  const isBullishShift =
    alert.direction === "BEARISH_TO_BULLISH" || alert.direction === "MIXED_TO_BULLISH";

  if (compact) {
    return (
      <div
        className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg border ${
          dismissed ? "border-border/20 bg-secondary/20 opacity-60" : "border-border/40 bg-card/60"
        }`}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs">{sev.icon}</span>
          <span className="font-mono font-bold text-xs">${alert.ticker}</span>
          <span className={`text-[10px] font-mono ${dir.color}`}>{dir.emoji}</span>
          <span className="text-[10px] font-mono text-muted-foreground">
            +{alert.shiftMagnitude}pt
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground/50">
          {timeAgo(alert.createdAt)}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`relative rounded-lg border p-3 ${sev.bg} ${sev.glow} transition-all hover:border-opacity-50`}
    >
      {/* Dismiss button */}
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="absolute top-2 right-2 p-1 rounded-full hover:bg-background/20 transition-colors"
          title="Dismiss alert"
        >
          <X className="w-3 h-3 text-muted-foreground/60" />
        </button>
      )}

      {/* Top row: ticker + severity */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs">{sev.icon}</span>
        <span className="font-mono font-bold text-sm">${alert.ticker}</span>
        <span
          className={`inline-flex items-center gap-0.5 text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded-full ${sev.bg} ${sev.text}`}
        >
          {sev.label}
        </span>
        {alert.notified === 1 && (
          <span className="text-[9px] text-muted-foreground/50 font-mono">notified</span>
        )}
        <span className="ml-auto text-[10px] text-muted-foreground/50">
          {timeAgo(alert.createdAt)}
        </span>
      </div>

      {/* Direction label */}
      <div className="flex items-center gap-2 mb-2">
        <span className={`text-xs font-mono font-medium ${dir.color}`}>
          {dir.emoji} {dir.label}
        </span>
        <span className="text-[10px] font-mono text-muted-foreground">
          +{alert.shiftMagnitude}pt swing
        </span>
      </div>

      {/* Sentiment bar comparison */}
      <div className="space-y-1.5">
        {/* Previous */}
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-mono text-muted-foreground/60 w-10">Before</span>
          <div className="flex-1 h-3 rounded-full bg-secondary/40 overflow-hidden flex">
            <div
              className="h-full bg-emerald/60 transition-all"
              style={{ width: `${alert.previousBullishPct}%` }}
            />
            <div
              className="h-full bg-rose/60 transition-all"
              style={{ width: `${alert.previousBearishPct}%` }}
            />
          </div>
          <span className="text-[9px] font-mono text-muted-foreground/60 w-16 text-right">
            {alert.previousBullishPct}%B / {alert.previousBearishPct}%S
          </span>
        </div>

        {/* Current */}
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-mono text-muted-foreground/60 w-10">After</span>
          <div className="flex-1 h-3 rounded-full bg-secondary/40 overflow-hidden flex">
            <div
              className={`h-full transition-all ${isBullishShift ? "bg-emerald" : "bg-emerald/60"}`}
              style={{ width: `${alert.newBullishPct}%` }}
            />
            <div
              className={`h-full transition-all ${!isBullishShift ? "bg-rose" : "bg-rose/60"}`}
              style={{ width: `${alert.newBearishPct}%` }}
            />
          </div>
          <span className="text-[9px] font-mono text-muted-foreground/60 w-16 text-right">
            {alert.newBullishPct}%B / {alert.newBearishPct}%S
          </span>
        </div>
      </div>

      {/* Mentions */}
      {alert.totalMentions != null && alert.totalMentions > 0 && (
        <div className="mt-2 text-[9px] font-mono text-muted-foreground/50">
          {alert.totalMentions} Reddit mentions
        </div>
      )}
    </div>
  );
}
