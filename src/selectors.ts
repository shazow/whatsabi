import { FunctionFragment } from "@ethersproject/abi";

import { keccak256 } from "./utils";
import { abiFromBytecode } from "./disasm";

// Load function selectors mapping from ABI, parsed using ethers.js
// Mapping is selector hash to signature
export function selectorsFromABI(abi: any[]): {[key: string]: string} {
    const r: {[key: string]: string} = {};

    for (const el of abi) {
      if (typeof(el) !== "string" && el.type !== "function") continue;
      const f = FunctionFragment.from(el).format();
      r[keccak256(f).substring(0, 10)] = f;
    }

    return r;
}

// Load function selectors from EVM bytecode by parsing JUMPI instructions
export function selectorsFromBytecode(code: string): string[] {
    const abi = abiFromBytecode(code);
    if (abi.length === 0) return [];

    let selectors:string[] = [];
    for (const a of abi) {
        if (a.type !== "function") continue;
        selectors.push(a.selector);
    }
    return selectors;
}
