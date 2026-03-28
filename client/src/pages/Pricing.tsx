/*
 * Pricing Page — Axiarch Pro subscription checkout
 */
import { motion } from "framer-motion";
import { Check, ArrowRight, Lock, CreditCard, Shield } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";
import { useSearch } from "wouter";

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

export default function Pricing() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const cancelled = params.get("subscription") === "cancelled";

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

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-14"
      >
        <h1 className="font-heading text-4xl font-bold tracking-tight mb-3">
          Unlock the Full Algorithm
        </h1>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Get complete access to every tool, signal, and feature in the Axiarch Trading Algorithm.
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
            ) : isSubscribed ? (
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
