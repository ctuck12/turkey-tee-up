import postgres from 'postgres';

// Supabase direct DB connection (pooler on port 5432)
const PROJECT_REF = 'dqxpnqkfkzpxlivulqhe';
// Using the service role key as password for the postgres user won't work directly
// We need to use the actual DB password or the connection pooler URL
// Supabase connection string format:
// postgresql://postgres.[project-ref]:[db-password]@aws-0-us-east-1.pooler.supabase.com:5432/postgres

// Since we don't have the DB password, let's use the Supabase REST API to create tables
// by calling the SQL via the Management API with a PAT
// Actually, let's write a SQL file and instruct how to run it, or use the pg REST approach

console.log(`
==================================================
ACTION REQUIRED IN SUPABASE DASHBOARD
==================================================

Please go to your Supabase project:
https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new

And run the following SQL to create the tables:
`);

const SQL = `
-- Tournament Settings
CREATE TABLE IF NOT EXISTS tournament_settings (
  id integer PRIMARY KEY DEFAULT 1,
  tournament_name text NOT NULL DEFAULT 'Abilene Turkey Drive Golf Tournament',
  year integer NOT NULL DEFAULT 2025,
  course_holes integer NOT NULL DEFAULT 18,
  admin_password text NOT NULL DEFAULT 'atdadmin2025',
  scorekeeper_password text NOT NULL DEFAULT 'atd2025',
  is_active boolean NOT NULL DEFAULT true
);

-- Holes
CREATE TABLE IF NOT EXISTS holes (
  id serial PRIMARY KEY,
  hole_number integer NOT NULL,
  par integer NOT NULL DEFAULT 4,
  handicap integer NOT NULL DEFAULT 1,
  yardage_blue integer NOT NULL DEFAULT 0,
  yardage_white integer NOT NULL DEFAULT 0,
  yardage_red integer NOT NULL DEFAULT 0,
  is_ctp_hole boolean NOT NULL DEFAULT false,
  ctp_label text
);

-- Sponsors
CREATE TABLE IF NOT EXISTS sponsors (
  id serial PRIMARY KEY,
  name text NOT NULL,
  logo_url text,
  website text,
  placement text NOT NULL DEFAULT 'leaderboard',
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true
);

-- Teams
CREATE TABLE IF NOT EXISTS teams (
  id serial PRIMARY KEY,
  team_name text NOT NULL,
  player1 text NOT NULL DEFAULT '',
  player2 text NOT NULL DEFAULT '',
  player3 text NOT NULL DEFAULT '',
  player4 text NOT NULL DEFAULT '',
  flight text NOT NULL DEFAULT 'morning',
  starting_hole integer NOT NULL DEFAULT 1,
  team_code text NOT NULL,
  is_active boolean NOT NULL DEFAULT true
);

-- Scores
CREATE TABLE IF NOT EXISTS scores (
  id serial PRIMARY KEY,
  team_id integer NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  hole_number integer NOT NULL,
  strokes integer,
  updated_at text NOT NULL DEFAULT now()::text
);

-- Closest to Pin
CREATE TABLE IF NOT EXISTS closest_to_pin (
  id serial PRIMARY KEY,
  hole_number integer NOT NULL,
  team_id integer REFERENCES teams(id) ON DELETE SET NULL,
  player_name text,
  distance text,
  updated_at text NOT NULL DEFAULT now()::text
);

-- Seed tournament settings
INSERT INTO tournament_settings (id, tournament_name, year, course_holes, admin_password, scorekeeper_password, is_active)
VALUES (1, 'Abilene Turkey Drive Golf Tournament', 2025, 18, 'atdadmin2025', 'atd2025', true)
ON CONFLICT (id) DO NOTHING;

-- Seed holes (ACC: North Course, Par 71)
INSERT INTO holes (hole_number, par, handicap, is_ctp_hole, ctp_label) VALUES
(1,  4, 1,  false, null),
(2,  4, 2,  false, null),
(3,  4, 3,  false, null),
(4,  3, 4,  true,  'CTP Hole 1'),
(5,  4, 5,  false, null),
(6,  4, 6,  false, null),
(7,  5, 7,  false, null),
(8,  3, 8,  true,  'CTP Hole 2'),
(9,  5, 9,  false, null),
(10, 3, 10, true,  'CTP Hole 3'),
(11, 4, 11, false, null),
(12, 4, 12, false, null),
(13, 5, 13, false, null),
(14, 3, 14, true,  'CTP Hole 4'),
(15, 5, 15, false, null),
(16, 4, 16, false, null),
(17, 3, 17, true,  'CTP Hole 5'),
(18, 4, 18, false, null)
ON CONFLICT DO NOTHING;
`;

console.log(SQL);
console.log('==================================================');
console.log('After running the SQL above, come back here and');
console.log('I will finish wiring up the app to Supabase.');
console.log('==================================================');
