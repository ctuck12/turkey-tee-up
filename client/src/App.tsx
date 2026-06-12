import { Switch, Route, Router, Link, useLocation } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { Bell, X as XIcon, Trophy, ClipboardList, Shield, Heart, Menu, X, Users, ClipboardEdit } from "lucide-react";
import { useSSE } from "@/hooks/use-sse";
import Leaderboard, { computeStandings } from "@/pages/Leaderboard";
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
  // Drives only the install instructions + test-mode welcome. The live
  // "flight started" question is handled separately by FlightStartedModal.
  const { data: settings } = useQuery<any>({ queryKey: ["/api/settings"], refetchInterval: 5000, refetchOnWindowFocus: true });
  const [, setTick] = useState(0); // re-render after sessionStorage writes
  const [step, setStep] = useState<"install" | "role" | "added">("install");
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  const sess = (k: string) => { try { return sessionStorage.getItem(k); } catch { return null; } };
  const mark = (k: string, v = "1") => { try { sessionStorage.setItem(k, v); } catch {} setTick(t => t + 1); };

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

  // Install instructions: always shown immediately on the first open in a
  // browser this session, regardless of tournament mode or flight status.
  const needInstall = showInstallPrompt && !sess("atd_install_seen");

  // Role question here is just the TEST-mode welcome (once per session). The live
  // "flight started" question lives in FlightStartedModal.
  const mode = settings ? (settings.tournamentMode ?? "test") : null; // null until settings load
  let roleAsk: { key: string; title: string } | null = null;
  if (mode === "test" && !sess("atd_role")) roleAsk = { key: "atd_role", title: "Welcome" };

  const visible = needInstall || !!roleAsk;

  useEffect(() => {
    if (visible && step !== "added") setStep(needInstall ? "install" : "role");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, needInstall, roleAsk?.key]);

  // Leaving the install step (skipped or done) — remember so it never re-shows
  function finishInstall() {
    mark("atd_install_seen");
    if (roleAsk) setStep("role");
  }

  function choose(role: "scorekeeper" | "viewer") {
    mark("atd_role", role);
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
              onClick={finishInstall}
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
                onClick={finishInstall}
                className="w-full py-2 rounded-xl font-bold font-sans-app text-sm transition-all text-[#1a2744]/50 hover:text-[#1a2744]/70"
              >
                Continue in Browser Instead
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="text-center">
              <h2 className="font-bold text-[#1a2744] text-xl mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>{roleAsk?.title ?? "Welcome"}</h2>
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

// ─── FLIGHT STARTED — "How are you using the app?" ────────────────────────────
// Standalone (independent of the install/welcome flow). Re-arms every time a
// flight FLIPS to In Progress, so it fires for everyone the instant the admin
// starts a flight. Suppressed only while actively on the scorekeeper page.
function FlightStartedModal() {
  const [location, navigate] = useLocation();
  const { data: settings } = useQuery<any>({ queryKey: ["/api/settings"], refetchInterval: 5000, refetchOnWindowFocus: true });
  const [armed, setArmed] = useState<{ morning: boolean; afternoon: boolean }>({ morning: false, afternoon: false });
  const prev = useRef<{ am?: string; pm?: string }>({});

  useEffect(() => {
    if (!settings) return;
    const am = settings.amStatus, pm = settings.pmStatus;
    setArmed(a => {
      let m = a.morning, n = a.afternoon;
      if (prev.current.am !== "in_progress" && am === "in_progress") m = true;
      if (am !== "in_progress") m = false;
      if (prev.current.pm !== "in_progress" && pm === "in_progress") n = true;
      if (pm !== "in_progress") n = false;
      return m === a.morning && n === a.afternoon ? a : { morning: m, afternoon: n };
    });
    prev.current = { am, pm };
  }, [settings?.amStatus, settings?.pmStatus]);

  const mode = settings?.tournamentMode ?? "test";
  const onScorekeeperPage = location.startsWith("/scorekeeper");
  if (!settings || mode !== "live" || onScorekeeperPage) return null;

  let flight: "morning" | "afternoon" | null = null;
  if (settings.pmStatus === "in_progress" && armed.afternoon) flight = "afternoon";
  else if (settings.amStatus === "in_progress" && armed.morning) flight = "morning";
  if (!flight) return null;

  const shown = flight;
  const label = flight === "morning" ? "AM" : "PM";
  const choose = (role: "scorekeeper" | "viewer") => {
    setArmed(a => ({ ...a, [shown]: false }));
    if (role === "scorekeeper") navigate("/scorekeeper");
  };

  return (
    <div className="fixed inset-0 z-[290] flex items-center justify-center p-6" style={{ background: "rgba(17,27,51,0.72)", backdropFilter: "blur(4px)" }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs p-5 flex flex-col items-center gap-3" style={{ border: "2px solid #b06b10" }}>
        <img src={atdLogoWelcome} alt="ATD" className="w-32 h-32 object-contain" />
        <div className="text-center">
          <h2 className="font-bold text-[#1a2744] text-lg mb-1 leading-tight" style={{ fontFamily: "'Playfair Display', serif" }}>{label} Flight Has Officially Started!</h2>
          <p className="text-[#1a2744]/55 text-sm font-sans-app">How are you using the app today?</p>
        </div>
        <div className="flex flex-col gap-3 w-full">
          <button
            onClick={() => choose("scorekeeper")}
            className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl font-bold text-white font-sans-app text-base transition-all"
            style={{ background: "linear-gradient(135deg, #1a2744, #243461)", border: "1.5px solid rgba(176,107,16,0.4)" }}
          >
            <ClipboardEdit size={18} /> Scorekeeper
          </button>
          <button
            onClick={() => choose("viewer")}
            className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl font-bold font-sans-app text-base transition-all"
            style={{ background: "rgba(176,107,16,0.12)", border: "1.5px solid #b06b10", color: "#8a5008" }}
          >
            <Users size={18} /> Viewer
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── FLIGHT COMPLETE ANNOUNCEMENT ─────────────────────────────────────────────
// When a flight's status flips to Complete, everyone on the app gets a one-time
// announcement: final podium, CTP/LD winners, collect-winnings note, thank-you,
// and Make Donation / View Leaderboard buttons.
function FlightCompleteModal() {
  const [, navigate] = useLocation();
  // Poll + refetch-on-focus fallback so the Complete announcement still fires on
  // desktop/iPad tabs whose SSE connection was suspended in the background.
  const { data: settings } = useQuery<any>({ queryKey: ["/api/settings"], refetchInterval: 5000, refetchOnWindowFocus: true });
  const { data: leaderboard = [] } = useQuery<any[]>({ queryKey: ["/api/leaderboard"], refetchInterval: 5000, refetchOnWindowFocus: true });
  const { data: teams = [] } = useQuery<any[]>({ queryKey: ["/api/teams"] });
  const { data: holes = [] } = useQuery<any[]>({ queryKey: ["/api/holes"] });
  const { data: ctp = [] } = useQuery<any[]>({ queryKey: ["/api/ctp"], refetchInterval: 5000, refetchOnWindowFocus: true });

  // Re-arm the announcement every time a flight FLIPS into Complete (and on first
  // load if it's already Complete), so toggling the status re-shows it for everyone.
  const [dismissed, setDismissed] = useState<{ morning: boolean; afternoon: boolean }>({ morning: false, afternoon: false });
  const prevStatus = useRef<{ am?: string; pm?: string }>({});
  useEffect(() => {
    if (!settings) return;
    const am = settings.amStatus, pm = settings.pmStatus;
    setDismissed(d => {
      let nd = d;
      if (prevStatus.current.am !== "complete" && am === "complete") nd = { ...nd, morning: false };
      if (prevStatus.current.pm !== "complete" && pm === "complete") nd = { ...nd, afternoon: false };
      return nd;
    });
    prevStatus.current = { am, pm };
  }, [settings?.amStatus, settings?.pmStatus]);

  const mode = settings?.tournamentMode ?? "test";

  // Pick the flight to announce: only in live/complete, status Complete, not yet dismissed
  let flight: "morning" | "afternoon" | null = null;
  if (settings && (mode === "live" || mode === "complete")) {
    if (settings.amStatus === "complete" && !dismissed.morning) flight = "morning";
    else if (settings.pmStatus === "complete" && !dismissed.afternoon) flight = "afternoon";
  }
  if (!flight || !settings) return null;

  const flightLabel = flight === "morning" ? "AM" : "PM";
  const tbHoles: number[] = (settings.tiebreakerHoles ?? "").split(",").map((s: string) => parseInt(s.trim())).filter((n: number) => !isNaN(n));
  const entries = leaderboard.filter((e: any) => e.team.flight === flight);
  const { sorted } = computeStandings(entries as any, tbHoles);
  const top3 = sorted.slice(0, 3);

  const flightTeamIds = new Set(teams.filter((t: any) => t.flight === flight).map((t: any) => t.id));
  const ctpHoles = holes.filter((h: any) => h.isCtpHole && h.par === 3).sort((a: any, b: any) => a.holeNumber - b.holeNumber);
  const ldHole = holes.find((h: any) => h.isCtpHole && h.par !== 3);
  const winnerFor = (hole: any) => {
    const entry = ctp.find((c: any) => c.holeNumber === hole.holeNumber && c.teamId != null && flightTeamIds.has(c.teamId));
    if (!entry) return null;
    const team = teams.find((t: any) => t.id === entry.teamId);
    return { name: entry.playerName || team?.teamName || "—", team: team?.teamName as string | undefined };
  };
  const ctpWinners = ctpHoles.map((h: any) => ({ hole: h, w: winnerFor(h) }));
  const ldWin = ldHole ? winnerFor(ldHole) : null;
  const hasContests = ctpWinners.some(c => c.w) || ldWin;

  const medals = ["🥇", "🥈", "🥉"];
  const fmtToPar = (e: any) => e.holesCompleted === 0 || e.totalToPar === 0 ? "E" : e.totalToPar > 0 ? `+${e.totalToPar}` : `${e.totalToPar}`;
  const shownFlight = flight;
  const dismiss = () => setDismissed(d => ({ ...d, [shownFlight]: true }));

  return (
    <div className="fixed inset-0 z-[280] flex items-center justify-center p-4" style={{ background: "rgba(17,27,51,0.72)", backdropFilter: "blur(4px)" }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm flex flex-col max-h-[88vh]" style={{ border: "2px solid #b06b10" }}>
        <div className="overflow-y-auto p-5 flex flex-col items-center gap-3">
          <img src={atdLogoWelcome} alt="ATD" className="w-24 h-24 object-contain" />
          <h2 className="font-bold text-[#1a2744] text-xl text-center leading-tight" style={{ fontFamily: "'Playfair Display', serif" }}>{flightLabel} Flight is Complete!</h2>

          {/* Podium */}
          <div className="w-full bg-[#f0ebe1] rounded-xl p-3 space-y-1.5">
            <p className="text-[#b06b10] text-[11px] font-bold uppercase tracking-widest text-center mb-1 font-sans-app">Final Standings</p>
            {top3.length === 0 ? (
              <p className="text-center text-sm text-[#1a2744]/50 italic font-sans-app">No teams</p>
            ) : top3.map((e: any, i: number) => (
              <div key={e.team.id} className="flex items-center gap-2 text-sm">
                <span className="text-lg shrink-0">{medals[i]}</span>
                <span className="font-bold text-[#1a2744] truncate flex-1" style={{ fontFamily: "'Playfair Display', serif" }}>{e.team.teamName}</span>
                <span className="font-bold text-[#1a2744] shrink-0" style={{ fontFamily: "'Rajdhani', sans-serif" }}>{fmtToPar(e)}</span>
              </div>
            ))}
          </div>

          {/* CTP / LD winners */}
          {hasContests && (
            <div className="w-full bg-white border border-amber-500/20 rounded-xl p-3 space-y-1">
              <p className="text-[#b06b10] text-[11px] font-bold uppercase tracking-widest text-center mb-1 font-sans-app">Closest to Pin &amp; Long Drive</p>
              {ctpWinners.map(({ hole, w }) => w && (
                <div key={hole.id} className="flex items-center justify-between gap-2 text-sm font-sans-app">
                  <span className="text-[#1a2744]/60 shrink-0">Hole {hole.holeNumber} CTP</span>
                  <span className="font-bold text-[#1a2744] truncate text-right">{w.name}</span>
                </div>
              ))}
              {ldWin && (
                <div className="flex items-center justify-between gap-2 text-sm font-sans-app">
                  <span className="text-emerald-700 font-bold shrink-0">Long Drive</span>
                  <span className="font-bold text-[#1a2744] truncate text-right">{ldWin.name}</span>
                </div>
              )}
            </div>
          )}

          <p className="text-[#1a2744]/75 text-sm text-center font-sans-app leading-relaxed">🏆 Winners, please come collect your winnings at the registration desk / pro shop.</p>
          <p className="text-[#1a2744]/65 text-sm text-center font-sans-app leading-relaxed">Thank you so much for your support of the Abilene Turkey Drive — we'll see you again next year!</p>
        </div>
        <div className="flex gap-2 p-4 border-t border-[#1a2744]/10">
          <button onClick={() => { dismiss(); navigate("/donate"); }} className="flex-1 py-2.5 rounded-xl font-bold text-white text-sm font-sans-app flex items-center justify-center gap-1.5" style={{ background: "linear-gradient(135deg, #b06b10, #8a5008)" }}>
            <Heart size={14} /> Make Donation
          </button>
          <button onClick={() => { dismiss(); navigate("/"); }} className="flex-1 py-2.5 rounded-xl font-bold text-sm font-sans-app bg-[#1a2744] text-white hover:bg-[#243461] transition-colors">
            View Leaderboard
          </button>
        </div>
      </div>
    </div>
  );
}

// Temporary diagnostic — enable by running localStorage.atd_debug=1 then refresh.
// Build marker "FSM3" confirms the new bundle is loaded.
function DebugBadge() {
  const [location] = useLocation();
  const { data: settings } = useQuery<any>({ queryKey: ["/api/settings"], refetchInterval: 3000 });
  let on = false;
  try { on = localStorage.getItem("atd_debug") === "1"; } catch {}
  const href = (typeof window !== "undefined" ? window.location.href : "").toLowerCase();
  if (!on && !href.includes("debug")) return null;
  return (
    <div style={{ position: "fixed", bottom: 4, left: 4, zIndex: 99999, background: "rgba(0,0,0,0.82)", color: "#5f5", font: "11px/1.4 monospace", padding: "5px 7px", borderRadius: 5, whiteSpace: "pre", pointerEvents: "none" }}>
      {`build=FSM3  loc=${location}\nmode=${settings?.tournamentMode}\nam=${settings?.amStatus}  pm=${settings?.pmStatus}`}
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
      <FlightStartedModal />
      <BroadcastModal />
      <FlightCompleteModal />
      <DebugBadge />
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
