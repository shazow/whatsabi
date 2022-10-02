import { ethers } from "ethers";

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

    // Special internal placeholers
    "PUSHN": 0xff60,
}

// Return PUSHN width of N if PUSH instruction, otherwise 0
export function pushWidth(instruction: number): number {
    if (instruction < opcodes.PUSH1 || instruction > opcodes.PUSH32) return 0;
    return instruction - opcodes.PUSH1 + 1;
}

export function isPush(instruction: number): boolean {
    return !(instruction < opcodes.PUSH1 || instruction > opcodes.PUSH32);
}

// CodeIter takes bytecode and handles iterating over it with correct
// step widths, while tracking N buffer of previous offsets for indexed access.
// This is useful for checking against sequences of variable width
// instructions.
export class CodeIter {
    bytecode: Uint8Array;

    count: number; // Instruction count
    pos: number; // Byte-wise instruction position (takes variable width into account)
    posBuffer: number[]; // Buffer of positions
    posBufferSize: number;

    constructor(bytecode: string, bufferSize?:number) {
        this.count = 0;
        this.pos = 0;

        this.posBufferSize = bufferSize || 0;
        this.posBuffer = [];

        this.bytecode = ethers.utils.arrayify(bytecode, { allowMissingPrefix: true });
    }

    hasMore(): boolean {
        return (this.bytecode.length > this.pos);
    }

    next(): OpCode {
        if (this.bytecode.length <= this.pos) return opcodes.STOP;

        const instruction = this.bytecode[this.pos];
        const width = pushWidth(instruction);

        if (this.posBuffer.length >= this.posBufferSize) this.posBuffer.shift();
        this.posBuffer.push(this.pos);

        this.count += 1;
        this.pos += 1 + width;

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

export type ABI = {
    type: string;
    name: string;
    payable: boolean;
    // TODO: constant: boolean;
    // TODO: inputs: {type: name}[];
    // TODO: outputs: {type, name}[];
}[];

export function abiFromBytecode(bytecode: string): ABI {
    const abi: ABI = [];

    // JUMPDEST lookup
    const jumps: { [key: string]: number } = {}; // function hash -> offset
    const dests: { [key: number]: number } = {}; // instruction offset -> bytes offset
    const notPayable: { [key: number]: number } = {}; // instruction offset -> bytes offset

    const code = new CodeIter(bytecode, 4);

    while (code.hasMore()) {
        const inst = code.next();

        // Find JUMPDEST labels
        if (inst === opcodes.JUMPDEST) {
            // Index jump destinations so we can check against them later
            dests[code.count] = code.pos;
        }

        // Note whether a JUMPDEST is has non-payable guards
        //
        // We look for a sequence of instructions that look like:
        // JUMPDEST CALLVALUE DUP1 ISZERO
        if (
            inst === opcodes.ISZERO &&
            code.at(-1) === opcodes.DUP1 &&
            code.at(-2) === opcodes.CALLVALUE &&
            code.at(-3) === opcodes.JUMPDEST
        ) {
            notPayable[code.count-3] = code.posBuffer[-3];
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
        if (
            inst === opcodes.JUMPI && 
            isPush(code.at(-1)) &&
            code.at(-2) === opcodes.EQ &&
            isPush(code.at(-3))
        ) {
            // Found a function selector sequence, save it to check against JUMPDEST table later
            const offsetDest:number = parseInt(ethers.utils.hexlify(code.valueAt(-1)), 16);
            const selector:string = ethers.utils.hexlify(code.valueAt(-3));
            jumps[selector] = offsetDest;
            continue;
        }
    }

    return abi;
}
