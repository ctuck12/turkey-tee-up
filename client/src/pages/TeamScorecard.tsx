import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import type { Team, Hole, Score } from "@shared/schema";
import { ScorecardTable, ScorecardLegend } from "@/components/ScorecardTable";
import bigCountryLogo from "@/assets/big-country-title.png";

export default function TeamScorecard() {
  const { teamId } = useParams();
  const id = parseInt(teamId ?? "0");

  const { data: team } = useQuery<Team>({ queryKey: ["/api/teams", id] });
  const { data: holes = [] } = useQuery<Hole[]>({ queryKey: ["/api/holes"] });
  const { data: scores = [] } = useQuery<Score[]>({ queryKey: ["/api/scores/team", id] });

  const hasScores = scores.some(s => s.strokes != null);
  const holesCompleted = scores.filter(s => s.strokes != null).length;

  // Front / Back / Total score-to-par tracker
  const sortedHoles = [...holes].sort((a, b) => a.holeNumber - b.holeNumber);
  const holeMap = new Map(sortedHoles.map(h => [h.holeNumber, h]));
  const scoreMap = new Map(scores.map(s => [s.holeNumber, s]));
  const front9 = sortedHoles.filter(h => h.holeNumber <= 9).map(h => h.holeNumber);
  const back9  = sortedHoles.filter(h => h.holeNumber >= 10).map(h => h.holeNumber);

  function groupToPar(holeNums: number[]) {
    let strokes = 0, par = 0;
    for (const n of holeNums) {
      const s = scoreMap.get(n);
      if (!s?.strokes) continue;
      strokes += s.strokes;
      par     += holeMap.get(n)?.par ?? 4;
    }
    if (strokes === 0) return null;
    return strokes - par;
  }

  function formatToPar(val: number | null) {
    if (val === null) return "—";
    if (val === 0) return "E";
    return val > 0 ? `+${val}` : `${val}`;
  }

  const frontToPar = groupToPar(front9);
  const backToPar  = groupToPar(back9);
  const totalToPar = (frontToPar !== null || backToPar !== null)
    ? (frontToPar ?? 0) + (backToPar ?? 0)
    : null;

  if (!team) {
    return (
      <div className="p-8 text-center text-[#1a2744]/50 font-sans-app">
        <p>Team not found.</p>
        <Link href="/" className="text-[#b06b10] hover:underline mt-2 block">← Back to Leaderboard</Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/">
          <button className="flex items-center gap-1.5 text-[#b06b10]/80 hover:text-[#b06b10] text-sm font-sans-app">
            <ArrowLeft size={15} /> Back
          </button>
        </Link>
      </div>

      {/* Players */}
      <div className="atd-card rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <h1 className="text-lg font-bold text-[#b06b10] leading-tight truncate max-w-[200px]">{team.teamName}</h1>
          <span className={`text-xs font-sans-app font-bold px-2 py-0.5 rounded-full border ${team.flight === "morning" ? "bg-blue-500/20 text-blue-600 border-blue-500/30" : "bg-amber-500/25 text-[#b06b10] border-amber-500/40"}`}>
            {team.flight === "morning" ? "AM" : "PM"}
          </span>
          <span className="text-xs font-sans-app px-2 py-0.5 rounded-full bg-[#1a2744]/8 border border-[#1a2744]/15 text-[#1a2744]/60">
            Starting Hole: {team.startingHole ?? 1}
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[team.player1, team.player2, team.player3, team.player4].filter(Boolean).map((p, i) => (
            <div key={i} className="bg-[#1a2744]/5 rounded-lg px-3 py-2">
              <span className="text-[#1a2744]/50 text-xs font-sans-app block">Player {i + 1}</span>
              <span className="text-[#1a2744] font-medium truncate block">{p}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Scorecard */}
      <div className="atd-card rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-[#1a2744]/12 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[#1a2744] text-xs uppercase tracking-widest font-sans-app font-bold">Scorecard</span>
            {!hasScores && <span className="text-[#1a2744]/35 text-xs font-sans-app italic">No scores entered yet</span>}
          </div>
          {hasScores && (
            <div className="flex items-center gap-3 text-xs font-sans-app">
              <span className="flex flex-col items-center">
                <span className="text-[#1a2744]/45 text-[10px] uppercase tracking-wide leading-none mb-0.5">Front</span>
                <span className="font-bold text-[#1a2744]">{formatToPar(frontToPar)}</span>
              </span>
              <span className="text-[#1a2744]/20 text-base leading-none">|</span>
              <span className="flex flex-col items-center">
                <span className="text-[#1a2744]/45 text-[10px] uppercase tracking-wide leading-none mb-0.5">Back</span>
                <span className="font-bold text-[#1a2744]">{formatToPar(backToPar)}</span>
              </span>
              <span className="text-[#1a2744]/20 text-base leading-none">|</span>
              <span className="flex flex-col items-center">
                <span className="text-[#1a2744]/45 text-[10px] uppercase tracking-wide leading-none mb-0.5">Total</span>
                <span className="font-bold text-[#1a2744]">{formatToPar(totalToPar)}</span>
              </span>
              <span className="text-[#1a2744]/20 text-base leading-none">|</span>
              <span className="flex flex-col items-center">
                <span className="text-[#1a2744]/45 text-[10px] uppercase tracking-wide leading-none mb-0.5">Thru</span>
                <span className="font-bold text-[#1a2744]">{holesCompleted === 18 ? "F" : holesCompleted}</span>
              </span>
            </div>
          )}
        </div>
        <div className="p-4">
          <ScorecardTable holes={holes} scores={scores} />
        </div>
      </div>

      {/* Big Country Title sponsor logo */}
      <div className="flex justify-center px-4 pb-2">
        <img
          src={bigCountryLogo}
          alt="Big Country Title Company"
          style={{
            width: "100%",
            maxWidth: "min(320px, 80vw)",
            maxHeight: "min(220px, 26vh)",
            height: "auto",
            display: "block",
            objectFit: "contain",
          }}
        />
      </div>
    </div>
  );
}
