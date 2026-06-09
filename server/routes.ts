import type { Express, Request, Response } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import type { InsertTeam, InsertSponsor } from "@shared/schema";

export function registerRoutes(app: Express) {
  const httpServer = createServer(app);

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

  // ─── DEBUG ─────────────────────────────────────────────────────────────────
  app.get("/api/debug", async (_req, res) => {
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const url = process.env.SUPABASE_URL || "hardcoded";
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY ? "env-set" : "using-hardcoded";
      const testClient = createClient(
        process.env.SUPABASE_URL || "https://dqxpnqkfkzpxlivulqhe.supabase.co",
        process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxeHBucWtma3pweGxpdnVscWhlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDk2MzE1NywiZXhwIjoyMDk2NTM5MTU3fQ.I4VAiM-4NUjlCsPj56xGiTl4xsdI-5XY0cmrCUteuxg",
        { auth: { autoRefreshToken: false, persistSession: false } }
      );
      const { data, error } = await testClient.from("tournament_settings").select("id,admin_password").eq("id", 1).single();
      res.json({ url, key, data, error: error?.message });
    } catch(e: any) {
      res.json({ error: e.message });
    }
  });

  // ─── SETTINGS ─────────────────────────────────────────────────────────────
  app.get("/api/settings", async (_req, res) => {
    const settings = await storage.getSettings();
    if (!settings) {
      res.status(404).json({ error: "Settings not found" });
    } else {
      res.json(settings);
    }
  });

  app.put("/api/settings", async (req: Request, res: Response) => {
    const updated = await storage.upsertSettings(req.body);
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
    res.json(entry);
  });

  app.delete("/api/ctp/:holeNumber", async (req: Request, res: Response) => {
    await storage.clearCtp(parseInt(req.params.holeNumber));
    res.json({ success: true });
  });

  return httpServer;
}
