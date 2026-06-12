import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Trophy, Target, Search, Users, ChevronDown, ChevronUp, Wifi, Zap, Flag, X } from "lucide-react";
import bigCountryLogo from "@/assets/big-country-title.png";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { LeaderboardEntry, Hole, ClosestToPin, CtpHistory, Team, Sponsor, TournamentSettings } from "@shared/schema";

// ─── TIEBREAKER / STANDINGS ───────────────────────────────────────────────────
type TieInfo = {
  decidingHole: number;
  vsTeamName: string;
  rows: { hole: number; mine: number | null; theirs: number | null; decided: boolean }[];
};

function holeScore(entry: LeaderboardEntry, hole: number): number | null {
  return entry.scores.find(s => s.holeNumber === hole)?.strokes ?? null;
}

// Compare two tied-on-total entries across the ranked tiebreaker holes.
// Returns <0 if a is better, the deciding hole, or 0 if still tied.
function tiebreak(a: LeaderboardEntry, b: LeaderboardEntry, tbHoles: number[]): { cmp: number; hole: number | null } {
  for (const h of tbHoles) {
    const as = holeScore(a, h), bs = holeScore(b, h);
    if (as != null && bs != null && as !== bs) return { cmp: as - bs, hole: h };
  }
  return { cmp: 0, hole: null };
}

// Per-flight standings. Medals (place 1-3) are only assigned once the WHOLE flight
// is final: every team thru 18 and officially submitted.
export function computeStandings(entries: LeaderboardEntry[], tbHoles: number[]) {
  const sorted = [...entries].sort((a, b) => {
    if (b.holesCompleted !== a.holesCompleted) return b.holesCompleted - a.holesCompleted;
    if (a.totalToPar !== b.totalToPar) return a.totalToPar - b.totalToPar;
    const tb = tiebreak(a, b, tbHoles);
    if (tb.cmp !== 0) return tb.cmp;
    return a.team.teamName.localeCompare(b.team.teamName);
  });

  const flightFinal = entries.length > 0 && entries.every(e => e.holesCompleted === 18 && e.team.isSubmitted);
  const placeMap = new Map<number, number>();
  const tieMap = new Map<number, TieInfo>();
  if (!flightFinal) return { sorted, placeMap, tieMap };

  sorted.forEach((e, i) => { if (i < 3) placeMap.set(e.team.id, i + 1); });

  // Asterisk: a team that placed in the top 3 by beating a tied team (same total) via tiebreaker
  for (let i = 0; i < Math.min(3, sorted.length); i++) {
    const a = sorted[i], b = sorted[i + 1];
    if (!b) continue;
    if (a.totalToPar !== b.totalToPar) continue; // not a tie — placed on merit
    const tb = tiebreak(a, b, tbHoles);
    if (tb.cmp < 0 && tb.hole != null) {
      const rows: TieInfo["rows"] = [];
      for (const h of tbHoles) {
        rows.push({ hole: h, mine: holeScore(a, h), theirs: holeScore(b, h), decided: h === tb.hole });
        if (h === tb.hole) break;
      }
      tieMap.set(a.team.id, { decidingHole: tb.hole, vsTeamName: b.team.teamName, rows });
    }
  }
  return { sorted, placeMap, tieMap };
}

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
  const { data: history = [] } = useQuery<CtpHistory[]>({ queryKey: ["/api/ctp/history"] });
  const [historyHole, setHistoryHole] = useState<{ hole: Hole; isLd: boolean } | null>(null);

  // Combine CTP holes + LD hole for rendering
  const allHoles: Array<{ hole: Hole; isLd: boolean }> = [
    ...ctpHoles.map(h => ({ hole: h, isLd: false })),
    ...(ldHole ? [{ hole: ldHole, isLd: true }] : []),
  ];

  // History rows for the popup: this hole, this flight's teams, newest first
  const popupRows = historyHole
    ? history
        .filter(h => h.holeNumber === historyHole.hole.holeNumber && h.teamId != null && flightTeamIds.has(h.teamId))
        .sort((a, b) => b.id - a.id)
    : [];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {allHoles.map(({ hole, isLd }) => {
        // Only show entry if it belongs to a team in this flight
        const entry = ctpEntries.find(c => c.holeNumber === hole.holeNumber && c.teamId != null && flightTeamIds.has(c.teamId!));
        const team = entry?.teamId ? teams.find(t => t.id === entry.teamId) : null;
        return (
          <button
            key={hole.id}
            onClick={() => setHistoryHole({ hole, isLd })}
            className={`bg-white rounded-lg p-3 shadow-sm text-left transition-shadow hover:shadow-md ${
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
          </button>
        );
      })}

      {/* History popup — full lineage of marks for this hole, current leader first */}
      {historyHole && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4" style={{ background: "rgba(17,27,51,0.6)" }} onClick={() => setHistoryHole(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" style={{ border: "2px solid #b06b10" }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-[#1a2744]/10 min-w-0">
              {/* One line, sizes down on small screens: type label colored, hole black, prize gray + truncating */}
              <div className="flex items-center gap-1.5 font-bold font-sans-app flex-nowrap min-w-0 text-[clamp(0.7rem,3.4vw,0.875rem)]">
                <span className={`flex items-center gap-1.5 shrink-0 whitespace-nowrap ${historyHole.isLd ? "text-emerald-600" : "text-[#b06b10]"}`}>
                  {historyHole.isLd ? <Zap size={14} /> : <Target size={14} />}
                  {historyHole.isLd ? "Long Drive" : "Closest to Pin"}
                </span>
                <span className="text-[#1a2744] shrink-0 whitespace-nowrap"><span className="text-[#1a2744]/45 font-normal">·</span> Hole {historyHole.hole.holeNumber}</span>
                {historyHole.hole.ctpLabel && (
                  <span className="text-[#1a2744]/45 font-normal truncate min-w-0">· {historyHole.hole.ctpLabel}</span>
                )}
              </div>
              <button onClick={() => setHistoryHole(null)} className="text-[#1a2744]/40 hover:text-[#1a2744]/70 p-1 shrink-0">
                <X size={16} />
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {popupRows.length === 0 ? (
                <div className="px-4 py-6 text-center text-[#1a2744]/40 text-sm italic font-sans-app">No entries marked yet</div>
              ) : (
                popupRows.map((row, idx) => {
                  const team = row.teamId ? teams.find(t => t.id === row.teamId) : null;
                  return (
                    <div key={row.id} className={`px-4 py-2.5 flex items-center justify-between gap-2 ${idx === 0 ? "bg-amber-500/10" : idx % 2 !== 0 ? "bg-[#1a2744]/3" : ""} ${idx !== popupRows.length - 1 ? "border-b border-[#1a2744]/8" : ""}`}>
                      <div className="min-w-0">
                        <div className={`text-sm truncate ${idx === 0 ? "font-bold text-[#1a2744]" : "text-[#1a2744]/70"}`} style={{ fontFamily: "'Playfair Display', 'Georgia', serif" }}>
                          {row.playerName || team?.teamName || "—"}
                        </div>
                        {team && <div className="text-[#1a2744]/45 text-xs truncate font-sans-app">{team.teamName}</div>}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {row.distance && (
                          <span className={`text-xs font-bold font-sans-app ${historyHole.isLd ? "text-emerald-700" : "text-green-700"}`}>
                            {historyHole.isLd ? `${row.distance} yds` : formatCtpDistance(row.distance)}
                          </span>
                        )}
                        {idx === 0 && (
                          <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-amber-500/25 text-[#b06b10] border border-amber-500/40 font-sans-app whitespace-nowrap">
                            Leader
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
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

function LeaderboardTable({ entries, label, flight, ctpEntries, ctpHoles, ldHole, teams, flightStatus, placeMap, tieMap }: {
  entries: LeaderboardEntry[];
  label: string;
  flight: "morning" | "afternoon";
  ctpEntries: ClosestToPin[];
  ctpHoles: Hole[];
  ldHole?: Hole;
  teams: Team[];
  flightStatus?: string | null;
  placeMap: Map<number, number>;
  tieMap: Map<number, TieInfo>;
}) {
  const [, navigate] = useLocation();
  const [showCtp, setShowCtp] = useState(false);
  const [showInProgress, setShowInProgress] = useState(false);
  const [search, setSearch] = useState("");
  const [tiePopup, setTiePopup] = useState<TieInfo | null>(null);

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
      {/* Header — single line, scales down on mobile, never wraps */}
      <div className="px-2.5 sm:px-4 py-3 border-b border-[#1a2744]/15 bg-[#1a2744]/5 flex items-center gap-1.5 flex-nowrap text-[clamp(9px,2.6vw,12px)]">
        <span className={`font-bold uppercase tracking-wide font-sans-app shrink-0 whitespace-nowrap ${flight === "morning" ? "text-blue-600" : "text-[#b06b10]"}`}>{label}</span>
        {flightStatus === "not_started" && (
          <span className="flex items-center gap-1 font-bold font-sans-app text-[#1a2744]/45 shrink-0 whitespace-nowrap">
            <span className="text-[#1a2744]/30">—</span>
            Not Started
          </span>
        )}
        {flightStatus === "in_progress" && (
          <span className="flex items-center gap-1 font-bold font-sans-app text-green-700 shrink-0 whitespace-nowrap">
            <span className="text-[#1a2744]/30">—</span>
            <span className="live-indicator w-1.5 h-1.5 rounded-full bg-green-500 inline-block"></span>
            In Progress
          </span>
        )}
        {flightStatus === "complete" && (
          <span className="flex items-center gap-1 font-bold font-sans-app text-[#1a2744] shrink-0 whitespace-nowrap">
            <span className="text-[#1a2744]/30">—</span>
            Complete
          </span>
        )}
        <div className="ml-auto flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setShowInProgress(v => !v)}
            className={`flex items-center gap-1 px-2 py-1 rounded-full border transition-colors font-sans-app whitespace-nowrap shrink-0 ${
              showInProgress
                ? "bg-green-600/15 border-green-600/60 text-green-700"
                : "border-[#1a2744]/20 text-[#1a2744]/50 hover:border-green-600/40 hover:text-green-700/80"
            }`}
          >
            <span className="flex items-center gap-1">⛳ Still Playing</span>
          </button>
          <button
            onClick={() => setShowCtp(v => !v)}
            className={`flex items-center gap-1 px-2 py-1 rounded-full border transition-colors font-sans-app whitespace-nowrap shrink-0 ${
              showCtp
                ? "bg-[#b06b10]/15 border-[#b06b10]/60 text-[#b06b10]"
                : "border-[#1a2744]/20 text-[#1a2744]/50 hover:border-[#b06b10]/40 hover:text-[#b06b10]/80"
            }`}
          >
            <span className="flex items-center gap-0.5"><Target size={10} />CTP</span>
            &amp;
            <span className="flex items-center gap-0.5"><Zap size={10} />Long Drive</span>
            {showCtp ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
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
                  <div className="flex items-center gap-1 max-w-[200px]">
                    <span className="font-bold text-[#1a2744] truncate" style={{ fontFamily: "'Playfair Display', 'Georgia', serif" }}>{entry.team.teamName}</span>
                    {placeMap.get(entry.team.id) != null && (
                      <span className="text-base shrink-0">{["", "🥇", "🥈", "🥉"][placeMap.get(entry.team.id)!]}</span>
                    )}
                    {tieMap.has(entry.team.id) && (
                      <button
                        onClick={e => { e.stopPropagation(); setTiePopup(tieMap.get(entry.team.id)!); }}
                        className="shrink-0 text-[#b06b10] font-bold text-lg leading-none px-0.5 hover:text-[#8a5008]"
                        title="Won on a tiebreaker — tap for details"
                      >*</button>
                    )}
                  </div>
                  <div className="text-[#1a2744]/50 text-xs mt-0.5 truncate max-w-[180px]" style={{ fontFamily: "'Playfair Display', 'Georgia', serif" }}>
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

    {/* Tiebreaker explanation popup */}
    {tiePopup && (
      <div className="fixed inset-0 z-[250] flex items-center justify-center p-4" style={{ background: "rgba(17,27,51,0.6)" }} onClick={() => setTiePopup(null)}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" style={{ border: "2px solid #b06b10" }} onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a2744]/10">
            <span className="font-bold text-sm text-[#b06b10] font-sans-app">Tiebreaker</span>
            <button onClick={() => setTiePopup(null)} className="text-[#1a2744]/40 hover:text-[#1a2744]/70 p-1"><X size={16} /></button>
          </div>
          <div className="px-4 py-3 space-y-3 font-sans-app">
            <p className="text-sm text-[#1a2744]/75">
              Tied on total with <span className="font-bold text-[#1a2744]">{tiePopup.vsTeamName}</span> — won on
              <span className="font-bold text-[#b06b10]"> Hole {tiePopup.decidingHole}</span>.
            </p>
            <div className="rounded-lg border border-[#1a2744]/12 overflow-hidden">
              <div className="grid grid-cols-3 text-[10px] font-bold uppercase tracking-wide text-[#1a2744]/45 bg-[#1a2744]/5 px-3 py-1.5">
                <span>Hole</span><span className="text-center">This team</span><span className="text-center">{tiePopup.vsTeamName.length > 12 ? "Other" : tiePopup.vsTeamName}</span>
              </div>
              {tiePopup.rows.map(r => (
                <div key={r.hole} className={`grid grid-cols-3 px-3 py-1.5 text-sm border-t border-[#1a2744]/8 ${r.decided ? "bg-green-500/10" : ""}`}>
                  <span className="text-[#1a2744]/70">Hole {r.hole}</span>
                  <span className={`text-center font-bold ${r.decided ? "text-green-700" : "text-[#1a2744]"}`}>{r.mine ?? "—"}</span>
                  <span className="text-center text-[#1a2744]/60">{r.theirs ?? "—"}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-[#1a2744]/45">Holes are compared in the tiebreaker order set by the admin; the green row is where the tie was broken.</p>
          </div>
        </div>
      </div>
    )}
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

  const tbHoles = (settings?.tiebreakerHoles ?? "").split(",").map(s => parseInt(s.trim())).filter(n => !isNaN(n));
  const amStandings = computeStandings(morningTeams, tbHoles);
  const pmStandings = computeStandings(afternoonTeams, tbHoles);

  const mode = settings?.tournamentMode ?? "test";
  const indicator = {
    test: { label: "Test", cls: "border-blue-600/40 text-blue-700 bg-blue-500/10", pulse: true },
    live: { label: "Live", cls: "border-green-600/40 text-green-700 bg-green-500/10", pulse: true },
    complete: { label: "Complete", cls: "border-[#1a2744]/30 text-[#1a2744]/70 bg-[#1a2744]/8", pulse: false },
  }[mode] ?? { label: "Live", cls: "border-green-600/40 text-green-700 bg-green-500/10", pulse: true };

  // Per-flight round status shown on the flight headers (live mode only)
  const amFlightStatus = mode === "live" ? (settings?.amStatus ?? "not_started") : null;
  const pmFlightStatus = mode === "live" ? (settings?.pmStatus ?? "not_started") : null;

  // Default tab follows the round status: PM when its round is in progress
  // (or wrapped up after AM), otherwise AM.
  const defaultTab = (settings?.pmStatus === "in_progress" || (settings?.pmStatus === "complete" && settings?.amStatus === "complete"))
    ? "afternoon" : "morning";

  return (
    <div className="space-y-6">
      {/* Hero header — logo floats right without affecting layout height */}
      <div className="relative">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 text-xs font-sans-app px-3 py-1.5 rounded-full border ${indicator.cls}`}>
              {mode === "complete" ? <Flag size={12} /> : <Wifi size={12} className={indicator.pulse ? "live-indicator" : ""} />}
              {indicator.label}
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

      {loadingLb || !settings ? (
        <div className="atd-card rounded-xl p-12 text-center">
          <Trophy size={40} className="text-[#b06b10]/30 mx-auto mb-3 animate-pulse" />
          <p className="text-[#1a2744]/50 font-sans-app">Loading leaderboard...</p>
        </div>
      ) : (
        <Tabs defaultValue={defaultTab}>
          <TabsList className="bg-white border border-[#1a2744]/20 mb-4 shadow-sm">
            <TabsTrigger value="morning" className="font-sans-app text-[#1a2744]/60 data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-600">
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
              <LeaderboardTable entries={amStandings.sorted} label="AM Flight" flight="morning" ctpEntries={ctpEntries} ctpHoles={holes.filter(h => h.isCtpHole && h.par === 3)} ldHole={holes.find(h => h.isCtpHole && h.par !== 3)} teams={teams} flightStatus={amFlightStatus} placeMap={amStandings.placeMap} tieMap={amStandings.tieMap} />
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
              <LeaderboardTable entries={pmStandings.sorted} label="PM Flight" flight="afternoon" ctpEntries={ctpEntries} ctpHoles={holes.filter(h => h.isCtpHole && h.par === 3)} ldHole={holes.find(h => h.isCtpHole && h.par !== 3)} teams={teams} flightStatus={pmFlightStatus} placeMap={pmStandings.placeMap} tieMap={pmStandings.tieMap} />
            )}
          </TabsContent>
        </Tabs>
      )}


    </div>
  );
}
