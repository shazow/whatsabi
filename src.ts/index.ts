import { disassemble, Bytecode, Operation } from "@ethersproject/asm";
import { ethers } from "ethers";

//import { Provider, TransactionRequest } from "@ethersproject/abstract-provider";

export function extractInternalSignatures(code: string): string[] {
    const prog: Bytecode = disassemble(code);

    // Find all the JUMPDEST instructions within the contract
    // We're looking for a sequence of opcodes that looks like:
    //
    //  DUP1 PUSH4 0x2E64CEC1 EQ PUSH1 0x37 JUMPI
    //  DUP1 PUSH4 <BYTE4> EQ PUSH1 <BYTE1> JUMPI
    //  80   63            14         57
    //             Func       Dest

    // JUMPDEST lookup
    const dests: { [key: string]: Operation } = {}; // hex offset -> op
    const jumps: { [key: string]: string } = {}; // function hash -> hex offset

    for (let i = 0; i < prog.length; i++) {
        const op: Operation = prog[i];

        if (op.opcode.isValidJumpDest()) {
            // Index destinations
            dests[ethers.utils.hexlify(op.offset)] = op;
            continue;
        }
        if (op.opcode.isJump()) {
            // Check previous opcode to be PUSH4
            let dest: string;
            let sig: string;

            {
                const prevOp: Operation = prog[i-1];
                if (prevOp.opcode.isPush() && prevOp.pushValue) {
                    dest = prevOp.pushValue;
                } else continue;
            }

            if (prog[i-2].opcode.mnemonic !== "EQ") continue;

            {
                const prevOp: Operation = prog[i-3];
                if (prevOp.opcode.mnemonic === "PUSH4" && prevOp.pushValue) {
                    sig = prevOp.pushValue;
                } else continue;
            }

            jumps[sig] = dest;
        }
    }

    const localDests: string[] = []; 
    for (let [sig, offset] of Object.entries(jumps)) {
        if (dests[offset] === undefined) continue;

        localDests.push(sig);
    }
    console.log("dests", Object.keys(dests));
    console.log("jumps", Object.keys(jumps));
    console.log("local", localDests);
    return localDests;
}
