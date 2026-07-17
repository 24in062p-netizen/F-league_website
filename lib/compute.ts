import type { Division, Match, StandingRow, HeadToHeadSummary } from './types';

// ──── シーズン ────────────────────────────────────────────────

export function getCurrentSeasonId(seasons: { id: string; is_current: number }[]): string {
  return (seasons.find((s) => s.is_current)?.id ?? seasons[0]?.id) ?? '';
}

// ──── 試合 ────────────────────────────────────────────────────

export function getMatchesByMatchday(
  matches: Match[],
  seasonId: string,
  division: Division,
  matchday: number,
): Match[] {
  return matches
    .filter((m) => m.season_id === seasonId && m.division === division && m.matchday === matchday)
    .sort(byDateTimeGid);
}

export function getMatchdays(
  matches: Match[],
  seasonId: string,
  division: Division,
): { matchday: number; count: number; finished: number }[] {
  const byMatchday = new Map<number, { matchday: number; count: number; finished: number }>();
  for (const m of matches) {
    if (m.season_id !== seasonId || m.division !== division) continue;
    const entry = byMatchday.get(m.matchday) ?? { matchday: m.matchday, count: 0, finished: 0 };
    entry.count += 1;
    if (m.status === '終了') entry.finished += 1;
    byMatchday.set(m.matchday, entry);
  }
  return [...byMatchday.values()].sort((a, b) => a.matchday - b.matchday);
}

/** 週末（開始日〜終了日）の試合をF1/F2両方まとめて返す */
export function getWeekendMatches(
  matches: Match[],
  seasonId: string,
  startDate: string,
  endDate: string,
): { f1: Match[]; f2: Match[] } {
  const inRange = matches.filter(
    (m) =>
      m.season_id === seasonId &&
      m.match_date !== null &&
      m.match_date >= startDate &&
      m.match_date <= endDate,
  );
  return {
    f1: inRange.filter((m) => m.division === 'F1').sort(byDateTimeGid),
    f2: inRange.filter((m) => m.division === 'F2').sort(byDateTimeGid),
  };
}

/** フォールバック用：直近の確定試合がある週末を探す */
export function getNearestWeekend(matches: Match[], seasonId: string): { start: string; end: string } | null {
  const finished = matches
    .filter((m) => m.season_id === seasonId && m.status === '終了' && m.match_date !== null)
    .sort((a, b) => (a.match_date! < b.match_date! ? 1 : a.match_date! > b.match_date! ? -1 : 0));

  const row = finished[0];
  if (!row?.match_date) return null;

  const d = new Date(row.match_date + 'T00:00:00Z');
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

export function getStandings(matches: Match[], seasonId: string, division: Division): StandingRow[] {
  const rows = new Map<string, StandingRow>();

  function ensure(team: string): StandingRow {
    let row = rows.get(team);
    if (!row) {
      row = { team, played: 0, pts: 0, wins: 0, draws: 0, losses: 0, gf: 0, ga: 0, gd: 0 };
      rows.set(team, row);
    }
    return row;
  }

  for (const m of matches) {
    if (m.season_id !== seasonId || m.division !== division || m.status !== '終了') continue;
    if (m.home_score === null || m.away_score === null) continue;

    const home = ensure(m.home_team);
    const away = ensure(m.away_team);

    home.played += 1;
    away.played += 1;
    home.gf += m.home_score;
    home.ga += m.away_score;
    away.gf += m.away_score;
    away.ga += m.home_score;

    if (m.home_score > m.away_score) {
      home.pts += 3;
      home.wins += 1;
      away.losses += 1;
    } else if (m.home_score === m.away_score) {
      home.pts += 1;
      away.pts += 1;
      home.draws += 1;
      away.draws += 1;
    } else {
      away.pts += 3;
      away.wins += 1;
      home.losses += 1;
    }
  }

  for (const row of rows.values()) row.gd = row.gf - row.ga;

  return [...rows.values()].sort(
    (a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || a.team.localeCompare(b.team),
  );
}

// ──── チーム ──────────────────────────────────────────────────

export function getTeams(matches: Match[], seasonId: string, division: Division): string[] {
  const names = new Set<string>();
  for (const m of matches) {
    if (m.season_id === seasonId && m.division === division) names.add(m.home_team);
  }
  return [...names].sort((a, b) => a.localeCompare(b));
}

export function getTeamMatches(matches: Match[], seasonId: string, teamName: string): Match[] {
  return matches
    .filter(
      (m) =>
        m.season_id === seasonId &&
        (m.home_team === teamName || m.away_team === teamName) &&
        m.status === '終了',
    )
    .sort(byDateTime);
}

// ──── 直接対戦 ────────────────────────────────────────────────

/** チームAが全シーズンを通じて対戦した（終了試合のある）相手一覧 */
export function getOpponents(matches: Match[], teamName: string): string[] {
  const names = new Set<string>();
  for (const m of matches) {
    if (m.status !== '終了') continue;
    if (m.home_team === teamName) names.add(m.away_team);
    else if (m.away_team === teamName) names.add(m.home_team);
  }
  return [...names].sort((a, b) => a.localeCompare(b));
}

/** 全シーズン通算のA対B直接対戦試合（終了のみ・日付順） */
export function getHeadToHeadMatches(matches: Match[], teamA: string, teamB: string): Match[] {
  return matches
    .filter(
      (m) =>
        m.status === '終了' &&
        ((m.home_team === teamA && m.away_team === teamB) ||
          (m.home_team === teamB && m.away_team === teamA)),
    )
    .sort(byDateTime);
}

/** Aから見た通算成績（終了試合のみ集計） */
export function getHeadToHeadSummary(matches: Match[], teamA: string, teamB: string): HeadToHeadSummary {
  const h2h = getHeadToHeadMatches(matches, teamA, teamB).filter(
    (m) => m.home_score !== null && m.away_score !== null,
  );
  let wins = 0,
    draws = 0,
    losses = 0,
    gf = 0,
    ga = 0;
  for (const m of h2h) {
    const isHome = m.home_team === teamA;
    const my = isHome ? m.home_score! : m.away_score!;
    const their = isHome ? m.away_score! : m.home_score!;
    gf += my;
    ga += their;
    if (my > their) wins++;
    else if (my === their) draws++;
    else losses++;
  }
  return { played: h2h.length, wins, draws, losses, gf, ga, gd: gf - ga };
}

// ──── JST週末計算 ─────────────────────────────────────────────

/**
 * 現在のJST日時に基づいて「表示すべき週末」(金〜日) を返す。
 * 火曜15:00 JST を切替基準とする。ブラウザの現在時刻を用いるため、
 * 必ずクライアント（'use client'）側で呼び出すこと。
 */
export function getDisplayWeekend(): { start: string; end: string } {
  const nowUtcMs = Date.now();
  const jstMs = nowUtcMs + 9 * 60 * 60 * 1000;
  const jst = new Date(jstMs);

  const dow = jst.getUTCDay(); // 0=Sun,1=Mon,2=Tue,3=Wed,4=Thu,5=Fri,6=Sat
  const hour = jst.getUTCHours();
  const min = jst.getUTCMinutes();
  const tueCutoffPassed = dow === 2 && (hour > 15 || (hour === 15 && min >= 0));

  let fridayOffset: number;
  if (dow === 5) fridayOffset = 0; // 今日が金
  else if (dow === 6) fridayOffset = -1; // 今日が土
  else if (dow === 0) fridayOffset = -2; // 今日が日
  else if (dow === 1) fridayOffset = -3; // 月→前週金
  else if (dow === 2 && !tueCutoffPassed) fridayOffset = -4; // 火(前)→前週金
  else if (dow === 2 && tueCutoffPassed) fridayOffset = 3; // 火(後)→翌週金
  else if (dow === 3) fridayOffset = 2; // 水→翌週金
  else fridayOffset = 1; // 木→明日金

  const friday = new Date(jstMs + fridayOffset * 86400000);
  const sunday = new Date(friday.getTime() + 2 * 86400000);

  return {
    start: friday.toISOString().split('T')[0],
    end: sunday.toISOString().split('T')[0],
  };
}

function byDateTimeGid(a: Match, b: Match): number {
  return byDateTime(a, b) || (a.gid ?? 0) - (b.gid ?? 0);
}

function byDateTime(a: Match, b: Match): number {
  const ad = a.match_date ?? '';
  const bd = b.match_date ?? '';
  if (ad !== bd) return ad < bd ? -1 : 1;
  const at = a.match_time ?? '';
  const bt = b.match_time ?? '';
  if (at !== bt) return at < bt ? -1 : 1;
  return 0;
}
