export type Division = 'F1' | 'F2';

export interface DivisionConfig {
  tid: number;
  schedulePhp: string;          // 節別スケジュールPHP
  standingsPhp: string;
  refererSchedule: string;
  refererStandings: string;
  maxMatchdays: number;         // 最大節数（超えたら空なので打ち切り）
}

export interface SeasonConfig {
  id: string;                   // '2026-27'
  label: string;
  isCurrent: boolean;
  divisions: Record<Division, DivisionConfig>;
}

export const SEASONS: SeasonConfig[] = [
  {
    id: '2026-27',
    label: 'Fリーグ2026-27',
    isCurrent: true,
    divisions: {
      F1: {
        tid: 5214,
        schedulePhp: 'FlGameSchedule_2026_div1.php',
        standingsPhp: 'FlStandings_2018.php',
        refererSchedule: 'https://www.fleague.jp/score/score.html',
        refererStandings: 'https://www.fleague.jp/score/teamrank.html',
        maxMatchdays: 30,
      },
      F2: {
        tid: 5215,
        schedulePhp: 'FlGameSchedule_2026_div2.php',
        standingsPhp: 'FlStandings_2018.php',
        refererSchedule: 'https://www.fleague.jp/score2/score.html',
        refererStandings: 'https://www.fleague.jp/score2/teamrank.html',
        maxMatchdays: 25,
      },
    },
  },
  {
    id: '2025-26',
    label: 'Fリーグ2025-26',
    isCurrent: false,
    divisions: {
      F1: {
        tid: 4780,
        schedulePhp: 'FlGameScheduleArchive_2025.php',
        standingsPhp: 'FlStandingsArchive_new.php',
        refererSchedule: 'https://www.fleague.jp/records/score/2025/score.html',
        refererStandings: 'https://www.fleague.jp/records/score/2025/teamrank.html',
        maxMatchdays: 30,
      },
      F2: {
        tid: 4781,
        schedulePhp: 'FlGameScheduleArchive_2025.php',
        standingsPhp: 'FlStandingsArchive_new.php',
        refererSchedule: 'https://www.fleague.jp/records2/score/2025/score.html',
        refererStandings: 'https://www.fleague.jp/records2/score/2025/teamrank.html',
        maxMatchdays: 25,
      },
    },
  },
];

export const PHP_BASE = 'https://www.fleague.jp/modules/php/';
