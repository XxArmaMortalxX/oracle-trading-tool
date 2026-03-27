/**
 * Database helpers for Oracle scan sessions, picks, and notification preferences.
 */
import { eq, desc, and } from "drizzle-orm";
import {
  scanSessions,
  scanPicks,
  notificationPreferences,
  sentimentHistory,
  InsertScanSession,
  InsertScanPick,
  InsertNotificationPreference,
  InsertSentimentHistory,
  ScanSession,
  ScanPick,
  NotificationPreference,
  SentimentHistoryRow,
} from "../drizzle/schema";
import { getDb } from "./db";

// ── Scan Sessions ──

export async function createScanSession(data: InsertScanSession): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(scanSessions).values(data);
  return result[0].insertId;
}

export async function updateScanSession(
  id: number,
  data: Partial<Pick<ScanSession, "status" | "totalStocksScanned" | "picksGenerated" | "notificationSent" | "completedAt">>
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(scanSessions).set(data).where(eq(scanSessions.id, id));
}

export async function getLatestScanSession(): Promise<ScanSession | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(scanSessions).orderBy(desc(scanSessions.id)).limit(1);
  return result[0];
}

export async function getScanSessionByDate(date: string): Promise<ScanSession | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(scanSessions)
    .where(eq(scanSessions.scanDate, date))
    .orderBy(desc(scanSessions.id))
    .limit(1);
  return result[0];
}

export async function getRecentScanSessions(limit: number = 7): Promise<ScanSession[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(scanSessions).orderBy(desc(scanSessions.id)).limit(limit);
}

// ── Scan Picks ──

export async function insertScanPicks(picks: InsertScanPick[]): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (picks.length === 0) return;
  await db.insert(scanPicks).values(picks);
}

export async function getPicksBySessionId(sessionId: number): Promise<ScanPick[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(scanPicks)
    .where(eq(scanPicks.sessionId, sessionId))
    .orderBy(desc(scanPicks.oracleScore));
}

export async function getLatestPicks(): Promise<ScanPick[]> {
  const session = await getLatestScanSession();
  if (!session) return [];
  return getPicksBySessionId(session.id);
}

// ── Notification Preferences ──

export async function getNotificationPrefs(userId: number): Promise<NotificationPreference | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, userId))
    .limit(1);
  return result[0];
}

// ── Sentiment History ──

/** Insert a batch of sentiment snapshots for the current scan. */
export async function insertSentimentSnapshots(snapshots: InsertSentimentHistory[]): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (snapshots.length === 0) return;
  await db.insert(sentimentHistory).values(snapshots);
}

/**
 * Get the most recent sentiment snapshot for each ticker (before a given session).
 * Returns a Map<ticker, { score, label, createdAt }> for fast lookup.
 */
export async function getPreviousSentimentByTickers(
  tickers: string[],
  beforeSessionId?: number
): Promise<Map<string, { score: number; label: string; createdAt: Date }>> {
  const db = await getDb();
  const result = new Map<string, { score: number; label: string; createdAt: Date }>();
  if (!db || tickers.length === 0) return result;

  // For each ticker, get the most recent snapshot that's not from the current session
  // We batch this into a single query using a subquery approach
  for (const ticker of tickers) {
    let query = db
      .select()
      .from(sentimentHistory)
      .where(eq(sentimentHistory.ticker, ticker))
      .orderBy(desc(sentimentHistory.createdAt))
      .limit(2); // Get last 2 so we can skip the current one if needed

    const rows = await query;
    // If beforeSessionId is provided, skip rows from that session
    const prev = beforeSessionId
      ? rows.find(r => r.sessionId !== beforeSessionId)
      : rows[0];

    if (prev) {
      result.set(ticker, {
        score: prev.sentimentScore,
        label: prev.sentimentLabel,
        createdAt: prev.createdAt,
      });
    }
  }

  return result;
}

export async function upsertNotificationPrefs(
  userId: number,
  data: Partial<InsertNotificationPreference>
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await getNotificationPrefs(userId);
  if (existing) {
    await db
      .update(notificationPreferences)
      .set(data)
      .where(eq(notificationPreferences.userId, userId));
  } else {
    await db.insert(notificationPreferences).values({
      userId,
      enabled: data.enabled ?? 1,
      minOracleScore: data.minOracleScore ?? 60,
      biasFilter: data.biasFilter ?? "ALL",
      maxPicks: data.maxPicks ?? 10,
    });
  }
}
