import { Switch, Route, Router, Link, useLocation } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import Leaderboard from "@/pages/Leaderboard";
import Scorekeeper from "@/pages/Scorekeeper";
import AdminPortal from "@/pages/AdminPortal";
import TeamScorecard from "@/pages/TeamScorecard";
import NotFound from "@/pages/not-found";
import atdLogo from "@/assets/atd-logo.png";
import { Trophy, ClipboardList, Shield, Menu, X } from "lucide-react";
import { useState } from "react";

function AppHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [loc] = useHashLocation();

  const navItems = [
    { href: "/", label: "Leaderboard", icon: Trophy },
    { href: "/scorekeeper", label: "Scorekeeper", icon: ClipboardList },
    { href: "/admin", label: "Admin", icon: Shield },
  ];

  return (
    <header className="atd-header sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between" style={{ height: '92px' }}>
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <div className="flex-shrink-0 rounded-full" style={{ background: 'rgba(255,255,255,0.97)', border: '2.5px solid #c8892a', boxShadow: '0 0 0 1px rgba(200,137,42,0.3)', width: '88px', height: '88px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img
                src={atdLogo}
                alt="Abilene Turkey Drive Golf"
                style={{ width: '72px', height: '72px', objectFit: 'contain', display: 'block' }}
              />
            </div>
            <div>
              <div className="text-[#b06b10] font-bold text-sm leading-tight tracking-wide">
                ABILENE TURKEY DRIVE
              </div>
              <div className="text-blue-200/70 text-xs tracking-widest">
                GOLF TOURNAMENT
              </div>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-150 font-sans-app ${
                  loc === href
                    ? "bg-amber-500/25 text-[#b06b10] border border-amber-500/30"
                    : "text-blue-100/80 hover:text-[#b06b10] hover:bg-white/5"
                }`}
              >
                <Icon size={15} />
                {label}
              </Link>
            ))}
          </nav>

          {/* Mobile menu button */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden text-blue-100/80 hover:text-[#b06b10] p-2"
            data-testid="button-mobile-menu"
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile nav */}
        {menuOpen && (
          <div className="md:hidden pb-3 border-t border-amber-500/20 mt-1 pt-2">
            {navItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium mb-1 font-sans-app ${
                  loc === href
                    ? "bg-amber-500/25 text-[#b06b10]"
                    : "text-blue-100/80 hover:text-[#b06b10] hover:bg-white/5"
                }`}
              >
                <Icon size={16} />
                {label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}

function AppShell() {
  return (
    <div className="min-h-screen" style={{ background: "#f0ebe1" }}>
      <AppHeader />
      <main className="max-w-7xl mx-auto px-4 py-6">
        <Switch>
          <Route path="/" component={Leaderboard} />
          <Route path="/scorekeeper" component={Scorekeeper} />
          <Route path="/scorekeeper/:teamId" component={Scorekeeper} />
          <Route path="/admin" component={AdminPortal} />
          <Route path="/admin/:tab" component={AdminPortal} />
          <Route path="/team/:teamId" component={TeamScorecard} />
          <Route component={NotFound} />
        </Switch>
      </main>

      <footer className="border-t border-[#1a2744]/15 mt-12 py-4 text-center">
        <p className="text-[#1a2744]/40 text-xs font-sans-app">
          Abilene Turkey Drive Golf Tournament · Est. 2020
        </p>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router hook={useHashLocation}>
        <AppShell />
      </Router>
      <Toaster />
    </QueryClientProvider>
  );
}
