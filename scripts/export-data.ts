import fs from "node:fs";
import path from "node:path";
import { getSeasons, getAllMatches } from "../lib/queries";

const seasons = getSeasons();
const matches = getAllMatches();

const outDir = path.join(process.cwd(), "data");
fs.mkdirSync(outDir, { recursive: true });

const outFile = path.join(outDir, "site-data.json");
fs.writeFileSync(outFile, JSON.stringify({ seasons, matches }));

console.log(
  `Exported ${seasons.length} season(s), ${matches.length} match(es) -> data/site-data.json`,
);
