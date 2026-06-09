import { useState, useEffect, useCallback } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";

import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Target, ChevronRight, Check } from "lucide-react"; // Check still used in CTP modal
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Team, Hole, Score, ClosestToPin, Sponsor } from "@shared/schema";
import atdLogo from "@/assets/atd-logo.png";
import { ScorecardTable } from "@/components/ScorecardTable";

// CTP Entry Modal
function CtpEntryModal({
  open, onClose, holeNumber, hole, teamPlayers, currentEntry, onSave
}: {
  open: boolean;
  onClose: () => void;
  holeNumber: number;
  hole?: Hole;
  teamPlayers: string[];
  currentEntry?: ClosestToPin;
  onSave: (data: { holeNumber: number; teamId?: number; playerName?: string; distance?: string }) => void;
}) {
  const [playerName, setPlayerName] = useState(currentEntry?.playerName ?? "");
  const [distance, setDistance] = useState(currentEntry?.distance ?? "");
  const [showPlayerList, setShowPlayerList] = useState(false);

  useEffect(() => {
    setPlayerName(currentEntry?.playerName ?? "");
    setDistance(currentEntry?.distance ?? "");
    setShowPlayerList(false);
  }, [currentEntry, open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#f0ebe1] border-[#1a2744]/20 text-[#1a2744] max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-[#1a2744] font-bold flex items-center gap-2">
            <Target size={18} className="text-[#b06b10]" /> CTP – Hole {holeNumber}
            {hole && <span className="text-[#1a2744]/55 text-sm">Par {hole.par}</span>}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 font-sans-app">
          <div className="relative">
            <Label className="text-[#1a2744]/70 text-xs mb-1 block font-bold">Player Name</Label>
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
          <div>
            <Label className="text-[#1a2744]/70 text-xs mb-1 block font-bold">Distance (inches)</Label>
            <Input
              value={distance}
              onChange={e => {
                const val = e.target.value.replace(/[^0-9]/g, "");
                setDistance(val);
              }}
              placeholder="e.g. 27"
              inputMode="numeric"
              pattern="[0-9]*"
              className="bg-white border-[#1a2744]/20 text-black placeholder:text-[#1a2744]/35"
              data-testid="input-ctp-distance"
            />
            <p className="text-[#1a2744]/45 text-[11px] mt-1 font-sans-app">Enter total inches — will display as feet &amp; inches on leaderboard</p>
          </div>
          <div className="flex gap-2 pt-2">
            <Button
              onClick={() => onSave({ holeNumber, playerName, distance })}
              className="flex-1 bg-[#b06b10] border border-[#b06b10] text-white hover:bg-[#8a5008]"
              data-testid="button-ctp-save"
            >
              <Check size={14} className="mr-1.5" /> Save CTP
            </Button>
            <Button variant="ghost" onClick={onClose} className="text-[#1a2744]/55 hover:text-[#1a2744]">
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── MAIN SCOREKEEPER PAGE ─────────────────────────────────────────────────────
export default function Scorekeeper() {
  const { teamId: routeTeamId } = useParams();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [teamCode, setTeamCode] = useState("");
  const [authedTeam, setAuthedTeam] = useState<Team | null>(null);
  const [authError, setAuthError] = useState("");
  const [currentHole, setCurrentHole] = useState(1);
  const [ctpModalHole, setCtpModalHole] = useState<number | null>(null);
  const [ctpWarningHole, setCtpWarningHole] = useState<number | null>(null); // hole awaiting CTP warning

  const { data: holes = [] } = useQuery<Hole[]>({ queryKey: ["/api/holes"] });
  const { data: teams = [] } = useQuery<Team[]>({ queryKey: ["/api/teams"] });
  const { data: ctpEntries = [], refetch: refetchCtp } = useQuery<ClosestToPin[]>({ queryKey: ["/api/ctp"] });
  const { data: sponsors = [] } = useQuery<Sponsor[]>({ queryKey: ["/api/sponsors"] });

  const teamScores = useQuery<Score[]>({
    queryKey: ["/api/scores/team", authedTeam?.id],
    enabled: !!authedTeam,
  });

  const holeMap = new Map(holes.map(h => [h.holeNumber, h]));
  const scoreMap = new Map((teamScores.data ?? []).map(s => [s.holeNumber, s]));
  const ctpHoles = holes.filter(h => h.isCtpHole);
  const currentHoleData = holeMap.get(currentHole);
  const currentScore = scoreMap.get(currentHole);
  const [localScore, setLocalScore] = useState<string>("");

  useEffect(() => {
    setLocalScore(currentScore?.strokes?.toString() ?? "");
  }, [currentHole, currentScore?.strokes]);

  // Auto-login if routeTeamId exists
  useEffect(() => {
    if (routeTeamId && teams.length > 0) {
      const team = teams.find(t => t.id === parseInt(routeTeamId));
      if (team) setAuthedTeam(team);
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

  const ctpMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/ctp", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/ctp"] });
      // Advance to next hole after saving CTP (modal was opened from warning)
      if (ctpModalHole !== null) advanceHole(ctpModalHole);
      setCtpModalHole(null);
      toast({ title: "CTP entry saved!" });
    },
  });

  async function handleLogin() {
    try {
      const res = await apiRequest("POST", "/api/auth/scorekeeper", { teamCode: teamCode.toUpperCase().trim() });
      const data = await res.json();
      setAuthedTeam(data.team);
      setCurrentHole(data.team.startingHole ?? 1);
      setAuthError("");
    } catch {
      setAuthError("Invalid team code. Check with your admin.");
    }
  }

  function handleSaveScore() {
    if (!authedTeam) return;
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
    scoreMutation.mutate({ teamId: authedTeam.id, holeNumber: currentHole, strokes });
    toast({ title: `Hole ${currentHole}: Score saved (${strokes})` });
    setLocalScore("");

    // If this is a CTP hole and no entry exists yet, show warning instead of advancing
    const isCtp = currentHoleData?.isCtpHole;
    const ctpAlreadySaved = ctpEntries.some(c => c.holeNumber === currentHole);
    if (isCtp && !ctpAlreadySaved) {
      setCtpWarningHole(currentHole);
      return;
    }
    // Otherwise advance normally
    advanceHole(currentHole);
  }

  // Quick score just selects — does NOT save or advance
  function handleQuickScore(n: number) {
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
          <img src={atdLogo} alt="ATD" className="w-56 mx-auto mb-6 object-contain" />
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
            onClick={handleLogin}
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
      </div>
    );
  }

  // ─── SCOREKEEPER MAIN ────────────────────────────────────────────────────────
  // Starting hole from admin setup; last hole wraps around (e.g. start=7 → last=6, start=1 → last=18)
  const startingHole = authedTeam.startingHole ?? 1;
  const lastHole = startingHole === 1 ? 18 : startingHole - 1;

  // Advance to next hole respecting the round boundary
  function advanceHole(from: number) {
    if (from === lastHole) return; // already on last hole, don't advance
    const next = from === 18 ? 1 : from + 1;
    setCurrentHole(next);
  }

  const completedHoles = (teamScores.data ?? []).filter(s => s.strokes != null).length;
  const totalStrokes = (teamScores.data ?? []).filter(s => s.strokes != null).reduce((s, sc) => s + (sc.strokes ?? 0), 0);
  const totalPar = (teamScores.data ?? []).filter(s => s.strokes != null).reduce((s, sc) => {
    return s + (holeMap.get(sc.holeNumber)?.par ?? 4);
  }, 0);
  const runningToPar = totalStrokes - totalPar;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Team header */}
      <div className="atd-card rounded-xl p-4">
        {/* Row 1: team name + total score + flight badge */}
        {(() => {
          const totalDisp = completedHoles === 0 ? "E" : runningToPar === 0 ? "E" : runningToPar > 0 ? `+${runningToPar}` : `${runningToPar}`;
          const isUnder = runningToPar < 0 && completedHoles > 0;
          return (
            <div className="flex items-center gap-2 mb-2">
              <h2 className="font-bold text-[#b06b10] text-lg leading-tight">{authedTeam.teamName}</h2>
              <span className={`font-bold text-lg leading-tight ${isUnder ? "text-[#c0323e]" : "text-[#1a2744]"}`} style={{ fontFamily: "'Rajdhani', sans-serif", letterSpacing: "0.05em" }}>{totalDisp}</span>
              <div className="flex-1" />
              <Badge className="bg-amber-500/15 text-[#b06b10]/80 border-amber-500/20 capitalize font-sans-app shrink-0">
                {authedTeam.flight}
              </Badge>
            </div>
          );
        })()}
        {/* Row 2: player names */}
        <div className="text-[#1a2744]/55 text-xs font-sans-app">
          {[authedTeam.player1, authedTeam.player2, authedTeam.player3, authedTeam.player4].filter(Boolean).join(" · ")}
        </div>
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
          {/* Hole navigation */}
          <div className="atd-card rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              {/* Back arrow hidden — scorekeepers cannot go backwards */}
              <div className="w-10" />
              <div className="text-center">
                <div className="text-[#b06b10]/70 text-xs uppercase tracking-widest font-sans-app">Hole</div>
                <div className="flex items-center justify-center gap-2">
                  <div className="text-4xl font-bold text-[#b06b10]">{currentHole}</div>
                  {currentHoleData?.isCtpHole && (
                    <Badge className="bg-amber-500/25 text-[#b06b10] border-amber-500/30 text-xs">
                      <Target size={10} className="mr-1" /> CTP
                    </Badge>
                  )}
                </div>
                <div className="flex items-center justify-center gap-3 mt-1 font-sans-app text-xs text-[#1a2744]/55">
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
            <div className="mb-4">
              <p className="text-[#1a2744]/50 text-xs uppercase tracking-wider font-sans-app mb-2">Select Score</p>
              <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${scoreOptions.length + 1}, 1fr)` }}>
                {scoreOptions.map(({ score, label }) => {
                  const isActive = localScore === score.toString();
                  return (
                    <button
                      key={score}
                      onClick={() => handleQuickScore(score)}
                      data-testid={`button-score-${score}`}
                      className={`flex items-center justify-center rounded-lg py-3 px-1 border transition-all font-sans-app ${
                        isActive
                          ? "bg-amber-500/30 border-amber-400/60 text-[#1a2744]"
                          : "bg-[#1a2744]/5 border-[#1a2744]/12 text-[#1a2744]/70 hover:bg-[#1a2744]/8 hover:text-[#1a2744]"
                      }`}
                    >
                      <span className="text-xl font-bold">{score}</span>
                    </button>
                  );
                })}
                {/* Save button — same size as score buttons */}
                <button
                  onClick={handleSaveScore}
                  disabled={scoreMutation.isPending || !localScore}
                  data-testid="button-save-score"
                  className="flex items-center justify-center rounded-lg py-3 px-1 border transition-all font-sans-app bg-amber-500/25 border-amber-400/60 text-[#1a2744] hover:bg-amber-500/35 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-sm"
                >
                  Save
                </button>
              </div>
            </div>

            {/* CTP quick-entry if this is a CTP hole */}
            {currentHoleData?.isCtpHole && (
              <button
                onClick={() => setCtpModalHole(currentHole)}
                className="mt-3 w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-[#1a2744]/15 border border-[#1a2744]/25 text-[#1a2744] hover:bg-[#1a2744]/22 transition-all font-sans-app text-sm font-bold"
                data-testid="button-enter-ctp"
              >
                <Target size={14} /> Enter Closest to Pin for Hole {currentHole}
              
              </button>
            )}
          </div>

          {/* Inline scorecard — no header, no legend */}
          <div className="atd-card rounded-xl overflow-hidden">
            <div className="p-3">
              <ScorecardTable holes={holes} scores={teamScores.data ?? []} />
            </div>
          </div>
      </div>

      {/* CTP Warning Dialog */}
      {ctpWarningHole !== null && (
        <Dialog open={true} onOpenChange={() => {
          // Dismiss = treat as No
          advanceHole(ctpWarningHole);
          setCtpWarningHole(null);
        }}>
          <DialogContent className="bg-[#f0ebe1] border-[#1a2744]/20 max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-[#1a2744] font-bold flex items-center gap-2">
                <Target size={18} className="text-[#b06b10]" /> Closest to the Pin
              </DialogTitle>
            </DialogHeader>
            <p className="text-[#1a2744]/75 font-sans-app text-sm">
              Was one of your players closest to the pin on Hole {ctpWarningHole}?
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  // Yes — open CTP modal; onSuccess will call advanceHole
                  setCtpModalHole(ctpWarningHole);
                  setCtpWarningHole(null);
                }}
                className="flex-1 py-2.5 rounded-lg bg-[#1a2744] text-white font-bold font-sans-app text-sm hover:bg-[#243461] transition-colors"
              >
                Yes
              </button>
              <button
                onClick={() => {
                  // No — just advance
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
          currentEntry={ctpEntries.find(c => c.holeNumber === ctpModalHole)}
          onSave={data => ctpMutation.mutate({ ...data, teamId: authedTeam.id })}
        />
      )}
    </div>
  );
}
