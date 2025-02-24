import * as AbiItem from 'ox/AbiItem';
import * as AbiFunction from 'ox/AbiFunction';

import { disasm } from "./disasm.js";

// Load function selectors mapping from ABI, parsed using oxlib
// Mapping is selector hash to signature
export function selectorsFromABI(abi: any[]): {[key: string]: string} {
    const r: {[key: string]: string} = {};

    for (const el of abi) {
        if (typeof(el) !== "string" && el.type !== "function") continue;
        const f = AbiItem.getSignature(el);
        const selector = AbiFunction.getSelector(el)
        r[selector] = f;
    }

    return r;
}

// Load function selectors from EVM bytecode by parsing JUMPI instructions
export function selectorsFromBytecode(code: string): string[] {
    const p = disasm(code, { onlyJumpTable: true });
    return Object.keys(p.selectors);
}
