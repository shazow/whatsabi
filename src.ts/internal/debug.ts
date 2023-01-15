import { ethers } from "ethers";

import { opcodes, mnemonics, OpCode, isPush, isDup }  from "../opcodes";
import { BytecodeIter } from "../disasm";

// Debug helper:

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
