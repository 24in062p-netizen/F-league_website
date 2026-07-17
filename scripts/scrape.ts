#!/usr/bin/env tsx
/**
 * スクレイパー CLI
 *   npm run scrape        # 現シーズンのみ更新
 *   npm run scrape:init   # 全シーズン（2025-26 + 2026-27）フル取り込み
 */
import { runImport } from '../scraper/importer';

const isInit = process.argv.includes('--init');

console.log(`Fリーグ スクレイパー (${isInit ? '初回フル取り込み' : '現シーズン更新'})`);
console.log('開始:', new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }));

runImport({ init: isInit, onProgress: console.log })
  .then(() => {
    console.log('終了:', new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }));
    process.exit(0);
  })
  .catch((e) => {
    console.error('エラー:', e);
    process.exit(1);
  });
