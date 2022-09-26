import { ethers } from "ethers";

import { disassemble, Bytecode, Operation } from "@ethersproject/asm";

//import { Provider, TransactionRequest } from "@ethersproject/abstract-provider";

// Load function selectors mapping from ABI, parsed using ethers.js
export function selectorsFromABI(abi: any[]): {[key: string]: string} {
    const r: {[key: string]: string} = {};

    for (let el of abi) {
      if (typeof(el) !== "string" && el.type !== "function") continue;
      const f = ethers.utils.FunctionFragment.from(el).format();
      r[ethers.utils.id(f).substring(0, 10)] = f;
    };

    return r;
}

// Load function selectors from EVM bytecode by parsing JUMPI instructions
export function selectorsFromBytecode(code: string): string[] {
    const prog: Bytecode = disassemble(code);

    // Find all the JUMPDEST instructions within the contract
    //
    // https://github.com/ethereum/solidity/blob/242096695fd3e08cc3ca3f0a7d2e06d09b5277bf/libsolidity/codegen/ContractCompiler.cpp#L333
    //
    // We're looking for a sequence of opcodes that looks like:
    //
    //  DUP1 PUSH4 0x2E64CEC1 EQ PUSH1 0x37 JUMPI
    //  DUP1 PUSH4 <BYTE4> EQ PUSH1 <BYTE1> JUMPI
    //  80   63            14         57
    //             Func       Dest

    const fragments: string[] = []; 

    for (let i = 0; i < prog.length; i++) {
        const op: Operation = prog[i];

        if (op.opcode.mnemonic === "JUMPI") {
            // Check previous opcode to be PUSH4
            let dest: number;
            let sig: string;

            {
                const prevOp: Operation = prog[i-1];
                if (prevOp.opcode.isPush() && prevOp.pushValue) {
                    dest = parseInt(prevOp.pushValue, 16);
                } else continue;
            }

            if (prog[i-2].opcode.mnemonic !== 'EQ') continue;

            {
                const prevOp: Operation = prog[i-3];
                if (prevOp.opcode.mnemonic === "PUSH4" && prevOp.pushValue) {
                    sig = prevOp.pushValue;
                } else continue;
            }

            if (prog[i-4].opcode.mnemonic !== "DUP1") continue;

            const target = prog.getOperation(dest);
            if (!target || !target.opcode.isValidJumpDest()) {
                continue
            }

            fragments.push(sig);
        }

    }

    return fragments;
}
