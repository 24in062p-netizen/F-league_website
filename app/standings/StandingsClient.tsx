"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import type { Match, Season, Division } from "@/lib/types";
import { getCurrentSeasonId, getStandings } from "@/lib/compute";

interface Props {
  seasons: Season[];
  matches: Match[];
}

export default function StandingsClient({ seasons, matches }: Props) {
  const searchParams = useSearchParams();
  const currentSeasonId = getCurrentSeasonId(seasons);

  const seasonId = searchParams.get("season") ?? currentSeasonId;
  const div: Division = searchParams.get("div") === "F2" ? "F2" : "F1";

  const rows = useMemo(() => getStandings(matches, seasonId, div), [matches, seasonId, div]);

  function linkFor(p: Record<string, string>) {
    const q = new URLSearchParams({ season: seasonId, div, ...p });
    return `/standings/?${q}`;
  }

  const divColor = div === "F1" ? "var(--f1-color)" : "var(--f2-color)";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-lg font-bold flex-none">順位表</h1>
        <div className="flex gap-1 flex-wrap">
          {seasons.map((s) => (
            <Link
              key={s.id}
              href={linkFor({ season: s.id })}
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
            href={linkFor({ div: d })}
            className={`px-4 py-1.5 rounded text-sm font-bold transition-colors ${
              d === div
                ? "text-white"
                : "bg-gray-100 text-[var(--muted)] hover:bg-gray-200"
            }`}
            style={d === div ? { background: divColor } : {}}
          >
            {d}
          </Link>
        ))}
      </div>

      {/* Standings table */}
      {rows.length === 0 ? (
        <p className="text-sm text-[var(--muted)] py-8 text-center">データがありません</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--card-bg)] shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-xs text-[var(--muted)]">
                <th className="py-2 px-2 text-center w-8">#</th>
                <th className="py-2 px-2 text-left">チーム</th>
                <th className="py-2 px-2 text-center font-bold" style={{ color: divColor }}>勝点</th>
                <th className="py-2 px-2 text-center">試合</th>
                <th className="py-2 px-2 text-center">勝</th>
                <th className="py-2 px-2 text-center">分</th>
                <th className="py-2 px-2 text-center">負</th>
                <th className="py-2 px-2 text-center">得点</th>
                <th className="py-2 px-2 text-center">失点</th>
                <th className="py-2 px-2 text-center">得失</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={row.team}
                  className={`border-b border-[var(--border)] last:border-0 ${
                    i % 2 === 0 ? "" : "bg-gray-50"
                  }`}
                >
                  <td className="py-2 px-2 text-center text-[var(--muted)]">{i + 1}</td>
                  <td className="py-2 px-2 font-medium">{row.team}</td>
                  <td className="py-2 px-2 text-center font-bold tabular-nums" style={{ color: divColor }}>
                    {row.pts}
                  </td>
                  <td className="py-2 px-2 text-center tabular-nums text-[var(--muted)]">{row.played}</td>
                  <td className="py-2 px-2 text-center tabular-nums">{row.wins}</td>
                  <td className="py-2 px-2 text-center tabular-nums">{row.draws}</td>
                  <td className="py-2 px-2 text-center tabular-nums">{row.losses}</td>
                  <td className="py-2 px-2 text-center tabular-nums">{row.gf}</td>
                  <td className="py-2 px-2 text-center tabular-nums">{row.ga}</td>
                  <td className="py-2 px-2 text-center tabular-nums text-[var(--muted)]">
                    {row.gd > 0 ? `+${row.gd}` : row.gd}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
