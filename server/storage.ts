import { createClient } from "@supabase/supabase-js";
import ws from "ws";
import type {
  Hole, Score, Team, Sponsor, ClosestToPin, CtpHistory, TournamentSettings,
  InsertHole, InsertScore, InsertTeam, InsertSponsor, InsertCtp, InsertSettings,
} from "@shared/schema";

const SUPABASE_URL = process.env.SUPABASE_URL || "https://dqxpnqkfkzpxlivulqhe.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxeHBucWtma3pweGxpdnVscWhlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDk2MzE1NywiZXhwIjoyMDk2NTM5MTU3fQ.I4VAiM-4NUjlCsPj56xGiTl4xsdI-5XY0cmrCUteuxg";

export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
  realtime: { transport: ws as any },
});

// ─── camelCase mappers ────────────────────────────────────────────────────────
function mapHole(r: any): Hole {
  return { id: r.id, holeNumber: r.hole_number, par: r.par, handicap: r.handicap, yardageBlue: r.yardage_blue, yardageWhite: r.yardage_white, yardageRed: r.yardage_red, isCtpHole: r.is_ctp_hole, ctpLabel: r.ctp_label };
}
function mapTeam(r: any): Team {
  return { id: r.id, teamName: r.team_name, player1: r.player1, player2: r.player2, player3: r.player3, player4: r.player4, flight: r.flight, startingHole: r.starting_hole, teamCode: r.team_code, isActive: r.is_active, isSubmitted: r.is_submitted ?? false, finishPlace: r.finish_place ?? null };
}
function mapScore(r: any): Score {
  return { id: r.id, teamId: r.team_id, holeNumber: r.hole_number, strokes: r.strokes, updatedAt: r.updated_at };
}
function mapSponsor(r: any): Sponsor {
  return { id: r.id, name: r.name, logoUrl: r.logo_url, website: r.website, placement: r.placement, displayOrder: r.display_order, isActive: r.is_active };
}
function mapCtp(r: any): ClosestToPin {
  return { id: r.id, holeNumber: r.hole_number, teamId: r.team_id, playerName: r.player_name, distance: r.distance, updatedAt: r.updated_at };
}
function mapCtpHistory(r: any): CtpHistory {
  return { id: r.id, holeNumber: r.hole_number, teamId: r.team_id, playerName: r.player_name, distance: r.distance, createdAt: r.created_at };
}
function mapSettings(r: any): TournamentSettings {
  return { id: r.id, tournamentName: r.tournament_name, courseName: r.course_name, year: r.year, courseHoles: r.course_holes, adminPassword: r.admin_password, scorekeeperPassword: r.scorekeeper_password, isActive: r.is_active, broadcastMessage: r.broadcast_message ?? null, defaultFlight: r.default_flight ?? "morning", tournamentMode: r.tournament_mode ?? "test", amStatus: r.am_status ?? "not_started", pmStatus: r.pm_status ?? "not_started", tiebreakerHoles: r.tiebreaker_holes ?? null };
}

export interface IStorage {
  getSettings(): Promise<TournamentSettings | undefined>;
  upsertSettings(data: Partial<InsertSettings>): Promise<TournamentSettings>;

  getHoles(): Promise<Hole[]>;
  getHole(holeNumber: number): Promise<Hole | undefined>;
  upsertHole(data: InsertHole): Promise<Hole>;
  bulkUpsertHoles(holesData: InsertHole[]): Promise<void>;

  getTeams(): Promise<Team[]>;
  getTeam(id: number): Promise<Team | undefined>;
  getTeamByCode(code: string): Promise<Team | undefined>;
  createTeam(data: InsertTeam): Promise<Team>;
  updateTeam(id: number, data: Partial<InsertTeam>): Promise<Team | undefined>;
  deleteTeam(id: number): Promise<void>;
  submitTeam(id: number): Promise<void>;
  unsubmitTeam(id: number): Promise<void>;
  isTeamSubmitted(id: number): Promise<boolean>;

  getScoresForTeam(teamId: number): Promise<Score[]>;
  getAllScores(): Promise<Score[]>;
  upsertScore(teamId: number, holeNumber: number, strokes: number | null): Promise<Score>;
  clearTeamScores(teamId: number): Promise<void>;

  getSponsors(): Promise<Sponsor[]>;
  createSponsor(data: InsertSponsor): Promise<Sponsor>;
  updateSponsor(id: number, data: Partial<InsertSponsor>): Promise<Sponsor | undefined>;
  deleteSponsor(id: number): Promise<void>;

  getCtpEntries(): Promise<ClosestToPin[]>;
  getCtpForHole(holeNumber: number): Promise<ClosestToPin | undefined>;
  upsertCtp(holeNumber: number, teamId: number | null, playerName: string | null, distance: string | null): Promise<ClosestToPin>;
  clearCtp(holeNumber: number): Promise<void>;
  clearCtpForTeam(teamId: number): Promise<void>;
  getCtpHistory(): Promise<CtpHistory[]>;

  // Scorekeeper presence
  touchSession(teamId: number, sessionId: string): Promise<void>;
  hasOtherActiveSession(teamId: number, sessionId: string, sinceIso: string): Promise<boolean>;
}

function createStorage(): IStorage {
  return {
    // ── Settings ──────────────────────────────────────────────────────────────
    async getSettings() {
      const { data } = await supabase.from("tournament_settings").select("*").eq("id", 1).single();
      return data ? mapSettings(data) : undefined;
    },
    async upsertSettings(data) {
      const snake: any = {};
      if (data.tournamentName !== undefined) snake.tournament_name = data.tournamentName;
      if (data.courseName !== undefined) snake.course_name = data.courseName;
      if (data.year !== undefined) snake.year = data.year;
      if (data.courseHoles !== undefined) snake.course_holes = data.courseHoles;
      if (data.adminPassword !== undefined) snake.admin_password = data.adminPassword;
      if (data.scorekeeperPassword !== undefined) snake.scorekeeper_password = data.scorekeeperPassword;
      if (data.isActive !== undefined) snake.is_active = data.isActive;
      if (data.broadcastMessage !== undefined) snake.broadcast_message = data.broadcastMessage;
      if (data.defaultFlight !== undefined) snake.default_flight = data.defaultFlight;
      if (data.tournamentMode !== undefined) snake.tournament_mode = data.tournamentMode;
      if (data.amStatus !== undefined) snake.am_status = data.amStatus;
      if (data.pmStatus !== undefined) snake.pm_status = data.pmStatus;
      if (data.tiebreakerHoles !== undefined) snake.tiebreaker_holes = data.tiebreakerHoles;
      const { data: row } = await supabase.from("tournament_settings").upsert({ id: 1, ...snake }, { onConflict: "id" }).select().single();
      return mapSettings(row);
    },

    // ── Holes ─────────────────────────────────────────────────────────────────
    async getHoles() {
      const { data } = await supabase.from("holes").select("*").order("hole_number");
      return (data || []).map(mapHole);
    },
    async getHole(holeNumber) {
      const { data } = await supabase.from("holes").select("*").eq("hole_number", holeNumber).single();
      return data ? mapHole(data) : undefined;
    },
    async upsertHole(data) {
      const { data: existing } = await supabase.from("holes").select("id").eq("hole_number", data.holeNumber).single();
      const row = { hole_number: data.holeNumber, par: data.par, handicap: data.handicap, yardage_blue: data.yardageBlue, yardage_white: data.yardageWhite, yardage_red: data.yardageRed, is_ctp_hole: data.isCtpHole, ctp_label: data.ctpLabel ?? null };
      if (existing) {
        const { data: updated } = await supabase.from("holes").update(row).eq("hole_number", data.holeNumber).select().single();
        return mapHole(updated);
      } else {
        const { data: inserted } = await supabase.from("holes").insert(row).select().single();
        return mapHole(inserted);
      }
    },
    async bulkUpsertHoles(holesData) {
      for (const h of holesData) await this.upsertHole(h);
    },

    // ── Teams ─────────────────────────────────────────────────────────────────
    async getTeams() {
      const { data } = await supabase.from("teams").select("*").eq("is_active", true).order("flight").order("team_name");
      return (data || []).map(mapTeam);
    },
    async getTeam(id) {
      const { data } = await supabase.from("teams").select("*").eq("id", id).single();
      return data ? mapTeam(data) : undefined;
    },
    async getTeamByCode(code) {
      const { data } = await supabase.from("teams").select("*").eq("team_code", code).eq("is_active", true).single();
      return data ? mapTeam(data) : undefined;
    },
    async createTeam(data) {
      const { data: row } = await supabase.from("teams").insert({ team_name: data.teamName, player1: data.player1 || "", player2: data.player2 || "", player3: data.player3 || "", player4: data.player4 || "", flight: data.flight, starting_hole: data.startingHole, team_code: data.teamCode, is_active: true }).select().single();
      return mapTeam(row);
    },
    async updateTeam(id, data) {
      const map: Record<string, string> = { teamName: "team_name", player1: "player1", player2: "player2", player3: "player3", player4: "player4", flight: "flight", startingHole: "starting_hole", teamCode: "team_code", isActive: "is_active", finishPlace: "finish_place" };
      const snake: any = {};
      for (const [k, v] of Object.entries(data)) if (map[k]) snake[map[k]] = v;
      if (!Object.keys(snake).length) return this.getTeam(id);
      const { data: row } = await supabase.from("teams").update(snake).eq("id", id).select().single();
      return row ? mapTeam(row) : undefined;
    },
    async deleteTeam(id) {
      await supabase.from("teams").update({ is_active: false }).eq("id", id);
    },
    async submitTeam(id) {
      await supabase.from("teams").update({ is_submitted: true }).eq("id", id);
    },
    async unsubmitTeam(id) {
      await supabase.from("teams").update({ is_submitted: false }).eq("id", id);
    },
    async isTeamSubmitted(id) {
      const { data } = await supabase.from("teams").select("is_submitted").eq("id", id).single();
      return data?.is_submitted ?? false;
    },

    // ── Scores ────────────────────────────────────────────────────────────────
    async getScoresForTeam(teamId) {
      const { data } = await supabase.from("scores").select("*").eq("team_id", teamId).order("hole_number");
      return (data || []).map(mapScore);
    },
    async getAllScores() {
      const { data } = await supabase.from("scores").select("*").order("team_id").order("hole_number");
      return (data || []).map(mapScore);
    },
    async upsertScore(teamId, holeNumber, strokes) {
      const now = new Date().toISOString();
      const { data: existing } = await supabase.from("scores").select("id").eq("team_id", teamId).eq("hole_number", holeNumber).single();
      if (existing) {
        const { data: row } = await supabase.from("scores").update({ strokes, updated_at: now }).eq("team_id", teamId).eq("hole_number", holeNumber).select().single();
        return mapScore(row);
      } else {
        const { data: row } = await supabase.from("scores").insert({ team_id: teamId, hole_number: holeNumber, strokes, updated_at: now }).select().single();
        return mapScore(row);
      }
    },
    async clearTeamScores(teamId) {
      await supabase.from("scores").delete().eq("team_id", teamId);
    },

    // ── Sponsors ──────────────────────────────────────────────────────────────
    async getSponsors() {
      const { data } = await supabase.from("sponsors").select("*").eq("is_active", true).order("display_order");
      return (data || []).map(mapSponsor);
    },
    async createSponsor(data) {
      const { data: row } = await supabase.from("sponsors").insert({ name: data.name, logo_url: data.logoUrl ?? null, website: data.website ?? null, placement: data.placement, display_order: data.displayOrder ?? 0, is_active: true }).select().single();
      return mapSponsor(row);
    },
    async updateSponsor(id, data) {
      const map: Record<string, string> = { name: "name", logoUrl: "logo_url", website: "website", placement: "placement", displayOrder: "display_order", isActive: "is_active" };
      const snake: any = {};
      for (const [k, v] of Object.entries(data)) if (map[k]) snake[map[k]] = v;
      const { data: row } = await supabase.from("sponsors").update(snake).eq("id", id).select().single();
      return row ? mapSponsor(row) : undefined;
    },
    async deleteSponsor(id) {
      await supabase.from("sponsors").update({ is_active: false }).eq("id", id);
    },

    // ── CTP ───────────────────────────────────────────────────────────────────
    async getCtpEntries() {
      const { data } = await supabase.from("closest_to_pin").select("*").order("hole_number");
      return (data || []).map(mapCtp);
    },
    async getCtpForHole(holeNumber) {
      const { data } = await supabase.from("closest_to_pin").select("*").eq("hole_number", holeNumber).single();
      return data ? mapCtp(data) : undefined;
    },
    async upsertCtp(holeNumber, teamId, playerName, distance) {
      const now = new Date().toISOString();
      const { data: existing } = await supabase.from("closest_to_pin").select("id").eq("hole_number", holeNumber).single();
      let result: ClosestToPin;
      if (existing) {
        const { data: row } = await supabase.from("closest_to_pin").update({ team_id: teamId, player_name: playerName, distance, updated_at: now }).eq("hole_number", holeNumber).select().single();
        result = mapCtp(row);
      } else {
        const { data: row } = await supabase.from("closest_to_pin").insert({ hole_number: holeNumber, team_id: teamId, player_name: playerName, distance, updated_at: now }).select().single();
        result = mapCtp(row);
      }
      // Append-only history log — powers the "who held it" popup on the leaderboard.
      // Best-effort: don't fail the save if the history table doesn't exist yet.
      try {
        await supabase.from("ctp_history").insert({ hole_number: holeNumber, team_id: teamId, player_name: playerName, distance, created_at: now });
      } catch {}
      return result;
    },
    async clearCtp(holeNumber) {
      await supabase.from("closest_to_pin").delete().eq("hole_number", holeNumber);
      // Clearing a hole resets its contest — wipe its history too
      try { await supabase.from("ctp_history").delete().eq("hole_number", holeNumber); } catch {}
    },
    async clearCtpForTeam(teamId) {
      await supabase.from("closest_to_pin").delete().eq("team_id", teamId);
      // Their marks are voided along with their round
      try { await supabase.from("ctp_history").delete().eq("team_id", teamId); } catch {}
    },
    async getCtpHistory() {
      try {
        const { data } = await supabase.from("ctp_history").select("*").order("id", { ascending: false });
        return (data || []).map(mapCtpHistory);
      } catch { return []; }
    },

    // ── Scorekeeper presence ────────────────────────────────────────────────────
    async touchSession(teamId, sessionId) {
      const now = new Date().toISOString();
      try {
        const { data: existing } = await supabase.from("scorekeeper_sessions").select("id").eq("session_id", sessionId).single();
        if (existing) {
          await supabase.from("scorekeeper_sessions").update({ team_id: teamId, last_seen: now }).eq("session_id", sessionId);
        } else {
          await supabase.from("scorekeeper_sessions").insert({ team_id: teamId, session_id: sessionId, last_seen: now });
        }
      } catch {}
    },
    async hasOtherActiveSession(teamId, sessionId, sinceIso) {
      try {
        const { data } = await supabase.from("scorekeeper_sessions")
          .select("session_id, last_seen")
          .eq("team_id", teamId)
          .neq("session_id", sessionId)
          .gte("last_seen", sinceIso);
        return (data || []).length > 0;
      } catch { return false; }
    },
  };
}

export const storage = createStorage();
