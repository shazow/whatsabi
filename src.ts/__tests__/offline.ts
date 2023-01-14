import * as fs from 'fs';

const CACHE_DIR = process.env["CACHE_DIR"] || ".cache";

export async function withCache(
  cacheKey: string,
  cacheGetter: () => Promise<any>,
): Promise<any> {
  // Check if cache exists
  const cachePath = `${CACHE_DIR}/${encodeURIComponent(cacheKey)}`;
  if (fs.existsSync(cachePath)) {
    console.debug("withCache: Using cached value:", cachePath);
    const val = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
    return val;
  }

  const val = await cacheGetter();
  if (val === undefined) throw "withCache: undefined value from cacheGetter";

  // Save it
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR);
  }

  console.debug("withCache: Saving test cache:", cachePath);
  fs.writeFileSync(cachePath, JSON.stringify(val));

  return val;
}
