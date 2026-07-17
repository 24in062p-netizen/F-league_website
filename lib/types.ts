export type Division = 'F1' | 'F2';

export interface Season {
  id: string;
  label: string;
  is_current: number;
}

export interface Match {
  id: number;
  gid: number | null;
  season_id: string;
  division: Division;
  matchday: number;
  match_date: string | null;
  match_time: string | null;
  venue: string | null;
  home_team: string;
  away_team: string;
  home_score: number | null;
  away_score: number | null;
  status: '予定' | '試合中' | '終了' | '延期' | '中止';
  last_fetched: string;
}

export interface StandingRow {
  team: string;
  played: number;
  pts: number;
  wins: number;
  draws: number;
  losses: number;
  gf: number;
  ga: number;
  gd: number;
}

export interface HeadToHeadSummary {
  played: number;
  wins: number;
  draws: number;
  losses: number;
  gf: number;
  ga: number;
  gd: number;
}

export interface SiteData {
  seasons: Season[];
  matches: Match[];
}
