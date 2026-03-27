/**
 * Sentiment Shift Detector
 * 
 * Compares current Reddit crowd sentiment against previous snapshots
 * to detect dramatic shifts (e.g., bearish → bullish).
 * 
 * Shift severity levels:
 *   - DRAMATIC: ≥40 percentage point swing in bullish%
 *   - MODERATE: ≥25 percentage point swing
 *   - MINOR:    ≥15 percentage point swing
 * 
 * Direction labels:
 *   - BEARISH_TO_BULLISH: crowd bias flipped from SHORT_BIAS to LONG_BIAS
 *   - MIXED_TO_BULLISH:   crowd bias moved from MIXED to LONG_BIAS
 *   - BULLISH_TO_BEARISH:  crowd bias flipped from LONG_BIAS to SHORT_BIAS
 *   - MIXED_TO_BEARISH:    crowd bias moved from MIXED to SHORT_BIAS
 */

import { eq, desc, and, sql } from "drizzle-orm";
import {
  redditSentimentSnapshots,
  sentimentShiftAlerts,
  type InsertRedditSentimentSnapshot,
  type InsertSentimentShiftAlert,
  type SentimentShiftAlert,
} from "../drizzle/schema";
import { getDb } from "./db";
import { notifyOwner } from "./_core/notification";
import type { TickerSentimentSplit } from "./redditSentiment";

// ── Types ──

export type ShiftSeverity = "DRAMATIC" | "MODERATE" | "MINOR";

export type ShiftDirection =
  | "BEARISH_TO_BULLISH"
  | "MIXED_TO_BULLISH"
  | "BULLISH_TO_BEARISH"
  | "MIXED_TO_BEARISH"
  | "BULLISH_TO_MIXED"
  | "BEARISH_TO_MIXED";

export interface DetectedShift {
  ticker: string;
  previousBias: string;
  newBias: string;
  previousBullishPct: number;
  newBullishPct: number;
  previousBearishPct: number;
  newBearishPct: number;
  shiftMagnitude: number;
  severity: ShiftSeverity;
  direction: ShiftDirection;
  totalMentions: number;
}

// ── Severity Thresholds ──

const DRAMATIC_THRESHOLD = 40; // ≥40pt swing
const MODERATE_THRESHOLD = 25; // ≥25pt swing
const MINOR_THRESHOLD = 15;    // ≥15pt swing

/**
 * Determine the severity of a sentiment shift based on the magnitude
 * of the bullish percentage change.
 */
export function classifySeverity(magnitude: number): ShiftSeverity | null {
  const abs = Math.abs(magnitude);
  if (abs >= DRAMATIC_THRESHOLD) return "DRAMATIC";
  if (abs >= MODERATE_THRESHOLD) return "MODERATE";
  if (abs >= MINOR_THRESHOLD) return "MINOR";
  return null; // Below threshold — not a significant shift
}

/**
 * Determine the direction label for a bias change.
 */
export function classifyDirection(
  previousBias: string,
  newBias: string
): ShiftDirection | null {
  const key = `${previousBias}_TO_${newBias}`;
  const validDirections: Record<string, ShiftDirection> = {
    "SHORT_BIAS_TO_LONG_BIAS": "BEARISH_TO_BULLISH",
    "MIXED_TO_LONG_BIAS": "MIXED_TO_BULLISH",
    "LONG_BIAS_TO_SHORT_BIAS": "BULLISH_TO_BEARISH",
    "MIXED_TO_SHORT_BIAS": "MIXED_TO_BEARISH",
    "LONG_BIAS_TO_MIXED": "BULLISH_TO_MIXED",
    "SHORT_BIAS_TO_MIXED": "BEARISH_TO_MIXED",
  };
  return validDirections[key] || null;
}

/**
 * Compare current sentiment data against previous snapshots
 * and detect significant shifts.
 */
export function detectShifts(
  currentData: Map<string, TickerSentimentSplit>,
  previousData: Map<string, { bullishPct: number; bearishPct: number; crowdBias: string }>
): DetectedShift[] {
  const shifts: DetectedShift[] = [];

  for (const [ticker, current] of Array.from(currentData.entries())) {
    const prev = previousData.get(ticker);
    if (!prev) continue; // No previous data — can't detect a shift

    // Skip tickers with very few mentions (noise reduction)
    if (current.totalMentions < 3) continue;

    // Calculate the magnitude of the bullish percentage change
    const bullishDelta = current.bullishPct - prev.bullishPct;
    const severity = classifySeverity(bullishDelta);
    if (!severity) continue; // Below threshold

    // Determine direction
    const direction = classifyDirection(prev.crowdBias, current.crowdBias);
    if (!direction) continue; // Same bias — no directional shift

    shifts.push({
      ticker,
      previousBias: prev.crowdBias,
      newBias: current.crowdBias,
      previousBullishPct: prev.bullishPct,
      newBullishPct: current.bullishPct,
      previousBearishPct: prev.bearishPct,
      newBearishPct: current.bearishPct,
      shiftMagnitude: Math.abs(bullishDelta),
      severity,
      direction,
      totalMentions: current.totalMentions,
    });
  }

  // Sort by severity (DRAMATIC first) then by magnitude
  const severityOrder: Record<ShiftSeverity, number> = {
    DRAMATIC: 3,
    MODERATE: 2,
    MINOR: 1,
  };

  shifts.sort((a, b) => {
    const sevDiff = severityOrder[b.severity] - severityOrder[a.severity];
    if (sevDiff !== 0) return sevDiff;
    return b.shiftMagnitude - a.shiftMagnitude;
  });

  return shifts;
}

// ── Database Helpers ──

/**
 * Store a batch of Reddit sentiment snapshots.
 */
export async function storeRedditSentimentSnapshots(
  data: Map<string, TickerSentimentSplit>,
  snapshotId: string
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const rows: InsertRedditSentimentSnapshot[] = [];
  for (const [ticker, split] of Array.from(data.entries())) {
    // Only store tickers with meaningful mention counts
    if (split.totalMentions < 2) continue;
    rows.push({
      ticker,
      bullishPct: split.bullishPct,
      bearishPct: split.bearishPct,
      neutralPct: split.neutralPct,
      totalMentions: split.totalMentions,
      crowdBias: split.crowdBias,
      snapshotId,
    });
  }

  if (rows.length === 0) return;

  // Insert in batches of 50 to avoid query size limits
  const BATCH_SIZE = 50;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    await db.insert(redditSentimentSnapshots).values(batch);
  }

  console.log(`[ShiftDetector] Stored ${rows.length} sentiment snapshots (batch: ${snapshotId})`);
}

/**
 * Get the most recent sentiment snapshot for each ticker (excluding the current batch).
 */
export async function getPreviousSentimentSnapshots(
  tickers: string[],
  excludeSnapshotId?: string
): Promise<Map<string, { bullishPct: number; bearishPct: number; crowdBias: string; createdAt: Date }>> {
  const db = await getDb();
  const result = new Map<string, { bullishPct: number; bearishPct: number; crowdBias: string; createdAt: Date }>();
  if (!db || tickers.length === 0) return result;

  for (const ticker of tickers) {
    const rows = await db
      .select()
      .from(redditSentimentSnapshots)
      .where(eq(redditSentimentSnapshots.ticker, ticker))
      .orderBy(desc(redditSentimentSnapshots.createdAt))
      .limit(2);

    const prev = excludeSnapshotId
      ? rows.find(r => r.snapshotId !== excludeSnapshotId)
      : rows[0];

    if (prev) {
      result.set(ticker, {
        bullishPct: prev.bullishPct,
        bearishPct: prev.bearishPct,
        crowdBias: prev.crowdBias,
        createdAt: prev.createdAt,
      });
    }
  }

  return result;
}

/**
 * Store detected shift alerts in the database.
 */
export async function storeShiftAlerts(shifts: DetectedShift[]): Promise<number[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (shifts.length === 0) return [];

  const ids: number[] = [];
  for (const shift of shifts) {
    const result = await db.insert(sentimentShiftAlerts).values({
      ticker: shift.ticker,
      previousBias: shift.previousBias,
      newBias: shift.newBias,
      previousBullishPct: shift.previousBullishPct,
      newBullishPct: shift.newBullishPct,
      previousBearishPct: shift.previousBearishPct,
      newBearishPct: shift.newBearishPct,
      shiftMagnitude: shift.shiftMagnitude,
      severity: shift.severity,
      direction: shift.direction,
      totalMentions: shift.totalMentions,
      notified: 0,
      dismissed: 0,
    });
    ids.push(result[0].insertId);
  }

  console.log(`[ShiftDetector] Stored ${shifts.length} shift alerts`);
  return ids;
}

/**
 * Get recent shift alerts (undismissed, most recent first).
 */
export async function getRecentAlerts(limit: number = 20): Promise<SentimentShiftAlert[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(sentimentShiftAlerts)
    .where(eq(sentimentShiftAlerts.dismissed, 0))
    .orderBy(desc(sentimentShiftAlerts.createdAt))
    .limit(limit);
}

/**
 * Get all shift alerts (including dismissed), paginated.
 */
export async function getAlertHistory(limit: number = 50, offset: number = 0): Promise<SentimentShiftAlert[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(sentimentShiftAlerts)
    .orderBy(desc(sentimentShiftAlerts.createdAt))
    .limit(limit)
    .offset(offset);
}

/**
 * Dismiss an alert by ID.
 */
export async function dismissAlert(alertId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(sentimentShiftAlerts)
    .set({ dismissed: 1 })
    .where(eq(sentimentShiftAlerts.id, alertId));
}

/**
 * Mark an alert as notified.
 */
export async function markAlertNotified(alertId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(sentimentShiftAlerts)
    .set({ notified: 1 })
    .where(eq(sentimentShiftAlerts.id, alertId));
}

/**
 * Get count of undismissed alerts (for badge display).
 */
export async function getActiveAlertCount(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(sentimentShiftAlerts)
    .where(eq(sentimentShiftAlerts.dismissed, 0));
  return result[0]?.count ?? 0;
}

// ── Notification ──

/**
 * Format and send owner notification for detected shifts.
 * Only notifies for bearish→bullish shifts (the primary use case).
 */
export async function notifyShiftAlerts(
  shifts: DetectedShift[],
  alertIds: number[]
): Promise<boolean> {
  // Filter to only bearish→bullish or mixed→bullish shifts
  const bullishShifts = shifts.filter(
    s => s.direction === "BEARISH_TO_BULLISH" || s.direction === "MIXED_TO_BULLISH"
  );

  if (bullishShifts.length === 0) return false;

  const title = bullishShifts.length === 1
    ? `🔄 Sentiment Shift: $${bullishShifts[0].ticker} turning Bullish`
    : `🔄 ${bullishShifts.length} Tickers Shifting Bullish`;

  const lines: string[] = [
    "Reddit crowd sentiment has shifted dramatically:\n",
  ];

  for (const shift of bullishShifts) {
    const emoji = shift.severity === "DRAMATIC" ? "🚨" : shift.severity === "MODERATE" ? "⚠️" : "ℹ️";
    lines.push(
      `${emoji} **$${shift.ticker}** — ${shift.direction.replace(/_/g, " ")}`,
      `   Bullish: ${shift.previousBullishPct}% → ${shift.newBullishPct}% (+${shift.shiftMagnitude}pt)`,
      `   Bearish: ${shift.previousBearishPct}% → ${shift.newBearishPct}%`,
      `   Mentions: ${shift.totalMentions} | Severity: ${shift.severity}`,
      "",
    );
  }

  lines.push("Check the Dashboard for full details.");

  const content = lines.join("\n");

  try {
    const sent = await notifyOwner({ title, content });
    if (sent) {
      // Mark alerts as notified
      for (let i = 0; i < shifts.length; i++) {
        const shift = shifts[i];
        const isBullish = shift.direction === "BEARISH_TO_BULLISH" || shift.direction === "MIXED_TO_BULLISH";
        if (isBullish && alertIds[i]) {
          await markAlertNotified(alertIds[i]);
        }
      }
    }
    return sent;
  } catch (err) {
    console.warn("[ShiftDetector] Failed to send notification:", err);
    return false;
  }
}

// ── Main Pipeline ──

/**
 * Run the full shift detection pipeline:
 * 1. Store current sentiment snapshot
 * 2. Compare against previous snapshot
 * 3. Detect shifts
 * 4. Store alerts
 * 5. Send notifications for bearish→bullish shifts
 * 
 * Returns the detected shifts.
 */
export async function runShiftDetection(
  currentSentiment: Map<string, TickerSentimentSplit>
): Promise<{ shifts: DetectedShift[]; notified: boolean }> {
  const snapshotId = `sent-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  // Step 1: Get previous snapshots before storing new ones
  const tickers = Array.from(currentSentiment.keys());
  const previousSnapshots = await getPreviousSentimentSnapshots(tickers);

  // Step 2: Store current snapshot
  await storeRedditSentimentSnapshots(currentSentiment, snapshotId);

  // Step 3: Detect shifts
  const shifts = detectShifts(currentSentiment, previousSnapshots);

  if (shifts.length === 0) {
    console.log(`[ShiftDetector] No significant sentiment shifts detected`);
    return { shifts: [], notified: false };
  }

  console.log(`[ShiftDetector] Detected ${shifts.length} sentiment shifts:`);
  for (const s of shifts) {
    console.log(`  ${s.ticker}: ${s.direction} (${s.severity}, +${s.shiftMagnitude}pt)`);
  }

  // Step 4: Store alerts
  const alertIds = await storeShiftAlerts(shifts);

  // Step 5: Notify for bearish→bullish shifts
  const notified = await notifyShiftAlerts(shifts, alertIds);

  return { shifts, notified };
}
