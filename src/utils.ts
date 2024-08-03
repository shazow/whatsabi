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

export function bytesToHex(bytes: Uint8Array|Number, padToBytes?: number): string {
  const hex = typeof bytes === 'number' ? bytes.toString(16) : Array.prototype.map.call(bytes, function(n: number) {
    return n.toString(16).padStart(2, "0");
  }).join("");

  if (padToBytes) {
    return "0x" + hex.padStart(padToBytes * 2, "0");
  }

  return "0x" + hex;
}


import { keccak_256 } from '@noble/hashes/sha3';

export function keccak256(data: Uint8Array|string): string {
  if (typeof data !== "string") {
    return bytesToHex(keccak_256(data));
  }
  if (data.startsWith("0x")) {
    data = hexToBytes(data.slice(2));
  }
  return bytesToHex(keccak_256(data));
}


export class FetchError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function fetchJSON(url: string): Promise<any> {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) {
      throw new FetchError(response.statusText, response.status);
  }
  return response.json();
}


// Borrowed from ethers.js with minor modifications
// https://github.com/ethers-io/ethers.js/blob/32915634bef5b81c6d9998f4e9ad812ffe721954/src.ts/address/address.ts#L8
// MIT License, copyright Richard Moore
export function addressWithChecksum(address: string): string {
    const chars = address.toLowerCase().substring(2).split("");

    const expanded = new Uint8Array(40);
    for (let i = 0; i < 40; i++) {
        expanded[i] = chars[i].charCodeAt(0);
    }

    const hashed = keccak_256(expanded);
    for (let i = 0; i < 40; i += 2) {
        if ((hashed[i >> 1] >> 4) >= 8) {
            chars[i] = chars[i].toUpperCase();
        }
        if ((hashed[i >> 1] & 0x0f) >= 8) {
            chars[i + 1] = chars[i + 1].toUpperCase();
        }
    }

    return "0x" + chars.join("");
}
