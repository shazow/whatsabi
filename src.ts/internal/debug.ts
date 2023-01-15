import { ethers } from "ethers";

import { opcodes, mnemonics, OpCode, isPush, isDup }  from "../opcodes";
import { Program, Function, BytecodeIter } from "../disasm";

// Debug helper:

export function* programToDotGraph(p: Program) {
    yield "digraph JUMPS {\n";

    const nameLookup = Object.fromEntries(Object.entries(p.selectors).map(([k, v]) => [v, k]));

    function toID(n: number): string {
        const sel = nameLookup[n];
        if (sel) return "SEL" + sel;
        return "FUNC" + n;
    }

    function toName(n: number): string {
        const sel = nameLookup[n];
        if (sel) return "➡️ " + sel;
        return ethers.utils.hexlify(n);
    }

    const jumps = Object.values(p.selectors).map(j => p.dests[j]) as Function[];
    const seen = new Set<number>();

    while (jumps.length > 0) {
        const fn = jumps.pop();
        if (!fn) continue;
        if (seen.has(fn.start)) continue;

        seen.add(fn.start);
        const j = fn.jumps.filter(j => j in p.dests).map(j => p.dests[j]);
        const id = toID(fn.start);
        const tags = fn.opTags && Array.from(fn.opTags).map(op => mnemonics[op]).join("|")
        const style = id.startsWith("SEL") ? " color=blue," : "";

        yield "\t" + id + ` [shape=record,${style} label="{ ${toName(fn.start)} | { ${tags} } }"]`;
        yield "\t" + id + " -> { " + j.map(n => toID(n.start)).join(" ") + " }";

        jumps.push(...j);
    }

    yield "}";
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
4
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
