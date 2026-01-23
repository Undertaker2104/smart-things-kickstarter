-- db/init.sql
-- Prototype schema for Ball Cleaner (Postgres)

BEGIN;

-- 1) Enums (als TEXT + CHECK kan ook, maar enums zijn prima in Postgres)
DO $$ BEGIN
  CREATE TYPE session_status AS ENUM ('RUNNING','PAUSED','FINISHED','ERROR');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE log_level AS ENUM ('INFO','WARN','ERROR');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE event_code AS ENUM ('EMERGENCY_STOP','FOREIGN_OBJECT','JAM','SENSOR_FAIL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE command_type AS ENUM ('START_CLEANING','STOP_CLEANING','RESET_ERROR');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE command_status AS ENUM ('PENDING','CLAIMED','FAILED','SUCCESS');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- 2) Core tables

CREATE TABLE IF NOT EXISTS ball_type (
  id           INT PRIMARY KEY,
  name         TEXT NOT NULL,
  diameter     REAL NOT NULL,
  allowed      BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS cleaning_session (
  id           SERIAL PRIMARY KEY,
  started_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at     TIMESTAMPTZ,
  status       session_status NOT NULL DEFAULT 'RUNNING'
);

CREATE TABLE IF NOT EXISTS session_item (
  id           SERIAL PRIMARY KEY,
  session_id   INT NOT NULL REFERENCES cleaning_session(id) ON DELETE CASCADE,
  ball_type_id INT NOT NULL REFERENCES ball_type(id),
  count        INT NOT NULL CHECK (count >= 0),
  UNIQUE (session_id, ball_type_id)
);

CREATE TABLE IF NOT EXISTS event_log (
  id           SERIAL PRIMARY KEY,
  timestamp    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  level        log_level NOT NULL,
  code         event_code NOT NULL,
  session_id   INT REFERENCES cleaning_session(id) ON DELETE CASCADE,
  details      TEXT NOT NULL DEFAULT ''
);

-- Commands queue: dashboard writes, ESP reads
CREATE TABLE IF NOT EXISTS command (
  id             SERIAL PRIMARY KEY,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  type           command_type NOT NULL,
  command_status command_status NOT NULL DEFAULT 'PENDING',
  acked_at       TIMESTAMPTZ,
  error_message  TEXT
);

-- Expected inventory: user-configurable expected counts per ball type
CREATE TABLE IF NOT EXISTS inventory_expected (
  ball_type_id INT PRIMARY KEY REFERENCES ball_type(id) ON DELETE CASCADE,
  expected_count INT NOT NULL CHECK (expected_count >= 0),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3) Useful indexes
CREATE INDEX IF NOT EXISTS idx_event_log_session_time ON event_log(session_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_session_status_time ON cleaning_session(status, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_command_status ON command(command_status, created_at);

-- 4) Seed data (ball types)
INSERT INTO ball_type (id, name, diameter, allowed) VALUES
  (1, 'Basketbal', 24.0, TRUE),
  (2, 'Voetbal',   22.0, TRUE),
  (3, 'Volleybal', 21.0, TRUE)
ON CONFLICT (id) DO NOTHING;

-- Expected inventory counts
INSERT INTO inventory_expected (ball_type_id, expected_count) VALUES
  (1, 50),  -- Basketbal
  (2, 60),  -- Voetbal
  (3, 40)   -- Volleybal
ON CONFLICT (ball_type_id) DO NOTHING;

-- 5) Seed cleaning sessions (last 7 days with multiple sessions per day)
INSERT INTO cleaning_session (id, started_at, ended_at, status) VALUES
  -- 7 days ago (3 sessions)
  (1, NOW() - INTERVAL '7 days' + INTERVAL '8 hours', NOW() - INTERVAL '7 days' + INTERVAL '8 hours 45 minutes', 'PAUSED'),
  (2, NOW() - INTERVAL '7 days' + INTERVAL '12 hours', NOW() - INTERVAL '7 days' + INTERVAL '12 hours 38 minutes', 'PAUSED'),
  (3, NOW() - INTERVAL '7 days' + INTERVAL '16 hours', NOW() - INTERVAL '7 days' + INTERVAL '16 hours 42 minutes', 'PAUSED'),
  -- 6 days ago (3 sessions)
  (4, NOW() - INTERVAL '6 days' + INTERVAL '9 hours', NOW() - INTERVAL '6 days' + INTERVAL '9 hours 50 minutes', 'PAUSED'),
  (5, NOW() - INTERVAL '6 days' + INTERVAL '13 hours', NOW() - INTERVAL '6 days' + INTERVAL '13 hours 35 minutes', 'ERROR'),
  (6, NOW() - INTERVAL '6 days' + INTERVAL '17 hours', NOW() - INTERVAL '6 days' + INTERVAL '17 hours 40 minutes', 'PAUSED'),
  -- 5 days ago (4 sessions)
  (7, NOW() - INTERVAL '5 days' + INTERVAL '8 hours', NOW() - INTERVAL '5 days' + INTERVAL '8 hours 48 minutes', 'PAUSED'),
  (8, NOW() - INTERVAL '5 days' + INTERVAL '11 hours', NOW() - INTERVAL '5 days' + INTERVAL '11 hours 43 minutes', 'PAUSED'),
  (9, NOW() - INTERVAL '5 days' + INTERVAL '14 hours', NOW() - INTERVAL '5 days' + INTERVAL '14 hours 52 minutes', 'PAUSED'),
  (10, NOW() - INTERVAL '5 days' + INTERVAL '18 hours', NOW() - INTERVAL '5 days' + INTERVAL '18 hours 38 minutes', 'PAUSED'),
  -- 4 days ago (3 sessions)
  (11, NOW() - INTERVAL '4 days' + INTERVAL '9 hours', NOW() - INTERVAL '4 days' + INTERVAL '9 hours 44 minutes', 'PAUSED'),
  (12, NOW() - INTERVAL '4 days' + INTERVAL '13 hours', NOW() - INTERVAL '4 days' + INTERVAL '13 hours 41 minutes', 'PAUSED'),
  (13, NOW() - INTERVAL '4 days' + INTERVAL '16 hours', NOW() - INTERVAL '4 days' + INTERVAL '16 hours 47 minutes', 'PAUSED'),
  -- 3 days ago (2 sessions)
  (14, NOW() - INTERVAL '3 days' + INTERVAL '10 hours', NOW() - INTERVAL '3 days' + INTERVAL '10 hours 39 minutes', 'PAUSED'),
  (15, NOW() - INTERVAL '3 days' + INTERVAL '15 hours', NOW() - INTERVAL '3 days' + INTERVAL '15 hours 46 minutes', 'PAUSED'),
  -- 2 days ago (4 sessions)
  (16, NOW() - INTERVAL '2 days' + INTERVAL '8 hours', NOW() - INTERVAL '2 days' + INTERVAL '8 hours 41 minutes', 'PAUSED'),
  (17, NOW() - INTERVAL '2 days' + INTERVAL '11 hours', NOW() - INTERVAL '2 days' + INTERVAL '11 hours 48 minutes', 'PAUSED'),
  (18, NOW() - INTERVAL '2 days' + INTERVAL '14 hours', NOW() - INTERVAL '2 days' + INTERVAL '14 hours 36 minutes', 'PAUSED'),
  (19, NOW() - INTERVAL '2 days' + INTERVAL '17 hours', NOW() - INTERVAL '2 days' + INTERVAL '17 hours 44 minutes', 'PAUSED'),
  -- 1 day ago (3 sessions)
  (20, NOW() - INTERVAL '1 day' + INTERVAL '9 hours', NOW() - INTERVAL '1 day' + INTERVAL '9 hours 42 minutes', 'PAUSED'),
  (21, NOW() - INTERVAL '1 day' + INTERVAL '13 hours', NOW() - INTERVAL '1 day' + INTERVAL '13 hours 50 minutes', 'PAUSED'),
  (22, NOW() - INTERVAL '1 day' + INTERVAL '16 hours', NOW() - INTERVAL '1 day' + INTERVAL '16 hours 38 minutes', 'PAUSED'),
  -- Today (2 sessions)
  (23, NOW() - INTERVAL '6 hours', NOW() - INTERVAL '6 hours' + INTERVAL '45 minutes', 'PAUSED'),
  (24, NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours' + INTERVAL '40 minutes', 'PAUSED')
ON CONFLICT (id) DO NOTHING;

-- 6) Seed session items (counted balls per type per session)
-- Expected counts: Basketbal=50, Voetbal=60, Volleybal=40
INSERT INTO session_item (session_id, ball_type_id, count) VALUES
  (1, 1, 48), (1, 2, 58), (1, 3, 39),
  (2, 1, 49), (2, 2, 60), (2, 3, 40),
  (3, 1, 47), (3, 2, 59), (3, 3, 38),
  (4, 1, 50), (4, 2, 61), (4, 3, 40),
  (5, 1, 42), (5, 2, 55), (5, 3, 35),
  (6, 1, 49), (6, 2, 60), (6, 3, 39),
  (7, 1, 50), (7, 2, 62), (7, 3, 41),
  (8, 1, 48), (8, 2, 59), (8, 3, 40),
  (9, 1, 51), (9, 2, 60), (9, 3, 40),
  (10, 1, 49), (10, 2, 58), (10, 3, 39),
  (11, 1, 50), (11, 2, 60), (11, 3, 40),
  (12, 1, 48), (12, 2, 61), (12, 3, 38),
  (13, 1, 50), (13, 2, 59), (13, 3, 41),
  (14, 1, 49), (14, 2, 60), (14, 3, 40),
  (15, 1, 50), (15, 2, 60), (15, 3, 39),
  (16, 1, 48), (16, 2, 59), (16, 3, 40),
  (17, 1, 50), (17, 2, 60), (17, 3, 39),
  (18, 1, 49), (18, 2, 61), (18, 3, 40),
  (19, 1, 47), (19, 2, 59), (19, 3, 38),
  (20, 1, 50), (20, 2, 60), (20, 3, 40),
  (21, 1, 49), (21, 2, 59), (21, 3, 39),
  (22, 1, 48), (22, 2, 60), (22, 3, 41),
  (23, 1, 50), (23, 2, 61), (23, 3, 40),
  (24, 1, 50), (24, 2, 60), (24, 3, 39)
ON CONFLICT (session_id, ball_type_id) DO NOTHING;

-- 7) Seed event logs
INSERT INTO event_log (timestamp, level, code, session_id, details) VALUES
  -- Session 5 events (ERROR session)
  (NOW() - INTERVAL '6 days' + INTERVAL '13 hours 20 minutes', 'ERROR', 'JAM', 5, 'Ball jam detected in conveyor'),
  -- Session 23 events
  (NOW() - INTERVAL '6 hours' + INTERVAL '28 minutes', 'INFO', 'SENSOR_FAIL', 23, 'Pressure sensor temporary failure')
ON CONFLICT DO NOTHING;

-- Reset sequence for auto-increment IDs
SELECT setval('cleaning_session_id_seq', (SELECT MAX(id) FROM cleaning_session));
SELECT setval('session_item_id_seq', (SELECT MAX(id) FROM session_item));
SELECT setval('event_log_id_seq', (SELECT MAX(id) FROM event_log));

COMMIT;