import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, adminProcedure, router } from "./_core/trpc";
import { z } from "zod";
import {
  getLatestScanSession,
  getRecentScanSessions,
  getPicksBySessionId,
  getLatestPicks,
  getNotificationPrefs,
  upsertNotificationPrefs,
} from "./scanDb";
import { executeScanRun } from "./scanRunner";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // ── Oracle Scanner Routes ──
  scan: router({
    /** Get the latest scan session info */
    latestSession: publicProcedure.query(async () => {
      return getLatestScanSession();
    }),

    /** Get recent scan sessions (last 7 days) */
    recentSessions: publicProcedure.query(async () => {
      return getRecentScanSessions(7);
    }),

    /** Get picks for a specific session */
    picksBySession: publicProcedure
      .input(z.object({ sessionId: z.number() }))
      .query(async ({ input }) => {
        return getPicksBySessionId(input.sessionId);
      }),

    /** Get the latest picks (most recent completed scan) */
    latestPicks: publicProcedure.query(async () => {
      return getLatestPicks();
    }),

    /** Manually trigger a scan (admin only) */
    triggerScan: adminProcedure.mutation(async () => {
      const result = await executeScanRun();
      return {
        sessionId: result.sessionId,
        picksCount: result.picks.length,
        notified: result.notified,
      };
    }),
  }),

  // ── Notification Preferences ──
  notifications: router({
    /** Get current user's notification preferences */
    getPrefs: protectedProcedure.query(async ({ ctx }) => {
      return getNotificationPrefs(ctx.user.id);
    }),

    /** Update notification preferences */
    updatePrefs: protectedProcedure
      .input(
        z.object({
          enabled: z.number().min(0).max(1).optional(),
          minOracleScore: z.number().min(0).max(100).optional(),
          biasFilter: z.enum(["ALL", "LONG", "SHORT"]).optional(),
          maxPicks: z.number().min(1).max(20).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await upsertNotificationPrefs(ctx.user.id, input);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
