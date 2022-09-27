"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.selectorsFromBytecode = exports.selectorsFromABI = void 0;
const ethers_1 = require("ethers");
const asm_1 = require("@ethersproject/asm");
// Load function selectors mapping from ABI, parsed using ethers.js
// Mapping is selector hash to signature
function selectorsFromABI(abi) {
    const r = {};
    for (let el of abi) {
        if (typeof (el) !== "string" && el.type !== "function")
            continue;
        const f = ethers_1.ethers.utils.FunctionFragment.from(el).format();
        r[ethers_1.ethers.utils.id(f).substring(0, 10)] = f;
    }
    ;
    return r;
}
exports.selectorsFromABI = selectorsFromABI;
// TODO: Implement abiFromBytecode by guessing arguments
// function abiFromBytecode(code: string): Interface
// Load function selectors from EVM bytecode by parsing JUMPI instructions
function selectorsFromBytecode(code) {
    // TODO: Rewrite this with a custom disassembler which can be more
    // efficient about only indexing the instructions we care about
    const prog = (0, asm_1.disassemble)(code);
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
    const fragments = [];
    for (let i = 0; i < prog.length; i++) {
        const op = prog[i];
        if (op.opcode.mnemonic === "JUMPI") {
            // Check previous opcode to be PUSH4
            let dest;
            let sig;
            {
                const prevOp = prog[i - 1];
                if (prevOp.opcode.isPush() && prevOp.pushValue) {
                    dest = parseInt(prevOp.pushValue, 16);
                }
                else
                    continue;
            }
            if (prog[i - 2].opcode.mnemonic !== 'EQ')
                continue;
            {
                const prevOp = prog[i - 3];
                if (prevOp.opcode.mnemonic === "PUSH4" && prevOp.pushValue) {
                    sig = prevOp.pushValue;
                }
                else
                    continue;
            }
            if (prog[i - 4].opcode.mnemonic !== "DUP1")
                continue;
            const target = prog.getOperation(dest);
            if (!target || !target.opcode.isValidJumpDest()) {
                continue;
            }
            fragments.push(sig);
        }
    }
    return fragments;
}
exports.selectorsFromBytecode = selectorsFromBytecode;
//# sourceMappingURL=index.js.map