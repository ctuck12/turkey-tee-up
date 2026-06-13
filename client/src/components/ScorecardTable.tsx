import React, { useEffect, useRef } from "react";
import type { Hole, Score } from "@shared/schema";

// ─── ScoreCell ────────────────────────────────────────────────────────────────
// highlight: green-tinted cell — used by the admin comparison view to mark the
// outright best score on a hole.
export function ScoreCell({ strokes, par, highlight }: { strokes: number | null | undefined; par: number; highlight?: boolean }) {
  const hlStyle: React.CSSProperties = highlight ? { background: "rgba(34,197,94,0.22)" } : {};
  if (strokes == null) {
    return <td className="scorecard-table score-cell text-center border border-[#1a2744]/10 text-[#1a2744]/35" style={{ padding: "6px 2px", ...hlStyle }}>-</td>;
  }
  const diff = strokes - par;

  const cellStyle: React.CSSProperties = { padding: "6px 2px", overflow: "visible", ...hlStyle };

  if (diff <= -2) {
    return (
      <td className="scorecard-table score-cell text-center border border-[#1a2744]/10" style={cellStyle}>
        <span style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          width: "20px", height: "20px", borderRadius: "50%",
          border: "1.5px solid #c0323e",
          boxShadow: "0 0 0 2px #faf8f4, 0 0 0 4px #c0323e",
          color: "#c0323e", fontWeight: 700, fontSize: "0.7rem",
        }}>{strokes}</span>
      </td>
    );
  }

  if (diff === -1) {
    return (
      <td className="scorecard-table score-cell text-center border border-[#1a2744]/10" style={cellStyle}>
        <span style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          width: "24px", height: "24px", borderRadius: "50%",
          border: "2px solid #c0323e",
          color: "#c0323e", fontWeight: 600, fontSize: "0.75rem",
        }}>{strokes}</span>
      </td>
    );
  }

  if (diff === 0) {
    return (
      <td className="scorecard-table score-cell text-center border border-[#1a2744]/10" style={{ ...cellStyle, color: "#1a2744" }}>
        {strokes}
      </td>
    );
  }

  return (
    <td className="scorecard-table score-cell text-center border border-[#1a2744]/10" style={cellStyle}>
      <span style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: "24px", height: "24px", borderRadius: "2px",
        border: "2px solid #1a2744",
        color: "#1a2744", fontWeight: 700, fontSize: "0.75rem",
      }}>{strokes}</span>
    </td>
  );
}

// ─── ScorePill ────────────────────────────────────────────────────────────────
// Inline (non-table) version of the scorecard score styling: double-circle eagle,
// circled birdie, plain par, squared bogey+. Used in the tiebreaker popups.
export function ScorePill({ strokes, par, gap = "#ffffff" }: { strokes: number | null | undefined; par: number; gap?: string }) {
  if (strokes == null) return <span className="text-[#1a2744]/35">—</span>;
  const diff = strokes - par;
  const box: React.CSSProperties = { display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 700 };
  if (diff <= -2) {
    return <span style={{ ...box, width: 22, height: 22, borderRadius: "50%", border: "1.5px solid #c0323e", boxShadow: `0 0 0 2px ${gap}, 0 0 0 4px #c0323e`, color: "#c0323e", fontSize: "0.75rem" }}>{strokes}</span>;
  }
  if (diff === -1) {
    return <span style={{ ...box, width: 24, height: 24, borderRadius: "50%", border: "2px solid #c0323e", color: "#c0323e", fontSize: "0.8rem" }}>{strokes}</span>;
  }
  if (diff === 0) {
    return <span style={{ color: "#1a2744", fontWeight: 700, fontSize: "0.85rem" }}>{strokes}</span>;
  }
  return <span style={{ ...box, width: 24, height: 24, borderRadius: 2, border: "2px solid #1a2744", color: "#1a2744", fontSize: "0.8rem" }}>{strokes}</span>;
}

// ─── ScorecardTable ───────────────────────────────────────────────────────────
// Full 18-hole scrollable scorecard.
// scrollToHole: when provided, auto-scrolls the table so that hole's column is
// visible on mount and whenever the value changes. Pass `currentHole` from the
// Scorekeeper so the relevant nine is always in view without any toggle.
export function ScorecardTable({
  holes,
  scores,
  scrollToHole,
  highlightHoles,
}: {
  holes: Hole[];
  scores: Score[];
  scrollToHole?: number;
  highlightHoles?: Set<number>;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const sortedHoles = [...holes].sort((a, b) => a.holeNumber - b.holeNumber);
  const holeMap = new Map(sortedHoles.map(h => [h.holeNumber, h]));
  const scoreMap = new Map(scores.map(s => [s.holeNumber, s]));

  const allHoleNums = sortedHoles.map(h => h.holeNumber);
  const front9 = allHoleNums.filter(n => n <= 9);
  const back9  = allHoleNums.filter(n => n >= 10);

  function holeTotal(holeNums: number[]) {
    return holeNums.reduce((sum, n) => sum + (scoreMap.get(n)?.strokes ?? 0), 0);
  }
  function parTotal(holeNums: number[]) {
    return holeNums.reduce((sum, n) => sum + (holeMap.get(n)?.par ?? 4), 0);
  }
  function playedParTotal(holeNums: number[]) {
    return holeNums.reduce((sum, n) => {
      const s = scoreMap.get(n);
      if (!s?.strokes) return sum;
      return sum + (holeMap.get(n)?.par ?? 4);
    }, 0);
  }

  const front9Strokes = holeTotal(front9);
  const back9Strokes  = holeTotal(back9);
  const totalStrokes  = front9Strokes + back9Strokes;
  const totalPar      = parTotal([...front9, ...back9]);
  const playedPar     = playedParTotal([...front9, ...back9]);
  const hasScores     = scores.some(s => s.strokes != null);

  // Auto-scroll so the active hole's nine is visible.
  // Back-9 holes (10-18): scroll to the right end.
  // Front-9 holes (1-9): scroll back to the left.
  useEffect(() => {
    if (!scrollToHole || !scrollRef.current) return;
    const el = scrollRef.current;
    if (scrollToHole >= 10) {
      // Scroll to the right so back 9 is visible
      el.scrollLeft = el.scrollWidth;
    } else {
      // Scroll back to left so front 9 is visible
      el.scrollLeft = 0;
    }
  }, [scrollToHole]);

  return (
    <div ref={scrollRef} className="overflow-x-auto">
      <table className="scorecard-table w-full" style={{ tableLayout: "fixed", minWidth: "680px" }}>
        <colgroup>
          <col style={{ width: "52px" }} />
          {front9.map(n => <col key={n} style={{ width: "32px" }} />)}
          <col style={{ width: "40px" }} />
          {back9.map(n => <col key={n} style={{ width: "32px" }} />)}
          <col style={{ width: "40px" }} />
          <col style={{ width: "44px" }} />
        </colgroup>
        <thead>
          <tr>
            <th style={{ width: "52px", textAlign: "left", paddingLeft: "8px" }}>Hole</th>
            {front9.map(n => <th key={n}>{n}</th>)}
            <th className="bg-[#b06b10]/20">OUT</th>
            {back9.map(n => <th key={n}>{n}</th>)}
            <th className="bg-[#b06b10]/20">IN</th>
            <th className="bg-[#1a2744]/20 text-[#c8892a]">TOT</th>
          </tr>
        </thead>
        <tbody>
          {/* Yardage row */}
          <tr className="par-row">
            <td style={{ textAlign: "left", paddingLeft: "8px" }} className="text-[#1a2744]/55 text-xs">Yds</td>
            {front9.map(n => <td key={n} className="text-center text-[#1a2744]/55 text-xs">{holeMap.get(n)?.yardageBlue ?? "—"}</td>)}
            <td className="subtotal-col font-bold text-xs">
              {front9.reduce((s, n) => s + (holeMap.get(n)?.yardageBlue ?? 0), 0)}
            </td>
            {back9.map(n => <td key={n} className="text-center text-[#1a2744]/55 text-xs">{holeMap.get(n)?.yardageBlue ?? "—"}</td>)}
            <td className="subtotal-col font-bold text-xs">
              {back9.reduce((s, n) => s + (holeMap.get(n)?.yardageBlue ?? 0), 0)}
            </td>
            <td className="total-col font-bold text-xs">
              {sortedHoles.reduce((s, h) => s + (h.yardageBlue ?? 0), 0)}
            </td>
          </tr>

          {/* Handicap row */}
          <tr className="score-row">
            <td style={{ textAlign: "left", paddingLeft: "8px" }} className="text-[#1a2744]/50 text-xs">Hdcp</td>
            {front9.map(n => <td key={n} className="text-center text-[#1a2744]/50 text-xs">{holeMap.get(n)?.handicap ?? "—"}</td>)}
            <td className="subtotal-col"></td>
            {back9.map(n => <td key={n} className="text-center text-[#1a2744]/50 text-xs">{holeMap.get(n)?.handicap ?? "—"}</td>)}
            <td className="subtotal-col"></td>
            <td className="total-col"></td>
          </tr>

          {/* Par row */}
          <tr className="score-row">
            <td style={{ textAlign: "left", paddingLeft: "8px" }} className="font-bold">Par</td>
            {front9.map(n => <td key={n}>{holeMap.get(n)?.par ?? 4}</td>)}
            <td className="subtotal-col font-bold">{parTotal(front9)}</td>
            {back9.map(n => <td key={n}>{holeMap.get(n)?.par ?? 4}</td>)}
            <td className="subtotal-col font-bold">{parTotal(back9)}</td>
            <td className="total-col font-bold">{totalPar}</td>
          </tr>

          {/* Score row */}
          <tr className="score-row score-data-row">
            <td style={{ textAlign: "left", paddingLeft: "8px" }} className="font-bold text-[#1a2744]">Score</td>
            {front9.map(n => (
              <ScoreCell key={n} strokes={scoreMap.get(n)?.strokes} par={holeMap.get(n)?.par ?? 4} highlight={highlightHoles?.has(n)} />
            ))}
            <td className="subtotal-col font-bold">
              {front9.some(n => scoreMap.get(n)?.strokes) ? front9Strokes : "—"}
            </td>
            {back9.map(n => (
              <ScoreCell key={n} strokes={scoreMap.get(n)?.strokes} par={holeMap.get(n)?.par ?? 4} highlight={highlightHoles?.has(n)} />
            ))}
            <td className="subtotal-col font-bold">
              {back9.some(n => scoreMap.get(n)?.strokes) ? back9Strokes : "—"}
            </td>
            <td className="total-col font-bold text-base">
              {hasScores ? totalStrokes : "—"}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ─── ScorecardLegend ──────────────────────────────────────────────────────────
export function ScorecardLegend() {
  return (
    <div className="px-4 pb-3 flex flex-wrap gap-4 items-center text-xs font-sans-app text-[#1a2744]/50 border-t border-[#1a2744]/8 pt-3">
      <span className="font-bold text-[#b06b10]/60">Legend:</span>
      <span className="flex items-center gap-1">
        <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "18px", height: "18px", borderRadius: "50%", border: "1.5px solid #c0323e", boxShadow: "0 0 0 2px #f0ebe1, 0 0 0 3.5px #c0323e", color: "#c0323e", fontWeight: 700, fontSize: "0.6rem" }}>3</span>
        <span className="text-[#1a2744]/50 ml-1">Eagle</span>
      </span>
      <span className="flex items-center gap-1">
        <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "20px", height: "20px", borderRadius: "50%", border: "2px solid #c0323e", color: "#c0323e", fontWeight: 600, fontSize: "0.65rem" }}>4</span>
        <span className="text-[#1a2744]/50 ml-1">Birdie</span>
      </span>
      <span className="flex items-center gap-1">
        <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "20px", height: "20px", color: "#1a2744", fontWeight: 600, fontSize: "0.65rem" }}>5</span>
        <span className="text-[#1a2744]/50 ml-1">Par</span>
      </span>
      <span className="flex items-center gap-1">
        <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "20px", height: "20px", borderRadius: "2px", border: "2px solid #1a2744", color: "#1a2744", fontWeight: 700, fontSize: "0.65rem" }}>6</span>
        <span className="text-[#1a2744]/50 ml-1">Bogey</span>
      </span>
    </div>
  );
}
