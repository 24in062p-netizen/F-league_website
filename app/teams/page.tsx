import { Suspense } from "react";
import siteData from "@/data/site-data.json";
import type { Match, Season } from "@/lib/types";
import TeamsClient from "./TeamsClient";

export default function TeamsPage() {
  return (
    <Suspense fallback={null}>
      <TeamsClient seasons={siteData.seasons as Season[]} matches={siteData.matches as Match[]} />
    </Suspense>
  );
}
