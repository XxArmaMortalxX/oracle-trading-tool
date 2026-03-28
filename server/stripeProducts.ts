/**
 * Stripe Product & Price configuration for Axiarch Trading Algorithm
 * Centralized product definitions for consistency across checkout and billing.
 */

export const AXIARCH_PRO = {
  name: "Axiarch Pro",
  description: "Full access to the Axiarch Trading Algorithm — live screener, sentiment analysis, Reddit radar, and daily picks.",
  priceAmount: 2999, // $29.99 in cents
  currency: "usd",
  interval: "month" as const,
  features: [
    "Real-time stock screener with Axiarch scoring",
    "Reddit Social Radar with crowd sentiment",
    "Sentiment shift alerts (bearish → bullish detection)",
    "Red Candle Theory calculator",
    "Daily pre-market picks with notifications",
    "7-Step Pennystocking Framework reference",
  ],
};
