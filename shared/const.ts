export const COOKIE_NAME = "app_session_id";
export const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;
export const AXIOS_TIMEOUT_MS = 30_000;
export const UNAUTHED_ERR_MSG = 'Please login (10001)';
export const NOT_ADMIN_ERR_MSG = 'You do not have required permission (10002)';

// ── Free Access Period ──
// During this period, ALL users get full access without signup or payment.
// Set to 1 month from launch (March 28, 2026 → April 28, 2026).
export const FREE_ACCESS_UNTIL = new Date('2026-04-28T23:59:59Z');
export function isFreeAccessPeriod(): boolean {
  return new Date() < FREE_ACCESS_UNTIL;
}

// ── Axiarch Scanner Constants ──
export const ORACLE_SCAN_HOUR_ET = 8; // 8:00 AM ET daily scan
export const MAX_DAILY_PICKS = 20;
export const MIN_ORACLE_SCORE = 50;
export const YAHOO_FINANCE_BASE = "https://query1.finance.yahoo.com/v8/finance";
