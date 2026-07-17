import * as cheerio from 'cheerio';

export interface ParsedMatch {
  matchday: number;
  date: string | null;    // YYYY-MM-DD
  time: string | null;    // HH:MM
  venue: string | null;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  status: '予定' | '終了';
  gid: number | null;
}

/**
 * 節別スケジュールHTML（FlGameSchedule_*.php の返り値）をパース。
 * 現シーズン・アーカイブ両方に対応。
 */
export function parseScheduleHtml(html: string): ParsedMatch[] {
  const $ = cheerio.load(html);
  const matches: ParsedMatch[] = [];
  let currentDate: string | null = null;
  let currentMatchday: number | null = null;

  // アーカイブページでは「2節」のような現在節の表示が .term にある
  // h3.tit が日付、直後の .sbox が試合

  $('h3.tit, .sbox').each((_, el) => {
    const tagName = ($(el).prop('tagName') as string).toLowerCase();

    if (tagName === 'h3') {
      // 日付ヘッダー: "2026.05.30（土）" or "2026.05.30"
      const raw = $(el).text().trim();
      // YYYY.MM.DD → YYYY-MM-DD
      const m = raw.match(/(\d{4})\.(\d{2})\.(\d{2})/);
      currentDate = m ? `${m[1]}-${m[2]}-${m[3]}` : null;
    } else {
      // 試合ブロック
      const termText = $(el).find('p.term').text().trim();   // "1節" or "1"
      const matchdayNum = parseInt(termText.replace(/節|第/g, ''));
      if (!isNaN(matchdayNum)) currentMatchday = matchdayNum;

      const timeText = $(el).find('p.time').text().trim();
      // "19:00" 以外に "時間未定" なども来る
      const timeMatch = timeText.match(/(\d{1,2}):(\d{2})/);
      const time = timeMatch
        ? `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`
        : null;

      const homeTeam = $(el).find('dd.teamLeft span.pc').text().trim();
      const awayTeam = $(el).find('dd.teamRight span.pc').text().trim();

      if (!homeTeam || !awayTeam) return;

      // venue: p.venue.sp に会場フルネーム、なければ p.venue.pc（略称）
      const venueText =
        $(el).find('p.venue.sp').text().trim() ||
        $(el).find('p.venue.pc').text().trim() ||
        null;
      const venue = venueText || null;

      const vsAnchor = $(el).find('dt.vs a');
      const vsText = vsAnchor.length ? vsAnchor.text().trim() : $(el).find('dt.vs').text().trim();
      const gidHref = vsAnchor.attr('href') ?? '';
      const gidMatch = gidHref.match(/gid=(\d+)/);
      const gid = gidMatch ? parseInt(gidMatch[1]) : null;

      // "4 - 3" or "4 × 3" (アーカイブは ×)
      const scoreMatch = vsText.match(/(\d+)\s*[×\-－]\s*(\d+)/);
      const homeScore = scoreMatch ? parseInt(scoreMatch[1]) : null;
      const awayScore = scoreMatch ? parseInt(scoreMatch[2]) : null;
      const status: '予定' | '終了' = scoreMatch ? '終了' : '予定';

      matches.push({
        matchday: currentMatchday ?? 0,
        date: currentDate,
        time,
        venue,
        homeTeam,
        awayTeam,
        homeScore,
        awayScore,
        status,
        gid,
      });
    }
  });

  return matches;
}

/**
 * 節ナビゲーションから利用可能な節番号一覧を取得（現シーズンのみ）。
 * アーカイブではnav無しのため空配列が返る → 外部で走査。
 */
export function parseAvailableMatchdays(html: string): number[] {
  const $ = cheerio.load(html);
  const result: number[] = [];
  $('nav ul.setsu li a').each((_, el) => {
    const t = $(el).text().trim();
    if (/^\d+$/.test(t)) result.push(parseInt(t));
  });
  return result;
}

export interface StandingRow {
  rank: number;
  teamName: string;
  pts: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  gf: number;
  ga: number;
  gd: number;
}

/**
 * 順位表HTML（FlStandings_2018.php / FlStandingsArchive_new.php）をパース。
 *
 * 列構成（td インデックス）:
 *   0: 順位, 1: teamLogo(img), 2: team pc(name), 3: team sp(short),
 *   4: 勝点, 5: 試合数, 6: 勝, 7: 分, 8: 負, 9: 得点, 10: 失点, 11: 得失点差
 */
export function parseStandingsHtml(html: string): StandingRow[] {
  const $ = cheerio.load(html);
  const rows: StandingRow[] = [];

  $('table.table01 tr').each((i, tr) => {
    if (i === 0) return; // ヘッダースキップ
    const tds = $(tr).find('td');
    if (tds.length < 10) return;

    const rank = parseInt($(tds[0]).text().trim());
    const teamName =
      $(tds[2]).text().trim() || $(tds[1]).text().trim();
    const pts = parseInt($(tds[4]).text().trim()) || 0;
    const played = parseInt($(tds[5]).text().trim()) || 0;
    const wins = parseInt($(tds[6]).text().trim()) || 0;
    const draws = parseInt($(tds[7]).text().trim()) || 0;
    const losses = parseInt($(tds[8]).text().trim()) || 0;
    const gf = parseInt($(tds[9]).text().trim()) || 0;
    const ga = parseInt($(tds[10]).text().trim()) || 0;
    const gdText = $(tds[11])?.text().trim();
    const gd = gdText !== undefined ? parseInt(gdText) || gf - ga : gf - ga;

    if (teamName && !isNaN(rank)) {
      rows.push({ rank, teamName, pts, played, wins, draws, losses, gf, ga, gd });
    }
  });

  return rows;
}
