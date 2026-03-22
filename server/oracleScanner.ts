/**
 * Oracle-Style Stock Scanner
 * 
 * Replicates StocksToTrade's Oracle methodology:
 * 1. Pre-Market Quantitative Screener (price, float, volume, gap)
 * 2. Scoring algorithm based on Oracle criteria
 * 3. Signal generation with entry, stop loss, and targets
 */
import { callDataApi } from "./_core/dataApi";

// ── Oracle Screening Criteria (from reverse engineering) ──
const ORACLE_CRITERIA = {
  priceMin: 0.50,
  priceMax: 20.00,
  minVolume: 50_000,        // Pre-market minimum (lower threshold for early scans)
  minGapPercent: 5,          // Minimum gap up/down %
  maxFloat: 50_000_000,     // Prefer low float < 50M (ideal < 10M)
  idealFloat: 10_000_000,   // Ideal float for max score
  minRiskReward: 3,          // Minimum 3:1 risk-reward
};

// ── Candidate stock universe (penny stocks & small caps known for volatility) ──
// In production, this would come from a real-time screener API.
// We use a curated watchlist of historically volatile tickers + trending tickers.
const SCAN_UNIVERSE = [
  // Recent penny stock movers & former runners
  "MULN", "FFIE", "SNDL", "BBIG", "ATER", "PROG", "CLOV", "WISH",
  "SOFI", "PLTR", "NIO", "LCID", "RIVN", "MARA", "RIOT", "BITF",
  "HIVE", "CLSK", "WULF", "IREN", "CORZ", "CIFR", "BTBT", "SOS",
  "GSAT", "OPEN", "SKLZ", "DKNG", "PENN", "AFRM", "UPST", "HOOD",
  "DNA", "IONQ", "RGTI", "QUBT", "QBTS", "ARQQ", "LUNR", "RKLB",
  "MNTS", "ASTR", "SPCE", "JOBY", "ACHR", "LILM", "EVTL", "BLDE",
  "SMCI", "KULR", "APLD", "BTDR", "HUT", "GREE", "EBON", "CAN",
  "VNET", "BABA", "JD", "PDD", "LI", "XPEV", "ZK", "FUTU",
  "TIGR", "GRAB", "SE", "SHOP", "MELI", "NU", "STNE", "PAGS",
  "AMC", "GME", "BB", "NOK", "EXPR", "KOSS", "NAKD", "CENN",
  "GOEV", "WKHS", "RIDE", "FSR", "PSNY", "PTRA", "REE", "ARVL",
  "NKLA", "HYLN", "XL", "CHPT", "BLNK", "EVGO", "DCFC", "VLTA",
  "PLUG", "FCEL", "BE", "BLDP", "CLNE", "GEVO", "TELL", "RIG",
  "VALE", "CLF", "X", "AA", "GOLD", "NEM", "FNV", "WPM",
];

export interface StockChartData {
  symbol: string;
  companyName?: string;
  currentPrice: number;
  previousClose: number;
  open: number;
  dayHigh: number;
  dayLow: number;
  volume: number;
  avgVolume: number;
  marketCap: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  // Derived
  gapPercent: number;
  dayChangePercent: number;
  // Historical data for pattern detection
  prices: number[];
  volumes: number[];
  timestamps: number[];
}

export interface OraclePick {
  ticker: string;
  companyName: string;
  bias: "LONG" | "SHORT";
  currentPrice: number;
  entryPrice: number;
  stopLoss: number;
  target1: number;
  target2: number;
  target3: number;
  riskRewardRatio: number;
  oracleScore: number;
  marketCap: number;
  floatShares: number | null;
  volume: number;
  avgVolume: number;
  gapPercent: number;
  dayChangePercent: number;
  support: number;
  resistance: number;
  reasoning: string;
}

/**
 * Fetch stock chart data from Yahoo Finance via the built-in Data API
 */
async function fetchStockData(symbol: string): Promise<StockChartData | null> {
  try {
    const result = await callDataApi("YahooFinance/get_stock_chart", {
      query: {
        symbol,
        region: "US",
        interval: "1d",
        range: "1mo",
        includeAdjustedClose: "true",
      },
    }) as any;

    if (!result?.chart?.result?.[0]) return null;

    const data = result.chart.result[0];
    const meta = data.meta;
    const quotes = data.indicators?.quote?.[0];
    const timestamps = data.timestamp || [];

    if (!meta || !quotes) return null;

    const currentPrice = meta.regularMarketPrice ?? 0;
    const previousClose = meta.chartPreviousClose ?? meta.previousClose ?? currentPrice;
    const openPrice = quotes.open?.[quotes.open.length - 1] ?? currentPrice;

    return {
      symbol: meta.symbol,
      companyName: meta.longName || meta.shortName || symbol,
      currentPrice,
      previousClose,
      open: openPrice,
      dayHigh: meta.regularMarketDayHigh ?? currentPrice,
      dayLow: meta.regularMarketDayLow ?? currentPrice,
      volume: meta.regularMarketVolume ?? 0,
      avgVolume: meta.averageDailyVolume10Day ?? meta.averageDailyVolume3Month ?? 0,
      marketCap: meta.marketCap ?? 0,
      fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh ?? currentPrice,
      fiftyTwoWeekLow: meta.fiftyTwoWeekLow ?? currentPrice,
      gapPercent: previousClose > 0 ? ((openPrice - previousClose) / previousClose) * 100 : 0,
      dayChangePercent: previousClose > 0 ? ((currentPrice - previousClose) / previousClose) * 100 : 0,
      prices: (quotes.close || []).filter((p: any) => p != null),
      volumes: (quotes.volume || []).filter((v: any) => v != null),
      timestamps: timestamps,
    };
  } catch (err) {
    console.warn(`[OracleScanner] Failed to fetch ${symbol}:`, err);
    return null;
  }
}

/**
 * Oracle-style scoring algorithm (0-100)
 * Based on reverse-engineered criteria from StocksToTrade's Oracle
 */
function calculateOracleScore(stock: StockChartData): number {
  let score = 0;

  // 1. Price Range Score (0-15 pts)
  // Oracle targets $0.50-$20 range, sweet spot $1-$10
  if (stock.currentPrice >= ORACLE_CRITERIA.priceMin && stock.currentPrice <= ORACLE_CRITERIA.priceMax) {
    score += 5;
    if (stock.currentPrice >= 1 && stock.currentPrice <= 10) score += 10;
    else if (stock.currentPrice >= 0.50 && stock.currentPrice < 1) score += 5;
    else score += 3;
  }

  // 2. Volume Score (0-20 pts)
  // Higher relative volume = more interest = higher score
  const relativeVolume = stock.avgVolume > 0 ? stock.volume / stock.avgVolume : 0;
  if (relativeVolume >= 5) score += 20;
  else if (relativeVolume >= 3) score += 15;
  else if (relativeVolume >= 2) score += 10;
  else if (relativeVolume >= 1.5) score += 5;

  // 3. Gap Score (0-20 pts)
  // Bigger gap = more momentum = higher score
  const absGap = Math.abs(stock.gapPercent);
  if (absGap >= 30) score += 20;
  else if (absGap >= 20) score += 17;
  else if (absGap >= 10) score += 14;
  else if (absGap >= 5) score += 10;
  else if (absGap >= 3) score += 5;

  // 4. Float Score (0-15 pts)
  // Lower float = more explosive moves
  // We estimate float from market cap / price as a rough proxy
  const estimatedFloat = stock.marketCap > 0 && stock.currentPrice > 0
    ? stock.marketCap / stock.currentPrice
    : 100_000_000;
  if (estimatedFloat <= 5_000_000) score += 15;
  else if (estimatedFloat <= 10_000_000) score += 12;
  else if (estimatedFloat <= 20_000_000) score += 8;
  else if (estimatedFloat <= 50_000_000) score += 4;

  // 5. Momentum Score (0-15 pts)
  // Day change percentage indicates momentum
  const absDayChange = Math.abs(stock.dayChangePercent);
  if (absDayChange >= 20) score += 15;
  else if (absDayChange >= 10) score += 12;
  else if (absDayChange >= 5) score += 8;
  else if (absDayChange >= 2) score += 4;

  // 6. Former Runner Score (0-15 pts)
  // Check if stock has had big moves recently (high/low range vs current price)
  const priceRange = stock.fiftyTwoWeekHigh - stock.fiftyTwoWeekLow;
  const rangePercent = stock.fiftyTwoWeekLow > 0 ? (priceRange / stock.fiftyTwoWeekLow) * 100 : 0;
  if (rangePercent >= 200) score += 15;
  else if (rangePercent >= 100) score += 12;
  else if (rangePercent >= 50) score += 8;
  else if (rangePercent >= 25) score += 4;

  return Math.min(100, Math.max(0, score));
}

/**
 * Determine bias (LONG or SHORT) based on Oracle methodology
 */
function determineBias(stock: StockChartData): "LONG" | "SHORT" {
  // Oracle uses momentum direction + gap direction
  // Positive gap + positive momentum = LONG
  // Negative gap + negative momentum = SHORT
  const momentumScore = stock.dayChangePercent + stock.gapPercent;
  return momentumScore >= 0 ? "LONG" : "SHORT";
}

/**
 * Calculate entry, stop loss, and targets using Red Candle Theory methodology
 */
function calculateSignals(stock: StockChartData, bias: "LONG" | "SHORT") {
  const price = stock.currentPrice;
  const dayRange = stock.dayHigh - stock.dayLow;
  const atr = dayRange > 0 ? dayRange : price * 0.05; // Use day range as ATR proxy

  if (bias === "LONG") {
    // Entry slightly above current price (wait for confirmation)
    const entry = +(price * 1.005).toFixed(4);
    // Stop loss below recent support (bottom of range)
    const stopLoss = +(price - atr * 0.5).toFixed(4);
    const risk = entry - stopLoss;
    // Targets at 3:1, 4:1, 5:1 risk-reward
    const target1 = +(entry + risk * 3).toFixed(4);
    const target2 = +(entry + risk * 4).toFixed(4);
    const target3 = +(entry + risk * 5).toFixed(4);
    const rr = risk > 0 ? +((target1 - entry) / risk).toFixed(1) : 0;
    // Support = day low, Resistance = day high
    const support = stock.dayLow;
    const resistance = stock.dayHigh;

    return { entry, stopLoss, target1, target2, target3, riskRewardRatio: rr, support, resistance };
  } else {
    // SHORT bias
    const entry = +(price * 0.995).toFixed(4);
    const stopLoss = +(price + atr * 0.5).toFixed(4);
    const risk = stopLoss - entry;
    const target1 = +(entry - risk * 3).toFixed(4);
    const target2 = +(entry - risk * 4).toFixed(4);
    const target3 = +(entry - risk * 5).toFixed(4);
    const rr = risk > 0 ? +((entry - target1) / risk).toFixed(1) : 0;
    const support = stock.dayLow;
    const resistance = stock.dayHigh;

    return { entry, stopLoss, target1, target2, target3, riskRewardRatio: rr, support, resistance };
  }
}

/**
 * Generate reasoning text for why this stock was picked
 */
function generateReasoning(stock: StockChartData, score: number, bias: string): string {
  const parts: string[] = [];

  if (Math.abs(stock.gapPercent) >= 5) {
    parts.push(`${stock.gapPercent > 0 ? "Gapped up" : "Gapped down"} ${Math.abs(stock.gapPercent).toFixed(1)}%`);
  }

  const relVol = stock.avgVolume > 0 ? (stock.volume / stock.avgVolume).toFixed(1) : "N/A";
  if (parseFloat(relVol) >= 1.5) {
    parts.push(`${relVol}x relative volume`);
  }

  const estFloat = stock.marketCap > 0 && stock.currentPrice > 0
    ? stock.marketCap / stock.currentPrice
    : null;
  if (estFloat && estFloat <= 10_000_000) {
    parts.push(`Low float (~${(estFloat / 1_000_000).toFixed(1)}M shares)`);
  }

  if (stock.currentPrice >= 0.50 && stock.currentPrice <= 20) {
    parts.push(`Price $${stock.currentPrice.toFixed(2)} in Oracle sweet spot`);
  }

  const rangePercent = stock.fiftyTwoWeekLow > 0
    ? ((stock.fiftyTwoWeekHigh - stock.fiftyTwoWeekLow) / stock.fiftyTwoWeekLow) * 100
    : 0;
  if (rangePercent >= 100) {
    parts.push("Former runner (high 52-week range)");
  }

  parts.push(`Oracle Score: ${score}/100`);
  parts.push(`Bias: ${bias}`);

  return parts.join(" | ");
}

/**
 * Run the full Oracle-style scan
 * Returns top picks sorted by Oracle score
 */
export async function runOracleScan(maxPicks: number = 20): Promise<{
  picks: OraclePick[];
  totalScanned: number;
  scanTime: number;
}> {
  const startTime = Date.now();
  console.log(`[OracleScanner] Starting scan of ${SCAN_UNIVERSE.length} tickers...`);

  // Fetch data for all tickers (in batches to avoid rate limits)
  const batchSize = 10;
  const allStockData: StockChartData[] = [];

  for (let i = 0; i < SCAN_UNIVERSE.length; i += batchSize) {
    const batch = SCAN_UNIVERSE.slice(i, i + batchSize);
    const results = await Promise.all(batch.map(fetchStockData));
    for (const r of results) {
      if (r) allStockData.push(r);
    }
    // Small delay between batches
    if (i + batchSize < SCAN_UNIVERSE.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  console.log(`[OracleScanner] Fetched data for ${allStockData.length} stocks`);

  // Apply Oracle screening criteria
  const candidates = allStockData.filter(stock => {
    // Price range filter
    if (stock.currentPrice < ORACLE_CRITERIA.priceMin || stock.currentPrice > ORACLE_CRITERIA.priceMax) return false;
    // Minimum volume
    if (stock.volume < ORACLE_CRITERIA.minVolume) return false;
    // Must have some movement
    if (Math.abs(stock.gapPercent) < 2 && Math.abs(stock.dayChangePercent) < 2) return false;
    return true;
  });

  console.log(`[OracleScanner] ${candidates.length} stocks passed initial screening`);

  // Score and rank candidates
  const scoredCandidates = candidates.map(stock => {
    const score = calculateOracleScore(stock);
    const bias = determineBias(stock);
    const signals = calculateSignals(stock, bias);
    const estFloat = stock.marketCap > 0 && stock.currentPrice > 0
      ? Math.round(stock.marketCap / stock.currentPrice)
      : null;

    return {
      ticker: stock.symbol,
      companyName: stock.companyName || stock.symbol,
      bias,
      currentPrice: stock.currentPrice,
      entryPrice: signals.entry,
      stopLoss: signals.stopLoss,
      target1: signals.target1,
      target2: signals.target2,
      target3: signals.target3,
      riskRewardRatio: signals.riskRewardRatio,
      oracleScore: score,
      marketCap: stock.marketCap,
      floatShares: estFloat,
      volume: stock.volume,
      avgVolume: stock.avgVolume,
      gapPercent: stock.gapPercent,
      dayChangePercent: stock.dayChangePercent,
      support: signals.support,
      resistance: signals.resistance,
      reasoning: generateReasoning(stock, score, bias),
    } satisfies OraclePick;
  });

  // Sort by Oracle score (highest first) and take top picks
  scoredCandidates.sort((a, b) => b.oracleScore - a.oracleScore);
  const topPicks = scoredCandidates.slice(0, maxPicks);

  // Ensure we have a mix of LONG and SHORT (like Oracle does ~10 each)
  const longs = topPicks.filter(p => p.bias === "LONG");
  const shorts = topPicks.filter(p => p.bias === "SHORT");

  const scanTime = Date.now() - startTime;
  console.log(`[OracleScanner] Scan complete in ${scanTime}ms. ${topPicks.length} picks (${longs.length} LONG, ${shorts.length} SHORT)`);

  return {
    picks: topPicks,
    totalScanned: allStockData.length,
    scanTime,
  };
}

/**
 * Format picks into a notification message
 */
export function formatPicksNotification(picks: OraclePick[], scanDate: string): { title: string; content: string } {
  const longs = picks.filter(p => p.bias === "LONG").slice(0, 5);
  const shorts = picks.filter(p => p.bias === "SHORT").slice(0, 5);

  let content = `🎯 **Oracle Daily Picks — ${scanDate}**\n\n`;

  if (longs.length > 0) {
    content += `📈 **TOP LONG PICKS:**\n`;
    for (const p of longs) {
      content += `\n**${p.ticker}** (Score: ${p.oracleScore}/100)\n`;
      content += `  Price: $${p.currentPrice.toFixed(2)} | Entry: $${p.entryPrice.toFixed(2)}\n`;
      content += `  Stop: $${p.stopLoss.toFixed(2)} | Target: $${p.target1.toFixed(2)} (${p.riskRewardRatio}:1 R/R)\n`;
      content += `  Gap: ${p.gapPercent >= 0 ? "+" : ""}${p.gapPercent.toFixed(1)}% | Vol: ${formatNumber(p.volume)}\n`;
    }
  }

  if (shorts.length > 0) {
    content += `\n📉 **TOP SHORT PICKS:**\n`;
    for (const p of shorts) {
      content += `\n**${p.ticker}** (Score: ${p.oracleScore}/100)\n`;
      content += `  Price: $${p.currentPrice.toFixed(2)} | Entry: $${p.entryPrice.toFixed(2)}\n`;
      content += `  Stop: $${p.stopLoss.toFixed(2)} | Target: $${p.target1.toFixed(2)} (${p.riskRewardRatio}:1 R/R)\n`;
      content += `  Gap: ${p.gapPercent >= 0 ? "+" : ""}${p.gapPercent.toFixed(1)}% | Vol: ${formatNumber(p.volume)}\n`;
    }
  }

  content += `\n---\n`;
  content += `Total stocks scanned: ${picks.length} qualified picks\n`;
  content += `⚠️ For research purposes only — not financial advice.\n`;

  return {
    title: `🎯 Oracle Picks: ${picks.length} Stocks for ${scanDate}`,
    content,
  };
}

function formatNumber(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + "B";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toString();
}
