import * as fs from 'fs';
import { test } from '@jest/globals';

const FIXTURES_DIR = "__fixtures__"

// Skip online tests unless ONLINE env is set
export const online_test = process.env["ONLINE"] !== undefined ? test : test.skip;
export const cached_test = process.env["CACHED"] ? test : test.skip;

export async function withCache(
  cacheKey: string,
  cacheGetter: () => Promise<any>,
): Promise<any> {
  // Check if cache exists
  const cachePath = `${FIXTURES_DIR}/${encodeURIComponent(cacheKey)}`;
  if (fs.existsSync(cachePath)) {
    const val = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
    return val;
  }

  const val = await cacheGetter();

  // Save it
  if (!fs.existsSync(FIXTURES_DIR)) {
    fs.mkdirSync(FIXTURES_DIR);
  }

  fs.writeFileSync(cachePath, JSON.stringify(val));

  return val;
}
