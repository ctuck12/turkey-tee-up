import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { ArrowLeft, Flag } from "lucide-react";
import type { Team, Hole, Score } from "@shared/schema";

function ScoreCell({ strokes, par }: { strokes: number | null | undefined; par: number }) {
  if (strokes == null) return <td className="scorecard-table score-cell">-</td>;
  const diff = strokes - par;
  let className = "scorecard-table score-cell ";
  let style: React.CSSProperties = {};

  if (diff <= -2) {
    style = { background: "rgba(200,137,42,0.2)", color: "#a0691a", fontWeight: 700 };
  } else if (diff === -1) {
    style = { borderRadius: "50%", background: "transparent", color: "#a0691a", border: "2px solid #c8892a", fontWeight: 600 };
  } else if (diff === 0) {
    style = { color: "#1a2744" };
  } else if (diff === 1) {
    style = { border: "2px solid #c0323e", color: "#c0323e" };
  } else {
    style = { border: "3px solid #a02030", color: "#a02030", fontWeight: 700 };
  }

  return <td className="scorecard-table score-cell py-1.5 px-2 text-center border border-[#1a2744]/10" style={style}>{strokes}</td>;
}

export default function TeamScorecard() {
  const { teamId } = useParams();
  const id = parseInt(teamId ?? "0");

  const { data: team } = useQuery<Team>({ queryKey: ["/api/teams", id] });
  const { data: holes = [] } = useQuery<Hole[]>({ queryKey: ["/api/holes"] });
  const { data: scores = [] } = useQuery<Score[]>({ queryKey: ["/api/scores/team", id] });

  const holeMap = new Map(holes.map(h => [h.holeNumber, h]));
  const scoreMap = new Map(scores.map(s => [s.holeNumber, s]));

  const front9 = Array.from({ length: 9 }, (_, i) => i + 1);
  const back9 = Array.from({ length: 9 }, (_, i) => i + 10);

  function holeTotal(holeNums: number[]) {
    return holeNums.reduce((sum, n) => {
      const s = scoreMap.get(n);
      return sum + (s?.strokes ?? 0);
    }, 0);
  }
  function parTotal(holeNums: number[]) {
    return holeNums.reduce((sum, n) => sum + (holeMap.get(n)?.par ?? 4), 0);
  }
  // Only count par for holes that have actually been played
  function playedParTotal(holeNums: number[]) {
    return holeNums.reduce((sum, n) => {
      const s = scoreMap.get(n);
      if (!s?.strokes) return sum;
      return sum + (holeMap.get(n)?.par ?? 4);
    }, 0);
  }

  const front9Strokes = holeTotal(front9);
  const back9Strokes = holeTotal(back9);
  const totalStrokes = front9Strokes + back9Strokes;
  const totalPar = parTotal([...front9, ...back9]);
  const playedPar = playedParTotal([...front9, ...back9]);
  const totalToPar = totalStrokes - playedPar;
  const hasScores = scores.some(s => s.strokes != null);

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
        <Flag size={18} className="text-[#b06b10]" />
        <h1 className="text-lg font-bold text-[#b06b10]">{team.teamName}</h1>
        <span className="text-xs font-sans-app px-2 py-0.5 rounded-full bg-amber-500/15 text-[#b06b10]/80 capitalize">
          {team.flight} Flight
        </span>
      </div>

      {/* Players */}
      <div className="atd-card rounded-xl p-4">
        <p className="text-amber-500/50 text-xs uppercase tracking-widest font-sans-app mb-2">Players</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[team.player1, team.player2, team.player3, team.player4].filter(Boolean).map((p, i) => (
            <div key={i} className="bg-[#1a2744]/5 rounded-lg px-3 py-2">
              <span className="text-[#1a2744]/50 text-xs font-sans-app block">Player {i + 1}</span>
              <span className="text-[#1a2744] font-medium">{p}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Horizontal Scorecard */}
      <div className="atd-card rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-[#1a2744]/12 flex items-center gap-2">
          <span className="text-[#b06b10]/60 text-xs uppercase tracking-widest font-sans-app">Official Scorecard</span>
          {!hasScores && <span className="text-[#1a2744]/35 text-xs font-sans-app italic">No scores entered yet</span>}
        </div>
        <div className="overflow-x-auto p-4">
          <table className="scorecard-table w-full min-w-[700px]">
            <thead>
              <tr>
                <th className="text-left px-3" style={{ width: "52px", minWidth: "52px" }}>Hole</th>
                {front9.map(n => <th key={n} className="w-8">{n}</th>)}
                <th className="bg-[#1a2744]/8">OUT</th>
                {back9.map(n => <th key={n} className="w-8">{n}</th>)}
                <th className="bg-[#1a2744]/8">IN</th>
                <th className="bg-[#1a2744]/12 text-[#c8892a]">TOT</th>
              </tr>
            </thead>
            <tbody>
              {/* Yardage row */}
              <tr className="par-row">
                <td className="text-left px-3 text-[#1a2744]/55 text-xs" style={{ width: "52px", minWidth: "52px" }}>Yds</td>
                {front9.map(n => <td key={n} className="text-[#1a2744]/55 text-xs">{holeMap.get(n)?.yardageBlue ?? "—"}</td>)}
                <td className="font-bold text-[#1a2744]/60 bg-[#1a2744]/5">
                  {front9.reduce((s,n) => s + (holeMap.get(n)?.yardageBlue ?? 0), 0)}
                </td>
                {back9.map(n => <td key={n} className="text-[#1a2744]/55 text-xs">{holeMap.get(n)?.yardageBlue ?? "—"}</td>)}
                <td className="font-bold text-[#1a2744]/60 bg-[#1a2744]/5">
                  {back9.reduce((s,n) => s + (holeMap.get(n)?.yardageBlue ?? 0), 0)}
                </td>
                <td className="font-bold text-[#1a2744]/60 bg-[#1a2744]/8">
                  {holes.reduce((s,h) => s + (h.yardageBlue ?? 0), 0)}
                </td>
              </tr>
              {/* Handicap row */}
              <tr className="score-row">
                <td className="text-left px-3 text-[#1a2744]/50 text-xs" style={{ width: "52px", minWidth: "52px" }}>Hdcp</td>
                {front9.map(n => <td key={n} className="text-[#1a2744]/50 text-xs">{holeMap.get(n)?.handicap ?? "—"}</td>)}
                <td className="bg-[#1a2744]/5"></td>
                {back9.map(n => <td key={n} className="text-[#1a2744]/50 text-xs">{holeMap.get(n)?.handicap ?? "—"}</td>)}
                <td className="bg-[#1a2744]/5"></td>
                <td className="bg-[#1a2744]/8"></td>
              </tr>
              {/* Par row */}
              <tr className="score-row">
                <td className="text-left px-3 font-bold" style={{ width: "52px", minWidth: "52px" }}>Par</td>
                {front9.map(n => <td key={n}>{holeMap.get(n)?.par ?? 4}</td>)}
                <td className="font-bold bg-[#1a2744]/8">{parTotal(front9)}</td>
                {back9.map(n => <td key={n}>{holeMap.get(n)?.par ?? 4}</td>)}
                <td className="font-bold bg-[#1a2744]/8">{parTotal(back9)}</td>
                <td className="font-bold bg-[#1a2744]/12">{totalPar}</td>
              </tr>
              {/* Score row */}
              <tr className="score-row">
                <td className="text-left px-3 font-bold text-[#1a2744]" style={{ width: "52px", minWidth: "52px" }}>Score</td>
                {front9.map(n => {
                  const s = scoreMap.get(n);
                  const h = holeMap.get(n);
                  return <ScoreCell key={n} strokes={s?.strokes} par={h?.par ?? 4} />;
                })}
                <td className="font-bold bg-[#1a2744]/5">
                  {front9.some(n => scoreMap.get(n)?.strokes) ? holeTotal(front9) : "—"}
                </td>
                {back9.map(n => {
                  const s = scoreMap.get(n);
                  const h = holeMap.get(n);
                  return <ScoreCell key={n} strokes={s?.strokes} par={h?.par ?? 4} />;
                })}
                <td className="font-bold bg-[#1a2744]/5">
                  {back9.some(n => scoreMap.get(n)?.strokes) ? holeTotal(back9) : "—"}
                </td>
                <td className="font-bold text-base bg-[#1a2744]/8">
                  {hasScores ? (
                    <div>
                      <div>{totalStrokes}</div>
                      <div className={`text-xs ${totalToPar < 0 ? "to-par-under" : totalToPar > 0 ? "to-par-over" : "to-par-even"}`}>
                        {totalToPar === 0 ? "E" : totalToPar > 0 ? `+${totalToPar}` : totalToPar}
                      </div>
                    </div>
                  ) : "—"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Score legend */}
        <div className="px-4 pb-3 flex flex-wrap gap-3 text-xs font-sans-app text-[#1a2744]/50 border-t border-[#1a2744]/8 pt-3">
          <span className="font-bold text-[#b06b10]/60">Legend:</span>
          <span style={{ background: "rgba(200,137,42,0.3)", color: "#e8a840", padding: "1px 4px", borderRadius: 2 }}>Eagle</span>
          <span style={{ border: "2px solid #e8a840", color: "#e8a840", padding: "1px 4px", borderRadius: "50%" }}>Birdie</span>
          <span style={{ color: "#e8e4d8" }}>Par</span>
          <span style={{ border: "2px solid #dd6974", color: "#dd6974", padding: "1px 4px" }}>Bogey</span>
          <span style={{ border: "3px solid #c24a59", color: "#c24a59", padding: "1px 4px" }}>Double+</span>
        </div>
      </div>
    </div>
  );
}
