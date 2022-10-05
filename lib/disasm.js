"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.abiFromBytecode = exports.BytecodeIter = exports.isLog = exports.isPush = exports.pushWidth = void 0;
const ethers_1 = require("ethers");
// Some opcodes we care about, doesn't need to be a complete list
const opcodes = {
    "STOP": 0x00,
    "EQ": 0x14,
    "ISZERO": 0x15,
    "CALLVALUE": 0x34,
    "CALLDATASIZE": 0x36,
    "JUMPI": 0x57,
    "JUMPDEST": 0x5b,
    "PUSH1": 0x60,
    "PUSH4": 0x63,
    "PUSH32": 0x7f,
    "DUP1": 0x80,
    "LOG1": 0xa1,
    "LOG4": 0xa4,
};
// Return PUSHN width of N if PUSH instruction, otherwise 0
function pushWidth(instruction) {
    if (instruction < opcodes.PUSH1 || instruction > opcodes.PUSH32)
        return 0;
    return instruction - opcodes.PUSH1 + 1;
}
exports.pushWidth = pushWidth;
function isPush(instruction) {
    return !(instruction < opcodes.PUSH1 || instruction > opcodes.PUSH32);
}
exports.isPush = isPush;
function isLog(instruction) {
    return instruction >= opcodes.LOG1 && instruction <= opcodes.LOG4;
}
exports.isLog = isLog;
// BytecodeIter takes EVM bytecode and handles iterating over it with correct
// step widths, while tracking N buffer of previous offsets for indexed access.
// This is useful for checking against sequences of variable width
// instructions.
class BytecodeIter {
    constructor(bytecode, config) {
        this.nextStep = 0;
        this.nextPos = 0;
        if (config === undefined)
            config = {};
        this.posBufferSize = Math.max(config.bufferSize || 1, 1);
        this.posBuffer = [];
        this.bytecode = ethers_1.ethers.utils.arrayify(bytecode, { allowMissingPrefix: true });
    }
    hasMore() {
        return (this.bytecode.length > this.nextPos);
    }
    next() {
        if (this.bytecode.length <= this.nextPos)
            return opcodes.STOP;
        const instruction = this.bytecode[this.nextPos];
        const width = pushWidth(instruction);
        // TODO: Optimization: Could use a circular buffer
        if (this.posBuffer.length >= this.posBufferSize)
            this.posBuffer.shift();
        this.posBuffer.push(this.nextPos);
        this.nextStep += 1;
        this.nextPos += 1 + width;
        return instruction;
    }
    // step is the current instruction position that we've iterated over. If
    // iteration has not begun, then it's -1.
    step() {
        return this.nextStep - 1;
    }
    // pos is the byte offset of the current instruction we've iterated over.
    // If iteration has not begun then it's -1.
    pos() {
        if (this.posBuffer.length === 0)
            return -1;
        return this.posBuffer[this.posBuffer.length - 1];
    }
    // at returns instruction at an absolute byte position or relative negative
    // buffered step offset. Buffered step offsets must be negative and start
    // at -1 (current step).
    at(posOrRelativeStep) {
        let pos = posOrRelativeStep;
        if (pos < 0) {
            pos = this.posBuffer[this.posBuffer.length + pos];
            if (pos === undefined) {
                throw new Error("buffer does not contain relative step");
            }
        }
        return this.bytecode[pos];
    }
    // value of last next-returned OpCode (should be a PUSHN intruction)
    value() {
        return this.valueAt(-1);
    }
    // valueAt returns the variable width value for PUSH-like instructions (or
    // empty value otherwise), at pos pos can be a relative negative count for
    // relative buffered offset.
    valueAt(posOrRelativeStep) {
        let pos = posOrRelativeStep;
        if (pos < 0) {
            pos = this.posBuffer[this.posBuffer.length + pos];
            if (pos === undefined) {
                throw new Error("buffer does not contain relative step");
            }
        }
        const instruction = this.bytecode[pos];
        const width = pushWidth(instruction);
        return this.bytecode.slice(pos + 1, pos + 1 + width);
    }
}
exports.BytecodeIter = BytecodeIter;
function abiFromBytecode(bytecode) {
    const abi = [];
    // JUMPDEST lookup
    const jumps = {}; // function hash -> instruction offset
    const dests = {}; // instruction offset -> bytes offset
    const notPayable = {}; // instruction offset -> bytes offset
    let lastPush32 = new Uint8Array(); // Track last push32 to find log topics
    let inJumpTable = true;
    const code = new BytecodeIter(bytecode, { bufferSize: 4 });
    // TODO: Optimization: Could optimize finding jumps by loading JUMPI first
    // (until the jump table window is reached), then sorting them and seeking
    // to each JUMPDEST.
    while (code.hasMore()) {
        const inst = code.next();
        const pos = code.pos();
        const step = code.step();
        // Track last PUSH32 to find LOG topics
        // This is probably not bullet proof but seems like a good starting point
        if (inst === opcodes.PUSH32) {
            lastPush32 = code.value();
            continue;
        }
        else if (isLog(inst) && lastPush32.length > 0) {
            abi.push({
                type: "event",
                hash: ethers_1.ethers.utils.hexlify(lastPush32),
            });
            continue;
        }
        // Find JUMPDEST labels
        if (inst === opcodes.JUMPDEST) {
            // Index jump destinations so we can check against them later
            dests[pos] = step;
            // Check whether a JUMPDEST has non-payable guards
            //
            // We look for a sequence of instructions that look like:
            // JUMPDEST CALLVALUE DUP1 ISZERO
            //
            // We can do direct positive indexing because we know that there
            // are no variable-width instructions in our sequence.
            if (code.at(pos + 1) === opcodes.CALLVALUE &&
                code.at(pos + 2) === opcodes.DUP1 &&
                code.at(pos + 3) === opcodes.ISZERO) {
                notPayable[pos] = step;
                // TODO: Optimization: Could seek ahead 3 pos/count safely
            }
            // Check whether we've reached the end of the selector jump table,
            // first time we see: JUMPDEST CALLDATASIZE
            if (inJumpTable && code.at(pos + 1) === opcodes.CALLDATASIZE) {
                inJumpTable = false;
            }
            continue;
        }
        if (!inJumpTable)
            continue; // Skip searching for function selectors at this point
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
        // Wee can reliably skip checking for DUP1 if we're only searching
        // within `inJumpTable` range.
        if (code.at(-1) === opcodes.JUMPI &&
            isPush(code.at(-2)) &&
            code.at(-3) === opcodes.EQ &&
            isPush(code.at(-4))) {
            // Found a function selector sequence, save it to check against JUMPDEST table later
            let value = code.valueAt(-4);
            if (value.length < 4) {
                // 0-prefixed comparisons get optimized to a smaller width than PUSH4
                value = ethers_1.ethers.utils.zeroPad(value, 4);
            }
            const selector = ethers_1.ethers.utils.hexlify(value);
            const offsetDest = parseInt(ethers_1.ethers.utils.hexlify(code.valueAt(-2)), 16);
            jumps[selector] = offsetDest;
            continue;
        }
        // In some cases, the sequence can get optimized such as for 0x00000000:
        //    DUP1 ISZERO PUSHN <BYTEN> JUMPI
        if (code.at(-1) === opcodes.JUMPI &&
            isPush(code.at(-2)) &&
            code.at(-3) === opcodes.ISZERO) {
            const selector = "0x00000000";
            const offsetDest = parseInt(ethers_1.ethers.utils.hexlify(code.valueAt(-2)), 16);
            jumps[selector] = offsetDest;
            continue;
        }
    }
    for (const [selector, offset] of Object.entries(jumps)) {
        // TODO: Optimization: If we only look at selectors in the jump table region, we shouldn't need to check JUMPDEST validity.
        if (!(offset in dests))
            continue; // Selector does not point to a valid jumpdest
        abi.push({
            type: "function",
            selector: selector,
            payable: !notPayable[jumps[selector]],
        });
    }
    return abi;
}
exports.abiFromBytecode = abiFromBytecode;
//# sourceMappingURL=disasm.js.map