import { getDb } from './db';
import type { Division, Match, Season, StandingRow, HeadToHeadSummary } from './types';

export type { Division, Match, Season, StandingRow, HeadToHeadSummary } from './types';

// ──── シーズン ────────────────────────────────────────────────

export function getSeasons(): Season[] {
  return getDb().prepare('SELECT * FROM seasons ORDER BY id DESC').all() as Season[];
}

export function getCurrentSeason(): Season | undefined {
  return (
    (getDb().prepare('SELECT * FROM seasons WHERE is_current = 1').get() as Season | undefined) ??
    (getDb().prepare('SELECT * FROM seasons ORDER BY id DESC LIMIT 1').get() as Season | undefined)
  );
}

// ──── 試合 ────────────────────────────────────────────────────

export function getMatchesByMatchday(
  seasonId: string,
  division: Division,
  matchday: number,
): Match[] {
  return getDb()
    .prepare(
      `SELECT * FROM matches
       WHERE season_id = ? AND division = ? AND matchday = ?
       ORDER BY match_date, match_time, gid`,
    )
    .all(seasonId, division, matchday) as Match[];
}

export function getMatchdays(
  seasonId: string,
  division: Division,
): { matchday: number; count: number; finished: number }[] {
  return getDb()
    .prepare(
      `SELECT matchday,
              COUNT(*) AS count,
              SUM(CASE WHEN status='終了' THEN 1 ELSE 0 END) AS finished
       FROM matches
       WHERE season_id = ? AND division = ?
       GROUP BY matchday
       ORDER BY matchday`,
    )
    .all(seasonId, division) as { matchday: number; count: number; finished: number }[];
}

/** 週末（開始日〜終了日）の試合をF1/F2両方まとめて返す */
export function getWeekendMatches(
  startDate: string,
  endDate: string,
): { f1: Match[]; f2: Match[] } {
  const db = getDb();
  const sql = `
    SELECT * FROM matches
    WHERE match_date BETWEEN ? AND ?
      AND season_id = (SELECT id FROM seasons WHERE is_current = 1 LIMIT 1)
      AND division = ?
    ORDER BY match_date, match_time, gid
  `;
  return {
    f1: db.prepare(sql).all(startDate, endDate, 'F1') as Match[],
    f2: db.prepare(sql).all(startDate, endDate, 'F2') as Match[],
  };
}

/** フォールバック用：直近の確定試合がある週末を探す */
export function getNearestWeekend(): { start: string; end: string } | null {
  const row = getDb()
    .prepare(
      `SELECT match_date FROM matches
       WHERE status = '終了'
         AND season_id = (SELECT id FROM seasons WHERE is_current = 1 LIMIT 1)
       ORDER BY match_date DESC LIMIT 1`,
    )
    .get() as { match_date: string } | undefined;

  if (!row) return null;

  const d = new Date(row.match_date + 'T00:00:00Z');
  // その日が属する週末（金〜日）を返す
  const dow = d.getUTCDay(); // 0=Sun,5=Fri,6=Sat
  const fridayOffset = dow === 5 ? 0 : dow === 6 ? -1 : dow === 0 ? -2 : 0;
  const friday = new Date(d.getTime() + fridayOffset * 86400000);
  const sunday = new Date(friday.getTime() + 2 * 86400000);
  return {
    start: friday.toISOString().split('T')[0],
    end: sunday.toISOString().split('T')[0],
  };
}

// ──── 順位表（動的計算） ──────────────────────────────────────

export function getStandings(seasonId: string, division: Division): StandingRow[] {
  return getDb()
    .prepare(
      `WITH home AS (
         SELECT home_team AS team,
                COUNT(*) AS played,
                SUM(CASE WHEN home_score > away_score THEN 3
                         WHEN home_score = away_score THEN 1 ELSE 0 END) AS pts,
                SUM(CASE WHEN home_score > away_score THEN 1 ELSE 0 END) AS wins,
                SUM(CASE WHEN home_score = away_score THEN 1 ELSE 0 END) AS draws,
                SUM(CASE WHEN home_score < away_score THEN 1 ELSE 0 END) AS losses,
                SUM(home_score) AS gf,
                SUM(away_score) AS ga
         FROM matches
         WHERE season_id = ? AND division = ? AND status = '終了'
         GROUP BY home_team
       ),
       away AS (
         SELECT away_team AS team,
                COUNT(*) AS played,
                SUM(CASE WHEN away_score > home_score THEN 3
                         WHEN away_score = home_score THEN 1 ELSE 0 END) AS pts,
                SUM(CASE WHEN away_score > home_score THEN 1 ELSE 0 END) AS wins,
                SUM(CASE WHEN away_score = home_score THEN 1 ELSE 0 END) AS draws,
                SUM(CASE WHEN away_score < home_score THEN 1 ELSE 0 END) AS losses,
                SUM(away_score) AS gf,
                SUM(home_score) AS ga
         FROM matches
         WHERE season_id = ? AND division = ? AND status = '終了'
         GROUP BY away_team
       ),
       combined AS (SELECT * FROM home UNION ALL SELECT * FROM away)
       SELECT team,
              SUM(played) AS played,
              SUM(pts)    AS pts,
              SUM(wins)   AS wins,
              SUM(draws)  AS draws,
              SUM(losses) AS losses,
              SUM(gf)     AS gf,
              SUM(ga)     AS ga,
              SUM(gf) - SUM(ga) AS gd
       FROM combined
       GROUP BY team
       ORDER BY pts DESC, gd DESC, gf DESC, team`,
    )
    .all(seasonId, division, seasonId, division) as StandingRow[];
}

// ──── チーム ──────────────────────────────────────────────────

export function getTeams(seasonId: string, division: Division): string[] {
  return (
    getDb()
      .prepare(
        `SELECT DISTINCT home_team AS name FROM matches
         WHERE season_id = ? AND division = ?
         ORDER BY home_team`,
      )
      .all(seasonId, division) as { name: string }[]
  ).map((r) => r.name);
}

export function getTeamMatches(seasonId: string, teamName: string): Match[] {
  return getDb()
    .prepare(
      `SELECT * FROM matches
       WHERE season_id = ?
         AND (home_team = ? OR away_team = ?)
         AND status = '終了'
       ORDER BY match_date, match_time`,
    )
    .all(seasonId, teamName, teamName) as Match[];
}

// ──── 直接対戦 ────────────────────────────────────────────────

/** チームAが全シーズンを通じて対戦した（終了試合のある）相手一覧 */
export function getOpponents(teamName: string): string[] {
  return (
    getDb()
      .prepare(
        `SELECT DISTINCT
           CASE WHEN home_team = ? THEN away_team ELSE home_team END AS opponent
         FROM matches
         WHERE (home_team = ? OR away_team = ?)
           AND status = '終了'
         ORDER BY opponent`,
      )
      .all(teamName, teamName, teamName) as { opponent: string }[]
  ).map((r) => r.opponent);
}

/** 全シーズン通算のA対B直接対戦試合（終了のみ・日付順） */
export function getHeadToHeadMatches(teamA: string, teamB: string): Match[] {
  return getDb()
    .prepare(
      `SELECT * FROM matches
       WHERE ((home_team = ? AND away_team = ?)
          OR (home_team = ? AND away_team = ?))
         AND status = '終了'
       ORDER BY match_date, match_time`,
    )
    .all(teamA, teamB, teamB, teamA) as Match[];
}

/** Aから見た通算成績（終了試合のみ集計） */
export function getHeadToHeadSummary(teamA: string, teamB: string): HeadToHeadSummary {
  const matches = getHeadToHeadMatches(teamA, teamB).filter(
    (m) => m.status === '終了' && m.home_score !== null && m.away_score !== null,
  );
  let wins = 0, draws = 0, losses = 0, gf = 0, ga = 0;
  for (const m of matches) {
    const isHome = m.home_team === teamA;
    const my = isHome ? m.home_score! : m.away_score!;
    const their = isHome ? m.away_score! : m.home_score!;
    gf += my;
    ga += their;
    if (my > their) wins++;
    else if (my === their) draws++;
    else losses++;
  }
  return { played: matches.length, wins, draws, losses, gf, ga, gd: gf - ga };
}

// ──── 静的書き出し用：全件ダンプ ────────────────────────────────

/** ビルド時のJSON書き出し（scripts/export-data.ts）専用。全試合を返す */
export function getAllMatches(): Match[] {
  return getDb()
    .prepare(
      `SELECT * FROM matches
       ORDER BY season_id DESC, division, matchday, match_date, match_time, gid`,
    )
    .all() as Match[];
}
