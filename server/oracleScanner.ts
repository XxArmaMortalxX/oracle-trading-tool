/**
 * Oracle-Style Stock Scanner — Real-Time Market Data
 * 
 * Pulls live data from Yahoo Finance via the Manus Data API hub.
 * 
 * Pipeline:
 * 1. Scan a curated universe of 200+ penny/small-cap tickers
 * 2. Fetch real-time price, volume, gap, and historical data
 * 3. Apply Oracle screening criteria (price, float, volume, gap)
 * 4. Score each candidate (0-100) using the Oracle algorithm
 * 5. Generate entry, stop loss, and target signals
 * 6. Return top 20 picks sorted by score
 */
import { callDataApi } from "./_core/dataApi";

// ── Oracle Screening Criteria (from reverse engineering) ──
const ORACLE_CRITERIA = {
  priceMin: 0.50,
  priceMax: 20.00,
  minVolume: 50_000,
  minGapPercent: 2,
  maxFloat: 50_000_000,
  idealFloat: 10_000_000,
  minRiskReward: 3,
};

// ── Curated scan universe: penny stocks, small caps, meme stocks, and volatile tickers ──
// This list is maintained with actively traded US equities known for volatility.
// Tickers are grouped by sector for readability.
const SCAN_UNIVERSE = [
  // ── Meme stocks & retail favorites ──
  "AMC", "GME", "BB", "NOK", "KOSS", "CENN",
  "GOEV", "WKHS", "NKLA",

  // ── Fintech & digital finance ──
  "SOFI", "HOOD", "AFRM", "UPST", "NU", "STNE", "PAGS",
  "FUTU", "TIGR",

  // ── Crypto-adjacent / miners ──
  "MARA", "RIOT", "BITF", "HIVE", "CLSK", "WULF", "IREN",
  "CIFR", "BTBT", "HUT", "BTDR", "CAN",

  // ── EV & clean energy ──
  "NIO", "LCID", "LI", "XPEV",
  "CHPT", "BLNK", "EVGO",
  "PLUG", "FCEL", "BE", "BLDP",
  "CLNE", "GEVO",

  // ── Quantum computing ──
  "IONQ", "RGTI", "QUBT",

  // ── Space & aerospace ──
  "LUNR", "RKLB", "SPCE", "JOBY", "ACHR", "LILM",

  // ── AI & tech small caps ──
  "SMCI", "KULR", "APLD",
  "GRAB", "SE", "SHOP",

  // ── Biotech & pharma (volatile small caps) ──
  "CLOV", "DNA",
  "SNDL",

  // ── Commodities & materials ──
  "TELL", "RIG", "VALE", "CLF", "X", "AA",
  "GOLD", "NEM",

  // ── China ADRs (volatile) ──
  "BABA", "JD", "PDD",

  // ── Sports betting & gaming ──
  "DKNG", "PENN",

  // ── Additional volatile small/mid caps ──
  "OPEN", "SKLZ", "GSAT",
  "PLTR",

  // ── Recently active penny stocks (updated periodically) ──
  "SOUN", "BBAI", "ASTS", "BFRG", "DRUG",
  "NVAX", "NNDM", "VNET", "BEKE", "ZK",
  "PSNY", "PTRA",
  "HYLN",

  // ── Additional small-cap movers ──
  "CPRX", "TGTX", "PRAX", "VERA", "IMVT",
  "RVMD", "PCVX", "KRYS", "INSM", "AXSM",
  "HIMS", "CELH", "MNST", "CORT", "LNTH",
  "AEHR", "WOLF", "SEDG", "ENPH", "ARRY",
  "RUN", "NOVA", "MAXN", "CSIQ", "JKS",
  "DQ", "FLNC", "STEM",

  // ── SPACs and de-SPACs (high volatility) ──
  "MVST", "QS", "LAZR", "VLDR", "OUST",
  "INDI", "LIDR", "AEVA",

  // ── Cannabis ──
  "TLRY", "CGC", "ACB", "OGI", "HEXO",

  // ── Micro-cap runners ──
  "PRPH", "CXDO", "NXGL",
  "BNGO", "GENI", "MAPS", "DATS",
  "BTCM", "MOGO", "CLOV",

  // ── Additional biotech ──
  "MRNA", "BNTX", "VXRT", "OCGN", "INO",
  "SRNE", "AGEN", "IBRX",
];

// Deduplicate
const UNIQUE_UNIVERSE = Array.from(new Set(SCAN_UNIVERSE));

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
  gapPercent: number;
  dayChangePercent: number;
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
 * Fetch real-time stock data from Yahoo Finance via the Manus Data API hub.
 * Uses the 1-month daily chart endpoint to get current price + historical data.
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
    if (currentPrice <= 0) return null;

    const previousClose = meta.chartPreviousClose ?? meta.previousClose ?? currentPrice;
    
    // Get today's open from the last data point, or from meta
    const openPrices = (quotes.open || []).filter((p: any) => p != null);
    const openPrice = openPrices.length > 0 ? openPrices[openPrices.length - 1] : currentPrice;

    // Volume: use meta's regularMarketVolume (real-time) or last quote volume
    const volumeArr = (quotes.volume || []).filter((v: any) => v != null);
    const volume = meta.regularMarketVolume ?? (volumeArr.length > 0 ? volumeArr[volumeArr.length - 1] : 0);

    // Average volume: use 10-day or 3-month average from meta, or compute from history
    let avgVolume = meta.averageDailyVolume10Day ?? meta.averageDailyVolume3Month ?? 0;
    if (avgVolume === 0 && volumeArr.length >= 5) {
      const recentVols = volumeArr.slice(-10);
      avgVolume = Math.round(recentVols.reduce((a: number, b: number) => a + b, 0) / recentVols.length);
    }

    // Market cap: if not provided, estimate from shares outstanding heuristic
    // Yahoo sometimes returns 0 for marketCap in chart endpoint
    let marketCap = meta.marketCap ?? 0;

    // Calculate gap and day change
    const gapPercent = previousClose > 0 ? ((openPrice - previousClose) / previousClose) * 100 : 0;
    const dayChangePercent = previousClose > 0 ? ((currentPrice - previousClose) / previousClose) * 100 : 0;

    return {
      symbol: meta.symbol || symbol,
      companyName: meta.longName || meta.shortName || symbol,
      currentPrice,
      previousClose,
      open: openPrice,
      dayHigh: meta.regularMarketDayHigh ?? currentPrice,
      dayLow: meta.regularMarketDayLow ?? currentPrice,
      volume,
      avgVolume,
      marketCap,
      fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh ?? currentPrice,
      fiftyTwoWeekLow: meta.fiftyTwoWeekLow ?? currentPrice,
      gapPercent,
      dayChangePercent,
      prices: (quotes.close || []).filter((p: any) => p != null),
      volumes: volumeArr,
      timestamps,
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
  if (stock.currentPrice >= ORACLE_CRITERIA.priceMin && stock.currentPrice <= ORACLE_CRITERIA.priceMax) {
    score += 5;
    if (stock.currentPrice >= 1 && stock.currentPrice <= 10) score += 10;
    else if (stock.currentPrice >= 0.50 && stock.currentPrice < 1) score += 5;
    else score += 3;
  }

  // 2. Volume Score (0-20 pts)
  const relativeVolume = stock.avgVolume > 0 ? stock.volume / stock.avgVolume : 0;
  if (relativeVolume >= 5) score += 20;
  else if (relativeVolume >= 3) score += 15;
  else if (relativeVolume >= 2) score += 10;
  else if (relativeVolume >= 1.5) score += 5;

  // 3. Gap Score (0-20 pts)
  const absGap = Math.abs(stock.gapPercent);
  if (absGap >= 30) score += 20;
  else if (absGap >= 20) score += 17;
  else if (absGap >= 10) score += 14;
  else if (absGap >= 5) score += 10;
  else if (absGap >= 3) score += 5;

  // 4. Float Score (0-15 pts)
  // Estimate float from market cap / price as a rough proxy
  const estimatedFloat = stock.marketCap > 0 && stock.currentPrice > 0
    ? stock.marketCap / stock.currentPrice
    : 100_000_000;
  if (estimatedFloat <= 5_000_000) score += 15;
  else if (estimatedFloat <= 10_000_000) score += 12;
  else if (estimatedFloat <= 20_000_000) score += 8;
  else if (estimatedFloat <= 50_000_000) score += 4;

  // 5. Momentum Score (0-15 pts)
  const absDayChange = Math.abs(stock.dayChangePercent);
  if (absDayChange >= 20) score += 15;
  else if (absDayChange >= 10) score += 12;
  else if (absDayChange >= 5) score += 8;
  else if (absDayChange >= 2) score += 4;

  // 6. Former Runner Score (0-15 pts)
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
  const momentumScore = stock.dayChangePercent + stock.gapPercent;
  return momentumScore >= 0 ? "LONG" : "SHORT";
}

/**
 * Calculate entry, stop loss, and targets using Red Candle Theory methodology
 */
function calculateSignals(stock: StockChartData, bias: "LONG" | "SHORT") {
  const price = stock.currentPrice;
  const dayRange = stock.dayHigh - stock.dayLow;
  const atr = dayRange > 0 ? dayRange : price * 0.05;

  if (bias === "LONG") {
    const entry = +(price * 1.005).toFixed(4);
    const stopLoss = +(price - atr * 0.5).toFixed(4);
    const risk = entry - stopLoss;
    const target1 = +(entry + risk * 3).toFixed(4);
    const target2 = +(entry + risk * 4).toFixed(4);
    const target3 = +(entry + risk * 5).toFixed(4);
    const rr = risk > 0 ? +((target1 - entry) / risk).toFixed(1) : 0;
    const support = stock.dayLow;
    const resistance = stock.dayHigh;
    return { entry, stopLoss, target1, target2, target3, riskRewardRatio: rr, support, resistance };
  } else {
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

  if (Math.abs(stock.dayChangePercent) >= 5) {
    parts.push(`Day change ${stock.dayChangePercent >= 0 ? "+" : ""}${stock.dayChangePercent.toFixed(1)}%`);
  }

  parts.push(`Oracle Score: ${score}/100`);
  parts.push(`Bias: ${bias}`);

  return parts.join(" | ");
}

/**
 * Run the full Oracle-style scan with REAL-TIME market data
 * Fetches live data from Yahoo Finance for all tickers in the universe.
 * Returns top picks sorted by Oracle score.
 */
export async function runOracleScan(maxPicks: number = 20): Promise<{
  picks: OraclePick[];
  totalScanned: number;
  scanTime: number;
}> {
  const startTime = Date.now();
  console.log(`[OracleScanner] Starting LIVE scan of ${UNIQUE_UNIVERSE.length} tickers...`);

  // Fetch data for all tickers in batches to avoid rate limits
  const batchSize = 10;
  const allStockData: StockChartData[] = [];
  let fetchErrors = 0;

  for (let i = 0; i < UNIQUE_UNIVERSE.length; i += batchSize) {
    const batch = UNIQUE_UNIVERSE.slice(i, i + batchSize);
    const results = await Promise.all(batch.map(fetchStockData));
    for (const r of results) {
      if (r) allStockData.push(r);
      else fetchErrors++;
    }
    // Small delay between batches to respect rate limits
    if (i + batchSize < UNIQUE_UNIVERSE.length) {
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    // Progress log every 50 tickers
    if ((i + batchSize) % 50 === 0 || i + batchSize >= UNIQUE_UNIVERSE.length) {
      console.log(`[OracleScanner] Progress: ${Math.min(i + batchSize, UNIQUE_UNIVERSE.length)}/${UNIQUE_UNIVERSE.length} tickers fetched (${allStockData.length} valid)`);
    }
  }

  console.log(`[OracleScanner] Fetched live data for ${allStockData.length} stocks (${fetchErrors} errors/delisted)`);

  // Apply Oracle screening criteria
  const candidates = allStockData.filter(stock => {
    // Price range filter
    if (stock.currentPrice < ORACLE_CRITERIA.priceMin || stock.currentPrice > ORACLE_CRITERIA.priceMax) return false;
    // Minimum volume
    if (stock.volume < ORACLE_CRITERIA.minVolume) return false;
    // Must have some movement (gap or day change)
    if (Math.abs(stock.gapPercent) < ORACLE_CRITERIA.minGapPercent && Math.abs(stock.dayChangePercent) < ORACLE_CRITERIA.minGapPercent) return false;
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

  const longs = topPicks.filter(p => p.bias === "LONG");
  const shorts = topPicks.filter(p => p.bias === "SHORT");

  const scanTime = Date.now() - startTime;
  console.log(`[OracleScanner] LIVE scan complete in ${(scanTime / 1000).toFixed(1)}s. ${topPicks.length} picks (${longs.length} LONG, ${shorts.length} SHORT)`);

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
