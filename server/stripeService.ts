/**
 * Stripe service layer for Axiarch subscription management.
 * Handles checkout sessions, webhook processing, and subscription queries.
 */
import Stripe from "stripe";
import { eq, and } from "drizzle-orm";
import { getDb } from "./db";
import { subscriptions, users } from "../drizzle/schema";
import { AXIARCH_PRO } from "./stripeProducts";
import { ENV } from "./_core/env";

// Lazy-init Stripe client
let _stripe: Stripe | null = null;
function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY not configured");
    _stripe = new Stripe(key, { apiVersion: "2025-03-31.basil" as any });
  }
  return _stripe;
}

// ── Checkout ──

export async function createCheckoutSession(opts: {
  userId: number;
  userEmail?: string | null;
  userName?: string | null;
  origin: string;
}): Promise<string> {
  const stripe = getStripe();

  // Find or create Stripe customer
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, opts.userId))
    .limit(1);

  let customerId = existing[0]?.stripeCustomerId;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: opts.userEmail ?? undefined,
      name: opts.userName ?? undefined,
      metadata: { user_id: opts.userId.toString() },
    });
    customerId = customer.id;

    // Create subscription record
    await db.insert(subscriptions).values({
      userId: opts.userId,
      stripeCustomerId: customerId,
      status: "inactive",
    });
  }

  // Create a price on-the-fly (or use a cached one)
  const prices = await stripe.prices.list({
    lookup_keys: ["axiarch_pro_monthly"],
    active: true,
    limit: 1,
  });

  let priceId: string;
  if (prices.data.length > 0) {
    priceId = prices.data[0].id;
  } else {
    // Create product + price
    const product = await stripe.products.create({
      name: AXIARCH_PRO.name,
      description: AXIARCH_PRO.description,
    });
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: AXIARCH_PRO.priceAmount,
      currency: AXIARCH_PRO.currency,
      recurring: { interval: AXIARCH_PRO.interval },
      lookup_key: "axiarch_pro_monthly",
    });
    priceId = price.id;
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${opts.origin}/dashboard?subscription=success`,
    cancel_url: `${opts.origin}/pricing?subscription=cancelled`,
    client_reference_id: opts.userId.toString(),
    allow_promotion_codes: true,
    metadata: {
      user_id: opts.userId.toString(),
      customer_email: opts.userEmail ?? "",
      customer_name: opts.userName ?? "",
    },
  });

  if (!session.url) throw new Error("Failed to create checkout session");
  return session.url;
}

// ── Webhook Processing ──

export function constructWebhookEvent(
  payload: Buffer,
  signature: string
): Stripe.Event {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET not configured");
  return stripe.webhooks.constructEvent(payload, signature, secret);
}

export async function handleWebhookEvent(event: Stripe.Event): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Stripe] Database not available, skipping webhook processing");
    return;
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode === "subscription" && session.subscription) {
        const subId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription.id;
        const customerId =
          typeof session.customer === "string"
            ? session.customer
            : session.customer?.id;

        if (customerId) {
          // Fetch the subscription to get period end
          const stripe = getStripe();
          const sub = await stripe.subscriptions.retrieve(subId) as any;

          await db
            .update(subscriptions)
            .set({
              stripeSubscriptionId: subId,
              status: "active",
              currentPeriodEnd: new Date((sub.current_period_end ?? Math.floor(Date.now() / 1000)) * 1000),
              cancelAtPeriodEnd: sub.cancel_at_period_end ? 1 : 0,
            })
            .where(eq(subscriptions.stripeCustomerId, customerId));

          console.log(`[Stripe] Subscription activated for customer ${customerId}`);
        }
      }
      break;
    }

    case "invoice.paid": {
      const invoice = event.data.object as any;
      const subId =
        typeof invoice.subscription === "string"
          ? invoice.subscription
          : invoice.subscription?.id;
      if (subId) {
        const stripe = getStripe();
        const sub = await stripe.subscriptions.retrieve(subId) as any;
        await db
          .update(subscriptions)
          .set({
            status: "active",
            currentPeriodEnd: new Date((sub.current_period_end ?? Math.floor(Date.now() / 1000)) * 1000),
          })
          .where(eq(subscriptions.stripeSubscriptionId, subId));
        console.log(`[Stripe] Invoice paid, subscription ${subId} renewed`);
      }
      break;
    }

    case "customer.subscription.updated": {
      const sub = event.data.object as any;
      await db
        .update(subscriptions)
        .set({
          status: sub.status === "active" ? "active" : sub.status === "past_due" ? "past_due" : "canceled",
          currentPeriodEnd: new Date((sub.current_period_end ?? Math.floor(Date.now() / 1000)) * 1000),
          cancelAtPeriodEnd: sub.cancel_at_period_end ? 1 : 0,
        })
        .where(eq(subscriptions.stripeSubscriptionId, sub.id));
      console.log(`[Stripe] Subscription ${sub.id} updated to ${sub.status}`);
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as any;
      await db
        .update(subscriptions)
        .set({
          status: "canceled",
          cancelAtPeriodEnd: 0,
        })
        .where(eq(subscriptions.stripeSubscriptionId, sub.id));
      console.log(`[Stripe] Subscription ${sub.id} canceled`);
      break;
    }

    default:
      console.log(`[Stripe] Unhandled event type: ${event.type}`);
  }
}

// ── Subscription Queries ──

export async function getUserSubscription(userId: number) {
  const db = await getDb();
  if (!db) return null;

  const rows = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);

  return rows[0] ?? null;
}

export async function isUserSubscribed(userId: number, userOpenId: string): Promise<boolean> {
  // Owner (admin) always has free access
  if (userOpenId === ENV.ownerOpenId) return true;

  const sub = await getUserSubscription(userId);
  if (!sub) return false;

  return sub.status === "active" || sub.status === "past_due";
}

// ── Billing Portal ──

export async function createBillingPortalSession(
  stripeCustomerId: string,
  returnUrl: string
): Promise<string> {
  const stripe = getStripe();
  const session = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: returnUrl,
  });
  return session.url;
}

// ── Waitlist ──

export async function addToWaitlist(email: string, name?: string, source?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    await db.insert((await import("../drizzle/schema")).waitlist).values({
      email,
      name: name ?? null,
      source: source ?? "landing",
    });
    return { success: true, alreadyExists: false };
  } catch (err: any) {
    // Duplicate email
    if (err?.code === "ER_DUP_ENTRY" || err?.message?.includes("Duplicate")) {
      return { success: true, alreadyExists: true };
    }
    throw err;
  }
}

export async function getWaitlistCount(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const { waitlist } = await import("../drizzle/schema");
  const rows = await db.select().from(waitlist);
  return rows.length;
}
