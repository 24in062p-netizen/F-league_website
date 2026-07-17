import { Suspense } from "react";
import siteData from "@/data/site-data.json";
import type { Match, Season } from "@/lib/types";
import StandingsClient from "./StandingsClient";

export default function StandingsPage() {
  return (
    <Suspense fallback={null}>
      <StandingsClient seasons={siteData.seasons as Season[]} matches={siteData.matches as Match[]} />
    </Suspense>
  );
}
