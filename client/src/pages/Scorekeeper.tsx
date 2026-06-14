import { useState, useEffect, useCallback, useRef, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";

import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Target, ChevronLeft, ChevronRight, Check, Zap, X } from "lucide-react"; // Zap = Long Drive icon
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Team, Hole, Score, ClosestToPin, Sponsor, TournamentSettings } from "@shared/schema";
import bigCountryLogo from "@/assets/big-country-title.png";
import atdLogoWelcome from "@/assets/atd-logo-welcome.jpeg";
import { ScorecardTable } from "@/components/ScorecardTable";

// CTP / Long Drive Entry Modal
function CtpEntryModal({
  open, onClose, holeNumber, hole, teamPlayers, currentEntry, currentTeamName, onSave, mode
}: {
  open: boolean;
  onClose: () => void;
  holeNumber: number;
  hole?: Hole;
  teamPlayers: string[];
  currentEntry?: ClosestToPin;
  currentTeamName?: string;
  onSave: (data: { holeNumber: number; teamId?: number; playerName?: string; distance?: string }) => void;
  mode?: "ctp" | "ld";
}) {
  const isLd = mode === "ld";
  // Start unselected — the current leader is shown separately, not pre-filled here
  const [playerName, setPlayerName] = useState("");
  const [showPlayerList, setShowPlayerList] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    setPlayerName("");
    setShowPlayerList(false);
    setConfirming(false);
  }, [currentEntry, open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#f0ebe1] border-[#1a2744]/20 text-[#1a2744] max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-[#1a2744] font-bold flex items-center gap-2">
            {isLd
              ? <Zap size={18} className="text-blue-600" />
              : <Target size={18} className="text-[#b06b10]" />
            }
            {isLd ? `Long Drive – Hole ${holeNumber}` : `CTP – Hole ${holeNumber}`}
            {hole && <span className="text-[#1a2744]/55 text-sm">Par {hole.par}</span>}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 font-sans-app">
          {/* Current leader on this hole — shown separately, not in the dropdown */}
          {currentEntry?.playerName ? (
            <div className={`rounded-lg border px-3 py-2 ${isLd ? "bg-blue-500/10 border-blue-500/25" : "bg-[#b06b10]/8 border-[#b06b10]/25"}`}>
              <p className={`text-[10px] font-bold uppercase tracking-widest ${isLd ? "text-blue-700" : "text-[#b06b10]"}`}>
                Current {isLd ? "Long Drive" : "Closest to Pin"}
              </p>
              <p className="text-[#1a2744] font-bold text-sm">{currentEntry.playerName}</p>
              {currentTeamName && <p className="text-[#1a2744]/55 text-xs">{currentTeamName}</p>}
            </div>
          ) : (
            <div className="rounded-lg border border-[#1a2744]/15 bg-[#1a2744]/5 px-3 py-2 text-center">
              <p className="text-[#1a2744]/55 text-xs italic">
                No one has been marked {isLd ? "for the longest drive" : "closest to the pin"} on this hole yet.
              </p>
            </div>
          )}

          <div className="relative">
            <Label className="text-[#1a2744]/70 text-xs mb-1 block font-bold">{currentEntry?.playerName ? "New Player (from your team)" : "Player Name"}</Label>
            <button
              type="button"
              onClick={() => setShowPlayerList(v => !v)}
              className="w-full flex items-center justify-between rounded-md border border-[#1a2744]/20 bg-white text-black px-3 py-2 text-sm text-left"
              data-testid="input-ctp-player"
            >
              <span className={playerName ? "text-black" : "text-[#1a2744]/40"}>
                {playerName || "Select a player..."}
              </span>
              <svg className={`w-4 h-4 text-[#1a2744]/50 transition-transform ${showPlayerList ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            {showPlayerList && (
              <div className="absolute z-50 mt-1 w-full bg-white border border-[#1a2744]/20 rounded-md shadow-lg overflow-hidden">
                {teamPlayers.map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => { setPlayerName(p); setShowPlayerList(false); }}
                    className={`w-full text-left px-3 py-2.5 text-sm font-sans-app transition-colors ${
                      playerName === p
                        ? "bg-[#1a2744] text-white font-bold"
                        : "text-[#1a2744] hover:bg-[#1a2744]/8"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
          </div>

          {confirming ? (
            <div className="pt-2 space-y-3">
              <div className={`rounded-lg border px-3 py-3 text-center ${isLd ? "bg-blue-500/10 border-blue-500/25" : "bg-[#b06b10]/8 border-[#b06b10]/25"}`}>
                <p className="text-[#1a2744]/55 text-[10px] font-bold uppercase tracking-widest">Confirm {isLd ? "Long Drive" : "Closest to Pin"}</p>
                <p className="text-[#1a2744] font-bold text-lg mt-0.5">{playerName}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => onSave({ holeNumber, playerName })}
                  className={`flex-1 text-white ${isLd ? "bg-blue-600 border border-blue-600 hover:bg-blue-700" : "bg-[#b06b10] border border-[#b06b10] hover:bg-[#8a5008]"}`}
                >
                  <Check size={14} className="mr-1.5" /> Confirm
                </Button>
                <Button variant="ghost" onClick={() => setConfirming(false)} className="text-[#1a2744]/55 hover:text-[#1a2744]">
                  Back
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2 pt-2">
              <Button
                onClick={() => { if (playerName) setConfirming(true); }}
                disabled={!playerName}
                className={`flex-1 text-white disabled:opacity-40 ${
                  isLd
                    ? "bg-blue-600 border border-blue-600 hover:bg-blue-700"
                    : "bg-[#b06b10] border border-[#b06b10] hover:bg-[#8a5008]"
                }`}
                data-testid="button-ctp-save"
              >
                <Check size={14} className="mr-1.5" /> {isLd ? "Save Long Drive" : "Save CTP"}
              </Button>
              <Button variant="ghost" onClick={onClose} className="text-[#1a2744]/55 hover:text-[#1a2744]">
                Cancel
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Shrinks its font-size until the (single-line) content fits — so a long team
// name stays fully visible and the badges scale down proportionally with it.
function FitRow({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      el.style.fontSize = "1rem";
      const cw = el.clientWidth, sw = el.scrollWidth;
      if (sw > cw && cw > 0) el.style.fontSize = `${Math.max(0.55, (cw / sw) * 0.98).toFixed(3)}rem`;
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  });
  return <div ref={ref} className={className} style={{ overflow: "hidden" }}>{children}</div>;
}

// ─── MAIN SCOREKEEPER PAGE ─────────────────────────────────────────────────────
export default function Scorekeeper() {
  const { teamId: routeTeamId } = useParams();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [teamCode, setTeamCode] = useState("");
  // Stable per-tab session id for presence/conflict detection
  const [sessionId] = useState(() => {
    try {
      let s = sessionStorage.getItem("sk_session_id");
      if (!s) { s = Math.random().toString(36).slice(2) + Date.now().toString(36); sessionStorage.setItem("sk_session_id", s); }
      return s;
    } catch { return Math.random().toString(36).slice(2); }
  });
  const [conflictMsg, setConflictMsg] = useState<string | null>(null);
  const [authedTeam, setAuthedTeam] = useState<Team | null>(() => {
    try {
      const saved = sessionStorage.getItem("sk_authed_team");
      return saved ? (JSON.parse(saved) as Team) : null;
    } catch { return null; }
  });
  const [authError, setAuthError] = useState("");
  const [notStartedMsg, setNotStartedMsg] = useState<string | null>(null);
  const [currentHole, setCurrentHole] = useState<number>(() => {
    try {
      const saved = sessionStorage.getItem("sk_current_hole");
      return saved ? parseInt(saved) : 1;
    } catch { return 1; }
  });
  const [ctpModalHole, setCtpModalHole] = useState<number | null>(null);
  const [ctpWarningHole, setCtpWarningHole] = useState<number | null>(null);
  const [ldModalHole, setLdModalHole] = useState<number | null>(null);
  const [ldWarningHole, setLdWarningHole] = useState<number | null>(null);
  const [pendingStrokes, setPendingStrokes] = useState<{ holeNumber: number; strokes: number } | null>(null);
  const [showRoundComplete, setShowRoundComplete] = useState(false);
  const [showScorecardView, setShowScorecardView] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  // Editing an already-finished card from the round-complete popup: after each
  // saved edit, prompt to keep editing or officially submit.
  const [editMode, setEditMode] = useState(false);
  const [showContinuePrompt, setShowContinuePrompt] = useState(false);
  const [confirmEdit, setConfirmEdit] = useState<{ holeNumber: number; oldScore: number; newScore: number } | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(() => !!(authedTeam?.isSubmitted));
  const [showSkipWarning, setShowSkipWarning] = useState(false);
  // Track which holes this team submitted CTP/LD entries for this session
  const [submittedCtpHoles, setSubmittedCtpHoles] = useState<number[]>([]);



  const [, navigate] = useLocation();
  const { data: holes = [] } = useQuery<Hole[]>({ queryKey: ["/api/holes"] });
  const { data: teams = [] } = useQuery<Team[]>({ queryKey: ["/api/teams"] });
  const { data: settings } = useQuery<TournamentSettings>({ queryKey: ["/api/settings"] });
  const { data: leaderboard = [] } = useQuery<any[]>({ queryKey: ["/api/leaderboard"] });

  // Sync isSubmitted from live teams query so the persisted Supabase value is
  // picked up even when the sessionStorage-cached team predates the is_submitted column.
  useEffect(() => {
    if (!authedTeam) return;
    const live = teams.find((t) => t.id === authedTeam.id);
    if (live) setIsSubmitted(!!live.isSubmitted);
  }, [teams, authedTeam]);

  // Heartbeat so this device stays "active" for presence/conflict detection
  useEffect(() => {
    if (!authedTeam) return;
    const beat = () => { apiRequest("POST", "/api/scorekeeper/heartbeat", { teamId: authedTeam.id, sessionId }).catch(() => {}); };
    beat();
    const id = setInterval(beat, 20000);
    return () => clearInterval(id);
  }, [authedTeam, sessionId]);

  // When an admin clears a submitted team's scores, the live is_submitted flips
  // back to false. Reset the scorekeeper to the start of their round so they can
  // re-enter scores from the beginning instead of being stuck on the last hole.
  const wasSubmittedRef = useRef(isSubmitted);
  useEffect(() => {
    if (wasSubmittedRef.current && !isSubmitted) {
      const start = authedTeam?.startingHole ?? 1;
      setCurrentHole(start);
      try { sessionStorage.setItem("sk_current_hole", String(start)); } catch {}
    }
    wasSubmittedRef.current = isSubmitted;
  }, [isSubmitted, authedTeam]);

  const { data: ctpEntries = [], refetch: refetchCtp } = useQuery<ClosestToPin[]>({ queryKey: ["/api/ctp"] });
  const { data: ctpHistory = [] } = useQuery<any[]>({ queryKey: ["/api/ctp/history"] });
  const { data: sponsors = [] } = useQuery<Sponsor[]>({ queryKey: ["/api/sponsors"] });

  const teamScores = useQuery<Score[]>({
    queryKey: ["/api/scores/team", authedTeam?.id],
    enabled: !!authedTeam,
  });

  const holeMap = new Map(holes.map(h => [h.holeNumber, h]));
  const scoreMap = new Map((teamScores.data ?? []).map(s => [s.holeNumber, s]));
  const ctpHoles = holes.filter(h => h.isCtpHole && h.par === 3);
  const currentHoleData = holeMap.get(currentHole);
  const currentScore = scoreMap.get(currentHole);
  const [localScore, setLocalScore] = useState<string>("");

  useEffect(() => {
    setLocalScore(currentScore?.strokes?.toString() ?? "");
  }, [currentHole, currentScore?.strokes]);

  // Once scores are actually fetched, seek to the first unscored hole in sequence.
  // If all holes are scored, land on the last hole in their sequence.
  useEffect(() => {
    if (!authedTeam || !teamScores.isFetched) return;
    const start = authedTeam.startingHole ?? 1;
    const last  = start === 1 ? 18 : start - 1;
    const scored = new Set((teamScores.data ?? []).filter(s => s.strokes != null).map(s => s.holeNumber));
    let h = start;
    let allScored = false;
    for (let i = 0; i < 18; i++) {
      if (!scored.has(h)) break;
      const next = h === 18 ? 1 : h + 1;
      if (next === start) { allScored = true; break; } // completed full loop
      h = next;
    }
    const target = allScored ? last : h;
    setCurrentHole(target);
    try { sessionStorage.setItem("sk_current_hole", String(target)); } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authedTeam?.id, teamScores.isFetched]);

  // Auto-login if routeTeamId exists (e.g. launched from admin portal)
  useEffect(() => {
    if (routeTeamId && teams.length > 0) {
      const team = teams.find(t => t.id === parseInt(routeTeamId));
      if (team) {
        setAuthedTeam(team);
        const startHole = team.startingHole ?? 1;
        setCurrentHole(startHole);
        try {
          sessionStorage.setItem("sk_authed_team", JSON.stringify(team));
          sessionStorage.setItem("sk_current_hole", String(startHole));
        } catch {}
      }
    }
  }, [routeTeamId, teams]);

  // Poll scores every 4 seconds
  useEffect(() => {
    if (!authedTeam) return;
    const id = setInterval(() => {
      qc.invalidateQueries({ queryKey: ["/api/scores/team", authedTeam.id] });
    }, 4000);
    return () => clearInterval(id);
  }, [authedTeam, qc]);

  const scoreMutation = useMutation({
    mutationFn: (data: { teamId: number; holeNumber: number; strokes: number | null }) =>
      apiRequest("POST", "/api/scores", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/scores/team", authedTeam?.id] });
      qc.invalidateQueries({ queryKey: ["/api/leaderboard"] });
    },
    onError: () => toast({ title: "Error saving score", variant: "destructive" }),
  });

  const submitMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/teams/${authedTeam?.id}/submit`, {}),
    onSuccess: () => {
      setIsSubmitted(true);
      setShowSubmitConfirm(false);
      setShowRoundComplete(false);
      setShowContinuePrompt(false);
      setEditMode(false);
      // Clear session so next team starts fresh
      try { sessionStorage.removeItem("sk_authed_team"); sessionStorage.removeItem("sk_current_hole"); } catch {}
      toast({ title: "Scorecard officially submitted!" });
    },
    onError: () => toast({ title: "Error submitting scorecard", variant: "destructive" }),
  });

  const pendingStrokesRef = { current: pendingStrokes };
  pendingStrokesRef.current = pendingStrokes;

  const ctpMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/ctp", data),
    onSuccess: (_res, variables) => {
      qc.invalidateQueries({ queryKey: ["/api/ctp"] });
      const pending = pendingStrokesRef.current;
      // Commit the held hole score silently — combined toast below handles messaging
      commitPendingScore(pending, true);
      // Track which hole this team submitted CTP for
      const ctpHole = ctpModalHole;
      if (ctpHole !== null) {
        setSubmittedCtpHoles(prev => prev.includes(ctpHole) ? prev : [...prev, ctpHole]);
        // Only advance if a held score was just saved as part of this flow.
        // Entering CTP alone (no score yet) stays put until they hit Save.
        if (pending) advanceHole(ctpHole);
      }
      setCtpModalHole(null);
      const player = variables?.playerName ?? "";
      const title = pending
        ? `Hole ${pending.holeNumber}: Score saved (${pending.strokes}) · CTP: ${player}`
        : `CTP saved${player ? ` — ${player}` : ""}`;
      const { dismiss } = toast({ title });
      setTimeout(dismiss, 3000);
    },
  });

  const ldMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/ctp", data),
    onSuccess: (_res, variables) => {
      qc.invalidateQueries({ queryKey: ["/api/ctp"] });
      const pending = pendingStrokesRef.current;
      // Commit the held hole score silently — combined toast below handles messaging
      commitPendingScore(pending, true);
      // Track that this team submitted LD (hole 15)
      const ldHole = ldModalHole;
      if (ldHole !== null) {
        setSubmittedCtpHoles(prev => prev.includes(ldHole) ? prev : [...prev, ldHole]);
        // Only advance if a held score was just saved as part of this flow.
        // Entering Long Drive alone (no score yet) stays put until they hit Save.
        if (pending) advanceHole(ldHole);
      }
      setLdModalHole(null);
      const player = variables?.playerName ?? "";
      const title = pending
        ? `Hole ${pending.holeNumber}: Score saved (${pending.strokes}) · Long Drive: ${player}`
        : `Long Drive saved${player ? ` — ${player}` : ""}`;
      const { dismiss } = toast({ title });
      setTimeout(dismiss, 3000);
    },
  });

  async function handleLogin(force = false) {
    try {
      const res = await apiRequest("POST", "/api/auth/scorekeeper", { teamCode: teamCode.toUpperCase().trim(), sessionId, force });
      const data = await res.json();
      setConflictMsg(null);
      setAuthedTeam(data.team);
      // Don't set currentHole here — the seek effect will set it once scores load
      sessionStorage.setItem("sk_authed_team", JSON.stringify(data.team));
      setAuthError("");
    } catch (err) {
      // Surface the server's message (e.g. flight not started, tournament complete)
      let msg = "Invalid team code. Check with your admin.";
      let reason = "";
      try {
        const text = String((err as Error)?.message ?? "");
        const json = JSON.parse(text.slice(text.indexOf("{")));
        if (json.message) msg = json.message;
        if (json.reason) reason = json.reason;
      } catch {}
      // Route by reason: flight-not-started popup, already-active warning, else inline
      if (reason === "flight_inactive") {
        setNotStartedMsg(msg);
        setAuthError("");
      } else if (reason === "already_active") {
        setConflictMsg(msg);
        setAuthError("");
      } else {
        setAuthError(msg);
      }
    }
  }

  function commitPendingScore(pending: { holeNumber: number; strokes: number } | null, silent = false) {
    if (!pending || !authedTeam) return;
    scoreMutation.mutate({ teamId: authedTeam.id, holeNumber: pending.holeNumber, strokes: pending.strokes });
    if (!silent) {
      const { dismiss } = toast({ title: `Hole ${pending.holeNumber}: Score saved (${pending.strokes})` });
      setTimeout(dismiss, 3000);
    }
    setPendingStrokes(null);
  }

  function handleSaveScore() {
    if (!authedTeam) return;
    const fs = authedTeam.flight === "morning" ? settings?.amStatus : settings?.pmStatus;
    if (settings?.tournamentMode === "complete" || (settings?.tournamentMode === "live" && fs === "complete")) {
      toast({ title: "Round complete", description: "Scores can no longer be edited.", variant: "destructive" });
      return;
    }
    // Block if previous hole in sequence has no saved score
    const prevH = getPrevHoleInSequence(currentHole, startingHole);
    if (prevH !== null && !scoreMap.has(prevH)) {
      setShowSkipWarning(true);
      return;
    }
    const strokes = parseInt(localScore);
    const bogey = par + 1;
    if (isNaN(strokes) || strokes < 1) {
      toast({ title: "Select a score first", variant: "destructive" });
      return;
    }
    if (strokes > bogey) {
      toast({ title: `Max score for this hole is ${bogey} (Bogey)`, variant: "destructive" });
      return;
    }
    setLocalScore("");

    // Editing a finished card: just save this hole, then ask continue-or-submit.
    if (editMode) {
      scoreMutation.mutate({ teamId: authedTeam.id, holeNumber: currentHole, strokes });
      const { dismiss } = toast({ title: `Hole ${currentHole}: Score updated (${strokes})` });
      setTimeout(dismiss, 2500);
      setShowContinuePrompt(true);
      return;
    }

    // Mid-round: if this hole already has a saved score and they're changing it,
    // confirm before saving (only before all 18 are in — editMode handles after).
    const existing = scoreMap.get(currentHole)?.strokes;
    if (existing != null && existing !== strokes) {
      setConfirmEdit({ holeNumber: currentHole, oldScore: existing, newScore: strokes });
      return;
    }

    proceedSave(strokes);
  }

  // Runs the CTP/LD prompts (if needed) then saves the score and advances.
  function proceedSave(strokes: number) {
    if (!authedTeam) return;
    // Has THIS team already marked a CTP/LD player for this hole? Check both the
    // in-session list AND the persistent history (survives refresh / coming back).
    const teamAlreadyMarked = submittedCtpHoles.includes(currentHole)
      || ctpHistory.some((h: any) => h.holeNumber === currentHole && h.teamId === authedTeam.id);

    // CTP hole: prompt unless THIS team already submitted one of their players,
    // even if another team currently holds the closest-to-pin for this hole.
    const isCtp = currentHoleData?.isCtpHole && currentHoleData?.par === 3;
    if (isCtp && !teamAlreadyMarked) {
      setPendingStrokes({ holeNumber: currentHole, strokes });
      setCtpWarningHole(currentHole);
      return;
    }
    // LD hole (par 4/5 with toggle on): same rule — prompt unless this team already entered one
    const isLdHole = !!(currentHoleData?.isCtpHole && currentHoleData?.par !== 3);
    if (isLdHole && !teamAlreadyMarked) {
      setPendingStrokes({ holeNumber: currentHole, strokes });
      setLdWarningHole(currentHole);
      return;
    }
    // Otherwise save and advance normally
    scoreMutation.mutate({ teamId: authedTeam.id, holeNumber: currentHole, strokes });
    const { dismiss } = toast({ title: `Hole ${currentHole}: Score saved (${strokes})` });
    setTimeout(dismiss, 3000);
    advanceHole(currentHole);
  }

  // The hole immediately before currentHole in playing sequence (wrapping); null if currentHole === startingHole
  function getPrevHoleInSequence(hole: number, start: number): number | null {
    if (hole === start) return null;
    return hole === 1 ? 18 : hole - 1;
  }

  // Quick score just selects — does NOT save or advance
  function handleQuickScore(n: number) {
    const fs = authedTeam?.flight === "morning" ? settings?.amStatus : settings?.pmStatus;
    if (settings?.tournamentMode === "complete" || (settings?.tournamentMode === "live" && fs === "complete")) return;
    // Block if previous hole in sequence has no saved score
    const prevH = getPrevHoleInSequence(currentHole, startingHole);
    if (prevH !== null && !scoreMap.has(prevH)) {
      setShowSkipWarning(true);
      return;
    }
    setLocalScore(n.toString());
  }

  const par = currentHoleData?.par ?? 4;

  // Build score options: always start with 1 (Hole in One),
  // then fill from 2 up to bogey, skipping 1 if it would duplicate
  function getScoreOptions(par: number) {
    const bogey = par + 1;
    const options: { score: number; label: string }[] = [];
    // Always show 1 as Hole in One
    options.push({ score: 1, label: "Hole in One" });
    for (let s = 2; s <= bogey; s++) {
      const diff = s - par;
      let label: string;
      if (diff <= -3) label = "Albatross";       // catches par-5 hole-in-one edge
      else if (diff === -3) label = "Albatross";
      else if (diff === -2) label = "Eagle";
      else if (diff === -1) label = "Birdie";
      else if (diff === 0) label = "Par";
      else label = "Bogey";
      options.push({ score: s, label });
    }
    return options;
  }
  const scoreOptions = getScoreOptions(par);

  const scorecardSponsors = sponsors.filter(s => s.placement === "scorecard" || s.placement === "both");

  // ─── LOGIN SCREEN ────────────────────────────────────────────────────────────
  if (!authedTeam) {
    return (
      <div className="max-w-sm mx-auto space-y-6 pt-8">
        <div className="text-center">
          <img src={bigCountryLogo} alt="Big Country Title Company" className="w-56 mx-auto mb-6 object-contain" />
          <h1 className="text-xl font-bold text-[#b06b10] mb-1">Scorekeeper Entry</h1>
          <p className="text-[#1a2744]/55 text-sm font-sans-app">Enter your team code to begin</p>
        </div>
        <div className="atd-card rounded-xl p-6 space-y-4 font-sans-app">
          <div>
            <Label className="text-[#1a2744]/60 text-sm mb-2 block">Team Code</Label>
            <Input
              value={teamCode}
              onChange={e => setTeamCode(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === "Enter" && handleLogin()}
              placeholder="e.g. A1B2"
              maxLength={6}
              className="bg-[#1a2744]/5 border-[#1a2744]/15 text-[#1a2744] text-lg tracking-widest text-center font-mono"
              data-testid="input-team-code"
            />
          </div>
          {authError && <p className="text-red-400 text-sm">{authError}</p>}
          <Button
            onClick={() => handleLogin()}
            className="w-full bg-amber-500/25 border border-amber-500/60 text-[#b06b10] hover:bg-amber-500/30 font-bold"
            data-testid="button-login"
          >
            Enter Scorecard
          </Button>
        </div>

        {/* Sponsor area */}
        {scorecardSponsors.length > 0 && (
          <div className="atd-card rounded-xl p-4">
            <p className="text-center text-amber-500/30 text-xs uppercase tracking-widest font-sans-app mb-3">Presented By</p>
            <div className="flex flex-wrap justify-center gap-3">
              {scorecardSponsors.map(s => (
                <div key={s.id} className="sponsor-logo-container">
                  {s.logoUrl ? (
                    <img src={s.logoUrl} alt={s.name} className="h-8 max-w-[100px] object-contain opacity-70" />
                  ) : (
                    <span className="text-[#b06b10]/60 text-sm font-bold">{s.name}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Flight-not-started popup — styled like the welcome/role modal, with logo */}
        {notStartedMsg && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-6" style={{ background: "rgba(17,27,51,0.72)", backdropFilter: "blur(4px)" }}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs p-5 flex flex-col items-center gap-3" style={{ border: "2px solid #b06b10" }}>
              <img src={atdLogoWelcome} alt="ATD" className="w-44 h-44 object-contain" />
              <div className="text-center">
                <h2 className="font-bold text-[#1a2744] text-xl mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>Hold Tight</h2>
                <p className="text-[#1a2744]/65 text-sm font-sans-app leading-relaxed">{notStartedMsg}</p>
              </div>
              <button
                onClick={() => { setNotStartedMsg(null); navigate("/"); }}
                className="w-full py-3 rounded-xl font-bold text-white font-sans-app text-sm transition-all"
                style={{ background: "linear-gradient(135deg, #1a2744, #243461)", border: "1.5px solid rgba(176,107,16,0.4)" }}
              >
                Got It
              </button>
            </div>
          </div>
        )}

        {/* Already-signed-in-elsewhere warning — Continue or Cancel */}
        {conflictMsg && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-6" style={{ background: "rgba(17,27,51,0.72)", backdropFilter: "blur(4px)" }}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs p-5 flex flex-col items-center gap-3" style={{ border: "2px solid #b06b10" }}>
              <img src={atdLogoWelcome} alt="ATD" className="w-36 h-36 object-contain" />
              <div className="text-center">
                <h2 className="font-bold text-[#1a2744] text-xl mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>Already Signed In Elsewhere</h2>
                <p className="text-[#1a2744]/65 text-sm font-sans-app leading-relaxed">{conflictMsg}</p>
              </div>
              <div className="flex flex-col gap-2 w-full pt-1">
                <button
                  onClick={() => { setConflictMsg(null); handleLogin(true); }}
                  className="w-full py-3 rounded-xl font-bold text-white font-sans-app text-sm transition-all"
                  style={{ background: "linear-gradient(135deg, #1a2744, #243461)", border: "1.5px solid rgba(176,107,16,0.4)" }}
                >
                  Continue Anyway
                </button>
                <button
                  onClick={() => setConflictMsg(null)}
                  className="w-full py-2 rounded-xl font-bold font-sans-app text-sm transition-all text-[#1a2744]/55 hover:text-[#1a2744]/75"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── FLIGHT / MODE LOCK ──────────────────────────────────────────────────────
  // Live mode + flight Not Started → block score entry with a lock screen that
  // auto-unlocks via SSE when the admin flips it to In Progress.
  // Tournament Complete mode or flight Complete → scorecard stays viewable but
  // read-only (banner below, all saves disabled).
  const tMode = settings?.tournamentMode ?? "test";
  const flightStatus = authedTeam.flight === "morning" ? (settings?.amStatus ?? "not_started") : (settings?.pmStatus ?? "not_started");
  const readOnly = tMode === "complete" || (tMode === "live" && flightStatus === "complete");
  const flightLocked = tMode === "live" && flightStatus === "not_started";

  function signOut() {
    try { sessionStorage.removeItem("sk_authed_team"); sessionStorage.removeItem("sk_current_hole"); } catch {}
    setAuthedTeam(null);
    setTeamCode("");
  }

  if (flightLocked) {
    const flLabel = authedTeam.flight === "morning" ? "AM" : "PM";
    return (
      <div className="max-w-sm mx-auto space-y-5 pt-10">
        <div className="atd-card rounded-xl p-6 text-center space-y-3">
          <div className="text-4xl">⛳</div>
          <h1 className="text-lg font-bold text-[#b06b10]">{flLabel} Flight Hasn't Started</h1>
          <p className="text-[#1a2744]/65 text-sm font-sans-app leading-relaxed">
            This flight has not officially started yet. Please wait until you arrive at the tee box of your first hole — this screen will unlock automatically when your flight begins.
          </p>
          <div className="flex flex-col gap-2 pt-1">
            <Button onClick={() => navigate("/")} className="w-full bg-amber-500/25 border border-amber-500/60 text-[#b06b10] hover:bg-amber-500/30 font-bold font-sans-app">
              View Leaderboard
            </Button>
            <Button variant="ghost" onClick={signOut} className="w-full text-[#1a2744]/55 font-sans-app">
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ─── SCOREKEEPER MAIN ────────────────────────────────────────────────────────
  // Starting hole from admin setup; last hole wraps around (e.g. start=7 → last=6, start=1 → last=18)
  const startingHole = authedTeam.startingHole ?? 1;
  const lastHole = startingHole === 1 ? 18 : startingHole - 1;

  // Flight is "final" once every team in this flight is thru 18 (Thru = F) AND has
  // officially submitted. Until then, CTP/LD entries show "Still Leading!" not "Winner!".
  const flightEntries = leaderboard.filter((e: any) => e.team?.flight === authedTeam.flight);
  const flightFinal = flightEntries.length > 0 && flightEntries.every((e: any) => e.holesCompleted === 18 && e.team?.isSubmitted);

  // Advance to next hole respecting the round boundary; show round complete on last hole
  function advanceHole(from: number) {
    if (from === lastHole) {
      setShowRoundComplete(true);
      return;
    }
    const next = from === 18 ? 1 : from + 1;
    setCurrentHole(next);
    try { sessionStorage.setItem("sk_current_hole", String(next)); } catch {}
  }

  const completedHoles = (teamScores.data ?? []).filter(s => s.strokes != null).length;
  const totalStrokes = (teamScores.data ?? []).filter(s => s.strokes != null).reduce((s, sc) => s + (sc.strokes ?? 0), 0);
  const totalPar = (teamScores.data ?? []).filter(s => s.strokes != null).reduce((s, sc) => {
    return s + (holeMap.get(sc.holeNumber)?.par ?? 4);
  }, 0);
  const runningToPar = totalStrokes - totalPar;

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-10">
      {/* Team header */}
      <div className="atd-card rounded-xl p-4">
        {/* Row 1: team name + total score + flight badge */}
        {(() => {
          const rawScore = completedHoles === 0 ? "E" : runningToPar === 0 ? "E" : runningToPar > 0 ? `+${runningToPar}` : `${runningToPar}`;
          const isUnder = runningToPar < 0 && completedHoles > 0;
          const isOver = runningToPar > 0 && completedHoles > 0;
          const isEven = !isUnder && !isOver;
          // Parentheses: red for under par, black for E/over
          const totalDisp = isUnder
            ? <span style={{ color: "#c0323e" }}>(<span>{rawScore}</span>)</span>
            : <span style={{ color: "#1a2744" }}>(<span>{rawScore}</span>)</span>;
          // Auto-fit one line: full team name stays visible; if too long the whole
          // row (name, score, AM/PM + Start Hole badges) scales down proportionally.
          return (
            <FitRow className="flex items-center gap-[0.4em] mb-2 flex-nowrap w-full whitespace-nowrap">
              <h2 className="font-bold text-[#b06b10] leading-tight shrink-0" style={{ fontSize: "1.125em" }}>{authedTeam.teamName}</h2>
              <span className="font-bold leading-tight shrink-0" style={{ fontFamily: "'Rajdhani', sans-serif", letterSpacing: "0.05em", fontSize: "1.125em" }}>{totalDisp}</span>
              <div className="flex-1" />
              <Badge className={`font-sans-app font-bold shrink-0 whitespace-nowrap px-1.5 ${authedTeam.flight === "morning" ? "bg-blue-500/20 text-blue-600 border-blue-500/30" : "bg-amber-500/25 text-[#b06b10] border-amber-500/40"}`} style={{ fontSize: "0.7em" }}>
                {authedTeam.flight === "morning" ? "AM" : "PM"}
              </Badge>
              <Badge className="bg-[#1a2744]/8 text-[#1a2744]/60 border-[#1a2744]/15 font-sans-app shrink-0 whitespace-nowrap px-1.5" style={{ fontSize: "0.7em" }}>
                Start Hole: {authedTeam.startingHole ?? 1}
              </Badge>
            </FitRow>
          );
        })()}
        {/* Row 2: player names — auto-fit so all names stay on one line */}
        <FitRow className="w-full whitespace-nowrap">
          <span className="text-[#1a2744]/55 font-sans-app" style={{ fontSize: "0.78em" }}>
            {[authedTeam.player1, authedTeam.player2, authedTeam.player3, authedTeam.player4].filter(Boolean).join(" · ")}
          </span>
        </FitRow>
      </div>

      {/* Sponsor bar */}
      {scorecardSponsors.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2 py-2 px-4 bg-[#1a2744]/5 border border-amber-500/10 rounded-lg">
          {scorecardSponsors.map(s => (
            <div key={s.id} className="sponsor-logo-container">
              {s.logoUrl
                ? <img src={s.logoUrl} alt={s.name} className="h-6 max-w-[80px] object-contain opacity-70" />
                : <span className="text-[#b06b10]/70 text-xs font-bold font-sans-app">{s.name}</span>
              }
            </div>
          ))}
        </div>
      )}

      {/* Score Entry + inline Scorecard */}
      <div className="space-y-4">
          {/* Round/Tournament complete — one bordered line with View Summary, auto-fits */}
          {(isSubmitted || readOnly) && (
            <div className="bg-[#1a2744]/8 border border-[#1a2744]/20 rounded-xl px-4 py-2.5 flex items-center justify-center gap-2 flex-nowrap whitespace-nowrap font-sans-app text-[clamp(11px,3.4vw,14px)]">
              <span className="text-[#1a2744] font-bold">🏁 {tMode === "complete" ? "Tournament Complete" : "Round Complete"}</span>
              <span className="text-[#1a2744]/30">·</span>
              <button onClick={() => setShowRoundComplete(true)} className="text-[#b06b10] font-bold underline hover:text-[#8a5008]">View Summary</button>
            </div>
          )}

          {/* Hole navigation */}
          <div className="atd-card rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              {/* Back arrow — allowed only if the previous hole has a saved score */}
              {(() => {
                const prevHole = currentHole === 1 ? 18 : currentHole - 1;
                const canGoBack = currentHole !== startingHole;
                return (
                  <button
                    onClick={() => {
                      setCurrentHole(prevHole);
                      try { sessionStorage.setItem("sk_current_hole", String(prevHole)); } catch {}
                    }}
                    disabled={!canGoBack}
                    className="p-2 rounded-lg bg-[#1a2744]/5 hover:bg-[#1a2744]/8 disabled:opacity-30 text-[#1a2744]/70 transition-colors"
                    data-testid="button-prev-hole"
                  >
                    <ChevronLeft size={20} />
                  </button>
                );
              })()}
              <div className="text-center">
                <div className="text-[#b06b10]/70 text-xs uppercase tracking-widest font-sans-app">Hole</div>
                <div className="flex items-center justify-center">
                  <div className="text-3xl font-bold text-[#b06b10]">{currentHole}</div>
                </div>
                <div className="flex items-center justify-center gap-3 font-sans-app text-xs text-[#1a2744]/55">
                  <span>Par {par}</span>
                  {currentHoleData?.handicap && <span>Hdcp {currentHoleData.handicap}</span>}
                  {currentHoleData?.yardageBlue && <span>{currentHoleData.yardageBlue} yds</span>}
                </div>
              </div>
              <button
                onClick={() => advanceHole(currentHole)}
                disabled={currentHole === lastHole}
                className="p-2 rounded-lg bg-[#1a2744]/5 hover:bg-[#1a2744]/8 disabled:opacity-30 text-[#1a2744]/70 transition-colors"
                data-testid="button-next-hole"
              >
                <ChevronRight size={20} />
              </button>
            </div>

            {/* Score selection buttons + Save in same row */}
            <div className="mb-2">
              <div className="flex items-center justify-between gap-2 mb-1.5 min-w-0">
                <p className="text-[#1a2744]/50 text-xs uppercase tracking-wider font-sans-app shrink-0">Select Score</p>
                {(() => {
                  if (!currentHoleData?.isCtpHole) return null;
                  const isLdHole = currentHoleData.par !== 3;
                  const lead = ctpEntries.find(c => c.holeNumber === currentHole && c.flight === authedTeam.flight);
                  const mine = lead?.teamId === authedTeam.id;
                  const leadTeamName = lead?.teamId ? teams.find(t => t.id === lead.teamId)?.teamName : null;
                  return (
                    <span className="flex items-center gap-1 min-w-0 text-[11px] font-sans-app">
                      <span className={`shrink-0 font-bold text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded-md border ${isLdHole ? "bg-blue-500/15 text-blue-700 border-blue-500/30" : "bg-amber-500/20 text-[#b06b10] border-amber-500/40"}`}>{isLdHole ? "LD" : "CTP"}</span>
                      {lead?.playerName ? (
                        <>
                          <span className="font-bold text-[#1a2744] truncate">{lead.playerName}</span>
                          {mine ? (
                            <span className="shrink-0 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-green-600/15 text-green-700">Your group</span>
                          ) : (
                            <span className="shrink min-w-0 truncate max-w-[40%] text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#1a2744]/8 text-[#1a2744]/55">{leadTeamName ?? "Other group"}</span>
                          )}
                        </>
                      ) : (
                        <span className="text-[#1a2744]/45 italic truncate">No entry yet</span>
                      )}
                    </span>
                  );
                })()}
              </div>
              <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${scoreOptions.length + 1}, 1fr)` }}>
                {scoreOptions.map(({ score, label }) => {
                  const isActive = localScore === score.toString();
                  return (
                    <button
                      key={score}
                      onClick={() => handleQuickScore(score)}
                      data-testid={`button-score-${score}`}
                      className={`flex items-center justify-center rounded-lg py-2 px-1 border transition-all font-sans-app ${
                        isActive
                          ? "bg-amber-500/30 border-amber-400/60 text-[#1a2744]"
                          : "bg-[#1a2744]/5 border-[#1a2744]/12 text-[#1a2744]/70 hover:bg-[#1a2744]/8 hover:text-[#1a2744]"
                      }`}
                    >
                      <span className="text-xl font-bold">{score}</span>
                    </button>
                  );
                })}
                {/* Save button — lights up amber gold when a score is selected */}
                <button
                  onClick={handleSaveScore}
                  disabled={scoreMutation.isPending || !localScore || isSubmitted || readOnly}
                  data-testid="button-save-score"
                  className={`flex items-center justify-center rounded-lg py-2 px-1 border transition-all font-sans-app font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed ${
                    localScore
                      ? "bg-[#b06b10] border-[#b06b10] text-white hover:bg-[#8a5008]"
                      : "bg-amber-500/25 border-amber-400/60 text-[#1a2744] hover:bg-amber-500/35"
                  }`}
                >
                  Save
                </button>
              </div>
            </div>

            {/* CTP quick-entry if this is a CTP hole (current leader is shown on the Select Score row) */}
            {currentHoleData?.isCtpHole && currentHoleData?.par === 3 && !isSubmitted && !readOnly && (() => {
              const hasLeader = !!ctpEntries.find(c => c.holeNumber === currentHole && c.flight === authedTeam.flight)?.playerName;
              return (
                <button
                  onClick={() => setCtpModalHole(currentHole)}
                  className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-amber-500/40 border border-amber-500/60 text-amber-900 hover:bg-amber-500/55 transition-all font-sans-app text-sm font-bold"
                  data-testid="button-enter-ctp"
                >
                  <Target size={14} className="shrink-0" /> {hasLeader ? `Update Closest to Pin` : `Enter Closest to Pin for Hole ${currentHole}`}
                </button>
              );
            })()}
            {/* Long Drive quick-entry if this is an LD hole (par 4/5 with toggle on) */}
            {(currentHoleData?.isCtpHole && currentHoleData?.par !== 3) && !isSubmitted && !readOnly && (() => {
              const hasLeader = !!ctpEntries.find(c => c.holeNumber === currentHole && c.flight === authedTeam.flight)?.playerName;
              return (
                <button
                  onClick={() => setLdModalHole(currentHole)}
                  className="mt-2 w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-blue-500/40 border border-blue-500/60 text-blue-900 hover:bg-blue-500/55 transition-all font-sans-app text-sm font-bold"
                  data-testid="button-enter-ld"
                >
                  <Zap size={14} className="shrink-0" /> {hasLeader ? `Update Long Drive` : `Enter Long Drive for Hole ${currentHole}`}
                </button>
              );
            })()}
          </div>

          {/* Inline scorecard — no header, no legend */}
          <div className="atd-card rounded-xl overflow-hidden">
            <div className="p-3">
              <ScorecardTable
                holes={holes}
                scores={teamScores.data ?? []}
                scrollToHole={currentHole}
              />
            </div>
          </div>

          {/* Big Country Title sponsor logo */}
          <div className="flex justify-center px-4">
            <img
              src={bigCountryLogo}
              alt="Big Country Title Company"
              style={{
                width: "100%",
                maxWidth: "min(320px, 80vw)",
                maxHeight: "min(200px, 25vh)",
                height: "auto",
                display: "block",
                objectFit: "contain",
              }}
            />
          </div>
          {/* Browser-bar spacer: always pushes content above Safari/Chrome URL bar */}
          <div className="browser-bar-spacer" />
      </div>

      {/* Skip Warning Dialog — previous hole not yet scored */}
      <Dialog open={showSkipWarning} onOpenChange={() => setShowSkipWarning(false)}>
        <DialogContent className="bg-[#f0ebe1] border-[#1a2744]/20 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[#1a2744] font-bold">Hole Not Completed</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 font-sans-app">
            <p className="text-[#1a2744]/75 text-sm">
              You need to save a score for Hole {getPrevHoleInSequence(currentHole, startingHole)} before entering a score for Hole {currentHole}.
            </p>
            <Button
              onClick={() => {
                // Find the first hole in sequence with no saved score
                let h = startingHole;
                for (let i = 0; i < 18; i++) {
                  if (!scoreMap.has(h)) break;
                  h = h === 18 ? 1 : h + 1;
                  if (h === startingHole) break; // full loop, all scored
                }
                setCurrentHole(h);
                try { sessionStorage.setItem("sk_current_hole", String(h)); } catch {}
                setShowSkipWarning(false);
              }}
              className="w-full bg-[#1a2744] text-white hover:bg-[#243461]"
            >
              Go to Current Hole
            </Button>
            <Button variant="ghost" onClick={() => setShowSkipWarning(false)} className="w-full text-[#1a2744]/55">
              Dismiss
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* CTP Warning Dialog — conditionally rendered when needed */}
      {ctpWarningHole !== null && (
        <Dialog open={true} onOpenChange={(open) => {
          if (!open) {
            commitPendingScore(pendingStrokes);
            advanceHole(ctpWarningHole);
            setCtpWarningHole(null);
          }
        }}>
          <DialogContent className="bg-[#f0ebe1] border-[#1a2744]/20 max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-[#1a2744] font-bold flex items-center gap-2">
                <Target size={18} className="text-[#b06b10]" /> Closest to the Pin
              </DialogTitle>
            </DialogHeader>
            <p className="text-[#1a2744]/75 font-sans-app text-sm">
              Was one of your players closest to the pin?
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  setCtpModalHole(ctpWarningHole);
                  setCtpWarningHole(null);
                }}
                className="flex-1 py-2.5 rounded-lg bg-[#1a2744] text-white font-bold font-sans-app text-sm hover:bg-[#243461] transition-colors"
              >
                Yes
              </button>
              <button
                onClick={() => {
                  commitPendingScore(pendingStrokes);
                  advanceHole(ctpWarningHole);
                  setCtpWarningHole(null);
                }}
                className="flex-1 py-2.5 rounded-lg bg-[#1a2744]/10 border border-[#1a2744]/20 text-[#1a2744] font-bold font-sans-app text-sm hover:bg-[#1a2744]/15 transition-colors"
              >
                No
              </button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* CTP Modal */}
      {ctpModalHole !== null && (
        <CtpEntryModal
          open={ctpModalHole !== null}
          onClose={() => setCtpModalHole(null)}
          holeNumber={ctpModalHole}
          hole={holeMap.get(ctpModalHole)}
          teamPlayers={[authedTeam.player1, authedTeam.player2, authedTeam.player3, authedTeam.player4].filter(Boolean) as string[]}
          currentEntry={ctpEntries.find(c => c.holeNumber === ctpModalHole && c.flight === authedTeam.flight)}
          currentTeamName={(() => { const e = ctpEntries.find(c => c.holeNumber === ctpModalHole && c.flight === authedTeam.flight); const t = e?.teamId ? teams.find(tm => tm.id === e.teamId) : null; return t?.teamName; })()}
          onSave={data => ctpMutation.mutate({ ...data, teamId: authedTeam.id, flight: authedTeam.flight })}
          mode="ctp"
        />
      )}

      {/* LD Warning Dialog — conditionally rendered when needed */}
      {ldWarningHole !== null && (
        <Dialog open={true} onOpenChange={(open) => {
          if (!open) {
            commitPendingScore(pendingStrokes);
            advanceHole(ldWarningHole);
            setLdWarningHole(null);
          }
        }}>
          <DialogContent className="bg-[#f0ebe1] border-[#1a2744]/20 max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-[#1a2744] font-bold flex items-center gap-2">
                <Zap size={18} className="text-blue-600" /> Long Drive
              </DialogTitle>
            </DialogHeader>
            <p className="text-[#1a2744]/75 font-sans-app text-sm">
              Did one of your players have the longest drive?
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  setLdModalHole(ldWarningHole);
                  setLdWarningHole(null);
                }}
                className="flex-1 py-2.5 rounded-lg bg-blue-600 text-white font-bold font-sans-app text-sm hover:bg-blue-700 transition-colors"
              >
                Yes
              </button>
              <button
                onClick={() => {
                  commitPendingScore(pendingStrokes);
                  advanceHole(ldWarningHole);
                  setLdWarningHole(null);
                }}
                className="flex-1 py-2.5 rounded-lg bg-[#1a2744]/10 border border-[#1a2744]/20 text-[#1a2744] font-bold font-sans-app text-sm hover:bg-[#1a2744]/15 transition-colors"
              >
                No
              </button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* LD Modal */}
      {ldModalHole !== null && (
        <CtpEntryModal
          open={ldModalHole !== null}
          onClose={() => setLdModalHole(null)}
          holeNumber={ldModalHole}
          hole={holeMap.get(ldModalHole)}
          teamPlayers={[authedTeam.player1, authedTeam.player2, authedTeam.player3, authedTeam.player4].filter(Boolean) as string[]}
          currentEntry={ctpEntries.find(c => c.holeNumber === ldModalHole && c.flight === authedTeam.flight)}
          currentTeamName={(() => { const e = ctpEntries.find(c => c.holeNumber === ldModalHole && c.flight === authedTeam.flight); const t = e?.teamId ? teams.find(tm => tm.id === e.teamId) : null; return t?.teamName; })()}
          onSave={data => ldMutation.mutate({ ...data, teamId: authedTeam.id, flight: authedTeam.flight })}
          mode="ld"
        />
      )}

      {/* ── ROUND COMPLETE MODAL ── */}
      {showRoundComplete && (() => {
        // Compute front / back / total to-par for the summary
        const scores = teamScores.data ?? [];
        function groupToPar(holeNums: number[]) {
          let str = 0, par = 0;
          for (const n of holeNums) {
            const s = scores.find(sc => sc.holeNumber === n);
            if (!s?.strokes) continue;
            str += s.strokes;
            par += holeMap.get(n)?.par ?? 4;
          }
          if (str === 0) return null;
          return str - par;
        }
        function fmt(v: number | null) {
          if (v === null) return "—";
          if (v === 0) return "E";
          return v > 0 ? `+${v}` : `${v}`;
        }
        const allNums = [...holes].sort((a,b)=>a.holeNumber-b.holeNumber).map(h=>h.holeNumber);
        const front = allNums.filter(n=>n<=9);
        const back  = allNums.filter(n=>n>=10);
        const frontVal = groupToPar(front);
        const backVal  = groupToPar(back);
        const totalVal = frontVal!==null||backVal!==null ? (frontVal??0)+(backVal??0) : null;
        // Every hole THIS team marked CTP/LD for (from the history log, so it
        // persists and keeps our player even after we've been overtaken). Latest
        // mark per hole wins.
        const myMarkByHole = new Map<number, any>();
        for (const h of ctpHistory) {
          if (h.teamId !== authedTeam.id) continue;
          const existing = myMarkByHole.get(h.holeNumber);
          if (!existing || h.id > existing.id) myMarkByHole.set(h.holeNumber, h);
        }
        const myMarks = Array.from(myMarkByHole.values()).sort((a, b) => a.holeNumber - b.holeNumber);

        return createPortal(
          <>
            {/* ── ROUND COMPLETE MODAL ── */}
            <div
              className="fixed inset-0 z-[9000] flex items-center justify-center p-4"
              style={{ background: "rgba(17,27,51,0.6)" }}
              onClick={(e) => { if (isSubmitted && e.target === e.currentTarget) setShowRoundComplete(false); }}
            >
              <div className="bg-[#f0ebe1] rounded-2xl border border-[#1a2744]/20 shadow-2xl w-full max-w-sm flex flex-col gap-4 p-5">
                {/* Header */}
                <div>
                  <p className="text-[#1a2744] font-bold text-lg">🏁 All Holes Submitted!</p>
                </div>

                {/* Score summary */}
                <div className="bg-white rounded-xl border border-[#1a2744]/12 p-4 space-y-2">
                  {[
                    { label: "Front 9", val: frontVal },
                    { label: "Back 9",  val: backVal  },
                    { label: "Total",   val: totalVal },
                  ].map(({ label, val }) => (
                    <div key={label} className="flex items-center justify-between font-sans-app">
                      <span className="text-[#1a2744]/55 text-sm">{label}</span>
                      <span className={`font-bold text-base ${
                        val !== null && val < 0 ? "text-[#c0323e]" : "text-[#1a2744]"
                      }`} style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: "1.1rem" }}>{fmt(val)}</span>
                    </div>
                  ))}
                </div>

                {/* CTP / LD entries with leading status */}
                {myMarks.length > 0 && (
                  <div className="bg-white rounded-xl border border-amber-500/20 p-3 space-y-2">
                    <p className="text-[#b06b10] text-xs uppercase tracking-widest font-bold font-sans-app">CTP &amp; Long Drive</p>

                    {myMarks.map(mark => {
                      const isLd = !!(holeMap.get(mark.holeNumber)?.isCtpHole && holeMap.get(mark.holeNumber)?.par !== 3);
                      const liveEntry = ctpEntries.find(c => c.holeNumber === mark.holeNumber && c.flight === authedTeam.flight);
                      const stillLeading = liveEntry?.teamId === authedTeam.id;
                      const playerName = mark.playerName ?? "";
                      const distFmt = (() => {
                        if (!mark.distance) return "";
                        if (isLd) return `${mark.distance} yds`;
                        const inches = parseInt(mark.distance);
                        return !isNaN(inches)
                          ? inches < 12 ? `${inches}"` : `${Math.floor(inches / 12)}' ${inches % 12}"`
                          : mark.distance;
                      })();
                      return (
                        <div key={mark.holeNumber} className="space-y-0.5">
                          <div className="flex items-center justify-between text-sm font-sans-app">
                            <span className="text-[#1a2744]/70">
                              {isLd
                                ? <span className="text-blue-700 font-bold">Long Drive</span>
                                : <>Hole {mark.holeNumber} CTP</>
                              }
                              {playerName ? <>{" — "}<span className="font-bold text-[#1a2744]">{playerName}</span></> : null}
                            </span>
                            {distFmt && (
                              <span className={isLd ? "text-blue-700 font-bold text-xs" : "text-green-700 font-bold text-xs"}>{distFmt}</span>
                            )}
                          </div>
                          <p className={`text-[10px] font-bold font-sans-app ml-0.5 ${
                            stillLeading ? (flightFinal ? "text-green-700" : "text-[#b06b10]") : "text-[#1a2744]/40"
                          }`}>
                            {stillLeading
                              ? (flightFinal ? "(WINNER!)" : "(STILL LEADING!)")
                              : "(No Longer Leading)"}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Action buttons */}
                {isSubmitted ? (
                  <div className="space-y-2">
                    <div className="text-center py-1">
                      <span className="text-green-700 font-bold font-sans-app text-sm">✅ Scorecard officially submitted</span>
                    </div>
                    <button
                      onClick={() => setShowRoundComplete(false)}
                      className="w-full py-2.5 rounded-lg bg-[#1a2744]/10 border border-[#1a2744]/20 text-[#1a2744] font-bold font-sans-app text-sm hover:bg-[#1a2744]/15 transition-colors"
                    >
                      Close
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-center text-[#1a2744]/60 text-xs font-sans-app">One last step — officially submit to lock in your scores.</p>
                    <button
                      onClick={() => setShowSubmitConfirm(true)}
                      className="w-full py-3.5 rounded-xl text-white font-bold font-sans-app text-base flex items-center justify-center gap-2 transition-transform active:scale-[0.99]"
                      style={{ background: "linear-gradient(135deg, #b06b10, #8a5008)", boxShadow: "0 4px 16px rgba(176,107,16,0.45)" }}
                    >
                      <Check size={18} /> Submit Scorecard
                    </button>
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setEditMode(true); setShowRoundComplete(false); }}
                        className="flex-1 py-2 rounded-lg bg-[#1a2744]/8 border border-[#1a2744]/15 text-[#1a2744]/70 font-bold font-sans-app text-sm hover:bg-[#1a2744]/12 transition-colors"
                      >
                        Edit Scores
                      </button>
                      <button
                        onClick={() => setShowScorecardView(true)}
                        className="flex-1 py-2 rounded-lg bg-[#1a2744]/8 border border-[#1a2744]/15 text-[#1a2744]/70 font-bold font-sans-app text-sm hover:bg-[#1a2744]/12 transition-colors"
                      >
                        View Scorecard
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── SCORECARD VIEW (layered on top of round complete) ── */}
            {showScorecardView && (
              <div className="fixed inset-0 z-[9100] flex items-center justify-center p-4" style={{ background: "rgba(17,27,51,0.55)" }}>
                <div className="bg-[#f0ebe1] rounded-2xl border border-[#1a2744]/20 shadow-2xl w-full max-w-lg p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#1a2744] text-base">{authedTeam?.teamName} — Scorecard</span>
                    <button
                      onClick={() => setShowScorecardView(false)}
                      className="text-[#1a2744]/50 hover:text-[#1a2744]/80 p-1"
                    >
                      <X size={18} />
                    </button>
                  </div>
                  <div className="overflow-x-auto -mx-1">
                    <ScorecardTable
                      holes={holes}
                      scores={teamScores.data ?? []}
                      scrollToHole={1}
                    />
                  </div>
                </div>
              </div>
            )}
          </>,
          document.body
        );
      })()}

      {/* ── CONTINUE EDITING vs SUBMIT — after each edited hole ── */}
      {showContinuePrompt && createPortal(
        <div className="fixed inset-0 z-[9200] flex items-center justify-center p-4" style={{ background: "rgba(17,27,51,0.7)" }}>
          <div className="bg-[#f0ebe1] rounded-2xl border border-[#1a2744]/20 shadow-2xl w-full max-w-sm p-5 flex flex-col gap-4">
            <p className="text-[#1a2744] font-bold text-base">✅ Score Updated</p>
            <p className="text-[#1a2744]/75 font-sans-app text-sm leading-relaxed">
              Do you need to keep editing other holes, or are you ready to officially submit your scorecard?
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setShowContinuePrompt(false)}
                className="w-full py-2.5 rounded-lg bg-[#1a2744]/10 border border-[#1a2744]/20 text-[#1a2744] font-bold font-sans-app text-sm hover:bg-[#1a2744]/15 transition-colors"
              >
                Continue Editing
              </button>
              <button
                onClick={() => { setShowContinuePrompt(false); setShowSubmitConfirm(true); }}
                className="w-full py-2.5 rounded-lg bg-[#1a2744] text-white font-bold font-sans-app text-sm hover:bg-[#243461] transition-colors"
              >
                Submit Scorecard
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── EDIT SCORE CONFIRMATION (mid-round change to an already-saved hole) ── */}
      {confirmEdit && createPortal(
        <div className="fixed inset-0 z-[9200] flex items-center justify-center p-4" style={{ background: "rgba(17,27,51,0.7)" }}>
          <div className="bg-[#f0ebe1] rounded-2xl border border-[#1a2744]/20 shadow-2xl w-full max-w-sm p-5 flex flex-col gap-4">
            <p className="text-[#1a2744] font-bold text-base">✏️ Change this score?</p>
            <p className="text-[#1a2744]/75 font-sans-app text-sm leading-relaxed">
              You're changing <span className="font-bold text-[#1a2744]">Hole {confirmEdit.holeNumber}</span> from <span className="font-bold text-[#1a2744]">{confirmEdit.oldScore}</span> to <span className="font-bold text-[#1a2744]">{confirmEdit.newScore}</span>. Save this change?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => { const ns = confirmEdit.newScore; setConfirmEdit(null); proceedSave(ns); }}
                className="flex-1 py-2.5 rounded-lg bg-[#1a2744] text-white font-bold font-sans-app text-sm hover:bg-[#243461] transition-colors"
              >
                Yes, Save Change
              </button>
              <button
                onClick={() => { setLocalScore(String(confirmEdit.newScore)); setConfirmEdit(null); }}
                className="flex-1 py-2.5 rounded-lg bg-[#1a2744]/10 border border-[#1a2744]/20 text-[#1a2744] font-bold font-sans-app text-sm hover:bg-[#1a2744]/15 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── SUBMIT CONFIRMATION — portal, no Radix ── */}
      {showSubmitConfirm && createPortal(
        <div className="fixed inset-0 z-[9200] flex items-center justify-center p-4" style={{ background: "rgba(17,27,51,0.7)" }}>
          <div className="bg-[#f0ebe1] rounded-2xl border border-[#1a2744]/20 shadow-2xl w-full max-w-sm p-5 flex flex-col gap-4">
            <p className="text-[#1a2744] font-bold text-base">⚠️ Confirm Submission</p>
            <p className="text-[#1a2744]/75 font-sans-app text-sm leading-relaxed">
              You will <span className="font-bold text-[#1a2744]">not be able to edit</span> your scorecard after submitting. Are you sure you want to officially submit?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => submitMutation.mutate()}
                disabled={submitMutation.isPending}
                className="flex-1 py-2.5 rounded-lg bg-[#1a2744] text-white font-bold font-sans-app text-sm hover:bg-[#243461] transition-colors disabled:opacity-50"
              >
                {submitMutation.isPending ? "Submitting..." : "Yes, Submit"}
              </button>
              <button
                onClick={() => setShowSubmitConfirm(false)}
                className="flex-1 py-2.5 rounded-lg bg-[#1a2744]/10 border border-[#1a2744]/20 text-[#1a2744] font-bold font-sans-app text-sm hover:bg-[#1a2744]/15 transition-colors"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
