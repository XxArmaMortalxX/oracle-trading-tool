/*
 * SubscriptionGate — wraps pages that require an active subscription.
 * Shows a paywall prompt if the user is not subscribed.
 * Owner/admin users always pass through.
 */
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Lock, ArrowRight, Loader2 } from "lucide-react";
import { Link } from "wouter";

interface SubscriptionGateProps {
  children: React.ReactNode;
  /** Optional: show a specific feature name in the paywall */
  featureName?: string;
}

export default function SubscriptionGate({ children, featureName }: SubscriptionGateProps) {
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  const billingStatus = trpc.billing.status.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 60_000, // Cache for 1 min to avoid excessive checks
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
