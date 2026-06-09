import { useState, useEffect, useCallback } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";

import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ClipboardList, Target, Flag, ChevronLeft, ChevronRight, Check, Trophy, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Team, Hole, Score, ClosestToPin, Sponsor } from "@shared/schema";
import atdLogo from "@/assets/atd-logo.png";
import { ScorecardTable, ScorecardLegend } from "@/components/ScorecardTable";

// CTP Entry Modal
function CtpEntryModal({
  open, onClose, holeNumber, hole, teams, currentEntry, onSave
}: {
  open: boolean;
  onClose: () => void;
  holeNumber: number;
  hole?: Hole;
  teams: Team[];
  currentEntry?: ClosestToPin;
  onSave: (data: { holeNumber: number; teamId?: number; playerName?: string; distance?: string }) => void;
}) {
  const [playerName, setPlayerName] = useState(currentEntry?.playerName ?? "");
  const [distance, setDistance] = useState(currentEntry?.distance ?? "");

  useEffect(() => {
    setPlayerName(currentEntry?.playerName ?? "");
    setDistance(currentEntry?.distance ?? "");
  }, [currentEntry, open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#1a2744] border-amber-500/25 text-[#1a2744] max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-[#b06b10] font-bold flex items-center gap-2">
            <Target size={18} /> CTP – Hole {holeNumber}
            {hole && <span className="text-[#1a2744]/55 text-sm">Par {hole.par}</span>}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 font-sans-app">
          <div>
            <Label className="text-[#1a2744]/60 text-xs mb-1 block">Player Name</Label>
            <Input
              value={playerName}
              onChange={e => setPlayerName(e.target.value)}
              placeholder="Player's name"
              className="bg-[#1a2744]/5 border-[#1a2744]/12 text-[#1a2744]"
              data-testid="input-ctp-player"
            />
          </div>
          <div>
            <Label className="text-[#1a2744]/60 text-xs mb-1 block">Distance (e.g. 4'6" or 1.2m)</Label>
            <Input
              value={distance}
              onChange={e => setDistance(e.target.value)}
              placeholder="e.g. 4'6 or 1.2m"
              className="bg-[#1a2744]/5 border-[#1a2744]/12 text-[#1a2744]"
              data-testid="input-ctp-distance"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button
              onClick={() => onSave({ holeNumber, playerName, distance })}
              className="flex-1 bg-amber-500/25 border border-amber-500/60 text-[#b06b10] hover:bg-amber-500/30"
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
  const [showScorecard, setShowScorecard] = useState(false);

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
    if (isNaN(strokes) || strokes < 1 || strokes > 20) {
      toast({ title: "Please enter a valid score (1-20)", variant: "destructive" });
      return;
    }
    scoreMutation.mutate({ teamId: authedTeam.id, holeNumber: currentHole, strokes });
    toast({ title: `Hole ${currentHole}: Score saved (${strokes})` });
  }

  function handleQuickScore(n: number) {
    if (!authedTeam) return;
    setLocalScore(n.toString());
    scoreMutation.mutate({ teamId: authedTeam.id, holeNumber: currentHole, strokes: n });
  }

  const par = currentHoleData?.par ?? 4;
  const quickScores = [par - 2, par - 1, par, par + 1, par + 2, par + 3].filter(n => n >= 1);

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
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">

            <div>
              <h2 className="font-bold text-[#b06b10] text-lg">{authedTeam.teamName}</h2>
              <div className="text-[#1a2744]/55 text-xs font-sans-app">
                {[authedTeam.player1, authedTeam.player2, authedTeam.player3, authedTeam.player4].filter(Boolean).join(" · ")}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-[#1a2744]/55 text-xs font-sans-app">Thru {completedHoles}</div>
              <div className={`font-bold text-lg ${runningToPar < 0 ? "to-par-under" : runningToPar > 0 ? "to-par-over" : "to-par-even"}`}>
                {completedHoles === 0 ? "E" : runningToPar === 0 ? "E" : runningToPar > 0 ? `+${runningToPar}` : runningToPar}
              </div>
            </div>
            <Badge className="bg-amber-500/15 text-[#b06b10]/80 border-amber-500/20 capitalize font-sans-app">
              {authedTeam.flight}
            </Badge>
          </div>
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

      {/* Tabs: Score Entry / Scorecard / CTP */}
      <Tabs defaultValue="entry">
        <TabsList className="bg-[#1a2744]/5 border border-[#1a2744]/12 w-full">
          <TabsTrigger value="entry" className="flex-1 font-sans-app data-[state=active]:bg-amber-500/25 data-[state=active]:text-[#b06b10]">
            <ClipboardList size={14} className="mr-1.5" /> Score Entry
          </TabsTrigger>
          <TabsTrigger value="scorecard" className="flex-1 font-sans-app data-[state=active]:bg-amber-500/25 data-[state=active]:text-[#b06b10]">
            <Trophy size={14} className="mr-1.5" /> Scorecard
          </TabsTrigger>
          <TabsTrigger value="ctp" className="flex-1 font-sans-app data-[state=active]:bg-amber-500/25 data-[state=active]:text-[#b06b10]">
            <Target size={14} className="mr-1.5" /> CTP
          </TabsTrigger>
        </TabsList>

        {/* SCORE ENTRY TAB */}
        <TabsContent value="entry" className="space-y-4 mt-4">
          {/* Hole navigation */}
          <div className="atd-card rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={() => setCurrentHole(Math.max(1, currentHole - 1))}
                disabled={currentHole === 1}
                className="p-2 rounded-lg bg-[#1a2744]/5 hover:bg-[#1a2744]/8 disabled:opacity-30 text-[#1a2744]/70 transition-colors"
                data-testid="button-prev-hole"
              >
                <ChevronLeft size={20} />
              </button>
              <div className="text-center">
                <div className="text-[#b06b10]/70 text-xs uppercase tracking-widest font-sans-app">Hole</div>
                <div className="text-4xl font-bold text-[#b06b10]">{currentHole}</div>
                <div className="flex items-center justify-center gap-3 mt-1 font-sans-app text-xs text-[#1a2744]/55">
                  <span>Par {par}</span>
                  {currentHoleData?.handicap && <span>Hdcp {currentHoleData.handicap}</span>}
                  {currentHoleData?.yardageBlue && <span>{currentHoleData.yardageBlue} yds</span>}
                  {currentHoleData?.isCtpHole && (
                    <Badge className="bg-amber-500/25 text-[#b06b10] border-amber-500/30 text-xs">
                      <Target size={10} className="mr-1" /> CTP
                    </Badge>
                  )}
                </div>
              </div>
              <button
                onClick={() => setCurrentHole(Math.min(18, currentHole + 1))}
                disabled={currentHole === 18}
                className="p-2 rounded-lg bg-[#1a2744]/5 hover:bg-[#1a2744]/8 disabled:opacity-30 text-[#1a2744]/70 transition-colors"
                data-testid="button-next-hole"
              >
                <ChevronRight size={20} />
              </button>
            </div>

            {/* Quick score buttons */}
            <div className="mb-4">
              <p className="text-[#1a2744]/50 text-xs uppercase tracking-wider font-sans-app mb-2">Quick Score</p>
              <div className="grid grid-cols-6 gap-2">
                {quickScores.map(n => {
                  const diff = n - par;
                  const labels: Record<number, string> = { [-2]: "Eagle", [-1]: "Birdie", 0: "Par", 1: "Bogey", 2: "Dbl", 3: "Triple" };
                  const label = labels[diff] ?? `+${diff}`;
                  const isActive = localScore === n.toString();
                  return (
                    <button
                      key={n}
                      onClick={() => handleQuickScore(n)}
                      data-testid={`button-score-${n}`}
                      className={`flex flex-col items-center rounded-lg py-2 px-1 border transition-all font-sans-app ${
                        isActive
                          ? "bg-amber-500/30 border-amber-400/60 text-amber-300"
                          : "bg-[#1a2744]/5 border-[#1a2744]/12 text-[#1a2744]/70 hover:bg-[#1a2744]/8 hover:text-[#1a2744]"
                      }`}
                    >
                      <span className="text-xl font-bold">{n}</span>
                      <span className="text-[10px] opacity-60">{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Manual input */}
            <div className="flex gap-2">
              <Input
                type="number"
                min={1}
                max={20}
                value={localScore}
                onChange={e => setLocalScore(e.target.value)}
                placeholder={`Score for hole ${currentHole}`}
                className="bg-[#1a2744]/5 border-[#1a2744]/12 text-[#1a2744] text-center text-xl font-bold font-sans-app"
                data-testid="input-score"
              />
              <Button
                onClick={handleSaveScore}
                disabled={scoreMutation.isPending || !localScore}
                className="bg-amber-500/25 border border-amber-500/60 text-[#b06b10] hover:bg-amber-500/30 font-bold px-6 font-sans-app"
                data-testid="button-save-score"
              >
                <Check size={16} className="mr-1" />
                Save
              </Button>
            </div>

            {/* CTP quick-entry if this is a CTP hole */}
            {currentHoleData?.isCtpHole && (
              <button
                onClick={() => setCtpModalHole(currentHole)}
                className="mt-3 w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[#b06b10]/80 hover:bg-amber-500/25 hover:text-[#b06b10] transition-all font-sans-app text-sm"
                data-testid="button-enter-ctp"
              >
                <Target size={14} /> Enter Closest to Pin for Hole {currentHole}
              </button>
            )}
          </div>

          {/* Hole progress strip */}
          <div className="atd-card rounded-xl p-3">
            <p className="text-[#1a2744]/50 text-xs uppercase tracking-wider font-sans-app mb-2">All Holes</p>
            <div className="grid grid-cols-9 gap-1">
              {Array.from({ length: 18 }, (_, i) => i + 1).map(n => {
                const s = scoreMap.get(n);
                const h = holeMap.get(n);
                const par = h?.par ?? 4;
                const isCurrent = n === currentHole;
                const hasScore = s?.strokes != null;
                const diff = hasScore ? (s.strokes! - par) : null;
                return (
                  <button
                    key={n}
                    onClick={() => setCurrentHole(n)}
                    data-testid={`button-hole-${n}`}
                    className={`relative rounded text-xs py-1.5 transition-all font-sans-app ${
                      isCurrent
                        ? "bg-amber-500/30 border border-amber-400/60 text-amber-300 font-bold"
                        : hasScore
                          ? diff! < 0 ? "bg-amber-500/15 border border-amber-500/30 text-[#b06b10]"
                          : diff === 0 ? "bg-[#1a2744]/8 border border-[#1a2744]/20 text-[#1a2744]/70"
                          : "bg-red-500/10 border border-red-500/20 text-red-400"
                        : "bg-[#1a2744]/5 border border-[#1a2744]/12 text-[#1a2744]/55 hover:bg-[#1a2744]/8"
                    }`}
                  >
                    <div>{n}</div>
                    {hasScore && <div className="font-bold">{s.strokes}</div>}
                  </button>
                );
              })}
            </div>
          </div>
        </TabsContent>

        {/* SCORECARD TAB */}
        <TabsContent value="scorecard" className="mt-4">
          <div className="atd-card rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-[#1a2744]/12 flex items-center gap-2">
              <span className="text-[#b06b10]/60 text-xs uppercase tracking-widest font-sans-app">Live Scorecard — {authedTeam.teamName}</span>
            </div>
            <div className="p-4">
              <ScorecardTable holes={holes} scores={teamScores.data ?? []} />
            </div>
            <ScorecardLegend />
          </div>
        </TabsContent>

        {/* CTP TAB */}
        <TabsContent value="ctp" className="mt-4">
          <div className="atd-card rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <Target size={16} className="text-[#b06b10]" />
              <h3 className="font-bold text-[#b06b10] font-sans-app">Closest to the Pin Holes</h3>
            </div>
            {ctpHoles.length === 0 ? (
              <p className="text-[#1a2744]/50 text-sm font-sans-app italic">No CTP holes configured yet.</p>
            ) : (
              ctpHoles.map(hole => {
                const entry = ctpEntries.find(c => c.holeNumber === hole.holeNumber);
                return (
                  <div key={hole.id} className="flex items-center justify-between bg-[#1a2744]/5 rounded-lg p-3 border border-amber-500/10">
                    <div>
                      <div className="font-bold text-[#1a2744] font-sans-app">Hole {hole.holeNumber} · Par {hole.par}</div>
                      {hole.ctpLabel && <div className="text-[#b06b10]/60 text-xs font-sans-app">{hole.ctpLabel}</div>}
                      {entry?.playerName ? (
                        <div className="mt-1">
                          <span className="text-amber-300 text-sm font-bold">{entry.playerName}</span>
                          {entry.distance && <span className="text-green-400 ml-2 font-bold">{entry.distance}</span>}
                        </div>
                      ) : (
                        <span className="text-[#1a2744]/35 text-xs italic font-sans-app">No entry</span>
                      )}
                    </div>
                    <Button
                      onClick={() => setCtpModalHole(hole.holeNumber)}
                      variant="outline"
                      size="sm"
                      className="border-amber-500/30 text-[#b06b10]/80 hover:text-[#b06b10] hover:border-amber-500/60 font-sans-app"
                      data-testid={`button-edit-ctp-${hole.holeNumber}`}
                    >
                      {entry?.playerName ? "Update" : "Enter"}
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* CTP Modal */}
      {ctpModalHole !== null && (
        <CtpEntryModal
          open={ctpModalHole !== null}
          onClose={() => setCtpModalHole(null)}
          holeNumber={ctpModalHole}
          hole={holeMap.get(ctpModalHole)}
          teams={teams}
          currentEntry={ctpEntries.find(c => c.holeNumber === ctpModalHole)}
          onSave={data => ctpMutation.mutate({ ...data, teamId: authedTeam.id })}
        />
      )}
    </div>
  );
}
