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

// ── Reddit Mention Velocity ──
// Stores periodic snapshots of Reddit mention data from ApeWisdom.
// Used to compute mention velocity (acceleration of mentions over time).

export const redditMentions = mysqlTable("reddit_mentions", {
  id: int("id").autoincrement().primaryKey(),
  ticker: varchar("ticker", { length: 10 }).notNull(),
  mentions: int("mentions").default(0).notNull(),
  mentions24hAgo: int("mentions24hAgo").default(0),
  upvotes: int("upvotes").default(0),
  rank: int("rank"),
  rank24hAgo: int("rank24hAgo"),
  /** Computed: (mentions - mentions24hAgo) / mentions24hAgo * 100 */
  velocityPct: float("velocityPct").default(0),
  /** Computed: mentions - mentions24hAgo */
  velocityAbs: int("velocityAbs").default(0),
  /** Which snapshot batch this belongs to */
  snapshotId: varchar("snapshotId", { length: 36 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type RedditMention = typeof redditMentions.$inferSelect;
export type InsertRedditMention = typeof redditMentions.$inferInsert;

// ── Reddit Sentiment Snapshots ──
// Stores periodic Reddit crowd sentiment per ticker for shift detection.
// Each refresh writes one row per ticker so we can compare current vs previous.

export const redditSentimentSnapshots = mysqlTable("reddit_sentiment_snapshots", {
  id: int("id").autoincrement().primaryKey(),
  ticker: varchar("ticker", { length: 10 }).notNull(),
  bullishPct: int("bullishPct").default(0).notNull(),
  bearishPct: int("bearishPct").default(0).notNull(),
  neutralPct: int("neutralPct").default(0).notNull(),
  totalMentions: int("totalMentions").default(0).notNull(),
  crowdBias: varchar("crowdBias", { length: 20 }).notNull(), // LONG_BIAS | SHORT_BIAS | MIXED
  /** Batch identifier for this snapshot */
  snapshotId: varchar("snapshotId", { length: 36 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type RedditSentimentSnapshot = typeof redditSentimentSnapshots.$inferSelect;
export type InsertRedditSentimentSnapshot = typeof redditSentimentSnapshots.$inferInsert;

// ── Sentiment Shift Alerts ──
// Stores detected sentiment shift events (e.g., bearish → bullish).

export const sentimentShiftAlerts = mysqlTable("sentiment_shift_alerts", {
  id: int("id").autoincrement().primaryKey(),
  ticker: varchar("ticker", { length: 10 }).notNull(),
  /** Previous crowd bias */
  previousBias: varchar("previousBias", { length: 20 }).notNull(),
  /** New crowd bias */
  newBias: varchar("newBias", { length: 20 }).notNull(),
  /** Previous bullish percentage */
  previousBullishPct: int("previousBullishPct").default(0).notNull(),
  /** New bullish percentage */
  newBullishPct: int("newBullishPct").default(0).notNull(),
  /** Previous bearish percentage */
  previousBearishPct: int("previousBearishPct").default(0).notNull(),
  /** New bearish percentage */
  newBearishPct: int("newBearishPct").default(0).notNull(),
  /** Magnitude of the shift in percentage points */
  shiftMagnitude: int("shiftMagnitude").default(0).notNull(),
  /** Severity: DRAMATIC (≥40pt swing), MODERATE (≥25pt), MINOR (≥15pt) */
  severity: varchar("severity", { length: 20 }).notNull(),
  /** Direction of the shift */
  direction: varchar("direction", { length: 30 }).notNull(), // BEARISH_TO_BULLISH | BULLISH_TO_BEARISH | MIXED_TO_BULLISH | etc.
  /** Total Reddit mentions at time of detection */
  totalMentions: int("totalMentions").default(0),
  /** Whether the owner was notified */
  notified: int("notified").default(0),
  /** Whether the alert has been dismissed by the user */
  dismissed: int("dismissed").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SentimentShiftAlert = typeof sentimentShiftAlerts.$inferSelect;
export type InsertSentimentShiftAlert = typeof sentimentShiftAlerts.$inferInsert;
