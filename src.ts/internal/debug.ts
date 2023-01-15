import { ethers } from "ethers";

import { mnemonics, OpCode, isPush }  from "../opcodes";
import { BytecodeIter } from "../disasm";

// Debug helper:

const hexpads = "0x0000";

export function BytecodeIterString(code : BytecodeIter): string {
    const step = code.step();
    const pos = code.pos();
    let hexpos = ethers.utils.hexlify(pos);
    if (hexpos.length < hexpads.length) hexpos = hexpads.slice(0, hexpos.length - hexpads.length) + hexpos.slice(2);
    const inst = code.at(pos);
    const value = isPush(inst) ? ethers.utils.hexlify(code.valueAt(pos)) : "";
    const name = mnemonics[inst] || ethers.utils.hexlify(inst);

    return `${String(step).padStart(6, " ")}\t${hexpos}\t${name}\t${value}`
}

export type bytecodeToStringConfig = {
    startPos?: number,
    stopPos?: number,
    highlightPos?: number,
    opcodeLookup?: { [key: OpCode]: string },
};

export function* bytecodeToString(
    bytecode: string, 
    config?: bytecodeToStringConfig,
) {
    const code = new BytecodeIter(bytecode);

    if (config === undefined) config = {};
    let { startPos, stopPos, highlightPos, opcodeLookup } = config;
    if (!opcodeLookup) opcodeLookup = mnemonics;

    while (code.hasMore()) {
        code.next();
        const pos = code.pos();

        if (startPos && pos < startPos) continue;
        if (stopPos && pos > stopPos) break;

        const highlight = (highlightPos === pos) ? " <--" : "";
        const line = BytecodeIterString(code) + highlight;
        const done : boolean = yield line;
        if (done) break;
    }
}
