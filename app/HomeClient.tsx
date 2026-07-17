"use client";
import { useEffect, useState } from "react";
import type { Match, Season } from "@/lib/types";
import { getCurrentSeasonId, getDisplayWeekend, getWeekendMatches, getNearestWeekend } from "@/lib/compute";
import MatchCard from "@/components/MatchCard";

function weekendLabel(start: string, end: string) {
  const fmt = (d: string) => {
    const [, m, day] = d.split("-");
    return `${Number(m)}/${Number(day)}`;
  };
  return `${fmt(start)}（金）〜 ${fmt(end)}（日）`;
}

interface Props {
  seasons: Season[];
  matches: Match[];
}

interface DisplayState {
  f1: Match[];
  f2: Match[];
  weekend: { start: string; end: string };
  isFallback: boolean;
}

export default function HomeClient({ seasons, matches }: Props) {
  const [state, setState] = useState<DisplayState | null>(null);

  useEffect(() => {
    const seasonId = getCurrentSeasonId(seasons);
    if (!seasonId) {
      setState({ f1: [], f2: [], weekend: { start: "", end: "" }, isFallback: false });
      return;
    }

    const display = getDisplayWeekend();
    let { f1, f2 } = getWeekendMatches(matches, seasonId, display.start, display.end);
    let weekend = display;
    let isFallback = false;

    if (f1.length === 0 && f2.length === 0) {
      const nearest = getNearestWeekend(matches, seasonId);
      if (nearest) {
        const fallback = getWeekendMatches(matches, seasonId, nearest.start, nearest.end);
        f1 = fallback.f1;
        f2 = fallback.f2;
        weekend = nearest;
        isFallback = true;
      }
    }

    setState({ f1, f2, weekend, isFallback });
  }, [seasons, matches]);

  if (!state) {
    return <p className="text-sm text-[var(--muted)] py-8 text-center">読み込み中...</p>;
  }

  const { f1, f2, weekend, isFallback } = state;
  const hasAny = f1.length > 0 || f2.length > 0;

  return (
    <div className="space-y-5">
      <div className="flex items-baseline gap-2">
        <h1 className="text-lg font-bold">直近の試合</h1>
        <span className="text-sm text-[var(--muted)]">{weekendLabel(weekend.start, weekend.end)}</span>
        {isFallback && (
          <span className="text-xs text-[var(--muted)]">（直近）</span>
        )}
      </div>

      {!hasAny && (
        <p className="text-sm text-[var(--muted)] py-8 text-center">この週末の試合はありません</p>
      )}

      {f1.length > 0 && (
        <section>
          <h2 className="flex items-center gap-2 text-sm font-bold mb-2">
            <span className="w-8 h-1 rounded" style={{ background: "var(--f1-color)" }} />
            <span style={{ color: "var(--f1-color)" }}>F1 ディビジョン</span>
          </h2>
          <div className="space-y-2">
            {f1.map((m) => (
              <MatchCard key={m.id} match={m} showDate />
            ))}
          </div>
        </section>
      )}

      {f2.length > 0 && (
        <section>
          <h2 className="flex items-center gap-2 text-sm font-bold mb-2">
            <span className="w-8 h-1 rounded" style={{ background: "var(--f2-color)" }} />
            <span style={{ color: "var(--f2-color)" }}>F2 ディビジョン</span>
          </h2>
          <div className="space-y-2">
            {f2.map((m) => (
              <MatchCard key={m.id} match={m} showDate />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
