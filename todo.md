# Oracle Decoded — Migration TODO

## Database Schema
- [x] Create scan_sessions table
- [x] Create scan_picks table
- [x] Create notification_preferences table
- [x] Run migrations via webdev_execute_sql

## Server-Side Code
- [x] Migrate shared/types.ts (OraclePick, ScanSession, NotificationPrefs types)
- [x] Migrate shared/const.ts (cookie name, constants)
- [x] Migrate server/oracleScanner.ts (scoring algorithm + Yahoo Finance API)
- [x] Migrate server/scanRunner.ts (fetch → score → store → notify pipeline)
- [x] Migrate server/routers.ts (scan + notification tRPC routes)
- [x] Migrate server/scanDb.ts (database query helpers)

## Frontend Design System
- [x] Migrate index.css (Signal Deck dark theme, emerald/rose/indigo palette)
- [x] Migrate index.html (Google Fonts: Instrument Sans, DM Sans, IBM Plex Mono)
- [x] Migrate Layout component (nav with 6 routes, mobile menu)

## Frontend Pages
- [x] Migrate Home page (hero, stats, features, three engines)
- [x] Migrate Methodology page (three engines deep dive)
- [x] Migrate Framework page (7-step pennystocking)
- [x] Migrate Calculator page (RCT calculator)
- [x] Migrate Screener page (stock screener simulator)
- [x] Migrate Dashboard page (live picks, scan history, notifications)

## App Configuration
- [x] Migrate App.tsx (routes, theme provider)
- [x] Client const.ts (getLoginUrl) — already in new scaffold

## Tests
- [x] Migrate oracleScanner.test.ts (10 tests)
- [x] Verify auth.logout.test.ts still passes (1 test)
- [x] All 11 tests passing

## Final Verification
- [x] Dev server runs without errors
- [x] All pages render correctly in browser
- [x] Save checkpoint and deliver

## Real-Time Market Data Update
- [x] Research available real-time stock market data APIs
- [x] Update oracleScanner.ts to fetch live market data (prices, volume, gaps, market cap, float)
- [x] Expand the scan universe to cover more tickers dynamically (200+ tickers)
- [x] Update the Screener page to use live data instead of sample data
- [x] Test scanner with real market data end-to-end (28 tests passing)
- [x] Verify Dashboard displays live picks correctly

## Screener Live Data Integration
- [x] Create backend tRPC screener.scan endpoint that fetches live data from Yahoo Finance
- [x] Support server-side filtering by price range, volume, gap %, and change %
- [x] Update Screener.tsx to call the tRPC endpoint instead of using static sample data
- [x] Add loading states, error handling, rate-limit warning, and empty states for live data
- [x] Write vitest tests for the screener endpoint (8 tests with mocked data)
- [x] Verify end-to-end in browser
