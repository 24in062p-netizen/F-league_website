"use client";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import type { Match, Season, Division } from "@/lib/types";
import {
  getCurrentSeasonId,
  getTeams,
  getTeamMatches,
  getOpponents,
  getHeadToHeadMatches,
  getHeadToHeadSummary,
} from "@/lib/compute";
import MatchCard from "@/components/MatchCard";
import TeamsFilter from "@/components/TeamsFilter";

interface Props {
  seasons: Season[];
  matches: Match[];
}

export default function TeamsClient({ seasons, matches }: Props) {
  const searchParams = useSearchParams();
  const currentSeasonId = getCurrentSeasonId(seasons);

  const seasonId = searchParams.get("season") ?? currentSeasonId;
  const div: Division = searchParams.get("div") === "F2" ? "F2" : "F1";
  const teams = useMemo(() => getTeams(matches, seasonId, div), [matches, seasonId, div]);

  // チーム：選択中シーズン/ディビジョンにいるチームのみ受け付ける
  const teamParam = searchParams.get("team") ?? "";
  const selectedTeam = teamParam && teams.includes(teamParam) ? teamParam : "";

  // 対戦相手候補：選択チームが全シーズンで実際に戦った相手（終了試合のみ）
  const opponents = useMemo(
    () => (selectedTeam ? getOpponents(matches, selectedTeam) : []),
    [matches, selectedTeam],
  );

  // 対戦相手：候補にある値のみ受け付ける
  const opponentParam = searchParams.get("opponent") ?? "";
  const selectedOpponent = opponentParam && opponents.includes(opponentParam) ? opponentParam : "";

  // 試合データ
  const isH2H = !!(selectedTeam && selectedOpponent);
  const teamMatches = useMemo(() => {
    if (isH2H) return getHeadToHeadMatches(matches, selectedTeam, selectedOpponent);
    if (selectedTeam) return getTeamMatches(matches, seasonId, selectedTeam);
    return [];
  }, [matches, isH2H, selectedTeam, selectedOpponent, seasonId]);

  const h2hSummary = useMemo(
    () => (isH2H ? getHeadToHeadSummary(matches, selectedTeam, selectedOpponent) : null),
    [matches, isH2H, selectedTeam, selectedOpponent],
  );

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold">チーム別</h1>

      <TeamsFilter
        seasons={seasons}
        teams={teams}
        opponents={opponents}
        selectedSeason={seasonId}
        selectedDiv={div}
        selectedTeam={selectedTeam}
        selectedOpponent={selectedOpponent}
      />

      {/* 通算対戦成績サマリー（H2Hモードのみ） */}
      {h2hSummary && (
        <div
          className="rounded-lg border px-4 py-3"
          style={{ background: "var(--accent-light)", borderColor: "var(--accent)" }}
        >
          <p className="text-xs font-bold text-[var(--accent)] mb-2">
            {selectedTeam} 対 {selectedOpponent} — 通算対戦成績
          </p>
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
            <span className="text-[var(--muted)]">{h2hSummary.played}試合</span>
            <span className="font-bold text-green-700">{h2hSummary.wins}勝</span>
            <span className="text-gray-500">{h2hSummary.draws}分</span>
            <span className="font-bold text-red-600">{h2hSummary.losses}敗</span>
            <span className="text-[var(--muted)]">
              得点 {h2hSummary.gf} / 失点 {h2hSummary.ga}
            </span>
            <span className="text-[var(--muted)]">
              得失点差{" "}
              <span className={h2hSummary.gd > 0 ? "text-green-700" : h2hSummary.gd < 0 ? "text-red-600" : ""}>
                {h2hSummary.gd > 0 ? `+${h2hSummary.gd}` : h2hSummary.gd}
              </span>
            </span>
          </div>
        </div>
      )}

      {/* 試合一覧 */}
      {!selectedTeam ? (
        <p className="text-sm text-[var(--muted)] py-8 text-center">チームを選択してください</p>
      ) : teamMatches.length === 0 ? (
        <p className="text-sm text-[var(--muted)] py-8 text-center">データがありません</p>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-[var(--muted)]">
            {isH2H
              ? `${selectedTeam} 対 ${selectedOpponent}（全シーズン通算 ${teamMatches.length}試合）`
              : `${selectedTeam}（${seasonId} · ${teamMatches.length}試合）`}
          </p>
          {teamMatches.map((m) => (
            <MatchCard
              key={m.id}
              match={m}
              showDate
              showSeason={isH2H}
              showMatchday={isH2H}
              perspectiveTeam={isH2H ? selectedTeam : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}
