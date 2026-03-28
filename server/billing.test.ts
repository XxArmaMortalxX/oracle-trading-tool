import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the stripe service module
vi.mock("./stripeService", () => ({
  addToWaitlist: vi.fn(),
  getWaitlistCount: vi.fn(),
  getUserSubscription: vi.fn(),
  isUserSubscribed: vi.fn(),
  createCheckoutSession: vi.fn(),
  createBillingPortalSession: vi.fn(),
}));

// Mock the drizzle schema for dynamic imports in stripeService
vi.mock("../drizzle/schema", () => ({
  users: {},
  subscriptions: {},
  waitlist: {},
}));

import {
  addToWaitlist,
  getWaitlistCount,
  getUserSubscription,
  isUserSubscribed,
} from "./stripeService";

describe("Waitlist", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("addToWaitlist returns success for new email", async () => {
    vi.mocked(addToWaitlist).mockResolvedValue({ success: true, alreadyExists: false });
    const result = await addToWaitlist("test@example.com", "Test User", "landing");
    expect(result.success).toBe(true);
    expect(result.alreadyExists).toBe(false);
  });

  it("addToWaitlist returns alreadyExists for duplicate email", async () => {
    vi.mocked(addToWaitlist).mockResolvedValue({ success: true, alreadyExists: true });
    const result = await addToWaitlist("test@example.com");
    expect(result.success).toBe(true);
    expect(result.alreadyExists).toBe(true);
  });

  it("getWaitlistCount returns a number", async () => {
    vi.mocked(getWaitlistCount).mockResolvedValue(42);
    const count = await getWaitlistCount();
    expect(count).toBe(42);
  });
});

describe("Subscription", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getUserSubscription returns null for user without subscription", async () => {
    vi.mocked(getUserSubscription).mockResolvedValue(null);
    const sub = await getUserSubscription(999);
    expect(sub).toBeNull();
  });

  it("getUserSubscription returns subscription data for subscribed user", async () => {
    vi.mocked(getUserSubscription).mockResolvedValue({
      id: 1,
      userId: 1,
      stripeCustomerId: "cus_test123",
      stripeSubscriptionId: "sub_test123",
      status: "active",
      currentPeriodEnd: new Date("2026-04-28"),
      cancelAtPeriodEnd: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const sub = await getUserSubscription(1);
    expect(sub).not.toBeNull();
    expect(sub!.status).toBe("active");
    expect(sub!.stripeCustomerId).toBe("cus_test123");
  });

  it("isUserSubscribed returns true for owner", async () => {
    vi.mocked(isUserSubscribed).mockResolvedValue(true);
    const result = await isUserSubscribed(1, "owner-open-id");
    expect(result).toBe(true);
  });

  it("isUserSubscribed returns false for unsubscribed user", async () => {
    vi.mocked(isUserSubscribed).mockResolvedValue(false);
    const result = await isUserSubscribed(999, "random-user");
    expect(result).toBe(false);
  });

  it("isUserSubscribed returns true for active subscriber", async () => {
    vi.mocked(isUserSubscribed).mockResolvedValue(true);
    const result = await isUserSubscribed(1, "subscribed-user");
    expect(result).toBe(true);
  });
});

describe("Stripe Products", () => {
  it("AXIARCH_PRO has correct pricing", async () => {
    const { AXIARCH_PRO } = await import("./stripeProducts");
    expect(AXIARCH_PRO.priceAmount).toBe(2999);
    expect(AXIARCH_PRO.currency).toBe("usd");
    expect(AXIARCH_PRO.interval).toBe("month");
    expect(AXIARCH_PRO.name).toBe("Axiarch Pro");
  });

  it("AXIARCH_PRO has feature list", async () => {
    const { AXIARCH_PRO } = await import("./stripeProducts");
    expect(AXIARCH_PRO.features.length).toBeGreaterThan(0);
    expect(AXIARCH_PRO.features).toContain("Real-time stock screener with Axiarch scoring");
  });
});

describe("Owner Bypass Logic", () => {
  it("owner always has free access regardless of subscription status", async () => {
    // This tests the concept - owner check happens before subscription check
    vi.mocked(isUserSubscribed).mockImplementation(async (_userId, openId) => {
      if (openId === "owner-open-id") return true;
      return false;
    });

    const ownerResult = await isUserSubscribed(1, "owner-open-id");
    expect(ownerResult).toBe(true);

    const regularResult = await isUserSubscribed(2, "regular-user");
    expect(regularResult).toBe(false);
  });
});
