import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, float, decimal } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ── Oracle Scan Sessions ──

export const scanSessions = mysqlTable("scan_sessions", {
  id: int("id").autoincrement().primaryKey(),
  scanDate: varchar("scanDate", { length: 10 }).notNull(), // YYYY-MM-DD
  status: mysqlEnum("status", ["running", "completed", "failed"]).default("running").notNull(),
  totalStocksScanned: int("totalStocksScanned").default(0),
  picksGenerated: int("picksGenerated").default(0),
  notificationSent: int("notificationSent").default(0),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ScanSession = typeof scanSessions.$inferSelect;
export type InsertScanSession = typeof scanSessions.$inferInsert;

// ── Oracle Scan Picks ──

export const scanPicks = mysqlTable("scan_picks", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("sessionId").notNull(),
  ticker: varchar("ticker", { length: 10 }).notNull(),
  companyName: varchar("companyName", { length: 255 }),
  bias: mysqlEnum("bias", ["LONG", "SHORT"]).notNull(),
  currentPrice: float("currentPrice"),
  entryPrice: float("entryPrice"),
  stopLoss: float("stopLoss"),
  target1: float("target1"),
  target2: float("target2"),
  target3: float("target3"),
  riskRewardRatio: float("riskRewardRatio"),
  oracleScore: int("oracleScore").default(0),
  marketCap: float("marketCap"),
  floatShares: float("floatShares"),
  volume: int("volume"),
  avgVolume: int("avgVolume"),
  gapPercent: float("gapPercent"),
  dayChangePercent: float("dayChangePercent"),
  support: float("support"),
  resistance: float("resistance"),
  reasoning: text("reasoning"),
  sentimentScore: int("sentimentScore").default(0),
  sentimentLabel: varchar("sentimentLabel", { length: 20 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ScanPick = typeof scanPicks.$inferSelect;
export type InsertScanPick = typeof scanPicks.$inferInsert;

// ── Notification Preferences ──

export const notificationPreferences = mysqlTable("notification_preferences", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  enabled: int("enabled").default(1),
  minOracleScore: int("minOracleScore").default(60),
  biasFilter: mysqlEnum("biasFilter", ["ALL", "LONG", "SHORT"]).default("ALL"),
  maxPicks: int("maxPicks").default(10),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type NotificationPreference = typeof notificationPreferences.$inferSelect;
export type InsertNotificationPreference = typeof notificationPreferences.$inferInsert;

// ── Sentiment History ──
// Stores per-ticker sentiment snapshots for trend tracking.
// Each scan writes one row per ticker so we can compute improving/declining/stable trends.

export const sentimentHistory = mysqlTable("sentiment_history", {
  id: int("id").autoincrement().primaryKey(),
  ticker: varchar("ticker", { length: 10 }).notNull(),
  sentimentScore: int("sentimentScore").notNull(),
  sentimentLabel: varchar("sentimentLabel", { length: 20 }).notNull(),
  sessionId: int("sessionId"),
  /** JSON string of component scores for detailed analysis */
  components: text("components"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SentimentHistoryRow = typeof sentimentHistory.$inferSelect;
export type InsertSentimentHistory = typeof sentimentHistory.$inferInsert;
