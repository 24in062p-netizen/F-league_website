import { Suspense } from "react";
import siteData from "@/data/site-data.json";
import type { Match, Season } from "@/lib/types";
import ScheduleClient from "./ScheduleClient";

export default function SchedulePage() {
  return (
    <Suspense fallback={null}>
      <ScheduleClient seasons={siteData.seasons as Season[]} matches={siteData.matches as Match[]} />
    </Suspense>
  );
}
