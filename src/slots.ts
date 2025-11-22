import { keccak256 } from "./utils.js";
import type { StorageProvider } from "./providers.js";
import { StorageReadError } from "./errors.js";


export function joinSlot(parts: string[]): string {
    return keccak256("0x" + parts.map(s => {
        if (s.startsWith("0x")) {
            s = s.slice(2);
        }
        return s.padStart(64, "0");
    }).join(""))
}

export function addSlotOffset(slot: string, offset: number): string {
    return "0x" + (BigInt(slot) + BigInt(offset)).toString(16);
}

/**
 * Read an array at some slot
 * @param {StorageProvider} provider - Implementation of a provider that can call getStorageAt
 * @param {string} address - Address of the contract storage namespace
 * @param {number|string} pos - Slot position of the array
 * @param {number=32} width - Array item size, in bytes
 * @param {number=0} limit - Array size limit, throw error if exceeded
 * @returns {Promise<string[]>} Values of the array at the given slot
 */
export async function readArray(provider: StorageProvider, address: string, pos: number|string, width: number=32, limit: number=0): Promise<string[]> {
    // Based on https://gist.github.com/banteg/0cee21909f7c1baedfa6c3d96ffe94f2
    const num = Number(await provider.getStorageAt(address, pos));
    if (limit !== 0 && num > limit) {
        throw new StorageReadError(`readArray aborted: Array size ${num} exceeds limit of ${limit}`, { context: { address, pos, width, limit } });
    }
    const start = keccak256(pos.toString(16)); // toString(16) does the right thing on strings too (no-op) (:
    const itemsPerWord = Math.floor(32 / width);

    const promises : Promise<string>[] = [];
    for (let i=0; i<num; i++) {
        const itemSlot = addSlotOffset(start, Math.floor(i / itemsPerWord));
        promises.push(provider.getStorageAt(address, itemSlot));
    }

    const words : string[] = await Promise.all(promises);

    return words.map((wordHex: string, i: number) => {
        // TODO: Extract multiple words if they fit in a slot?
        const itemOffset = 2 + 64 - (i % itemsPerWord + 1) * width * 2; // 0x + 2 hex per byte
        return wordHex.slice(itemOffset, itemOffset + width * 2);
    });
}
