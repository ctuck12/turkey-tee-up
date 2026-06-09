import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { ArrowLeft, Flag } from "lucide-react";
import type { Team, Hole, Score } from "@shared/schema";
import { ScorecardTable, ScorecardLegend } from "@/components/ScorecardTable";

export default function TeamScorecard() {
  const { teamId } = useParams();
  const id = parseInt(teamId ?? "0");

  const { data: team } = useQuery<Team>({ queryKey: ["/api/teams", id] });
  const { data: holes = [] } = useQuery<Hole[]>({ queryKey: ["/api/holes"] });
  const { data: scores = [] } = useQuery<Score[]>({ queryKey: ["/api/scores/team", id] });

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

      {/* Scorecard */}
      <div className="atd-card rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-[#1a2744]/12 flex items-center gap-2">
          <span className="text-[#b06b10]/60 text-xs uppercase tracking-widest font-sans-app">Official Scorecard</span>
          {!hasScores && <span className="text-[#1a2744]/35 text-xs font-sans-app italic">No scores entered yet</span>}
        </div>
        <div className="p-4">
          <ScorecardTable holes={holes} scores={scores} />
        </div>
        <ScorecardLegend />
      </div>
    </div>
  );
}
