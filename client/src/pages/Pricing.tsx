/*
 * Pricing Page — Axiarch Pro subscription checkout
 * During free access period, shows a banner + directs users to tools
 */
import { motion } from "framer-motion";
import { Check, ArrowRight, Lock, CreditCard, Shield, Gift } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";
import { useSearch } from "wouter";
import { Link } from "wouter";
import { isFreeAccessPeriod, FREE_ACCESS_UNTIL } from "../../../shared/const";
import { useState, useEffect } from "react";

const proFeatures = [
  "Real-time stock screener with Axiarch scoring",
  "Reddit Social Radar with crowd sentiment",
  "Sentiment shift alerts (bearish to bullish)",
  "Red Candle Theory calculator",
  "Daily pre-market picks with notifications",
  "7-Step Pennystocking Framework",
  "Full methodology deep-dive",
  "Priority access to new features",
];

function FreeCountdown() {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    function update() {
      const now = new Date();
      const diff = FREE_ACCESS_UNTIL.getTime() - now.getTime();
      if (diff <= 0) {
        setTimeLeft("Expired");
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      setTimeLeft(`${days}d ${hours}h ${mins}m`);
    }
    update();
    const interval = setInterval(update, 60_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center justify-center gap-3 text-sm">
      <span className="text-muted-foreground">Free access ends in</span>
      <span className="font-mono font-bold text-emerald text-lg">{timeLeft}</span>
    </div>
  );
}

export default function Pricing() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const cancelled = params.get("subscription") === "cancelled";
  const freeAccess = isFreeAccessPeriod();

  const billingStatus = trpc.billing.status.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const createCheckout = trpc.billing.createCheckout.useMutation({
    onSuccess: (data) => {
      toast.info("Redirecting to checkout...");
      window.open(data.url, "_blank");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to create checkout session.");
    },
  });

  const createPortal = trpc.billing.createPortal.useMutation({
    onSuccess: (data) => {
      toast.info("Redirecting to billing portal...");
      window.open(data.url, "_blank");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to open billing portal.");
    },
  });

  const handleSubscribe = () => {
    if (!isAuthenticated) {
      window.location.href = getLoginUrl("/pricing");
      return;
    }
    createCheckout.mutate({ origin: window.location.origin });
  };

  const handleManageBilling = () => {
    createPortal.mutate({ origin: window.location.origin });
  };

  const isSubscribed = billingStatus.data?.isSubscribed;
  const isOwner = billingStatus.data?.isOwner;

  return (
    <div className="container py-16">
      {cancelled && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md mx-auto mb-8 p-4 rounded-lg bg-amber/10 border border-amber/20 text-center"
        >
          <p className="text-sm text-amber">Checkout was cancelled. You can try again anytime.</p>
        </motion.div>
      )}

      {/* Free Access Banner */}
      {freeAccess && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-lg mx-auto mb-10 p-6 rounded-xl bg-gradient-to-br from-emerald/10 to-indigo/10 border border-emerald/30 text-center"
        >
          <Gift className="w-8 h-8 text-emerald mx-auto mb-3" />
          <h2 className="font-heading text-2xl font-bold mb-2">Everything is Free Right Now</h2>
          <p className="text-sm text-muted-foreground mb-4">
            All tools are unlocked for everyone until{" "}
            {FREE_ACCESS_UNTIL.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}.
            No signup. No credit card.
          </p>
          <FreeCountdown />
          <Link href="/screener">
            <Button size="lg" className="gap-2 bg-emerald hover:bg-emerald/90 text-white mt-5">
              Start Using Free
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-14"
      >
        <h1 className="font-heading text-4xl font-bold tracking-tight mb-3">
          {freeAccess ? "After the Free Period" : "Unlock the Full Algorithm"}
        </h1>
        <p className="text-muted-foreground max-w-xl mx-auto">
          {freeAccess
            ? "When the free access period ends, subscribe to keep using all tools."
            : "Get complete access to every tool, signal, and feature in the Axiarch Trading Algorithm."}
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="max-w-md mx-auto"
      >
        <Card className="border-indigo/40 bg-card relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo via-amber to-indigo" />
          <CardContent className="p-8">
            <div className="text-center mb-8">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo/10 border border-indigo/20 text-indigo text-xs font-mono font-medium tracking-wide mb-4">
                AXIARCH PRO
              </span>
              <div className="flex items-baseline justify-center gap-1 mb-2">
                <span className="font-heading text-5xl font-bold text-foreground">$29</span>
                <span className="font-heading text-2xl font-bold text-muted-foreground">.99</span>
                <span className="text-muted-foreground text-sm ml-1">/month</span>
              </div>
              <p className="text-sm text-muted-foreground">Full access to all tools and features</p>
            </div>

            <div className="space-y-3 mb-8">
              {proFeatures.map((feature) => (
                <div key={feature} className="flex items-start gap-3">
                  <Check className="w-4 h-4 text-emerald mt-0.5 shrink-0" />
                  <span className="text-sm text-foreground">{feature}</span>
                </div>
              ))}
            </div>

            {isOwner ? (
              <div className="text-center p-4 rounded-lg bg-emerald/10 border border-emerald/20">
                <Shield className="w-6 h-6 text-emerald mx-auto mb-2" />
                <p className="text-sm font-medium text-emerald">Owner Access</p>
                <p className="text-xs text-muted-foreground mt-1">You have permanent free access as the platform owner.</p>
              </div>
            ) : isSubscribed && !freeAccess ? (
              <div className="space-y-3">
                <div className="text-center p-4 rounded-lg bg-emerald/10 border border-emerald/20">
                  <Check className="w-6 h-6 text-emerald mx-auto mb-2" />
                  <p className="text-sm font-medium text-emerald">Active Subscription</p>
                  {billingStatus.data?.currentPeriodEnd && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {billingStatus.data.cancelAtPeriodEnd
                        ? `Cancels on ${new Date(billingStatus.data.currentPeriodEnd).toLocaleDateString()}`
                        : `Renews on ${new Date(billingStatus.data.currentPeriodEnd).toLocaleDateString()}`}
                    </p>
                  )}
                </div>
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={handleManageBilling}
                  disabled={createPortal.isPending}
                >
                  <CreditCard className="w-4 h-4" />
                  {createPortal.isPending ? "Loading..." : "Manage Billing"}
                </Button>
              </div>
            ) : freeAccess ? (
              <div className="text-center p-4 rounded-lg bg-emerald/10 border border-emerald/20">
                <Gift className="w-6 h-6 text-emerald mx-auto mb-2" />
                <p className="text-sm font-medium text-emerald">Currently Free</p>
                <p className="text-xs text-muted-foreground mt-1">
                  All tools are free until {FREE_ACCESS_UNTIL.toLocaleDateString("en-US", { month: "long", day: "numeric" })}. Subscribe now to lock in access after.
                </p>
                <Button
                  className="w-full gap-2 bg-indigo hover:bg-indigo/90 text-white mt-4"
                  size="lg"
                  onClick={handleSubscribe}
                  disabled={createCheckout.isPending || authLoading}
                >
                  <Lock className="w-4 h-4" />
                  {createCheckout.isPending
                    ? "Creating checkout..."
                    : !isAuthenticated
                    ? "Sign In & Subscribe Early"
                    : "Subscribe Early — Lock In Access"}
                </Button>
              </div>
            ) : (
              <>
                <Button
                  className="w-full gap-2 bg-indigo hover:bg-indigo/90 text-white"
                  size="lg"
                  onClick={handleSubscribe}
                  disabled={createCheckout.isPending || authLoading}
                >
                  <Lock className="w-4 h-4" />
                  {createCheckout.isPending
                    ? "Creating checkout..."
                    : !isAuthenticated
                    ? "Sign In & Subscribe"
                    : "Subscribe Now"}
                </Button>
                <p className="text-xs text-muted-foreground text-center mt-3">
                  Cancel anytime. No long-term commitment.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Trust signals */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="flex items-center justify-center gap-6 mt-12 text-xs text-muted-foreground"
      >
        <span className="flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5" /> Secure payment via Stripe
        </span>
        <span className="flex items-center gap-1.5">
          <CreditCard className="w-3.5 h-3.5" /> Cancel anytime
        </span>
      </motion.div>
    </div>
  );
}
