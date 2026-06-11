import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Trophy, Target, Search, Users, ChevronDown, ChevronUp, Wifi, Zap } from "lucide-react";
import bigCountryLogo from "@/assets/big-country-title.png";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { LeaderboardEntry, Hole, ClosestToPin, Team, Sponsor, TournamentSettings } from "@shared/schema";

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
            <span className="text-[#b06b10]/80 text-sm font-bold font-sans-app">{s.name}</span>
          )}
        </div>
      ))}
    </div>
  );
}

function formatCtpDistance(raw: string | null | undefined): string {
  if (!raw) return "";
  const inches = parseInt(raw, 10);
  if (isNaN(inches) || inches < 0) return raw; // fallback: show as-is if not a plain number
  const feet = Math.floor(inches / 12);
  const rem  = inches % 12;
  if (feet === 0) return `${rem}"`;
  if (rem === 0)  return `${feet}'`;
  return `${feet}' ${rem}"`;
}

function CtpGrid({ ctpEntries, ctpHoles, ldHole, teams, flight }: { ctpEntries: ClosestToPin[]; ctpHoles: Hole[]; ldHole?: Hole; teams: Team[]; flight: "morning" | "afternoon" }) {
  const flightTeamIds = new Set(teams.filter(t => t.flight === flight).map(t => t.id));

  // Combine CTP holes + LD hole for rendering
  const allHoles: Array<{ hole: Hole; isLd: boolean }> = [
    ...ctpHoles.map(h => ({ hole: h, isLd: false })),
    ...(ldHole ? [{ hole: ldHole, isLd: true }] : []),
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {allHoles.map(({ hole, isLd }) => {
        // Only show entry if it belongs to a team in this flight
        const entry = ctpEntries.find(c => c.holeNumber === hole.holeNumber && c.teamId != null && flightTeamIds.has(c.teamId!));
        const team = entry?.teamId ? teams.find(t => t.id === entry.teamId) : null;
        return (
          <div
            key={hole.id}
            className={`bg-white rounded-lg p-3 shadow-sm ${
              isLd ? "border border-emerald-600/25" : "border border-[#1a2744]/20"
            }`}
          >
            {/* Type label */}
            <div className={`text-[10px] font-bold uppercase tracking-widest font-sans-app mb-0.5 flex items-center gap-1 ${
              isLd ? "text-emerald-600" : "text-[#b06b10]"
            }`}>
              {isLd ? <Zap size={10} /> : <Target size={10} />}
              {isLd ? "Long Drive" : "Closest to Pin"}
            </div>
            {/* Hole + prize label */}
            <div className="text-xs font-sans-app mb-1 flex items-center gap-1">
              <span className="font-bold text-[#1a2744]">Hole {hole.holeNumber}</span>
              {hole.ctpLabel && <span className="ml-1 text-[#1a2744]/45">· {hole.ctpLabel}</span>}
            </div>
            {entry && (entry.playerName || team) ? (
              <>
                <div className="text-[#1a2744] font-bold text-sm">{entry.playerName || team?.teamName}</div>
                {team && <div className="text-[#1a2744]/55 text-xs font-sans-app">{team.teamName}</div>}
              </>
            ) : (
              <div className="text-[#1a2744]/40 text-sm italic font-sans-app">No entry yet</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function CtpPanel({ ctpEntries, holes, teams }: { ctpEntries: ClosestToPin[]; holes: Hole[]; teams: Team[] }) {
  const ctpHoles = holes.filter(h => h.isCtpHole && h.par === 3);
  const ldHole = holes.find(h => h.isCtpHole && h.par !== 3);
  if (ctpHoles.length === 0 && !ldHole) return null;

  return (
    <div className="atd-card rounded-xl p-4 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Target size={18} className="text-[#1a2744]" />
        <h2 className="text-[#1a2744] font-bold text-sm uppercase tracking-widest font-sans-app">Closest to the Pin</h2>
        <div className="flex items-center gap-1 ml-2">
          <span className="live-indicator w-2 h-2 rounded-full bg-green-400 inline-block"></span>
          <span className="text-green-400/70 text-xs font-sans-app">Live</span>
        </div>
      </div>
      <Tabs defaultValue="morning">
        <TabsList className="bg-white border border-[#1a2744]/20 mb-3 shadow-sm">
          <TabsTrigger value="morning" className="font-sans-app text-[#1a2744]/60 data-[state=active]:bg-[#1a2744] data-[state=active]:text-[#b06b10] text-xs">
            AM
          </TabsTrigger>
          <TabsTrigger value="afternoon" className="font-sans-app text-[#1a2744]/60 data-[state=active]:bg-[#1a2744] data-[state=active]:text-[#b06b10] text-xs">
            PM
          </TabsTrigger>
        </TabsList>
        <TabsContent value="morning">
          <CtpGrid ctpEntries={ctpEntries} ctpHoles={ctpHoles} ldHole={ldHole} teams={teams} flight="morning" />
        </TabsContent>
        <TabsContent value="afternoon">
          <CtpGrid ctpEntries={ctpEntries} ctpHoles={ctpHoles} ldHole={ldHole} teams={teams} flight="afternoon" />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function LeaderboardTable({ entries, label, flight, ctpEntries, ctpHoles, ldHole, teams }: {
  entries: LeaderboardEntry[];
  label: string;
  flight: "morning" | "afternoon";
  ctpEntries: ClosestToPin[];
  ctpHoles: Hole[];
  ldHole?: Hole;
  teams: Team[];
}) {
  const [, navigate] = useLocation();
  const [showCtp, setShowCtp] = useState(false);
  const [showInProgress, setShowInProgress] = useState(false);
  const [search, setSearch] = useState("");

  const q = search.trim().toLowerCase();
  const filtered = entries.filter(e => {
    if (showInProgress && e.team.isSubmitted) return false;
    if (!q) return true;
    if (e.team.teamName.toLowerCase().includes(q)) return true;
    const players = [e.team.player1, e.team.player2, e.team.player3, e.team.player4];
    return players.some(p => {
      if (!p) return false;
      const lastName = p.trim().split(/\s+/).pop()?.toLowerCase() ?? "";
      return lastName.includes(q);
    });
  });

  if (entries.length === 0) {
    return (
      <div className="atd-card rounded-xl p-8 text-center">
        <Users size={40} className="text-[#1a2744]/25 mx-auto mb-3" />
        <p className="text-[#1a2744]/50 font-sans-app">No teams in {label} flight yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Search bar — sits right above the flight card */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#1a2744]/35 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search teams or players by last name..."
          className="w-full pl-9 pr-8 py-2 rounded-xl border border-[#1a2744]/15 bg-white text-[#1a2744] placeholder:text-[#1a2744]/35 text-sm font-sans-app focus:outline-none focus:border-[#b06b10]/50 focus:ring-1 focus:ring-[#b06b10]/30"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#1a2744]/35 hover:text-[#1a2744]/60 text-base leading-none">
            ✕
          </button>
        )}
      </div>

    <div className="atd-card rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#1a2744]/15 bg-[#1a2744]/5 flex items-center gap-2">
        <span className="text-[#1a2744] font-bold text-xs uppercase tracking-widest font-sans-app">{label}</span>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setShowInProgress(v => !v)}
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-colors font-sans-app ${
              showInProgress
                ? "bg-green-600/15 border-green-600/60 text-green-700"
                : "border-[#1a2744]/20 text-[#1a2744]/50 hover:border-green-600/40 hover:text-green-700/80"
            }`}
          >
            <span className="flex items-center gap-1">⛳ In Progress</span>
          </button>
          <button
            onClick={() => setShowCtp(v => !v)}
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-colors font-sans-app ${
              showCtp
                ? "bg-[#b06b10]/15 border-[#b06b10]/60 text-[#b06b10]"
                : "border-[#1a2744]/20 text-[#1a2744]/50 hover:border-[#b06b10]/40 hover:text-[#b06b10]/80"
            }`}
          >
            <span className="flex items-center gap-0.5"><Target size={11} />CTP</span>
            &amp;
            <span className="flex items-center gap-0.5"><Zap size={11} />Long Drive</span>
            {showCtp ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          </button>
        </div>
      </div>

      {/* CTP / LD panel — shown inline when toggled */}
      {showCtp && (ctpHoles.length > 0 || ldHole) && (
        <div className="px-4 py-3 border-b border-amber-500/15 bg-amber-500/5">
          <CtpGrid ctpEntries={ctpEntries} ctpHoles={ctpHoles} ldHole={ldHole} teams={teams} flight={flight} />
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full font-sans-app text-sm">
          <thead>
            <tr className="border-b border-amber-500/10">
              <th className="px-3 py-2.5 text-left text-[#b06b10] text-xs uppercase tracking-wider w-10">#</th>
              <th className="px-3 py-2.5 text-left text-[#b06b10] text-xs uppercase tracking-wider">Team</th>
              <th className="px-3 py-2.5 text-center text-[#b06b10] text-xs uppercase tracking-wider w-24">Score</th>
              <th className="px-3 py-2.5 text-center text-[#b06b10] text-xs uppercase tracking-wider w-16">Thru</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((entry, idx) => (
              <tr
                key={entry.team.id}
                onClick={() => navigate(`/team/${entry.team.id}`)}
                className="border-b border-[#1a2744]/10 hover:bg-amber-500/5 transition-colors cursor-pointer"
              >
                <td className="px-3 py-3 text-[#1a2744]/50 text-xs">
                  {idx + 1}
                </td>
                <td className="px-3 py-3">
                  <div className="font-bold text-[#1a2744] truncate max-w-[180px]">{entry.team.teamName}</div>
                  <div className="text-[#1a2744]/50 text-xs mt-0.5 truncate max-w-[180px]">
                    {[entry.team.player1, entry.team.player2, entry.team.player3, entry.team.player4]
                      .filter(Boolean)
                      .map(name => (name ?? "").trim().split(/\s+/).pop() ?? name)
                      .join(" · ")}
                  </div>
                </td>
                <td className="px-3 py-3 text-center text-lg">
                  {toParDisplay(entry.totalToPar, entry.holesCompleted)}
                </td>
                <td className="px-3 py-3 text-center text-[#1a2744]/60 text-sm">
                  {entry.holesCompleted > 0 ? (entry.holesCompleted === 18 ? "F" : `${entry.holesCompleted}`) : <span className="text-[#1a2744]/35">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
    </div>
  );
}

export default function Leaderboard() {
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  // All data arrives via SSE (useSSE in AppShell) — no polling needed here
  const { data: leaderboard = [], isLoading: loadingLb } = useQuery<LeaderboardEntry[]>({ queryKey: ["/api/leaderboard"] });
  const { data: holes = [] } = useQuery<Hole[]>({ queryKey: ["/api/holes"] });
  const { data: ctpEntries = [] } = useQuery<ClosestToPin[]>({ queryKey: ["/api/ctp"] });
  const { data: teams = [] } = useQuery<Team[]>({ queryKey: ["/api/teams"] });
  const { data: sponsors = [] } = useQuery<Sponsor[]>({ queryKey: ["/api/sponsors"] });
  const { data: settings } = useQuery<TournamentSettings>({ queryKey: ["/api/settings"] });

  useEffect(() => {
    if (leaderboard.length > 0) setLastUpdate(new Date());
  }, [leaderboard]);

  const morningTeams = leaderboard.filter(e => e.team.flight === "morning");
  const afternoonTeams = leaderboard.filter(e => e.team.flight === "afternoon");

  return (
    <div className="space-y-6">
      {/* Hero header — logo floats right without affecting layout height */}
      <div className="relative">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs font-sans-app px-3 py-1.5 rounded-full border border-green-600/40 text-green-700 bg-green-500/10">
              <Wifi size={12} className="live-indicator" />
              Live
            </div>
            {lastUpdate && (
              <span className="text-[#1a2744]/35 text-xs font-sans-app">
                Updated {lastUpdate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </span>
            )}
          </div>
          <h1 className="text-xl font-bold text-[#b06b10] leading-tight">Leaderboard</h1>
        </div>
        {/* Logo floats right — zero height impact on surrounding layout */}
        <div style={{ position: "absolute", top: 0, right: 0, pointerEvents: "none", zIndex: 0 }}>
          <img
            src={bigCountryLogo}
            alt="Big Country Title Company"
            className="bct-leaderboard-logo"
            style={{
              width: "auto",
              objectFit: "contain",
              display: "block",
            }}
          />
        </div>
      </div>

      {/* Sponsor banner */}
      <SponsorBanner sponsors={sponsors} placement="leaderboard" />

      {loadingLb ? (
        <div className="atd-card rounded-xl p-12 text-center">
          <Trophy size={40} className="text-[#b06b10]/30 mx-auto mb-3 animate-pulse" />
          <p className="text-[#1a2744]/50 font-sans-app">Loading leaderboard...</p>
        </div>
      ) : (
        <Tabs defaultValue={settings?.defaultFlight ?? "morning"}>
          <TabsList className="bg-white border border-[#1a2744]/20 mb-4 shadow-sm">
            <TabsTrigger value="morning" className="font-sans-app text-[#1a2744]/60 data-[state=active]:bg-amber-500/20 data-[state=active]:text-[#8a5008]">
              AM ({morningTeams.length})
            </TabsTrigger>
            <TabsTrigger value="afternoon" className="font-sans-app text-[#1a2744]/60 data-[state=active]:bg-amber-500/20 data-[state=active]:text-[#8a5008]">
              PM ({afternoonTeams.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="morning">
            {morningTeams.length === 0 ? (
              <div className="atd-card rounded-xl p-12 text-center">
                <Trophy size={48} className="text-[#b06b10]/20 mx-auto mb-4" />
                <p className="text-[#1a2744]/50 font-sans-app text-lg mb-2">No teams yet</p>
                <p className="text-[#1a2744]/30 text-sm font-sans-app">Teams will appear here once added by the admin</p>
              </div>
            ) : (
              <LeaderboardTable entries={morningTeams} label="AM Flight" flight="morning" ctpEntries={ctpEntries} ctpHoles={holes.filter(h => h.isCtpHole && h.par === 3)} ldHole={holes.find(h => h.isCtpHole && h.par !== 3)} teams={teams} />
            )}
          </TabsContent>
          <TabsContent value="afternoon">
            {afternoonTeams.length === 0 ? (
              <div className="atd-card rounded-xl p-12 text-center">
                <Trophy size={48} className="text-[#b06b10]/20 mx-auto mb-4" />
                <p className="text-[#1a2744]/50 font-sans-app text-lg mb-2">No teams yet</p>
                <p className="text-[#1a2744]/30 text-sm font-sans-app">Teams will appear here once added by the admin</p>
              </div>
            ) : (
              <LeaderboardTable entries={afternoonTeams} label="PM Flight" flight="afternoon" ctpEntries={ctpEntries} ctpHoles={holes.filter(h => h.isCtpHole && h.par === 3)} ldHole={holes.find(h => h.isCtpHole && h.par !== 3)} teams={teams} />
            )}
          </TabsContent>
        </Tabs>
      )}


    </div>
  );
}
