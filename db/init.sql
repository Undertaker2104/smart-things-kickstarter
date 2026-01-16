-- db/init.sql
-- Prototype schema for Ball Cleaner (Postgres)

BEGIN;

-- 1) Enums (als TEXT + CHECK kan ook, maar enums zijn prima in Postgres)
DO $$ BEGIN
  CREATE TYPE session_status AS ENUM ('RUNNING','OK','STOPPED','EMERGENCY','ERROR');
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
  id           SERIAL PRIMARY KEY,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  type         command_type NOT NULL,
  payload      JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- For prototype with 1 machine you can keep device_id constant.
  device_id    TEXT NOT NULL DEFAULT 'machine-1',

  -- delivery/ack tracking
  claimed_at   TIMESTAMPTZ,
  acked_at     TIMESTAMPTZ
);

-- 3) Useful indexes
CREATE INDEX IF NOT EXISTS idx_event_log_session_time ON event_log(session_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_session_status_time ON cleaning_session(status, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_command_device_unacked ON command(device_id, acked_at, created_at);

-- 4) Seed data (ball types)
INSERT INTO ball_type (id, name, diameter, allowed) VALUES
  (1, 'Basketbal', 24.0, TRUE),
  (2, 'Voetbal',   22.0, TRUE),
  (3, 'Volleybal', 21.0, TRUE)
ON CONFLICT (id) DO NOTHING;

COMMIT;
