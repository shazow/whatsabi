// Convert 32 bytes of hex to Uint8Array, undefined for other sizes
//
// Borrowed from:
// https://chat.openai.com/share/ae1e8813-ac3d-4262-89c7-14c462febb34
export function hexToBytes(hex: string): Uint8Array {
  if (hex.startsWith("0x")) {
    hex = hex.slice(2);
  }

  const length = hex.length;
  if (length % 2 !== 0) {
    throw new Error('hexToBytes: odd input length, must be even: ' + hex);
  }

  const r = new Uint8Array(length / 2);

  for (let i = 0; i < length; i += 2) {
    const highNibble = parseInt(hex[i], 16);
    const lowNibble = parseInt(hex[i + 1], 16);
    r[i / 2] = (highNibble << 4) | lowNibble;
  }

  return r;
}

export function bytesToHex(bytes: Uint8Array | Number | bigint, padToBytes?: number): string {
  const hex = (typeof bytes === 'number' || typeof bytes === 'bigint') ? bytes.toString(16) : Array.prototype.map.call(bytes, function(n: number) {
    return n.toString(16).padStart(2, "0");
  }).join("");

  if (padToBytes) {
    return "0x" + hex.padStart(padToBytes * 2, "0");
  }

  return "0x" + hex;
}


export class FetchError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

// HTTP 429 retries. Honor Retry-After when it is a small delay (0-10s);
// otherwise wait attempt seconds (1s, 2s, 3s). A missing header is not 0:
// Number(null) === 0, which would retry immediately.
const RATE_LIMIT_RETRIES = 3;
const MAX_RETRY_AFTER_SECONDS = 10;

function rateLimitDelayMs(retryAfter: string | null, attempt: number): number {
  if (retryAfter != null && retryAfter.trim() !== "") {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds) && seconds >= 0 && seconds <= MAX_RETRY_AFTER_SECONDS) {
      return seconds * 1000;
    }
  }
  return attempt * 1000;
}

export async function fetchWithRetry(url: string, init?: RequestInit): Promise<Response> {
  let response = await fetch(url, init);
  for (let attempt = 1; response.status === 429 && attempt <= RATE_LIMIT_RETRIES; attempt++) {
    const delayMs = rateLimitDelayMs(response.headers.get("retry-after"), attempt);
    await new Promise(resolve => setTimeout(resolve, delayMs));
    response = await fetch(url, init);
  }
  return response;
}

export async function fetchJSON(url: string): Promise<any> {
  const response = await fetchWithRetry(url, {
    headers: {
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) {
    throw new FetchError(response.statusText, response.status);
  }
  return response.json();
}
