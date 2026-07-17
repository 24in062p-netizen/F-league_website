"use client";
import { useRouter } from "next/navigation";
import type { Division, Season } from "@/lib/types";

interface Props {
  seasons: Season[];
  teams: string[];
  opponents: string[];
  selectedSeason: string;
  selectedDiv: Division;
  selectedTeam: string;
  selectedOpponent: string;
}

export default function TeamsFilter({
  seasons,
  teams,
  opponents,
  selectedSeason,
  selectedDiv,
  selectedTeam,
  selectedOpponent,
}: Props) {
  const router = useRouter();
  const hasOpponent = !!selectedOpponent;
  const divColor = selectedDiv === "F1" ? "var(--f1-color)" : "var(--f2-color)";

  function go(updates: Record<string, string>) {
    const base: Record<string, string> = {
      season: selectedSeason,
      div: selectedDiv,
      team: selectedTeam,
      opponent: selectedOpponent,
    };
    const merged = { ...base, ...updates };
    const q = new URLSearchParams();
    if (merged.season) q.set("season", merged.season);
    if (merged.div) q.set("div", merged.div);
    if (merged.team) q.set("team", merged.team);
    if (merged.opponent) q.set("opponent", merged.opponent);
    router.push(`/teams/?${q}`);
  }

  return (
    <div className="space-y-3">
      {/* シーズン */}
      <div className="flex flex-wrap items-center gap-1.5">
        {seasons.map((s) => (
          <button
            key={s.id}
            disabled={hasOpponent}
            onClick={() => go({ season: s.id, team: "", opponent: "" })}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors
              ${hasOpponent
                ? "opacity-40 cursor-not-allowed border-[var(--border)] text-[var(--muted)]"
                : s.id === selectedSeason
                ? "bg-[var(--accent)] text-white border-[var(--accent)]"
                : "border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)]"
              }`}
          >
            {s.label}
          </button>
        ))}
        {hasOpponent && (
          <span className="text-xs text-[var(--muted)] italic">全シーズン通算</span>
        )}
      </div>

      {/* F1 / F2 */}
      <div className="flex gap-2">
        {(["F1", "F2"] as Division[]).map((d) => (
          <button
            key={d}
            disabled={hasOpponent}
            onClick={() => !hasOpponent && go({ div: d, team: "", opponent: "" })}
            className={`px-4 py-1.5 rounded text-sm font-bold transition-colors
              ${hasOpponent
                ? "opacity-40 cursor-not-allowed"
                : d !== selectedDiv
                ? "bg-gray-100 text-[var(--muted)] hover:bg-gray-200"
                : ""
              }`}
            style={
              d === selectedDiv && !hasOpponent
                ? { background: divColor, color: "white" }
                : d === selectedDiv && hasOpponent
                ? { background: divColor, color: "white", opacity: 0.4 }
                : {}
            }
          >
            {d}
          </button>
        ))}
      </div>

      {/* チーム選択プルダウン */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-[var(--muted)]">チーム</label>
        <select
          value={selectedTeam}
          onChange={(e) => go({ team: e.target.value, opponent: "" })}
          className="border border-[var(--border)] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
        >
          <option value="">チームを選択してください</option>
          {teams.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {/* 対戦相手プルダウン */}
      <div className="flex flex-col gap-1">
        <label className={`text-xs font-medium ${!selectedTeam ? "text-gray-300" : "text-[var(--muted)]"}`}>
          対戦相手
        </label>
        <select
          value={selectedOpponent}
          disabled={!selectedTeam}
          onChange={(e) => go({ opponent: e.target.value })}
          className={`border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--accent)]
            ${!selectedTeam
              ? "border-gray-200 text-gray-300 cursor-not-allowed"
              : "border-[var(--border)]"
            }`}
        >
          <option value="">すべて（絞り込みなし）</option>
          {opponents.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
