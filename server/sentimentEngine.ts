/**
 * Technical Sentiment Engine
 * 
 * Derives market sentiment from price action data already fetched from Yahoo Finance.
 * No additional API calls required — sentiment is computed from:
 *   1. Price momentum (multi-day trend)
 *   2. Volume conviction (relative volume)
 *   3. Gap sentiment (pre-market gap direction + magnitude)
 *   4. 52-week position (where price sits in annual range)
 *   5. Intraday strength (close relative to day's range)
 * 
 * Output: sentiment score (-100 to +100) and label (Strong Bullish → Strong Bearish)
 */

import type { StockChartData } from "./oracleScanner";

export type SentimentLabel = "Strong Bullish" | "Bullish" | "Neutral" | "Bearish" | "Strong Bearish";

export interface SentimentResult {
  /** Overall sentiment score from -100 (extremely bearish) to +100 (extremely bullish) */
  score: number;
  /** Human-readable sentiment label */
  label: SentimentLabel;
  /** Individual component scores for transparency */
  components: {
    momentum: number;      // -25 to +25
    volumeConviction: number; // -20 to +20
    gapSentiment: number;  // -20 to +20
    weekPosition: number;  // -15 to +15
    intradayStrength: number; // -20 to +20
  };
}

/**
 * Compute the momentum component from multi-day price trend.
 * Uses the historical close prices array to determine trend direction and strength.
 * Range: -25 to +25
 */
function computeMomentum(prices: number[]): number {
  if (prices.length < 3) return 0;

  // Use last 5 days (or fewer if not available)
  const recent = prices.slice(-5);
  if (recent.length < 2) return 0;

  const first = recent[0];
  const last = recent[recent.length - 1];
  if (first <= 0) return 0;

  // Percentage change over the period
  const pctChange = ((last - first) / first) * 100;

  // Count up days vs down days for trend consistency
  let upDays = 0;
  let downDays = 0;
  for (let i = 1; i < recent.length; i++) {
    if (recent[i] > recent[i - 1]) upDays++;
    else if (recent[i] < recent[i - 1]) downDays++;
  }
  const totalDays = upDays + downDays;
  const trendConsistency = totalDays > 0 ? Math.abs(upDays - downDays) / totalDays : 0;

  // Base score from percentage change (capped at ±20%)
  let score = Math.max(-25, Math.min(25, pctChange * 1.25));

  // Boost/dampen by trend consistency (consistent trends get full score, choppy trends get reduced)
  const consistencyMultiplier = 0.5 + (trendConsistency * 0.5);
  score *= consistencyMultiplier;

  return Math.round(Math.max(-25, Math.min(25, score)));
}

/**
 * Compute volume conviction component.
 * High relative volume in the direction of the move = strong conviction.
 * Range: -20 to +20
 */
function computeVolumeConviction(stock: StockChartData): number {
  if (stock.avgVolume <= 0) return 0;

  const relativeVolume = stock.volume / stock.avgVolume;
  const direction = stock.dayChangePercent >= 0 ? 1 : -1;

  // Volume multiplier: 1x = neutral, 2x+ = significant, 5x+ = extreme
  let magnitude: number;
  if (relativeVolume >= 5) magnitude = 20;
  else if (relativeVolume >= 3) magnitude = 15;
  else if (relativeVolume >= 2) magnitude = 10;
  else if (relativeVolume >= 1.5) magnitude = 6;
  else if (relativeVolume >= 1) magnitude = 2;
  else if (relativeVolume >= 0.5) magnitude = -3;
  else magnitude = -8; // Very low volume = bearish signal (lack of interest)

  // Low volume with price drop is more bearish; low volume with price rise is less bullish
  if (relativeVolume < 1 && direction > 0) {
    // Rising on low volume — weak conviction, slightly bearish
    return Math.round(magnitude * -0.5);
  }

  return Math.round(magnitude * direction);
}

/**
 * Compute gap sentiment component.
 * Pre-market gaps indicate overnight sentiment from news/catalysts.
 * Range: -20 to +20
 */
function computeGapSentiment(stock: StockChartData): number {
  const gap = stock.gapPercent;

  if (Math.abs(gap) < 0.5) return 0; // Negligible gap

  // Score scales with gap magnitude
  let score: number;
  const absGap = Math.abs(gap);

  if (absGap >= 20) score = 20;
  else if (absGap >= 10) score = 16;
  else if (absGap >= 5) score = 12;
  else if (absGap >= 3) score = 8;
  else if (absGap >= 1) score = 4;
  else score = 2;

  // Check if gap is being filled (price moving opposite to gap direction)
  const gapDirection = gap > 0 ? 1 : -1;
  const priceDirection = stock.dayChangePercent >= 0 ? 1 : -1;

  if (gapDirection !== priceDirection) {
    // Gap fill in progress — reduces gap sentiment by half
    score *= 0.5;
  }

  return Math.round(score * (gap > 0 ? 1 : -1));
}

/**
 * Compute 52-week position component.
 * Stocks near 52-week highs tend to be bullish; near lows tend to be bearish.
 * Range: -15 to +15
 */
function computeWeekPosition(stock: StockChartData): number {
  const { currentPrice, fiftyTwoWeekHigh, fiftyTwoWeekLow } = stock;

  if (fiftyTwoWeekHigh <= fiftyTwoWeekLow || fiftyTwoWeekLow <= 0) return 0;

  const range = fiftyTwoWeekHigh - fiftyTwoWeekLow;
  const position = (currentPrice - fiftyTwoWeekLow) / range; // 0 = at low, 1 = at high

  // Map position to score: near high = bullish, near low = bearish
  // Use a curve that's more extreme at the edges
  if (position >= 0.9) return 15;
  if (position >= 0.75) return 10;
  if (position >= 0.6) return 5;
  if (position >= 0.4) return 0;
  if (position >= 0.25) return -5;
  if (position >= 0.1) return -10;
  return -15;
}

/**
 * Compute intraday strength component.
 * Where the current price sits relative to the day's high-low range.
 * Closing near the high = bullish; closing near the low = bearish.
 * Range: -20 to +20
 */
function computeIntradayStrength(stock: StockChartData): number {
  const { currentPrice, dayHigh, dayLow } = stock;

  if (dayHigh <= dayLow) return 0;

  const range = dayHigh - dayLow;
  const position = (currentPrice - dayLow) / range; // 0 = at low, 1 = at high

  // Map to score with emphasis on extremes
  if (position >= 0.9) return 20;
  if (position >= 0.75) return 14;
  if (position >= 0.6) return 8;
  if (position >= 0.4) return 0;
  if (position >= 0.25) return -8;
  if (position >= 0.1) return -14;
  return -20;
}

/**
 * Map a sentiment score to a human-readable label.
 */
function scoreToLabel(score: number): SentimentLabel {
  if (score >= 40) return "Strong Bullish";
  if (score >= 15) return "Bullish";
  if (score > -15) return "Neutral";
  if (score > -40) return "Bearish";
  return "Strong Bearish";
}

/**
 * Compute the full sentiment analysis for a stock.
 * Uses only data already available from the Yahoo Finance chart endpoint.
 */
export function computeSentiment(stock: StockChartData): SentimentResult {
  const momentum = computeMomentum(stock.prices);
  const volumeConviction = computeVolumeConviction(stock);
  const gapSentiment = computeGapSentiment(stock);
  const weekPosition = computeWeekPosition(stock);
  const intradayStrength = computeIntradayStrength(stock);

  const rawScore = momentum + volumeConviction + gapSentiment + weekPosition + intradayStrength;
  const score = Math.max(-100, Math.min(100, rawScore));

  return {
    score,
    label: scoreToLabel(score),
    components: {
      momentum,
      volumeConviction,
      gapSentiment,
      weekPosition,
      intradayStrength,
    },
  };
}
