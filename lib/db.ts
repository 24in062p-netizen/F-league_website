import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = process.env.DB_PATH ?? path.join(process.cwd(), 'fleague.db');

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma('journal_mode = WAL');
    _db.pragma('foreign_keys = ON');
    initSchema(_db);
  }
  return _db;
}

function initSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS seasons (
      id         TEXT PRIMARY KEY,
      label      TEXT NOT NULL,
      is_current INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS teams (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      season_id  TEXT NOT NULL REFERENCES seasons(id),
      division   TEXT NOT NULL CHECK(division IN ('F1','F2')),
      name       TEXT NOT NULL,
      short_name TEXT,
      UNIQUE(season_id, division, name)
    );

    CREATE TABLE IF NOT EXISTS matches (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      gid          INTEGER UNIQUE,
      season_id    TEXT NOT NULL REFERENCES seasons(id),
      division     TEXT NOT NULL CHECK(division IN ('F1','F2')),
      matchday     INTEGER NOT NULL,
      match_date   TEXT,
      match_time   TEXT,
      venue        TEXT,
      home_team    TEXT NOT NULL,
      away_team    TEXT NOT NULL,
      home_score   INTEGER,
      away_score   INTEGER,
      status       TEXT NOT NULL DEFAULT '予定'
                   CHECK(status IN ('予定','試合中','終了','延期','中止')),
      last_fetched TEXT NOT NULL,
      UNIQUE(season_id, division, matchday, home_team, away_team)
    );

    CREATE INDEX IF NOT EXISTS idx_matches_season_div
      ON matches(season_id, division);
    CREATE INDEX IF NOT EXISTS idx_matches_date
      ON matches(match_date);
    CREATE INDEX IF NOT EXISTS idx_matches_teams
      ON matches(home_team, away_team);

    CREATE TABLE IF NOT EXISTS scrape_logs (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      started_at       TEXT NOT NULL,
      finished_at      TEXT,
      status           TEXT NOT NULL DEFAULT 'running'
                       CHECK(status IN ('running','success','error')),
      matches_upserted INTEGER DEFAULT 0,
      message          TEXT
    );
  `);
}
