import { mnemonics, isPush }  from "../opcodes.js";
import type { OpCode }  from "../opcodes.js";
import { BytecodeIter } from "../disasm.js";
import { bytesToHex } from "../utils.js";

// Debug helper:

const hexpads = "0x0000";

export function BytecodeIterString(code : BytecodeIter): string {
    const step = code.step();
    const pos = code.pos();
    let hexpos = bytesToHex(pos);
    if (hexpos.length < hexpads.length) hexpos = hexpads.slice(0, hexpos.length - hexpads.length) + hexpos.slice(2);
    const inst = code.at(pos);
    const value = isPush(inst) ? bytesToHex(code.valueAt(pos)) : "";
    const name = mnemonics[inst] || bytesToHex(inst);

    return `${String(step).padStart(6, " ")}\t${hexpos}\t${name}\t${value}`
}

export type bytecodeToStringConfig = {
    startPos?: number,
    stopPos?: number,
    highlightPos?: number,
    boundaryPos?: number,
    opcodeLookup?: { [key: OpCode]: string },
};

export function* bytecodeToString(
    bytecode: string, 
    config?: bytecodeToStringConfig,
) {
    const code = new BytecodeIter(bytecode);

    if (config === undefined) config = {};
    let { startPos, stopPos, highlightPos, boundaryPos, opcodeLookup } = config;
    if (!opcodeLookup) opcodeLookup = mnemonics;

    while (code.hasMore()) {
        code.next();
        const pos = code.pos();

        if (startPos && pos < startPos) continue;
        if (stopPos && pos > stopPos) break;
        if (boundaryPos === pos) {
            // const line = bytecode.slice(2 + pos * 2); // pos is byte offset, bytecode is hex string
            const line = bytesToHex(code.bytecode.slice(pos));
            yield line;
            break;
        }

        const highlight = (highlightPos === pos) ? " <--" : "";
        const line = BytecodeIterString(code) + highlight;
        const done : boolean = yield line;
        if (done) break;
    }
}
