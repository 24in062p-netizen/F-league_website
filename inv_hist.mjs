/**
 * 調査1: records/score/ と records2/score/ ページのHTML・JS参照を確認
 * 現行アーカイブ形式（FlGameScheduleArchive_YYYY.php）が過去年でも使えるか試す
 */
const BASE_PHP = 'https://www.fleague.jp/modules/php/';

// ── 1. records/score/ のHTMLからphp参照を探す ──────────────
async function checkRecordsPage(url) {
  const r = await fetch(url, { headers: { 'Accept-Language': 'ja,en' } });
  const html = await r.text();

  // php ファイル名を抽出
  const phpRefs = [...html.matchAll(/modules\/php\/([^'"?\s]+\.php)/g)]
    .map(m => m[1]);
  const uniquePhp = [...new Set(phpRefs)];

  // セレクトボックスや年度参照を探す
  const yearRefs = [...html.matchAll(/20\d\d/g)].map(m => m[0]);
  const uniqueYears = [...new Set(yearRefs)].sort();

  // tid を探す
  const tids = [...html.matchAll(/tid[=:]\s*(\d+)/g)].map(m => m[1]);

  console.log(`\n=== ${url} ===`);
  console.log('PHP refs:', uniquePhp);
  console.log('Years:', uniqueYears);
  console.log('TIDs:', [...new Set(tids)]);
  console.log('HTML snippet (first 1000):', html.slice(0, 1000).replace(/\n/g,' '));
}

await checkRecordsPage('https://www.fleague.jp/records/score/');
await checkRecordsPage('https://www.fleague.jp/records2/score/');
