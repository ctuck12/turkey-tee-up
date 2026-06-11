import { Switch, Route, Router, Link, useLocation } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { Bell, X as XIcon, Trophy, ClipboardList, Shield, Heart, Menu, X, Users, ClipboardEdit } from "lucide-react";
import { useSSE } from "@/hooks/use-sse";
import Leaderboard from "@/pages/Leaderboard";
import Scorekeeper from "@/pages/Scorekeeper";
import AdminPortal from "@/pages/AdminPortal";
import Donate from "@/pages/Donate";
import TeamScorecard from "@/pages/TeamScorecard";
import NotFound from "@/pages/not-found";
import atdLogo from "@/assets/atd-logo.png";
import atdLogoHeader from "@/assets/atd-logo-header.jpeg";
import atdLogoWelcome from "@/assets/atd-logo-welcome.jpeg";

function AppHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  // Keep --header-h CSS variable in sync with actual header height (accounts for
  // safe-area-inset-top, font scaling, Safari browser chrome, etc.)
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const update = () => {
      const h = el.getBoundingClientRect().height;
      if (h > 10) { // only update if we have a real measurement
        document.documentElement.style.setProperty('--header-h', `${h}px`);
      }
    };
    update();
    // Fire again after short delays to catch env(safe-area-inset-top) resolving in PWA mode
    const t1 = setTimeout(update, 50);
    const t2 = setTimeout(update, 200);
    const t3 = setTimeout(update, 500);
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      ro.disconnect();
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);
  const [loc] = useHashLocation();

  const navItems = [
    { href: "/", label: "Leaderboard", icon: Trophy },
    { href: "/scorekeeper", label: "Scorekeeper", icon: ClipboardList },
    { href: "/donate", label: "Donate", icon: Heart },
    { href: "/admin", label: "Admin", icon: Shield },
  ];

  return (
    <header ref={headerRef} className="atd-header fixed top-0 left-0 right-0 z-50" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between" style={{ height: 'clamp(70px, 19.5vw, 84px)' }}>
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <img
              src={atdLogoHeader}
              alt="Abilene Turkey Drive Golf"
              style={{ width: '82px', height: '82px', objectFit: 'contain', display: 'block', flexShrink: 0 }}
            />
            <div>
              <div className="text-[#b06b10] font-bold text-base leading-tight tracking-wide">
                ABILENE TURKEY DRIVE
              </div>
              <div className="text-blue-200/85 text-[17px] leading-tight" style={{ fontFamily: "'Rajdhani', 'DM Sans', sans-serif", letterSpacing: "0.12em", fontWeight: 600 }}>
                5TH ANNUAL TURKEY TEE UP
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
                    ? "bg-amber-500/25 text-white border border-amber-500/30"
                    : "text-blue-100/80 hover:text-white hover:bg-white/5"
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
            className="md:hidden text-blue-100/80 hover:text-white p-2"
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
                    ? "bg-amber-500/25 text-white"
                    : "text-blue-100/80 hover:text-white hover:bg-white/5"
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

function RoleSelector() {
  const [, navigate] = useLocation();
  const [visible, setVisible] = useState(() => {
    try { return !sessionStorage.getItem("atd_role"); } catch { return true; }
  });
  const [step, setStep] = useState<"install" | "role" | "added">("install");
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // Capture the Android Chrome install prompt event
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function handleAndroidInstall() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    if (outcome === "accepted") setStep("added");
  }

  // Detect mobile browser type and whether already installed as PWA
  const browserType = (() => {
    const ua = navigator.userAgent;
    const isStandalone = (navigator as any).standalone === true ||
      window.matchMedia('(display-mode: standalone)').matches;
    if (isStandalone) return "pwa";
    const isIos = /iphone|ipad|ipod/i.test(ua);
    const isSafari = /safari/i.test(ua) && !/chrome|crios|fxios/i.test(ua);
    const isAndroid = /android/i.test(ua);
    const isChrome = /chrome|crios/i.test(ua) && !/edg/i.test(ua);
    if (isIos && isSafari) return "safari";
    if (isAndroid && isChrome) return "android-chrome";
    if (isIos && /crios/i.test(ua)) return "ios-chrome";
    return "other";
  })();

  // Extract iOS major version — used to show correct Safari share instructions.
  // iOS 15+ moved address bar to bottom with ··· menu; iOS 14 and below had share in top bar.
  const iosMajorVersion = (() => {
    const match = navigator.userAgent.match(/OS (\d+)_/);
    return match ? parseInt(match[1]) : null;
  })();
  const safariNewLayout = iosMajorVersion === null || iosMajorVersion >= 15;

  const showInstallPrompt = browserType === "safari" || browserType === "android-chrome" || browserType === "ios-chrome";

  useEffect(() => {
    if (visible) {
      setStep(showInstallPrompt ? "install" : "role");
    }
  }, []);

  function choose(role: "scorekeeper" | "viewer") {
    sessionStorage.setItem("atd_role", role);
    setVisible(false);
    if (role === "scorekeeper") navigate("/scorekeeper");
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-6" style={{ background: "rgba(17,27,51,0.72)", backdropFilter: "blur(4px)" }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs p-5 flex flex-col items-center gap-3" style={{ border: "2px solid #b06b10" }}>
        <img src={atdLogoWelcome} alt="ATD" className="w-44 h-44 object-contain" />

        {step === "added" ? (
          <>
            <div className="text-center">
              <div className="text-4xl mb-2">🎉</div>
              <h2 className="font-bold text-[#1a2744] text-xl mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>You're All Set!</h2>
              <p className="text-[#1a2744]/65 text-sm font-sans-app leading-relaxed">
                Close Safari and open the <span className="font-bold text-[#b06b10]">ATD Golf</span> app from your Home Screen for the full experience.
              </p>
            </div>
            <button
              onClick={() => setStep("role")}
              className="w-full py-2 rounded-xl font-bold font-sans-app text-sm transition-all text-[#1a2744]/50 hover:text-[#1a2744]/70"
            >
              Continue in Browser Anyway
            </button>
          </>
        ) : step === "install" ? (
          <>
            <div className="text-center">
              <h2 className="font-bold text-[#1a2744] text-xl mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>Get the Best Experience</h2>
              <p className="text-[#1a2744]/65 text-sm font-sans-app leading-relaxed">
                Add this app to your Home Screen for a full-screen experience with no browser bar.
              </p>
            </div>
            {/* Step-by-step install instructions — varies by browser */}
            <div className="w-full bg-[#f0ebe1] rounded-xl p-3 space-y-2 font-sans-app text-sm text-[#1a2744]/80">
              {browserType === "android-chrome" ? (
                deferredPrompt ? (
                  // Native one-tap install available
                  <div className="flex flex-col items-center gap-2 py-1">
                    <p className="text-[#1a2744]/70 text-xs text-center font-sans-app">Tap the button below to install instantly:</p>
                    <button
                      onClick={handleAndroidInstall}
                      className="w-full py-3 rounded-xl font-bold text-white font-sans-app text-sm transition-all"
                      style={{ background: "linear-gradient(135deg, #1a2744, #243461)", border: "1.5px solid rgba(176,107,16,0.4)" }}
                    >
                      📲 Install App
                    </button>
                  </div>
                ) : (
                  // Fallback manual steps (prompt not yet fired or already dismissed)
                  <>
                    <div className="flex items-start gap-2">
                      <span className="font-bold text-[#b06b10] shrink-0">1.</span>
                      <span>Tap the <span className="font-bold">⋮ menu</span> in the top-right corner of Chrome</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-bold text-[#b06b10] shrink-0">2.</span>
                      <span>Tap <span className="font-bold">"Add to Home Screen"</span> or <span className="font-bold">"Install App"</span></span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-bold text-[#b06b10] shrink-0">3.</span>
                      <span>Tap <span className="font-bold">"Add"</span> — then open the app from your home screen</span>
                    </div>
                  </>
                )
              ) : browserType === "ios-chrome" ? (
                <>
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-[#b06b10] shrink-0">1.</span>
                    <span>Tap the <span className="font-bold">Share ⬆</span> button in the top URL bar</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-[#b06b10] shrink-0">2.</span>
                    <span>Tap <span className="font-bold">"More" ↓</span> to expand all options</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-[#b06b10] shrink-0">3.</span>
                    <span>Scroll down and tap <span className="font-bold">"Add to Home Screen"</span> then <span className="font-bold">"Add"</span></span>
                  </div>
                </>
              ) : (
                // Safari — instructions differ by iOS version
                safariNewLayout ? (
                  // iOS 15+ — address bar at bottom, share inside ··· menu
                  <>
                    <div className="flex items-start gap-2">
                      <span className="font-bold text-[#b06b10] shrink-0">1.</span>
                      <span>Tap the <span className="font-bold">···</span> button in the bottom-right corner of Safari</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-bold text-[#b06b10] shrink-0">2.</span>
                      <span>Tap the <span className="font-bold">Share ⬆</span> button</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-bold text-[#b06b10] shrink-0">3.</span>
                      <span>Tap <span className="font-bold">"View More" ↓</span> to expand all options</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-bold text-[#b06b10] shrink-0">4.</span>
                      <span>Tap <span className="font-bold">"Add to Home Screen"</span> then <span className="font-bold">"Add"</span></span>
                    </div>
                  </>
                ) : (
                  // iOS 14 and below — share button in top URL bar
                  <>
                    <div className="flex items-start gap-2">
                      <span className="font-bold text-[#b06b10] shrink-0">1.</span>
                      <span>Tap the <span className="font-bold">Share ⬆</span> button in the top URL bar</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-bold text-[#b06b10] shrink-0">2.</span>
                      <span>Scroll down and tap <span className="font-bold">"Add to Home Screen"</span></span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-bold text-[#b06b10] shrink-0">3.</span>
                      <span>Tap <span className="font-bold">"Add"</span> to confirm</span>
                    </div>
                  </>
                )
              )}
            </div>
            <div className="flex flex-col gap-2 w-full">
              <button
                onClick={() => setStep("added")}
                className="w-full py-3 rounded-xl font-bold text-white font-sans-app text-sm transition-all"
                style={{ background: "linear-gradient(135deg, #1a2744, #243461)", border: "1.5px solid rgba(176,107,16,0.4)" }}
              >
                I Added It
              </button>
              <button
                onClick={() => setStep("role")}
                className="w-full py-2 rounded-xl font-bold font-sans-app text-sm transition-all text-[#1a2744]/50 hover:text-[#1a2744]/70"
              >
                Continue in Browser Instead
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="text-center">
              <h2 className="font-bold text-[#1a2744] text-xl mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>Welcome</h2>
              <p className="text-[#1a2744]/55 text-sm font-sans-app">How are you using the app today?</p>
            </div>
            <div className="flex flex-col gap-3 w-full">
              <button
                onClick={() => choose("scorekeeper")}
                className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl font-bold text-white font-sans-app text-base transition-all"
                style={{ background: "linear-gradient(135deg, #1a2744, #243461)", border: "1.5px solid rgba(176,107,16,0.4)" }}
              >
                <ClipboardEdit size={18} />
                Scorekeeper
              </button>
              <button
                onClick={() => choose("viewer")}
                className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl font-bold font-sans-app text-base transition-all"
                style={{ background: "rgba(176,107,16,0.12)", border: "1.5px solid #b06b10", color: "#8a5008" }}
              >
                <Users size={18} />
                Viewer
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function BroadcastModal() {
  // Settings arrive via SSE — no polling needed
  const { data: settings } = useQuery<any>({ queryKey: ["/api/settings"] });
  const [dismissed, setDismissed] = useState<string | null>(null);
  const message: string | null = settings?.broadcastMessage || null;

  // When a new message arrives (different from dismissed), show it again
  const shownMessage = message && message !== dismissed ? message : null;

  if (!shownMessage) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.55)" }}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 relative" style={{ border: "2px solid #b06b10" }}>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-full bg-[#b06b10]/15 flex items-center justify-center flex-shrink-0">
            <Bell size={16} className="text-[#b06b10]" />
          </div>
          <span className="font-bold text-[#1a2744] font-sans-app text-sm uppercase tracking-widest">Announcement</span>
        </div>
        <p className="text-[#1a2744] font-sans-app text-base leading-relaxed mb-5">{shownMessage}</p>
        <button
          onClick={() => setDismissed(shownMessage)}
          className="w-full py-2.5 rounded-xl bg-[#1a2744] text-white font-bold font-sans-app text-sm hover:bg-[#243461] transition-colors"
        >
          Dismiss
        </button>
        <button
          onClick={() => setDismissed(shownMessage)}
          className="absolute top-3 right-3 text-[#1a2744]/40 hover:text-[#1a2744]/70"
        >
          <XIcon size={18} />
        </button>
      </div>
    </div>
  );
}

function AppShell() {
  // Single SSE connection for the whole app — feeds all shared query caches
  useSSE();

  return (
    <div className="min-h-[100dvh]" style={{ background: "#f0ebe1" }}>
      <AppHeader />
      <RoleSelector />
      <BroadcastModal />
      <main className="max-w-7xl mx-auto px-4 py-6" style={{ paddingTop: 'calc(var(--header-h, 130px) + 1.5rem)', paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)' }}>
        <Switch>
          <Route path="/" component={Leaderboard} />
          <Route path="/scorekeeper" component={Scorekeeper} />
          <Route path="/scorekeeper/:teamId" component={Scorekeeper} />
          <Route path="/donate" component={Donate} />
          <Route path="/admin" component={AdminPortal} />
          <Route path="/admin/:tab" component={AdminPortal} />
          <Route path="/team/:teamId" component={TeamScorecard} />
          <Route component={NotFound} />
        </Switch>
      </main>


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
