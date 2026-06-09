import type { Hole, Score } from "@shared/schema";

// ─── ScoreCell ────────────────────────────────────────────────────────────────
// Single source of truth for all per-hole score cell rendering.
// Edit this to change how scores look on BOTH the leaderboard scorecard
// and the scorekeeper scorecard tab.
export function ScoreCell({ strokes, par }: { strokes: number | null | undefined; par: number }) {
  if (strokes == null) {
    return <td className="scorecard-table score-cell py-1.5 px-2 text-center border border-[#1a2744]/10 text-[#1a2744]/35">-</td>;
  }
  const diff = strokes - par;

  // Eagle / Albatross: two distinct red circles with visible gap
  if (diff <= -2) {
    return (
      <td className="scorecard-table score-cell py-1.5 px-2 text-center border border-[#1a2744]/10">
        <span style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          width: "28px", height: "28px", borderRadius: "50%",
          border: "2px solid #c0323e",
          outline: "2px solid #c0323e", outlineOffset: "3px",
          color: "#c0323e", fontWeight: 700, fontSize: "0.75rem",
        }}>{strokes}</span>
      </td>
    );
  }

  // Birdie: single red circle
  if (diff === -1) {
    return (
      <td className="scorecard-table score-cell py-1.5 px-2 text-center border border-[#1a2744]/10">
        <span style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          width: "24px", height: "24px", borderRadius: "50%",
          border: "2px solid #c0323e",
          color: "#c0323e", fontWeight: 600, fontSize: "0.75rem",
        }}>{strokes}</span>
      </td>
    );
  }

  // Par: plain navy
  if (diff === 0) {
    return (
      <td className="scorecard-table score-cell py-1.5 px-2 text-center border border-[#1a2744]/10"
        style={{ color: "#1a2744" }}>
        {strokes}
      </td>
    );
  }

  // Bogey (max): navy/black square border
  return (
    <td className="scorecard-table score-cell py-1.5 px-2 text-center border border-[#1a2744]/10">
      <span style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: "24px", height: "24px", borderRadius: "2px",
        border: "2px solid #1a2744",
        color: "#1a2744", fontWeight: 700, fontSize: "0.75rem",
      }}>{strokes}</span>
    </td>
  );
}

// ─── ScorecardTable ───────────────────────────────────────────────────────────
// Full scorecard table used in both TeamScorecard and Scorekeeper > Scorecard tab.
// Edit rows, colors, column widths here — it updates everywhere automatically.
export function ScorecardTable({ holes, scores }: { holes: Hole[]; scores: Score[] }) {
  // Sort holes by hole number so columns are always in order
  const sortedHoles = [...holes].sort((a, b) => a.holeNumber - b.holeNumber);
  const holeMap = new Map(sortedHoles.map(h => [h.holeNumber, h]));
  const scoreMap = new Map(scores.map(s => [s.holeNumber, s]));

  // Use actual hole numbers from the DB rather than assuming 1–18
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
  const totalToPar    = totalStrokes - playedPar;
  const hasScores     = scores.some(s => s.strokes != null);

  return (
    <div className="overflow-x-auto">
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
          {/* Yardage row — gray tint */}
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

          {/* Handicap row — white */}
          <tr className="score-row">
            <td style={{ textAlign: "left", paddingLeft: "8px" }} className="text-[#1a2744]/50 text-xs">Hdcp</td>
            {front9.map(n => <td key={n} className="text-center text-[#1a2744]/50 text-xs">{holeMap.get(n)?.handicap ?? "—"}</td>)}
            <td className="subtotal-col"></td>
            {back9.map(n => <td key={n} className="text-center text-[#1a2744]/50 text-xs">{holeMap.get(n)?.handicap ?? "—"}</td>)}
            <td className="subtotal-col"></td>
            <td className="total-col"></td>
          </tr>

          {/* Par row — white */}
          <tr className="score-row">
            <td style={{ textAlign: "left", paddingLeft: "8px" }} className="font-bold">Par</td>
            {front9.map(n => <td key={n}>{holeMap.get(n)?.par ?? 4}</td>)}
            <td className="subtotal-col font-bold">{parTotal(front9)}</td>
            {back9.map(n => <td key={n}>{holeMap.get(n)?.par ?? 4}</td>)}
            <td className="subtotal-col font-bold">{parTotal(back9)}</td>
            <td className="total-col font-bold">{totalPar}</td>
          </tr>

          {/* Score row — white, gold top border */}
          <tr className="score-row score-data-row">
            <td style={{ textAlign: "left", paddingLeft: "8px" }} className="font-bold text-[#1a2744]">Score</td>
            {front9.map(n => (
              <ScoreCell key={n} strokes={scoreMap.get(n)?.strokes} par={holeMap.get(n)?.par ?? 4} />
            ))}
            <td className="subtotal-col font-bold">
              {front9.some(n => scoreMap.get(n)?.strokes) ? holeTotal(front9) : "—"}
            </td>
            {back9.map(n => (
              <ScoreCell key={n} strokes={scoreMap.get(n)?.strokes} par={holeMap.get(n)?.par ?? 4} />
            ))}
            <td className="subtotal-col font-bold">
              {back9.some(n => scoreMap.get(n)?.strokes) ? holeTotal(back9) : "—"}
            </td>
            <td className="total-col font-bold text-base">
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
  );
}

// ─── ScorecardLegend ──────────────────────────────────────────────────────────
// Legend strip shown below the scorecard table.
export function ScorecardLegend() {
  return (
    <div className="px-4 pb-3 flex flex-wrap gap-4 items-center text-xs font-sans-app text-[#1a2744]/50 border-t border-[#1a2744]/8 pt-3">
      <span className="font-bold text-[#b06b10]/60">Legend:</span>
      {/* Eagle/Albatross: double red circle */}
      <span className="flex items-center gap-1">
        <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "20px", height: "20px", borderRadius: "50%", border: "2px solid #c0323e", outline: "2px solid #c0323e", outlineOffset: "3px", color: "#c0323e", fontWeight: 700, fontSize: "0.65rem" }}>3</span>
        <span className="text-[#1a2744]/50 ml-1">Eagle</span>
      </span>
      {/* Birdie: single red circle */}
      <span className="flex items-center gap-1">
        <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "20px", height: "20px", borderRadius: "50%", border: "2px solid #c0323e", color: "#c0323e", fontWeight: 600, fontSize: "0.65rem" }}>4</span>
        <span className="text-[#1a2744]/50 ml-1">Birdie</span>
      </span>
      {/* Par: plain */}
      <span className="flex items-center gap-1">
        <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "20px", height: "20px", color: "#1a2744", fontWeight: 600, fontSize: "0.65rem" }}>5</span>
        <span className="text-[#1a2744]/50 ml-1">Par</span>
      </span>
      {/* Bogey: black square */}
      <span className="flex items-center gap-1">
        <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "20px", height: "20px", borderRadius: "2px", border: "2px solid #1a2744", color: "#1a2744", fontWeight: 700, fontSize: "0.65rem" }}>6</span>
        <span className="text-[#1a2744]/50 ml-1">Bogey</span>
      </span>
    </div>
  );
}
