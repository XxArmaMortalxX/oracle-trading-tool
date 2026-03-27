/**
 * Scan Runner — Orchestrates the Oracle scan pipeline:
 * 1. Create a scan session
 * 2. Run the Oracle scanner
 * 3. Store picks in DB
 * 4. Send notification to owner
 */
import { runOracleScan, formatPicksNotification, type OraclePick } from "./oracleScanner";
import {
  createScanSession,
  updateScanSession,
  insertScanPicks,
  getScanSessionByDate,
  insertSentimentSnapshots,
  getPreviousSentimentByTickers,
} from "./scanDb";
import { computeSentimentTrend, type SentimentTrendResult } from "./sentimentEngine";
import { notifyOwner } from "./_core/notification";

/**
 * Execute a full scan run: fetch data, score, store, notify.
 * Returns the session ID and picks.
 */
export async function executeScanRun(options?: { force?: boolean }): Promise<{
  sessionId: number;
  picks: OraclePick[];
  notified: boolean;
  trends?: Map<string, SentimentTrendResult>;
}> {
  const force = options?.force ?? false;
  const now = new Date();
  const scanDate = now.toISOString().slice(0, 10); // YYYY-MM-DD

  // Check if we already ran today (skip if force=true)
  if (!force) {
    const existing = await getScanSessionByDate(scanDate);
    if (existing && existing.status === "completed") {
      console.log(`[ScanRunner] Scan already completed for ${scanDate}, skipping.`);
      return { sessionId: existing.id, picks: [], notified: false };
    }
  } else {
    console.log(`[ScanRunner] Force refresh requested for ${scanDate}`);
  }

  // Create session
  const sessionId = await createScanSession({
    scanDate,
    status: "running",
  });

  console.log(`[ScanRunner] Created scan session #${sessionId} for ${scanDate}`);

  try {
    // Run the Oracle scan
    const { picks, totalScanned } = await runOracleScan(20);

    // Store sentiment snapshots for trend tracking
    if (picks.length > 0) {
      await insertSentimentSnapshots(
        picks.map(p => ({
          ticker: p.ticker,
          sentimentScore: p.sentimentScore ?? 0,
          sentimentLabel: p.sentimentLabel ?? "Neutral",
          sessionId,
          components: JSON.stringify(p.sentimentComponents ?? {}),
        }))
      );
    }

    // Compute sentiment trends by comparing with previous snapshots
    const tickers = picks.map(p => p.ticker);
    const previousSentiments = await getPreviousSentimentByTickers(tickers, sessionId);
    const trends = new Map<string, SentimentTrendResult>();
    for (const pick of picks) {
      const prev = previousSentiments.get(pick.ticker);
      const trend = computeSentimentTrend(
        pick.sentimentScore ?? 0,
        (pick.sentimentLabel as any) ?? "Neutral",
        prev?.score ?? null,
        prev?.label ?? null,
      );
      trends.set(pick.ticker, trend);
    }

    // Store picks in DB
    if (picks.length > 0) {
      await insertScanPicks(
        picks.map(p => ({
          sessionId,
          ticker: p.ticker,
          companyName: p.companyName,
          bias: p.bias,
          currentPrice: p.currentPrice,
          entryPrice: p.entryPrice,
          stopLoss: p.stopLoss,
          target1: p.target1,
          target2: p.target2 ?? null,
          target3: p.target3 ?? null,
          riskRewardRatio: p.riskRewardRatio,
          oracleScore: p.oracleScore,
          marketCap: p.marketCap,
          floatShares: p.floatShares,
          volume: p.volume,
          avgVolume: p.avgVolume,
          gapPercent: p.gapPercent,
          dayChangePercent: p.dayChangePercent,
          support: p.support,
          resistance: p.resistance,
          reasoning: p.reasoning,
          sentimentScore: p.sentimentScore,
          sentimentLabel: p.sentimentLabel,
        }))
      );
    }

    // Send notification
    let notified = false;
    if (picks.length > 0) {
      try {
        const { title, content } = formatPicksNotification(picks, scanDate);
        notified = await notifyOwner({ title, content });
        console.log(`[ScanRunner] Notification ${notified ? "sent" : "failed"}`);
      } catch (err) {
        console.warn("[ScanRunner] Notification error:", err);
      }
    }

    // Update session as completed
    await updateScanSession(sessionId, {
      status: "completed",
      totalStocksScanned: totalScanned,
      picksGenerated: picks.length,
      notificationSent: notified ? 1 : 0,
      completedAt: new Date(),
    });

    console.log(`[ScanRunner] Scan complete: ${picks.length} picks from ${totalScanned} stocks`);
    return { sessionId, picks, notified, trends };
  } catch (err) {
    console.error("[ScanRunner] Scan failed:", err);
    await updateScanSession(sessionId, {
      status: "failed",
      completedAt: new Date(),
    });
    throw err;
  }
}
