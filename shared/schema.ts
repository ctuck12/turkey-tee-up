import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ─── TOURNAMENT SETTINGS ──────────────────────────────────────────────────────
export const tournamentSettings = sqliteTable("tournament_settings", {
  id: integer("id").primaryKey().default(1),
  tournamentName: text("tournament_name").notNull().default("Abilene Turkey Drive Golf Tournament"),
  courseName: text("course_name").notNull().default("ACC: North Course"),
  year: integer("year").notNull().default(2025),
  courseHoles: integer("course_holes").notNull().default(18),
  adminPassword: text("admin_password").notNull().default("atdadmin2025"),
  scorekeeperPassword: text("scorekeeper_password").notNull().default("atd2025"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  broadcastMessage: text("broadcast_message"),
  defaultFlight: text("default_flight").notNull().default("morning"),
  // Tournament lifecycle: 'test' (open, full testing) | 'live' (flight-gated) | 'complete' (locked)
  tournamentMode: text("tournament_mode").notNull().default("test"),
  // Per-flight round status in live mode: 'not_started' | 'in_progress' | 'complete'
  amStatus: text("am_status").notNull().default("not_started"),
  pmStatus: text("pm_status").notNull().default("not_started"),
  // Ordered, comma-separated hole numbers used to break ties (1st listed = compared first)
  tiebreakerHoles: text("tiebreaker_holes"),
});

// ─── HOLES ────────────────────────────────────────────────────────────────────
export const holes = sqliteTable("holes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  holeNumber: integer("hole_number").notNull(),
  par: integer("par").notNull().default(4),
  handicap: integer("handicap").notNull().default(1),
  yardageBlue: integer("yardage_blue").notNull().default(0),
  yardageWhite: integer("yardage_white").notNull().default(0),
  yardageRed: integer("yardage_red").notNull().default(0),
  isCtpHole: integer("is_ctp_hole", { mode: "boolean" }).notNull().default(false),
  ctpLabel: text("ctp_label"), // e.g. "CTP #1"
});

// ─── SPONSORS ─────────────────────────────────────────────────────────────────
export const sponsors = sqliteTable("sponsors", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  logoUrl: text("logo_url"), // URL to their logo
  website: text("website"),
  placement: text("placement").notNull().default("leaderboard"), // 'leaderboard' | 'scorecard' | 'both'
  displayOrder: integer("display_order").notNull().default(0),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
});

// ─── TEAMS ────────────────────────────────────────────────────────────────────
export const teams = sqliteTable("teams", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  teamName: text("team_name").notNull(),
  player1: text("player1").notNull().default(""),
  player2: text("player2").notNull().default(""),
  player3: text("player3").notNull().default(""),
  player4: text("player4").notNull().default(""),
  flight: text("flight").notNull().default("morning"), // 'morning' | 'afternoon'
  startingHole: integer("starting_hole").notNull().default(1),
  teamCode: text("team_code").notNull(), // unique 4-digit code for scorekeeper access
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  isSubmitted: integer("is_submitted", { mode: "boolean" }).notNull().default(false),
  finishPlace: integer("finish_place"), // 1 | 2 | 3 within their flight, null = unplaced
});

// ─── SCORES ───────────────────────────────────────────────────────────────────
export const scores = sqliteTable("scores", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  teamId: integer("team_id").notNull().references(() => teams.id),
  holeNumber: integer("hole_number").notNull(),
  strokes: integer("strokes"), // null = not yet entered
  updatedAt: text("updated_at").notNull().default(new Date().toISOString()),
});

// ─── CLOSEST TO PIN ───────────────────────────────────────────────────────────
export const closestToPin = sqliteTable("closest_to_pin", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  holeNumber: integer("hole_number").notNull(),
  teamId: integer("team_id").references(() => teams.id),
  playerName: text("player_name"),
  distance: text("distance"), // e.g. "4'6\"" or "1.2m"
  updatedAt: text("updated_at").notNull().default(new Date().toISOString()),
});

// ─── CTP / LD HISTORY ─────────────────────────────────────────────────────────
// Append-only log: one row every time a CTP/LD entry is marked, so the
// leaderboard can show the full lineage of leaders for each hole.
export const ctpHistory = sqliteTable("ctp_history", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  holeNumber: integer("hole_number").notNull(),
  teamId: integer("team_id").references(() => teams.id),
  playerName: text("player_name"),
  distance: text("distance"),
  createdAt: text("created_at").notNull().default(new Date().toISOString()),
});

// ─── INSERT SCHEMAS ───────────────────────────────────────────────────────────
export const insertHoleSchema = createInsertSchema(holes).omit({ id: true });
export const insertSponsorSchema = createInsertSchema(sponsors).omit({ id: true });
export const insertTeamSchema = createInsertSchema(teams).omit({ id: true });
export const insertScoreSchema = createInsertSchema(scores).omit({ id: true });
export const insertCtpSchema = createInsertSchema(closestToPin).omit({ id: true });
export const insertSettingsSchema = createInsertSchema(tournamentSettings).omit({ id: true });

// ─── TYPES ────────────────────────────────────────────────────────────────────
export type Hole = typeof holes.$inferSelect;
export type Sponsor = typeof sponsors.$inferSelect;
export type Team = typeof teams.$inferSelect;
export type Score = typeof scores.$inferSelect;
export type ClosestToPin = typeof closestToPin.$inferSelect;
export type CtpHistory = typeof ctpHistory.$inferSelect;
export type TournamentSettings = typeof tournamentSettings.$inferSelect;

export type InsertHole = z.infer<typeof insertHoleSchema>;
export type InsertSponsor = z.infer<typeof insertSponsorSchema>;
export type InsertTeam = z.infer<typeof insertTeamSchema>;
export type InsertScore = z.infer<typeof insertScoreSchema>;
export type InsertCtp = z.infer<typeof insertCtpSchema>;
export type InsertSettings = z.infer<typeof insertSettingsSchema>;

// ─── DERIVED TYPES ────────────────────────────────────────────────────────────
export type LeaderboardEntry = {
  team: Team;
  scores: Score[];
  totalStrokes: number;
  totalToPar: number;
  holesCompleted: number;
  thruHole: number | null;
};
