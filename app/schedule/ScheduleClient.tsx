"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import type { Match, Season, Division } from "@/lib/types";
import { getCurrentSeasonId, getMatchdays, getMatchesByMatchday } from "@/lib/compute";
import MatchCard from "@/components/MatchCard";

interface Props {
  seasons: Season[];
  matches: Match[];
}

export default function ScheduleClient({ seasons, matches }: Props) {
  const searchParams = useSearchParams();
  const currentSeasonId = getCurrentSeasonId(seasons);

  const seasonId = searchParams.get("season") ?? currentSeasonId;
  const div: Division = searchParams.get("div") === "F2" ? "F2" : "F1";

  const matchdays = useMemo(
    () => getMatchdays(matches, seasonId, div),
    [matches, seasonId, div],
  );
  const lastFinished = [...matchdays].reverse().find((m) => m.finished > 0);
  const defaultMatchday = lastFinished?.matchday ?? matchdays[0]?.matchday ?? 1;
  const matchday = Number(searchParams.get("matchday") ?? defaultMatchday);

  const dayMatches = useMemo(
    () => getMatchesByMatchday(matches, seasonId, div, matchday),
    [matches, seasonId, div, matchday],
  );

  function linkFor(p: Record<string, string | number>) {
    const q = new URLSearchParams({
      season: seasonId,
      div,
      matchday: String(matchday),
      ...Object.fromEntries(Object.entries(p).map(([k, v]) => [k, String(v)])),
    });
    return `/schedule/?${q}`;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-lg font-bold flex-none">日程・結果</h1>
        <div className="flex gap-1 flex-wrap">
          {seasons.map((s) => (
            <Link
              key={s.id}
              href={linkFor({ season: s.id, matchday: 1 })}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                s.id === seasonId
                  ? "bg-[var(--accent)] text-white border-[var(--accent)]"
                  : "border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)]"
              }`}
            >
              {s.label}
            </Link>
          ))}
        </div>
      </div>

      {/* F1/F2 toggle */}
      <div className="flex gap-2">
        {(["F1", "F2"] as Division[]).map((d) => (
          <Link
            key={d}
            href={linkFor({ div: d, matchday: 1 })}
            className={`px-4 py-1.5 rounded text-sm font-bold transition-colors ${
              d === div
                ? d === "F1"
                  ? "bg-[var(--f1-color)] text-white"
                  : "bg-[var(--f2-color)] text-white"
                : "bg-gray-100 text-[var(--muted)] hover:bg-gray-200"
            }`}
          >
            {d}
          </Link>
        ))}
      </div>

      {/* Matchday selector */}
      {matchdays.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {matchdays.map((md) => (
            <Link
              key={md.matchday}
              href={linkFor({ matchday: md.matchday })}
              className={`w-9 h-9 flex items-center justify-center rounded text-sm font-medium transition-colors ${
                md.matchday === matchday
                  ? "bg-[var(--accent)] text-white"
                  : md.finished === md.count && md.count > 0
                  ? "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              {md.matchday}
            </Link>
          ))}
        </div>
      )}

      {/* Matches */}
      {dayMatches.length === 0 ? (
        <p className="text-sm text-[var(--muted)] py-8 text-center">試合データがありません</p>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-[var(--muted)]">第{matchday}節</p>
          {dayMatches.map((m) => (
            <MatchCard key={m.id} match={m} showDate />
          ))}
        </div>
      )}
    </div>
  );
}
