import { ethers } from "ethers";

import { opcodes, mnemonics, OpCode, isPush, isDup }  from "../opcodes";
import { Program, Function, BytecodeIter } from "../disasm";

// Debug helper:

export function programToDotGraph(p: Program): string {
    const nameLookup = Object.fromEntries(Object.entries(p.selectors).map(([k, v]) => [v, "SEL" + k]));
    const start = {start: 0, jumps: Object.values(p.selectors)} as Function;

    function jumpsToDot(fn: Function): string {
        if (fn.jumps.length === 0) return "";

        function name(n: number): string {
            return nameLookup[n] || ("FUNC" + n);
        }

        let s = "\t" + name(fn.start) + " -> { " + fn.jumps.map(n => name(n)).join(" ") + " }\n";
        for (const jump of fn.jumps) {
            s += jumpsToDot(p.dests[jump]);
        }
        return s;
    }

    return "digraph jumps {\n" + jumpsToDot(start) + "\n}";
}

export type bytecodeToStringConfig = {
    start?: number,
    stop?: number,
    highlight?: number,
    opcodeLookup?: { [key: OpCode]: string },
};

export function* bytecodeToString(
    bytecode: string, 
    config?: bytecodeToStringConfig,
) {
    const code = new BytecodeIter(bytecode);

    if (config === undefined) config = {};
    let { start, stop, highlight, opcodeLookup } = config;
    if (!opcodeLookup) opcodeLookup = mnemonics;

    while (code.hasMore()) {
        const inst = code.next();
        const step = code.step();

        if (start && step < start) continue;
        if (stop && step > stop) break;

        const pos = ethers.utils.hexlify(code.pos());
        const value = isPush(inst) && ethers.utils.hexlify(code.value()) || "";
        let name = opcodeLookup[inst];
        if (isPush(inst)) name = "PUSH" + (inst - opcodes.PUSH1 + 1);
        else if (isDup(inst)) name = "DUP" + (inst - opcodes.DUP1 + 1);
        else if (name === undefined) name = ethers.utils.hexlify(inst);

        const line = `${step}\t${pos}\t${name}\t${value}\t${highlight === step ? "<--" : ""}`;
        const done : boolean = yield line;
        if (done) break;
    }
}
