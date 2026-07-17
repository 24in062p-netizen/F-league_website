import type { Match } from "@/lib/types";

const STATUS_STYLE: Record<string, string> = {
  "終了": "bg-gray-100 text-gray-600",
  "試合中": "bg-red-100 text-red-700 font-bold",
  "予定": "bg-blue-50 text-blue-700",
  "延期": "bg-yellow-100 text-yellow-700",
  "中止": "bg-red-50 text-red-500",
};

const WDL_STYLE = {
  "勝": "bg-green-100 text-green-700 font-bold",
  "分": "bg-gray-100 text-gray-600",
  "負": "bg-red-100 text-red-600",
};

function fmtDate(d: string | null) {
  if (!d) return "";
  const [, m, day] = d.split("-");
  return `${Number(m)}/${Number(day)}`;
}

function wdlOf(match: Match, teamA: string): "勝" | "分" | "負" | null {
  if (match.status !== "終了" || match.home_score === null || match.away_score === null) return null;
  const isHome = match.home_team === teamA;
  const my = isHome ? match.home_score : match.away_score;
  const their = isHome ? match.away_score : match.home_score;
  return my > their ? "勝" : my === their ? "分" : "負";
}

interface Props {
  match: Match;
  showDate?: boolean;
  showSeason?: boolean;
  showMatchday?: boolean;
  perspectiveTeam?: string;
}

export default function MatchCard({
  match,
  showDate,
  showSeason,
  showMatchday,
  perspectiveTeam,
}: Props) {
  const isFinished = match.status === "終了";
  const wdl = perspectiveTeam ? wdlOf(match, perspectiveTeam) : null;

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] px-4 py-3 shadow-sm">
      <div className="flex items-center justify-between text-xs text-[var(--muted)] mb-2">
        <span className="flex items-center gap-1.5 flex-wrap">
          {showSeason && (
            <span className="font-medium text-[var(--accent)]">{match.season_id}</span>
          )}
          {showMatchday && (
            <span>第{match.matchday}節</span>
          )}
          {showDate && match.match_date && (
            <span>{fmtDate(match.match_date)}</span>
          )}
          {match.match_time
            ? <span>{match.match_time}</span>
            : !isFinished && <span className="text-gray-400">時間未定</span>
          }
          {match.venue
            ? <span className="text-gray-400">· {match.venue}</span>
            : !isFinished && <span className="text-gray-400">会場未定</span>
          }
        </span>
        <span className="flex items-center gap-1 flex-shrink-0">
          {wdl && (
            <span className={`px-2 py-0.5 rounded-full text-xs ${WDL_STYLE[wdl]}`}>
              {wdl}
            </span>
          )}
          <span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_STYLE[match.status] ?? "bg-gray-100 text-gray-600"}`}>
            {match.status}
          </span>
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="flex-1 text-right font-medium text-sm leading-tight">{match.home_team}</span>
        <span className="w-20 text-center font-bold text-lg tabular-nums">
          {isFinished ? `${match.home_score} - ${match.away_score}` : "vs"}
        </span>
        <span className="flex-1 text-left font-medium text-sm leading-tight">{match.away_team}</span>
      </div>
    </div>
  );
}
