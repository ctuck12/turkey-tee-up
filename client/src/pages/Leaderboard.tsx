import { useEffect, useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Trophy, Target, Wifi, Users, ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { LeaderboardEntry, Hole, ClosestToPin, Team, Sponsor } from "@shared/schema";

function toParDisplay(toPar: number, holesCompleted: number): React.ReactNode {
  if (holesCompleted === 0) return <span className="text-[#1a2744]/50 text-sm">—</span>;
  if (toPar === 0) return <span className="to-par-even font-bold">E</span>;
  if (toPar < 0) return <span className="to-par-under font-bold">{toPar}</span>;
  return <span className="to-par-over font-bold">+{toPar}</span>;
}

function ScoreCircle({ strokes, par }: { strokes: number | null | undefined; par: number }) {
  if (strokes == null) return <span className="text-[#1a2744]/35">·</span>;
  const diff = strokes - par;
  if (diff <= -2) return <span className="hole-score-eagle">{strokes}</span>;
  if (diff === -1) return <span className="hole-score-birdie">{strokes}</span>;
  if (diff === 0) return <span className="hole-score-par">{strokes}</span>;
  if (diff === 1) return <span className="hole-score-bogey">{strokes}</span>;
  if (diff === 2) return <span className="hole-score-double">{strokes}</span>;
  return <span className="hole-score-double" style={{ border: "3px double #a53142" }}>{strokes}</span>;
}

function SponsorBanner({ sponsors, placement }: { sponsors: Sponsor[]; placement: "leaderboard" | "scorecard" | "both" }) {
  const filtered = sponsors.filter(s => s.placement === placement || s.placement === "both");
  if (filtered.length === 0) return null;
  return (
    <div className="flex items-center justify-center flex-wrap gap-3 py-2 px-4 bg-[#1a2744]/5 border border-amber-500/10 rounded-lg">
      <span className="text-amber-500/40 text-xs uppercase tracking-widest font-sans-app mr-2">Sponsors</span>
      {filtered.map(s => (
        <div key={s.id} className="sponsor-logo-container">
          {s.logoUrl ? (
            <img src={s.logoUrl} alt={s.name} className="h-8 max-w-[120px] object-contain opacity-80 hover:opacity-100 transition-opacity" />
          ) : (
            <span className="text-amber-400/70 text-sm font-bold font-sans-app">{s.name}</span>
          )}
        </div>
      ))}
    </div>
  );
}

function CtpGrid({ ctpEntries, ctpHoles, teams, flight }: { ctpEntries: ClosestToPin[]; ctpHoles: Hole[]; teams: Team[]; flight: "morning" | "afternoon" }) {
  const flightTeamIds = new Set(teams.filter(t => t.flight === flight).map(t => t.id));
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {ctpHoles.map(hole => {
        // Only show entry if it belongs to a team in this flight
        const entry = ctpEntries.find(c => c.holeNumber === hole.holeNumber && c.teamId != null && flightTeamIds.has(c.teamId!));
        const team = entry?.teamId ? teams.find(t => t.id === entry.teamId) : null;
        return (
          <div key={hole.id} className="bg-[#1a2744]/8 border border-[#1a2744]/20 rounded-lg p-3">
            <div className="text-amber-500/60 text-xs font-sans-app mb-1">
              Hole {hole.holeNumber} · Par {hole.par}
              {hole.ctpLabel && <span className="ml-1 text-amber-400/80">({hole.ctpLabel})</span>}
            </div>
            {entry && (entry.playerName || team) ? (
              <>
                <div className="text-amber-300 font-bold text-sm">{entry.playerName || team?.teamName}</div>
                {team && <div className="text-[#1a2744]/60 text-xs font-sans-app">{team.teamName}</div>}
                {entry.distance && (
                  <div className="text-green-400 font-bold text-base mt-1">{entry.distance}</div>
                )}
              </>
            ) : (
              <div className="text-[#1a2744]/35 text-sm italic font-sans-app">No entry yet</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function CtpPanel({ ctpEntries, holes, teams }: { ctpEntries: ClosestToPin[]; holes: Hole[]; teams: Team[] }) {
  const ctpHoles = holes.filter(h => h.isCtpHole);
  if (ctpHoles.length === 0) return null;

  return (
    <div className="atd-card rounded-xl p-4 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Target size={18} className="text-amber-400" />
        <h2 className="text-amber-400 font-bold text-sm uppercase tracking-widest font-sans-app">Closest to the Pin</h2>
        <div className="flex items-center gap-1 ml-2">
          <span className="live-indicator w-2 h-2 rounded-full bg-green-400 inline-block"></span>
          <span className="text-green-400/70 text-xs font-sans-app">Live</span>
        </div>
      </div>
      <Tabs defaultValue="morning">
        <TabsList className="bg-white border border-[#1a2744]/20 mb-3 shadow-sm">
          <TabsTrigger value="morning" className="font-sans-app text-[#1a2744]/60 data-[state=active]:bg-[#1a2744] data-[state=active]:text-amber-400 text-xs">
            Morning
          </TabsTrigger>
          <TabsTrigger value="afternoon" className="font-sans-app text-[#1a2744]/60 data-[state=active]:bg-[#1a2744] data-[state=active]:text-amber-400 text-xs">
            Afternoon
          </TabsTrigger>
        </TabsList>
        <TabsContent value="morning">
          <CtpGrid ctpEntries={ctpEntries} ctpHoles={ctpHoles} teams={teams} flight="morning" />
        </TabsContent>
        <TabsContent value="afternoon">
          <CtpGrid ctpEntries={ctpEntries} ctpHoles={ctpHoles} teams={teams} flight="afternoon" />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function LeaderboardTable({ entries, label, flight, ctpEntries, ctpHoles, teams }: {
  entries: LeaderboardEntry[];
  label: string;
  flight: "morning" | "afternoon";
  ctpEntries: ClosestToPin[];
  ctpHoles: Hole[];
  teams: Team[];
}) {
  const [, navigate] = useLocation();
  const [showCtp, setShowCtp] = useState(false);

  if (entries.length === 0) {
    return (
      <div className="atd-card rounded-xl p-8 text-center">
        <Users size={40} className="text-[#1a2744]/25 mx-auto mb-3" />
        <p className="text-[#1a2744]/50 font-sans-app">No teams in {label} flight yet</p>
      </div>
    );
  }

  return (
    <div className="atd-card rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#1a2744]/15 bg-[#1a2744]/5 flex items-center gap-2">
        <span className="text-[#1a2744] font-bold text-xs uppercase tracking-widest font-sans-app">{label} Flight</span>
        <Badge variant="outline" className="text-[#1a2744]/70 border-[#1a2744]/30 text-xs font-sans-app font-semibold">
          {entries.length} teams
        </Badge>
        <button
          onClick={() => setShowCtp(v => !v)}
          className={`ml-auto flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-colors font-sans-app ${
            showCtp
              ? "bg-amber-500/15 border-amber-500/40 text-amber-500"
              : "border-[#1a2744]/20 text-[#1a2744]/50 hover:border-amber-500/30 hover:text-amber-500/70"
          }`}
        >
          <Target size={11} />
          Closest to Pin
          {showCtp ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
        </button>
      </div>

      {/* CTP panel — shown inline when toggled */}
      {showCtp && ctpHoles.length > 0 && (
        <div className="px-4 py-3 border-b border-amber-500/15 bg-amber-500/5">
          <CtpGrid ctpEntries={ctpEntries} ctpHoles={ctpHoles} teams={teams} flight={flight} />
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full font-sans-app text-sm">
          <thead>
            <tr className="border-b border-amber-500/10">
              <th className="px-3 py-2.5 text-left text-amber-500/60 text-xs uppercase tracking-wider w-10">#</th>
              <th className="px-3 py-2.5 text-left text-amber-500/60 text-xs uppercase tracking-wider">Team</th>
              <th className="px-3 py-2.5 text-center text-amber-500/60 text-xs uppercase tracking-wider w-24">+/- Par</th>
              <th className="px-3 py-2.5 text-center text-amber-500/60 text-xs uppercase tracking-wider w-16">Thru</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, idx) => (
              <tr
                key={entry.team.id}
                onClick={() => navigate(`/team/${entry.team.id}`)}
                className="border-b border-[#1a2744]/10 hover:bg-amber-500/5 transition-colors cursor-pointer"
              >
                <td className="px-3 py-3 text-[#1a2744]/50 text-xs">
                  {idx + 1}
                </td>
                <td className="px-3 py-3">
                  <div className="font-bold text-[#1a2744]">{entry.team.teamName}</div>
                  <div className="text-[#1a2744]/50 text-xs mt-0.5 truncate max-w-[200px]">
                    {[entry.team.player1, entry.team.player2, entry.team.player3, entry.team.player4]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                </td>
                <td className="px-3 py-3 text-center text-lg">
                  {toParDisplay(entry.totalToPar, entry.holesCompleted)}
                </td>
                <td className="px-3 py-3 text-center text-[#1a2744]/60 text-sm">
                  {entry.thruHole ? (entry.thruHole === 18 ? "F" : `${entry.thruHole}`) : <span className="text-[#1a2744]/35">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const POLL_INTERVAL = 4000;

export default function Leaderboard() {
  const queryClient = useQueryClient();
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const { data: leaderboard = [], isLoading: loadingLb } = useQuery<LeaderboardEntry[]>({ queryKey: ["/api/leaderboard"] });
  const { data: holes = [] } = useQuery<Hole[]>({ queryKey: ["/api/holes"] });
  const { data: ctpEntries = [] } = useQuery<ClosestToPin[]>({ queryKey: ["/api/ctp"] });
  const { data: teams = [] } = useQuery<Team[]>({ queryKey: ["/api/teams"] });
  const { data: sponsors = [] } = useQuery<Sponsor[]>({ queryKey: ["/api/sponsors"] });

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["/api/leaderboard"] });
    queryClient.invalidateQueries({ queryKey: ["/api/ctp"] });
    queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
    setLastUpdate(new Date());
  }, [queryClient]);

  // Poll every 4 seconds
  useEffect(() => {
    const id = setInterval(refresh, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [refresh]);

  const morningTeams = leaderboard.filter(e => e.team.flight === "morning");
  const afternoonTeams = leaderboard.filter(e => e.team.flight === "afternoon");

  return (
    <div className="space-y-6">
      {/* Hero header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-xl font-bold text-amber-400 leading-tight">Live Leaderboard</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-sans-app px-3 py-1.5 rounded-full border border-green-500/30 text-green-400 bg-green-500/10">
            <Wifi size={12} className="live-indicator" />
            Live
          </div>
          {lastUpdate && (
            <span className="text-[#1a2744]/35 text-xs font-sans-app">
              Updated {lastUpdate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
          )}
        </div>
      </div>

      {/* Sponsor banner */}
      <SponsorBanner sponsors={sponsors} placement="leaderboard" />

      {/* Leaderboard tabs */}
      {loadingLb ? (
        <div className="atd-card rounded-xl p-12 text-center">
          <Trophy size={40} className="text-amber-400/30 mx-auto mb-3 animate-pulse" />
          <p className="text-[#1a2744]/50 font-sans-app">Loading leaderboard...</p>
        </div>
      ) : (
        <Tabs defaultValue="morning">
          <TabsList className="bg-white border border-[#1a2744]/20 mb-4 shadow-sm">
            <TabsTrigger value="morning" className="font-sans-app text-[#1a2744]/60 data-[state=active]:bg-[#1a2744] data-[state=active]:text-amber-400">
              Morning ({morningTeams.length})
            </TabsTrigger>
            <TabsTrigger value="afternoon" className="font-sans-app text-[#1a2744]/60 data-[state=active]:bg-[#1a2744] data-[state=active]:text-amber-400">
              Afternoon ({afternoonTeams.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="morning">
            {morningTeams.length === 0 ? (
              <div className="atd-card rounded-xl p-12 text-center">
                <Trophy size={48} className="text-amber-400/20 mx-auto mb-4" />
                <p className="text-[#1a2744]/50 font-sans-app text-lg mb-2">No teams yet</p>
                <p className="text-[#1a2744]/30 text-sm font-sans-app">Teams will appear here once added by the admin</p>
              </div>
            ) : (
              <LeaderboardTable entries={morningTeams} label="Morning" flight="morning" ctpEntries={ctpEntries} ctpHoles={holes.filter(h => h.isCtpHole)} teams={teams} />
            )}
          </TabsContent>
          <TabsContent value="afternoon">
            {afternoonTeams.length === 0 ? (
              <div className="atd-card rounded-xl p-12 text-center">
                <Trophy size={48} className="text-amber-400/20 mx-auto mb-4" />
                <p className="text-[#1a2744]/50 font-sans-app text-lg mb-2">No teams yet</p>
                <p className="text-[#1a2744]/30 text-sm font-sans-app">Teams will appear here once added by the admin</p>
              </div>
            ) : (
              <LeaderboardTable entries={afternoonTeams} label="Afternoon" flight="afternoon" ctpEntries={ctpEntries} ctpHoles={holes.filter(h => h.isCtpHole)} teams={teams} />
            )}
          </TabsContent>
        </Tabs>
      )}


    </div>
  );
}
