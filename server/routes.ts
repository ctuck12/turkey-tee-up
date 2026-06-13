import type { Express, Request, Response } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import type { InsertTeam, InsertSponsor } from "@shared/schema";

// ─── SSE BROKER ──────────────────────────────────────────────────────────────
// One server-side timer fetches all shared data every 4 seconds and pushes it
// to every connected client. Score/settings writes trigger an immediate push so
// changes appear in ≤ 1s regardless of the timer cadence.
// Result: ~4 Supabase queries/sec total, regardless of how many viewers are
// connected. Vercel serverless invocations drop to near-zero for read traffic.

type SseClient = { id: number; res: Response };

const sseClients: Set<SseClient> = new Set();
let sseClientId = 0;

// Cached broadcast payload — rebuilt on every tick or manual invalidation
interface SsePayload {
  leaderboard: any[];
  ctp: any[];
  ctpHistory: any[];
  teams: any[];
  settings: any;
  holes: any[];
  sponsors: any[];
  submissions: any[];
}
let lastPayload: SsePayload | null = null;
let broadcastTimer: ReturnType<typeof setInterval> | null = null;

async function buildPayload(): Promise<SsePayload> {
  let [teams, scores, holes, ctp, ctpHistory, settings, sponsors] = await Promise.all([
    storage.getTeams(),
    storage.getAllScores(),
    storage.getHoles(),
    storage.getCtpEntries(),
    storage.getCtpHistory(),
    storage.getSettings(),
    storage.getSponsors(),
  ]);

  // Auto-submit safety net: if a team has scored all 18 holes but never tapped
  // "Officially Submit", submit for them 2 minutes after their last score so a
  // forgotten submit doesn't hold up final results. Skipped in test mode.
  if ((settings?.tournamentMode ?? "test") !== "test") {
    const now = Date.now();
    const stale = teams.filter(t => !t.isSubmitted).filter(t => {
      const ts = scores.filter(s => s.teamId === t.id && s.strokes != null);
      if (ts.length < 18) return false;
      const lastUpdate = Math.max(...ts.map(s => (s.updatedAt ? new Date(s.updatedAt).getTime() : 0)));
      return now - lastUpdate > 240_000; // 4 minutes
    });
    if (stale.length > 0) {
      await Promise.all(stale.map(t => storage.submitTeam(t.id)));
      teams = await storage.getTeams(); // refresh so this payload reflects the auto-submit
    }
  }

  const holeMap = new Map(holes.map(h => [h.holeNumber, h]));
  const leaderboard = teams.map(team => {
    const teamScores = scores.filter(s => s.teamId === team.id);
    const scoredHoles = teamScores.filter(s => s.strokes != null);
    const totalStrokes = scoredHoles.reduce((sum, s) => sum + (s.strokes ?? 0), 0);
    const totalPar = scoredHoles.reduce((sum, s) => sum + (holeMap.get(s.holeNumber)?.par ?? 4), 0);
    const totalToPar = totalStrokes - totalPar;
    const maxHole = scoredHoles.length > 0 ? Math.max(...scoredHoles.map(s => s.holeNumber)) : null;
    return { team, scores: teamScores, totalStrokes, totalToPar, holesCompleted: scoredHoles.length, thruHole: maxHole };
  });
  leaderboard.sort((a, b) => {
    const aStarted = a.holesCompleted > 0, bStarted = b.holesCompleted > 0;
    if (aStarted !== bStarted) return aStarted ? -1 : 1;
    if (a.totalToPar !== b.totalToPar) return a.totalToPar - b.totalToPar;
    return a.team.teamName.localeCompare(b.team.teamName);
  });

  const submissions = teams.map(team => {
    const isSubmitted = team.isSubmitted ?? false;
    const teamScores = scores.filter(s => s.teamId === team.id && s.strokes != null);
    const holesScored = teamScores.length;
    const holesRemaining = isSubmitted ? 0 : Math.max(0, 18 - holesScored);
    return { id: team.id, teamName: team.teamName, flight: team.flight, startingHole: team.startingHole ?? 1, isSubmitted, holesScored, holesRemaining };
  });

  return { leaderboard, ctp, ctpHistory, teams, settings, holes, sponsors, submissions };
}

function broadcast(payload: SsePayload) {
  lastPayload = payload;
  const data = `data: ${JSON.stringify(payload)}\n\n`;
  for (const client of sseClients) {
    try { client.res.write(data); } catch { sseClients.delete(client); }
  }
}

async function tick() {
  try { broadcast(await buildPayload()); } catch (e) { console.error("SSE tick error:", e); }
}

function ensureTimer() {
  if (broadcastTimer) return;
  broadcastTimer = setInterval(tick, 4000);
  // Fire immediately so first connection gets data right away
  tick();
}

// Call after any write that should appear immediately (scores, settings)
function scheduleImmediatePush() {
  // Small delay so the DB write completes before we read
  setTimeout(tick, 150);
}

// Can a scorekeeper for the given flight enter scores/CTP right now?
//   test     → always (full testing)
//   complete → never (locked, admin-only)
//   live     → only while that flight's round is 'in_progress'
function flightEnterable(settings: any, flight: string): boolean {
  const mode = settings?.tournamentMode ?? "test";
  if (mode === "test") return true;
  if (mode === "complete") return false;
  const status = flight === "morning" ? (settings?.amStatus ?? "not_started") : (settings?.pmStatus ?? "not_started");
  return status === "in_progress";
}

export function registerRoutes(app: Express) {
  const httpServer = createServer(app);

  // ─── SSE STREAM ───────────────────────────────────────────────────────────
  app.get("/api/stream", (req: Request, res: Response) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no"); // disable Nginx/Vercel buffering
    res.flushHeaders();

    const client: SseClient = { id: ++sseClientId, res };
    sseClients.add(client);
    ensureTimer();

    // Send last known payload immediately so the client renders without waiting
    if (lastPayload) {
      try { res.write(`data: ${JSON.stringify(lastPayload)}\n\n`); } catch {}
    }

    // Heartbeat every 25s to keep the connection alive through proxies
    const hb = setInterval(() => {
      try { res.write(": heartbeat\n\n"); } catch { clearInterval(hb); }
    }, 25000);

    req.on("close", () => {
      clearInterval(hb);
      sseClients.delete(client);
    });
  });

  // ─── AUTH ─────────────────────────────────────────────────────────────────
  app.post("/api/auth/admin", async (req: Request, res: Response) => {
    const { password } = req.body;
    const settings = await storage.getSettings();
    if (settings && password === settings.adminPassword) {
      res.json({ success: true, role: "admin" });
    } else {
      res.status(401).json({ success: false, message: "Invalid admin password" });
    }
  });

  app.post("/api/auth/scorekeeper", async (req: Request, res: Response) => {
    const { teamCode, sessionId, force } = req.body;
    const team = await storage.getTeamByCode(teamCode);
    if (!team) {
      return res.status(401).json({ success: false, message: "Invalid team code" });
    }
    const settings = await storage.getSettings();
    const mode = settings?.tournamentMode ?? "test";
    // Tournament-complete mode and flight-complete status: login is allowed so
    // teams can view their scorecard — the client renders read-only and
    // score/CTP writes are blocked above. Only 'not_started' blocks login.
    const status = team.flight === "morning" ? (settings?.amStatus ?? "not_started") : (settings?.pmStatus ?? "not_started");
    if (mode === "live" && status === "not_started") {
      return res.status(403).json({ success: false, reason: "flight_inactive", message: "This flight has not officially started yet. We'll notify you when this flight is officially in progress." });
    }
    // Presence: warn if another device is currently signed in with this code
    if (sessionId && !force) {
      const since = new Date(Date.now() - 60_000).toISOString(); // active within last 60s
      const conflict = await storage.hasOtherActiveSession(team.id, sessionId, since);
      if (conflict) {
        return res.status(409).json({ success: false, reason: "already_active", message: `Someone is already signed in to “${team.teamName}” on another device. If you continue, both devices will be entering scores for this team.` });
      }
    }
    if (sessionId) await storage.touchSession(team.id, sessionId);
    res.json({ success: true, team });
  });

  // Heartbeat keeps a scorekeeper session marked active for presence detection
  app.post("/api/scorekeeper/heartbeat", async (req: Request, res: Response) => {
    const { teamId, sessionId } = req.body;
    if (teamId && sessionId) await storage.touchSession(parseInt(teamId), sessionId);
    res.json({ ok: true });
  });

  // ─── SETTINGS ─────────────────────────────────────────────────────────────
  app.get("/api/settings", async (_req, res) => {
    res.json(await storage.getSettings());
  });

  app.put("/api/settings", async (req: Request, res: Response) => {
    const updated = await storage.upsertSettings(req.body);
    // When a flight or the tournament is marked Complete, finalize everyone in
    // scope: auto-submit any team that has scores but hasn't officially submitted,
    // so nothing stays hung up and the final results can compute.
    const body = req.body || {};
    const completingTournament = body.tournamentMode === "complete";
    const completingAm = body.amStatus === "complete";
    const completingPm = body.pmStatus === "complete";
    if (completingTournament || completingAm || completingPm) {
      const scopeFlight = completingTournament ? null : (completingAm ? "morning" : "afternoon");
      const [teams, scores] = await Promise.all([storage.getTeams(), storage.getAllScores()]);
      const toSubmit = teams
        .filter(t => !t.isSubmitted)
        .filter(t => scopeFlight === null || t.flight === scopeFlight)
        .filter(t => scores.some(s => s.teamId === t.id && s.strokes != null));
      await Promise.all(toSubmit.map(t => storage.submitTeam(t.id)));
    }
    scheduleImmediatePush(); // broadcast_message and other settings update live
    res.json(updated);
  });

  // Un-submit a team WITHOUT clearing their scores (admin can re-open a scorecard)
  app.post("/api/teams/:id/unsubmit", async (req: Request, res: Response) => {
    await storage.unsubmitTeam(parseInt(req.params.id));
    scheduleImmediatePush();
    res.json({ success: true, submitted: false });
  });

  // ─── HOLES ────────────────────────────────────────────────────────────────
  app.get("/api/holes", async (_req, res) => {
    res.json(await storage.getHoles());
  });

  app.put("/api/holes/:holeNumber", async (req: Request, res: Response) => {
    const holeNumber = parseInt(req.params.holeNumber);
    const updated = await storage.upsertHole({ ...req.body, holeNumber });
    res.json(updated);
  });

  app.post("/api/holes/bulk", async (req: Request, res: Response) => {
    await storage.bulkUpsertHoles(req.body);
    const holes = await storage.getHoles();
    res.json(holes);
  });

  // ─── TEAMS ────────────────────────────────────────────────────────────────
  app.get("/api/teams", async (_req, res) => {
    res.json(await storage.getTeams());
  });

  app.get("/api/teams/:id", async (req: Request, res: Response) => {
    const team = await storage.getTeam(parseInt(req.params.id));
    if (!team) return res.status(404).json({ message: "Team not found" });
    res.json(team);
  });

  app.post("/api/teams", async (req: Request, res: Response) => {
    const body = req.body as InsertTeam;
    const existing = await storage.getTeams();
    const codeTaken = (code: string, excludeId?: number) =>
      existing.find(t => t.id !== excludeId && (t.teamCode ?? "").toUpperCase() === code.toUpperCase());
    if (!body.teamCode) {
      // Auto-generate until unique among current teams
      do {
        body.teamCode = Math.random().toString(36).substring(2, 6).toUpperCase();
      } while (codeTaken(body.teamCode));
    } else if (codeTaken(body.teamCode)) {
      return res.status(409).json({ message: `Team code "${body.teamCode.toUpperCase()}" is already used by ${codeTaken(body.teamCode)!.teamName}. Regenerate or choose a different code.` });
    }
    const team = await storage.createTeam(body);
    res.status(201).json(team);
  });

  app.put("/api/teams/:id", async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (req.body.teamCode) {
      const existing = await storage.getTeams();
      const dup = existing.find(t => t.id !== id && (t.teamCode ?? "").toUpperCase() === String(req.body.teamCode).toUpperCase());
      if (dup) {
        return res.status(409).json({ message: `Team code "${String(req.body.teamCode).toUpperCase()}" is already used by ${dup.teamName}. Regenerate or choose a different code.` });
      }
    }
    const team = await storage.updateTeam(id, req.body);
    if (!team) return res.status(404).json({ message: "Team not found" });
    res.json(team);
  });

  app.post("/api/teams/:id/submit", async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    await storage.submitTeam(id);
    scheduleImmediatePush();
    res.json({ success: true, submitted: true });
  });

  app.get("/api/teams/:id/submitted", async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const submitted = await storage.isTeamSubmitted(id);
    res.json({ submitted });
  });

  // Bulk submissions status — reads is_submitted from Supabase (persists across restarts)
  app.get("/api/submissions", async (_req: Request, res: Response) => {
    const [teams, scores] = await Promise.all([
      storage.getTeams(),
      storage.getScores(),
    ]);
    const result = teams.map(team => {
      const isSubmitted = team.isSubmitted ?? false;
      const teamScores = scores.filter(s => s.teamId === team.id && s.strokes != null);
      const holesScored = teamScores.length;
      const holesRemaining = isSubmitted ? 0 : Math.max(0, 18 - holesScored);
      return {
        id: team.id,
        teamName: team.teamName,
        flight: team.flight,
        startingHole: team.startingHole ?? 1,
        isSubmitted,
        holesScored,
        holesRemaining,
        player1: team.player1 ?? null,
        player2: team.player2 ?? null,
        player3: team.player3 ?? null,
        player4: team.player4 ?? null,
      };
    });
    res.json(result);
  });

  app.delete("/api/teams/:id", async (req: Request, res: Response) => {
    await storage.deleteTeam(parseInt(req.params.id));
    res.json({ success: true });
  });

  // ─── SCORES ───────────────────────────────────────────────────────────────
  app.get("/api/scores", async (_req, res) => {
    res.json(await storage.getAllScores());
  });

  app.get("/api/scores/team/:teamId", async (req: Request, res: Response) => {
    res.json(await storage.getScoresForTeam(parseInt(req.params.teamId)));
  });

  app.post("/api/scores", async (req: Request, res: Response) => {
    const { teamId, holeNumber, strokes, asAdmin } = req.body;
    if (!teamId || !holeNumber) return res.status(400).json({ message: "teamId and holeNumber required" });
    // Admin (asAdmin) can always write; scorekeepers are gated by tournament mode + flight
    if (!asAdmin) {
      const settings = await storage.getSettings();
      const team = await storage.getTeam(teamId);
      if (!team || !flightEnterable(settings, team.flight)) {
        const mode = settings?.tournamentMode ?? "test";
        return res.status(403).json({ message: mode === "complete" ? "The tournament is complete — scoring is closed." : "Scoring isn't open for this flight yet." });
      }
    }
    const score = await storage.upsertScore(teamId, holeNumber, strokes);
    scheduleImmediatePush(); // push new score to all leaderboard viewers immediately
    res.json(score);
  });

  app.delete("/api/scores/team/:teamId", async (req: Request, res: Response) => {
    const teamId = parseInt(req.params.teamId);
    await storage.clearTeamScores(teamId);
    // Reset submission so the team can re-enter scores from the start of their round
    await storage.unsubmitTeam(teamId);
    // Remove any CTP / Long Drive entries this team currently holds
    await storage.clearCtpForTeam(teamId);
    scheduleImmediatePush(); // push cleared scores + un-submitted status to all viewers live
    res.json({ success: true });
  });

  // ─── LEADERBOARD ──────────────────────────────────────────────────────────
  app.get("/api/leaderboard", async (_req, res) => {
    const [teams, scores, holes] = await Promise.all([
      storage.getTeams(),
      storage.getAllScores(),
      storage.getHoles(),
    ]);
    const holeMap = new Map(holes.map(h => [h.holeNumber, h]));

    const leaderboard = teams.map(team => {
      const teamScores = scores.filter(s => s.teamId === team.id);
      const scoredHoles = teamScores.filter(s => s.strokes != null);
      const totalStrokes = scoredHoles.reduce((sum, s) => sum + (s.strokes ?? 0), 0);
      const totalPar = scoredHoles.reduce((sum, s) => sum + (holeMap.get(s.holeNumber)?.par ?? 4), 0);
      const totalToPar = totalStrokes - totalPar;
      const maxHole = scoredHoles.length > 0 ? Math.max(...scoredHoles.map(s => s.holeNumber)) : null;
      return { team, scores: teamScores, totalStrokes, totalToPar, holesCompleted: scoredHoles.length, thruHole: maxHole };
    });

    leaderboard.sort((a, b) => {
      const aStarted = a.holesCompleted > 0, bStarted = b.holesCompleted > 0;
      if (aStarted !== bStarted) return aStarted ? -1 : 1;
      if (a.totalToPar !== b.totalToPar) return a.totalToPar - b.totalToPar;
      return a.team.teamName.localeCompare(b.team.teamName);
    });

    res.json(leaderboard);
  });

  // ─── SPONSORS ─────────────────────────────────────────────────────────────
  app.get("/api/sponsors", async (_req, res) => {
    res.json(await storage.getSponsors());
  });

  app.post("/api/sponsors", async (req: Request, res: Response) => {
    const sponsor = await storage.createSponsor(req.body as InsertSponsor);
    res.status(201).json(sponsor);
  });

  app.put("/api/sponsors/:id", async (req: Request, res: Response) => {
    const sponsor = await storage.updateSponsor(parseInt(req.params.id), req.body);
    if (!sponsor) return res.status(404).json({ message: "Sponsor not found" });
    res.json(sponsor);
  });

  app.delete("/api/sponsors/:id", async (req: Request, res: Response) => {
    await storage.deleteSponsor(parseInt(req.params.id));
    res.json({ success: true });
  });

  // ─── CLOSEST TO PIN ───────────────────────────────────────────────────────
  app.get("/api/ctp", async (_req, res) => {
    res.json(await storage.getCtpEntries());
  });

  app.get("/api/ctp/history", async (_req, res) => {
    res.json(await storage.getCtpHistory());
  });

  app.post("/api/ctp", async (req: Request, res: Response) => {
    const { holeNumber, teamId, playerName, distance, asAdmin } = req.body;
    if (!holeNumber) return res.status(400).json({ message: "holeNumber required" });
    // Resolve the flight for this entry: prefer an explicit flight from the client,
    // otherwise derive it from the team. CTP/LD winners are stored per flight.
    let flight: string | null = req.body.flight ?? null;
    const team = teamId ? await storage.getTeam(teamId) : undefined;
    if (!flight && team) flight = team.flight;
    // Admin (asAdmin) can always write; scorekeepers are gated by tournament mode + flight
    if (!asAdmin) {
      const settings = await storage.getSettings();
      const mode = settings?.tournamentMode ?? "test";
      if (mode === "complete") {
        return res.status(403).json({ message: "The tournament is complete — entries are closed." });
      }
      if (mode === "live" && team && !flightEnterable(settings, team.flight)) {
        return res.status(403).json({ message: "Scoring isn't open for this flight yet." });
      }
    }
    const entry = await storage.upsertCtp(holeNumber, flight, teamId ?? null, playerName ?? null, distance ?? null);
    scheduleImmediatePush(); // push CTP update live
    res.json(entry);
  });

  app.delete("/api/ctp/:holeNumber", async (req: Request, res: Response) => {
    const flight = (req.query.flight as string) ?? null;
    await storage.clearCtp(parseInt(req.params.holeNumber), flight);
    res.json({ success: true });
  });

  return httpServer;
}
