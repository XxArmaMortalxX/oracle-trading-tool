/**
 * Database helpers for Oracle scan sessions, picks, and notification preferences.
 */
import { eq, desc, and } from "drizzle-orm";
import {
  scanSessions,
  scanPicks,
  notificationPreferences,
  InsertScanSession,
  InsertScanPick,
  InsertNotificationPreference,
  ScanSession,
  ScanPick,
  NotificationPreference,
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
