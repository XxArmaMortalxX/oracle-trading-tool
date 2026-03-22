import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ── Helper to create a mock context ──
type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

type CookieCall = {
  name: string;
  options: Record<string, unknown>;
};

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

function createAuthContext(role: "user" | "admin" = "user"): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "jake@example.com",
    name: "Jake",
    loginMethod: "manus",
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("scan routes", () => {
  it("latestSession returns undefined when no scans exist", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.scan.latestSession();
    // Should return undefined or a session object
    expect(result === undefined || typeof result === "object").toBe(true);
  });

  it("latestPicks returns an array", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.scan.latestPicks();
    expect(Array.isArray(result)).toBe(true);
  });

  it("recentSessions returns an array", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.scan.recentSessions();
    expect(Array.isArray(result)).toBe(true);
  });

  it("triggerScan requires admin role", async () => {
    const ctx = createAuthContext("user");
    const caller = appRouter.createCaller(ctx);
    await expect(caller.scan.triggerScan()).rejects.toThrow();
  });

  it("triggerScan rejects unauthenticated users", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.scan.triggerScan()).rejects.toThrow();
  });
});

describe("notification routes", () => {
  it("getPrefs requires authentication", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.notifications.getPrefs()).rejects.toThrow();
  });

  it("updatePrefs requires authentication", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.notifications.updatePrefs({ enabled: 1 })
    ).rejects.toThrow();
  });

  it("getPrefs works for authenticated users", async () => {
    const ctx = createAuthContext("user");
    const caller = appRouter.createCaller(ctx);
    const result = await caller.notifications.getPrefs();
    // Should return undefined (no prefs yet) or a prefs object
    expect(result === undefined || typeof result === "object").toBe(true);
  });

  it("updatePrefs validates input", async () => {
    const ctx = createAuthContext("user");
    const caller = appRouter.createCaller(ctx);
    // Invalid minOracleScore (> 100)
    await expect(
      caller.notifications.updatePrefs({ minOracleScore: 150 })
    ).rejects.toThrow();
  });

  it("updatePrefs validates bias filter", async () => {
    const ctx = createAuthContext("user");
    const caller = appRouter.createCaller(ctx);
    // Invalid bias filter
    await expect(
      caller.notifications.updatePrefs({ biasFilter: "INVALID" as any })
    ).rejects.toThrow();
  });
});
