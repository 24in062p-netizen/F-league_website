import siteData from "@/data/site-data.json";
import type { Match, Season } from "@/lib/types";
import HomeClient from "./HomeClient";

export default function HomePage() {
  return <HomeClient seasons={siteData.seasons as Season[]} matches={siteData.matches as Match[]} />;
}
