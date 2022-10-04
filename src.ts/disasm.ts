import { ethers } from "ethers";

import { ABI, ABIFunction, ABIEvent } from "./abi";

type OpCode = number;

// Some opcodes we care about, doesn't need to be a complete list
const opcodes: { [key: string]: OpCode } = {
    "STOP": 0x00,
    "EQ": 0x14,
    "ISZERO": 0x15,
    "CALLVALUE": 0x34,
    "JUMPI": 0x57,
    "JUMPDEST": 0x5b,
    "PUSH1": 0x60,
    "PUSH4": 0x63,
    "PUSH32": 0x7f,
    "DUP1": 0x80,
    "LOG1": 0xa1,
    "LOG4": 0xa4,
}

// Return PUSHN width of N if PUSH instruction, otherwise 0
export function pushWidth(instruction: OpCode): number {
    if (instruction < opcodes.PUSH1 || instruction > opcodes.PUSH32) return 0;
    return instruction - opcodes.PUSH1 + 1;
}

export function isPush(instruction: OpCode): boolean {
    return !(instruction < opcodes.PUSH1 || instruction > opcodes.PUSH32);
}

export function isLog(instruction: OpCode): boolean {
    return instruction >= opcodes.LOG1 && instruction <= opcodes.LOG4;
}

// CodeIter takes bytecode and handles iterating over it with correct
// step widths, while tracking N buffer of previous offsets for indexed access.
// This is useful for checking against sequences of variable width
// instructions.
export class CodeIter {
    bytecode: Uint8Array;

    nextCount: number; // Instruction count
    nextPos: number; // Byte-wise instruction position (takes variable width into account)
    posBuffer: number[]; // Buffer of positions
    posBufferSize: number;

    constructor(bytecode: string, bufferSize?:number) {
        this.nextCount = 0;
        this.nextPos = 0;

        this.posBufferSize = bufferSize || 0;
        this.posBuffer = [];

        this.bytecode = ethers.utils.arrayify(bytecode, { allowMissingPrefix: true });
    }

    hasMore(): boolean {
        return (this.bytecode.length > this.nextPos);
    }

    next(): OpCode {
        if (this.bytecode.length <= this.nextPos) return opcodes.STOP;

        const instruction = this.bytecode[this.nextPos];
        const width = pushWidth(instruction);

        if (this.posBuffer.length >= this.posBufferSize) this.posBuffer.shift();
        this.posBuffer.push(this.nextPos);

        this.nextCount += 1;
        this.nextPos += 1 + width;

        return instruction;
    }

    // value of last next-returned OpCode (should be a PUSHN intruction)
    value(): Uint8Array {
        return this.valueAt(-1);
    }

    // at returns instruction at an absolute position or relative negative count.
    at(pos: number): OpCode {
        if (pos < 0) {
            pos = this.posBuffer[this.posBuffer.length + pos];
        }
        return this.bytecode[pos];
    }

    // valueAt returns the variable width value for PUSH-like instructions at pos
    // pos can be a relative negative count for relative buffered offset.
    valueAt(pos: number): Uint8Array {
        if (pos < 0) {
            pos = this.posBuffer[this.posBuffer.length + pos];
        }
        const instruction = this.bytecode[pos];
        const width = pushWidth(instruction);
        return this.bytecode.slice(pos+1, pos+1+width);
    }
}

export function abiFromBytecode(bytecode: string): ABI {
    const abi: ABI = [];

    // JUMPDEST lookup
    const jumps: { [key: string]: number } = {}; // function hash -> instruction offset
    const dests: { [key: number]: number } = {}; // instruction offset -> bytes offset
    const notPayable: { [key: number]: number } = {}; // instruction offset -> bytes offset
    let lastPush32: Uint8Array = new Uint8Array();  // Track last push32 to find log topics

    const code = new CodeIter(bytecode, 4);

    // FIXME: Could optimize finding jumps by loading JUMPI first (until the
    // jump table window is reached), then sorting them and seeking to each
    // JUMPDEST.

    while (code.hasMore()) {
        const inst = code.next();

        // Track last PUSH32 to find LOG topics
        // This is probably not bullet proof but seems like a good starting point
        if (inst === opcodes.PUSH32) {
            lastPush32 = code.value();
            continue
        } else if (isLog(inst) && lastPush32.length > 0) {
            abi.push({
                type: "event",
                hash: ethers.utils.hexlify(lastPush32),
            } as ABIEvent)
            continue
        }

        // Find JUMPDEST labels
        if (inst === opcodes.JUMPDEST) {
            // Index jump destinations so we can check against them later
            dests[code.nextPos-1] = code.nextCount-1;

            // Note whether a JUMPDEST is has non-payable guards
            //
            // We look for a sequence of instructions that look like:
            // JUMPDEST CALLVALUE DUP1 ISZERO
            if (
                code.at(code.nextPos) === opcodes.CALLVALUE &&
                code.at(code.nextPos+1) === opcodes.DUP1 &&
                code.at(code.nextPos+2) === opcodes.ISZERO
            ) {
                notPayable[code.nextPos-1] = code.nextCount-1;
                // TODO: Could seek ahead 3 pos/count safely
            }
            continue
        }

        // Find callable function selectors:
        //
        // https://github.com/ethereum/solidity/blob/242096695fd3e08cc3ca3f0a7d2e06d09b5277bf/libsolidity/codegen/ContractCompiler.cpp#L333
        //
        // We're looking for a sequence of opcodes that looks like:
        //
        //    DUP1 PUSH4 0x2E64CEC1 EQ PUSH1 0x37    JUMPI
        //    DUP1 PUSH4 <BYTE4>    EQ PUSHN <BYTEN> JUMPI
        //    80   63    ^          14 60-7f ^       57
        //               Selector            Dest
        //
        // FIXME: We can probably stop checking after we find some instruction set? Maybe 2nd CALLDATASIZE?
        if (
            code.at(-1) === opcodes.JUMPI && 
            isPush(code.at(-2)) &&
            code.at(-3) === opcodes.EQ &&
            isPush(code.at(-4))
        ) {
            // Found a function selector sequence, save it to check against JUMPDEST table later
            const value = ethers.utils.zeroPad(code.valueAt(-4), 4); // 0-prefixed comparisons get optimized to a smaller width than PUSH4
            const selector:string = ethers.utils.hexlify(value);
            const offsetDest:number = parseInt(ethers.utils.hexlify(code.valueAt(-2)), 16);
            jumps[selector] = offsetDest;

            continue;
        }
    }

    for (let selector of Object.keys(jumps)) {
        // TODO: Check jumpdests?
        abi.push({
            type: "function",
            selector: selector,
            payable: !notPayable[jumps[selector]],
        } as ABIFunction)
    }

    return abi;
}
