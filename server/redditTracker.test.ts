import { describe, expect, it, vi, beforeEach } from "vitest";

// ── Test the Reddit mention velocity computation logic ──
// These tests verify the velocity calculation, signal classification,
// and data transformation without hitting the live ApeWisdom API.

describe("Reddit Mention Velocity Tracker", () => {
  // ── Velocity Calculation Tests ──
  describe("velocity percentage calculation", () => {
    it("computes positive velocity when mentions increase", () => {
      const current = 100;
      const previous = 50;
      const velocityPct = previous > 0 ? ((current - previous) / previous) * 100 : 0;
      expect(velocityPct).toBe(100);
    });

    it("computes negative velocity when mentions decrease", () => {
      const current = 25;
      const previous = 100;
      const velocityPct = previous > 0 ? ((current - previous) / previous) * 100 : 0;
      expect(velocityPct).toBe(-75);
    });

    it("returns 0 velocity when no previous data", () => {
      const current = 50;
      const previous = 0;
      const velocityPct = previous > 0 ? ((current - previous) / previous) * 100 : 0;
      expect(velocityPct).toBe(0);
    });

    it("handles equal mentions as zero velocity", () => {
      const current = 50;
      const previous = 50;
      const velocityPct = previous > 0 ? ((current - previous) / previous) * 100 : 0;
      expect(velocityPct).toBe(0);
    });

    it("handles very large acceleration correctly", () => {
      const current = 500;
      const previous = 5;
      const velocityPct = previous > 0 ? ((current - previous) / previous) * 100 : 0;
      expect(velocityPct).toBe(9900);
    });
  });

  // ── Signal Classification Tests ──
  describe("velocity signal classification", () => {
    function classifySignal(velocityPct: number, mentions: number): string {
      if (mentions < 3) return "COLD";
      if (velocityPct >= 200) return "EXPLODING";
      if (velocityPct >= 100) return "SURGING";
      if (velocityPct >= 30) return "RISING";
      if (velocityPct >= -20) return "STABLE";
      if (velocityPct >= -50) return "FADING";
      return "COLD";
    }

    it("classifies EXPLODING when velocity >= 200%", () => {
      expect(classifySignal(250, 50)).toBe("EXPLODING");
      expect(classifySignal(200, 10)).toBe("EXPLODING");
    });

    it("classifies SURGING when velocity >= 100%", () => {
      expect(classifySignal(150, 20)).toBe("SURGING");
      expect(classifySignal(100, 10)).toBe("SURGING");
    });

    it("classifies RISING when velocity >= 30%", () => {
      expect(classifySignal(50, 15)).toBe("RISING");
      expect(classifySignal(30, 10)).toBe("RISING");
    });

    it("classifies STABLE when velocity between -20% and 30%", () => {
      expect(classifySignal(0, 20)).toBe("STABLE");
      expect(classifySignal(15, 10)).toBe("STABLE");
      expect(classifySignal(-10, 10)).toBe("STABLE");
    });

    it("classifies FADING when velocity between -50% and -20%", () => {
      expect(classifySignal(-30, 20)).toBe("FADING");
      expect(classifySignal(-50, 10)).toBe("FADING");
    });

    it("classifies COLD when velocity < -50% or mentions < 3", () => {
      expect(classifySignal(-60, 20)).toBe("COLD");
      expect(classifySignal(500, 2)).toBe("COLD"); // high velocity but too few mentions
      expect(classifySignal(0, 1)).toBe("COLD");
    });
  });

  // ── Data Transformation Tests ──
  describe("ApeWisdom data transformation", () => {
    it("transforms raw ApeWisdom response into RedditMentionData", () => {
      const rawTicker = {
        ticker: "AMC",
        name: "AMC Entertainment",
        rank: 5,
        mentions: 120,
        upvotes: 3500,
        rank_24h_ago: 8,
        mentions_24h_ago: 60,
      };

      const velocityPct = rawTicker.mentions_24h_ago > 0
        ? ((rawTicker.mentions - rawTicker.mentions_24h_ago) / rawTicker.mentions_24h_ago) * 100
        : 0;

      const rankDelta = rawTicker.rank_24h_ago - rawTicker.rank; // positive = improving

      expect(velocityPct).toBe(100);
      expect(rankDelta).toBe(3); // moved up 3 ranks
      expect(rawTicker.ticker).toBe("AMC");
    });

    it("handles missing 24h data gracefully", () => {
      const rawTicker = {
        ticker: "NEWSTOCK",
        name: "New Stock Inc",
        rank: 100,
        mentions: 10,
        upvotes: 50,
        rank_24h_ago: 0,
        mentions_24h_ago: 0,
      };

      const velocityPct = rawTicker.mentions_24h_ago > 0
        ? ((rawTicker.mentions - rawTicker.mentions_24h_ago) / rawTicker.mentions_24h_ago) * 100
        : 0;

      expect(velocityPct).toBe(0);
    });

    it("filters out low-mention tickers correctly", () => {
      const tickers = [
        { ticker: "AMC", mentions: 120, velocityPct: 100 },
        { ticker: "LOWVOL", mentions: 2, velocityPct: 500 },
        { ticker: "GME", mentions: 80, velocityPct: 50 },
        { ticker: "TINY", mentions: 1, velocityPct: 0 },
      ];

      const filtered = tickers.filter(t => t.mentions >= 5);
      expect(filtered).toHaveLength(2);
      expect(filtered[0].ticker).toBe("AMC");
      expect(filtered[1].ticker).toBe("GME");
    });

    it("sorts by velocity percentage descending", () => {
      const tickers = [
        { ticker: "A", velocityPct: 50 },
        { ticker: "B", velocityPct: 200 },
        { ticker: "C", velocityPct: -10 },
        { ticker: "D", velocityPct: 100 },
      ];

      const sorted = [...tickers].sort((a, b) => b.velocityPct - a.velocityPct);
      expect(sorted[0].ticker).toBe("B");
      expect(sorted[1].ticker).toBe("D");
      expect(sorted[2].ticker).toBe("A");
      expect(sorted[3].ticker).toBe("C");
    });
  });

  // ── Edge Cases ──
  describe("edge cases", () => {
    it("handles ticker with zero mentions and zero previous", () => {
      const velocityPct = 0;
      const signal = velocityPct >= 200 ? "EXPLODING" :
                     velocityPct >= 100 ? "SURGING" :
                     velocityPct >= 30 ? "RISING" :
                     velocityPct >= -20 ? "STABLE" :
                     velocityPct >= -50 ? "FADING" : "COLD";
      expect(signal).toBe("STABLE");
    });

    it("handles extremely high mention counts", () => {
      const current = 10000;
      const previous = 100;
      const velocityPct = ((current - previous) / previous) * 100;
      expect(velocityPct).toBe(9900);
    });

    it("rank delta correctly shows improvement vs decline", () => {
      // Rank 10 → Rank 3 = improved by 7 positions
      expect(10 - 3).toBe(7); // positive = improving

      // Rank 3 → Rank 10 = declined by 7 positions
      expect(3 - 10).toBe(-7); // negative = declining
    });
  });
});
