import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("Free Access Period", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("FREE_ACCESS_UNTIL is set to April 28, 2026", async () => {
    const { FREE_ACCESS_UNTIL } = await import("../shared/const");
    expect(FREE_ACCESS_UNTIL).toBeInstanceOf(Date);
    expect(FREE_ACCESS_UNTIL.toISOString()).toBe("2026-04-28T23:59:59.000Z");
  });

  it("isFreeAccessPeriod returns true before the deadline", async () => {
    vi.setSystemTime(new Date("2026-04-01T12:00:00Z"));
    const { isFreeAccessPeriod } = await import("../shared/const");
    expect(isFreeAccessPeriod()).toBe(true);
  });

  it("isFreeAccessPeriod returns true on the last day", async () => {
    vi.setSystemTime(new Date("2026-04-28T23:00:00Z"));
    const { isFreeAccessPeriod } = await import("../shared/const");
    expect(isFreeAccessPeriod()).toBe(true);
  });

  it("isFreeAccessPeriod returns false after the deadline", async () => {
    vi.setSystemTime(new Date("2026-04-29T00:00:00Z"));
    const { isFreeAccessPeriod } = await import("../shared/const");
    expect(isFreeAccessPeriod()).toBe(false);
  });

  it("isFreeAccessPeriod returns false well after the deadline", async () => {
    vi.setSystemTime(new Date("2026-06-01T00:00:00Z"));
    const { isFreeAccessPeriod } = await import("../shared/const");
    expect(isFreeAccessPeriod()).toBe(false);
  });
});

describe("Billing status includes free access info", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("during free period, billing status should report isFreeAccess=true and isSubscribed=true", async () => {
    // Simulate the billing status logic during free period
    vi.setSystemTime(new Date("2026-04-01T12:00:00Z"));
    const { isFreeAccessPeriod, FREE_ACCESS_UNTIL } = await import("../shared/const");

    const freeAccess = isFreeAccessPeriod();
    const isUserSubscribed = false; // user has no paid subscription
    const isOwner = false;

    const billingResponse = {
      isSubscribed: isUserSubscribed || freeAccess,
      isOwner,
      isFreeAccess: freeAccess,
      freeAccessUntil: FREE_ACCESS_UNTIL.toISOString(),
      status: isOwner ? "active" : freeAccess ? "free_access" : "inactive",
    };

    expect(billingResponse.isSubscribed).toBe(true);
    expect(billingResponse.isFreeAccess).toBe(true);
    expect(billingResponse.status).toBe("free_access");
    expect(billingResponse.freeAccessUntil).toBe("2026-04-28T23:59:59.000Z");
  });

  it("after free period, unsubscribed user gets isSubscribed=false", async () => {
    vi.setSystemTime(new Date("2026-05-01T12:00:00Z"));
    const { isFreeAccessPeriod, FREE_ACCESS_UNTIL } = await import("../shared/const");

    const freeAccess = isFreeAccessPeriod();
    const isUserSubscribed = false;
    const isOwner = false;

    const billingResponse = {
      isSubscribed: isUserSubscribed || freeAccess,
      isOwner,
      isFreeAccess: freeAccess,
      freeAccessUntil: FREE_ACCESS_UNTIL.toISOString(),
      status: isOwner ? "active" : freeAccess ? "free_access" : "inactive",
    };

    expect(billingResponse.isSubscribed).toBe(false);
    expect(billingResponse.isFreeAccess).toBe(false);
    expect(billingResponse.status).toBe("inactive");
  });
});
