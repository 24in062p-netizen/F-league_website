import { PHP_BASE } from './config';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

export async function fetchPhp(
  phpFile: string,
  params: Record<string, string | number>,
  referer: string,
): Promise<string> {
  const url = new URL(PHP_BASE + phpFile);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, String(v));
  }
  url.searchParams.set('_', Date.now().toString());

  const res = await fetch(url.toString(), {
    headers: {
      Referer: referer,
      'Accept-Language': 'ja,en-US;q=0.9',
      'User-Agent': USER_AGENT,
    },
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${phpFile} tid=${params.tid}`);
  }
  return res.text();
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
