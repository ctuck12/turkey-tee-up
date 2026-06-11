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
  teams: any[];
  settings: any;
  holes: any[];
  sponsors: any[];
  submissions: any[];
}
let lastPayload: SsePayload | null = null;
let broadcastTimer: ReturnType<typeof setInterval> | null = null;

async function buildPayload(): Promise<SsePayload> {
  const [teams, scores, holes, ctp, settings, sponsors] = await Promise.all([
    storage.getTeams(),
    storage.getAllScores(),
    storage.getHoles(),
    storage.getCtpEntries(),
    storage.getSettings(),
    storage.getSponsors(),
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
    if (b.holesCompleted !== a.holesCompleted) return b.holesCompleted - a.holesCompleted;
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

  return { leaderboard, ctp, teams, settings, holes, sponsors, submissions };
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
    const { teamCode } = req.body;
    const team = await storage.getTeamByCode(teamCode);
    if (team) {
      res.json({ success: true, team });
    } else {
      res.status(401).json({ success: false, message: "Invalid team code" });
    }
  });

  // ─── SETTINGS ─────────────────────────────────────────────────────────────
  app.get("/api/settings", async (_req, res) => {
    res.json(await storage.getSettings());
  });

  app.put("/api/settings", async (req: Request, res: Response) => {
    const updated = await storage.upsertSettings(req.body);
    scheduleImmediatePush(); // broadcast_message and other settings update live
    res.json(updated);
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
    if (!body.teamCode) {
      body.teamCode = Math.random().toString(36).substring(2, 6).toUpperCase();
    }
    const team = await storage.createTeam(body);
    res.status(201).json(team);
  });

  app.put("/api/teams/:id", async (req: Request, res: Response) => {
    const team = await storage.updateTeam(parseInt(req.params.id), req.body);
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
    const { teamId, holeNumber, strokes } = req.body;
    if (!teamId || !holeNumber) return res.status(400).json({ message: "teamId and holeNumber required" });
    const score = await storage.upsertScore(teamId, holeNumber, strokes);
    scheduleImmediatePush(); // push new score to all leaderboard viewers immediately
    res.json(score);
  });

  app.delete("/api/scores/team/:teamId", async (req: Request, res: Response) => {
    await storage.clearTeamScores(parseInt(req.params.teamId));
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
      if (b.holesCompleted !== a.holesCompleted) return b.holesCompleted - a.holesCompleted;
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

  app.post("/api/ctp", async (req: Request, res: Response) => {
    const { holeNumber, teamId, playerName, distance } = req.body;
    if (!holeNumber) return res.status(400).json({ message: "holeNumber required" });
    const entry = await storage.upsertCtp(holeNumber, teamId ?? null, playerName ?? null, distance ?? null);
    scheduleImmediatePush(); // push CTP update live
    res.json(entry);
  });

  app.delete("/api/ctp/:holeNumber", async (req: Request, res: Response) => {
    await storage.clearCtp(parseInt(req.params.holeNumber));
    res.json({ success: true });
  });

  return httpServer;
}
