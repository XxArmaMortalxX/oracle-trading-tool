/*
 * SubscriptionGate — wraps pages that require an active subscription.
 * During the free access period, ALL users (even unauthenticated) get through.
 * After the free period, shows a paywall prompt if the user is not subscribed.
 * Owner/admin users always pass through.
 */
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Lock, ArrowRight, Loader2, Gift } from "lucide-react";
import { Link } from "wouter";
import { FREE_ACCESS_UNTIL, isFreeAccessPeriod } from "../../../shared/const";
import { useState, useEffect } from "react";

interface SubscriptionGateProps {
  children: React.ReactNode;
  /** Optional: show a specific feature name in the paywall */
  featureName?: string;
}

function FreeAccessBanner() {
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
      setTimeLeft(`${days}d ${hours}h remaining`);
    }
    update();
    const interval = setInterval(update, 60_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-gradient-to-r from-emerald-500/10 to-indigo/10 border border-emerald-500/30 rounded-lg px-4 py-3 mb-6 flex items-center gap-3">
      <Gift className="w-5 h-5 text-emerald-400 shrink-0" />
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium text-emerald-400">Free Access Period</span>
        <span className="text-xs text-muted-foreground ml-2">— {timeLeft}</span>
      </div>
    </div>
  );
}

export default function SubscriptionGate({ children, featureName }: SubscriptionGateProps) {
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  // During free access period, let everyone through immediately — no login required
  if (isFreeAccessPeriod()) {
    return (
      <>
        <div className="container pt-4">
          <FreeAccessBanner />
        </div>
        {children}
      </>
    );
  }

  // After free period — original paywall logic
  const billingStatus = trpc.billing.status.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 60_000,
  });

  // Still loading auth or billing
  if (authLoading || (isAuthenticated && billingStatus.isLoading)) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo" />
      </div>
    );
  }

  // Not logged in
  if (!isAuthenticated) {
    return (
      <div className="container py-20">
        <Card className="max-w-md mx-auto border-border/40">
          <CardContent className="p-8 text-center">
            <Lock className="w-12 h-12 text-indigo mx-auto mb-4" />
            <h2 className="font-heading text-2xl font-bold mb-2">Sign In Required</h2>
            <p className="text-muted-foreground text-sm mb-6">
              {featureName
                ? `Sign in to access ${featureName}.`
                : "Sign in to access this feature."}
            </p>
            <a href={getLoginUrl()}>
              <Button className="gap-2 bg-indigo hover:bg-indigo/90 text-white">
                Sign In
                <ArrowRight className="w-4 h-4" />
              </Button>
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Logged in but not subscribed (and not owner)
  if (!billingStatus.data?.isSubscribed) {
    return (
      <div className="container py-20">
        <Card className="max-w-md mx-auto border-indigo/30">
          <CardContent className="p-8 text-center">
            <Lock className="w-12 h-12 text-indigo mx-auto mb-4" />
            <h2 className="font-heading text-2xl font-bold mb-2">Subscription Required</h2>
            <p className="text-muted-foreground text-sm mb-6">
              {featureName
                ? `Upgrade to Axiarch Pro to access ${featureName}.`
                : "Upgrade to Axiarch Pro to access all trading tools."}
            </p>
            <div className="flex items-baseline justify-center gap-1 mb-6">
              <span className="font-heading text-3xl font-bold text-foreground">$29.99</span>
              <span className="text-muted-foreground text-sm">/month</span>
            </div>
            <Link href="/pricing">
              <Button className="gap-2 bg-indigo hover:bg-indigo/90 text-white" size="lg">
                View Plans
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Subscribed or owner — render the page
  return <>{children}</>;
}
