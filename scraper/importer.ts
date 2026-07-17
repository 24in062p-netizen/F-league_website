import Database from 'better-sqlite3';
import { getDb } from '../lib/db';
import { fetchPhp, sleep } from './fetcher';
import { parseScheduleHtml, parseAvailableMatchdays } from './parser';
import { SEASONS, type SeasonConfig, type Division } from './config';

const SLEEP_MS = 600;

// ──── シーズン登録 ──────────────────────────────────────────────

function upsertSeasons(db: Database.Database): void {
  const stmt = db.prepare(
    `INSERT INTO seasons(id, label, is_current)
     VALUES(?,?,?)
     ON CONFLICT(id) DO UPDATE SET label=excluded.label, is_current=excluded.is_current`,
  );
  for (const s of SEASONS) {
    stmt.run(s.id, s.label, s.isCurrent ? 1 : 0);
  }
}

// ──── チーム登録 ────────────────────────────────────────────────

function upsertTeam(
  db: Database.Database,
  seasonId: string,
  division: Division,
  name: string,
): void {
  db.prepare(
    `INSERT OR IGNORE INTO teams(season_id, division, name) VALUES(?,?,?)`,
  ).run(seasonId, division, name);
}

// ──── 試合 upsert（複合キー方式） ─────────────────────────────
//
// 識別キー: (season_id, division, matchday, home_team, away_team)
// gid は取得できた時点で更新（null → 実gid への遷移に対応）
// status='終了' のレコードはスコア・ステータスを保護
// date/time/venue は常に最新で上書き（会場変更等に対応）

function makeUpsertStmt(db: Database.Database): Database.Statement {
  return db.prepare(`
    INSERT INTO matches
      (gid, season_id, division, matchday, match_date, match_time, venue,
       home_team, away_team, home_score, away_score, status, last_fetched)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(season_id, division, matchday, home_team, away_team)
    DO UPDATE SET
      gid          = CASE WHEN excluded.gid IS NOT NULL
                          THEN excluded.gid ELSE gid END,
      match_date   = excluded.match_date,
      match_time   = excluded.match_time,
      venue        = excluded.venue,
      home_score   = CASE WHEN matches.status = '終了'
                          THEN home_score ELSE excluded.home_score END,
      away_score   = CASE WHEN matches.status = '終了'
                          THEN away_score ELSE excluded.away_score END,
      status       = CASE WHEN matches.status = '終了'
                          THEN '終了' ELSE excluded.status END,
      last_fetched = excluded.last_fetched
  `);
}

// ──── 1節分の取り込み ──────────────────────────────────────────

async function importMatchday(
  db: Database.Database,
  stmt: Database.Statement,
  season: SeasonConfig,
  division: Division,
  matchday: number,
): Promise<number> {
  const cfg = season.divisions[division];
  const html = await fetchPhp(
    cfg.schedulePhp,
    { tid: cfg.tid, t: matchday },
    cfg.refererSchedule,
  );

  const parsed = parseScheduleHtml(html);
  if (parsed.length === 0) return -1;

  let count = 0;
  for (const m of parsed) {
    stmt.run(
      m.gid,
      season.id,
      division,
      m.matchday || matchday,
      m.date,
      m.time,
      m.venue,
      m.homeTeam,
      m.awayTeam,
      m.homeScore,
      m.awayScore,
      m.status,
      new Date().toISOString(),
    );
    upsertTeam(db, season.id, division, m.homeTeam);
    upsertTeam(db, season.id, division, m.awayTeam);
    count++;
  }
  return count;
}

// ──── 1ディビジョン全節取り込み ────────────────────────────────

async function importDivision(
  db: Database.Database,
  season: SeasonConfig,
  division: Division,
  onProgress: (msg: string) => void,
): Promise<number> {
  const cfg = season.divisions[division];
  const stmt = makeUpsertStmt(db);

  const firstHtml = await fetchPhp(
    cfg.schedulePhp,
    { tid: cfg.tid, t: 1 },
    cfg.refererSchedule,
  );
  await sleep(SLEEP_MS);

  let matchdays = parseAvailableMatchdays(firstHtml);
  if (matchdays.length === 0) {
    matchdays = Array.from({ length: cfg.maxMatchdays }, (_, i) => i + 1);
  }

  // 第1節は既に取得済みなので先に処理
  const parsed0 = parseScheduleHtml(firstHtml);
  let totalUpserted = 0;
  for (const m of parsed0) {
    stmt.run(
      m.gid, season.id, division, m.matchday || 1,
      m.date, m.time, m.venue,
      m.homeTeam, m.awayTeam,
      m.homeScore, m.awayScore, m.status,
      new Date().toISOString(),
    );
    upsertTeam(db, season.id, division, m.homeTeam);
    upsertTeam(db, season.id, division, m.awayTeam);
    totalUpserted++;
  }
  onProgress(`  ${season.id} ${division} 第1節: ${parsed0.length}試合`);

  for (const t of matchdays.slice(1)) {
    const count = await importMatchday(db, stmt, season, division, t);
    if (count === -1) {
      onProgress(`  ${season.id} ${division} 第${t}節: データなし → 終了`);
      break;
    }
    onProgress(`  ${season.id} ${division} 第${t}節: ${count}試合`);
    totalUpserted += count;
    await sleep(SLEEP_MS);
  }

  return totalUpserted;
}

// ──── メイン ───────────────────────────────────────────────────

export interface ImportOptions {
  init?: boolean;
  onProgress?: (msg: string) => void;
}

export async function runImport(opts: ImportOptions = {}): Promise<void> {
  const db = getDb();
  const log = opts.onProgress ?? console.log;

  upsertSeasons(db);

  const logId = (
    db.prepare(`INSERT INTO scrape_logs(started_at) VALUES(?)`).run(new Date().toISOString()) as
      { lastInsertRowid: number }
  ).lastInsertRowid;

  let totalUpserted = 0;
  try {
    const targets = opts.init ? SEASONS : SEASONS.filter((s) => s.isCurrent);

    for (const season of targets) {
      for (const div of ['F1', 'F2'] as Division[]) {
        log(`\n[${season.id} ${div}] 取り込み開始`);
        const n = await importDivision(db, season, div, log);
        log(`  → ${n} 件 upserted`);
        totalUpserted += n;
        await sleep(1000);
      }
    }

    db.prepare(
      `UPDATE scrape_logs SET status='success', finished_at=?, matches_upserted=? WHERE id=?`,
    ).run(new Date().toISOString(), totalUpserted, logId);

    log(`\n完了: 合計 ${totalUpserted} 件`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    db.prepare(
      `UPDATE scrape_logs SET status='error', finished_at=?, message=? WHERE id=?`,
    ).run(new Date().toISOString(), msg, logId);
    throw e;
  }
}
