/*
 * DESIGN: Signal Deck — Modern Trading Command Center
 * Dark theme, emerald/rose signal colors, indigo accent
 * Instrument Sans headings, DM Sans body, IBM Plex Mono data
 */
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import {
  Activity,
  BarChart3,
  Bell,
  Calculator,
  Layers,
  Menu,
  Search,
  X,
  Zap,
} from "lucide-react";

const navItems = [
  { href: "/", label: "Home", icon: Zap },
  { href: "/methodology", label: "Methodology", icon: Layers },
  { href: "/framework", label: "7-Step Framework", icon: BarChart3 },
  { href: "/calculator", label: "RCT Calculator", icon: Calculator },
  { href: "/screener", label: "Stock Screener", icon: Search },
  { href: "/dashboard", label: "Live Picks", icon: Bell },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-indigo flex items-center justify-center">
              <Activity className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="font-heading font-bold text-lg tracking-tight text-foreground">
              Axi<span className="text-indigo">arch</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = location === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "text-foreground bg-secondary"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                  {isActive && (
                    <motion.div
                      layoutId="nav-indicator"
                      className="absolute bottom-0 left-3 right-3 h-0.5 bg-indigo rounded-full"
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Mobile Toggle */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-secondary transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Nav */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden border-t border-border/50 overflow-hidden"
            >
              <nav className="container py-3 flex flex-col gap-1">
                {navItems.map((item) => {
                  const isActive = location === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? "text-foreground bg-secondary"
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Page Content */}
      <AnimatePresence mode="wait">
        <motion.main
          key={location}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          {children}
        </motion.main>
      </AnimatePresence>

      {/* Footer */}
      <footer className="border-t border-border/50 mt-20">
        <div className="container py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            The Axiarch Trading Algorithm is an independent research tool. Not affiliated with StocksToTrade.
          </p>
          <p className="text-xs text-muted-foreground/60">
            For educational purposes only. Not financial advice.
          </p>
        </div>
      </footer>
    </div>
  );
}
