"use strict";
// Based on code from https://github.com/ethers-io/ethers.js/blob/44cbc7fa4e199c1d6113ceec3c5162f53def5bb8/packages/asm/src.ts/assembler.ts
// Extracted to work around cli-focused dependencies that prevented browser embedding.
Object.defineProperty(exports, "__esModule", { value: true });
exports.disassemble = void 0;
const ethers_1 = require("ethers");
const opcodes_1 = require("./thirdparty/ethers.js/opcodes");
function disassemble(bytecode) {
    const ops = [];
    const offsets = {};
    const bytes = ethers_1.ethers.utils.arrayify(bytecode, { allowMissingPrefix: true });
    let i = 0;
    let oob = false;
    while (i < bytes.length) {
        let opcode = opcodes_1.Opcode.from(bytes[i]);
        if (!opcode) {
            opcode = new opcodes_1.Opcode(`unknown (${ethers_1.ethers.utils.hexlify(bytes[i])})`, bytes[i], 0, 0);
        }
        else if (oob && opcode.mnemonic === "JUMPDEST") {
            opcode = new opcodes_1.Opcode(`JUMPDEST (invalid; OOB!!)`, bytes[i], 0, 0);
        }
        const op = {
            opcode: opcode,
            offset: i,
            length: 1
        };
        offsets[i] = op;
        ops.push(op);
        i++;
        const push = opcode.isPush();
        if (push) {
            const data = ethers_1.ethers.utils.hexlify(bytes.slice(i, i + push));
            if (ethers_1.ethers.utils.hexDataLength(data) === push) {
                op.pushValue = data;
                op.length += push;
                i += push;
            }
            else {
                oob = true;
            }
        }
    }
    ops.getOperation = function (offset) {
        if (offset >= bytes.length) {
            return {
                opcode: opcodes_1.Opcode.from("STOP"),
                offset: offset,
                length: 1
            };
        }
        return (offsets[offset] || null);
    };
    ops.getByte = function (offset) {
        if (offset >= bytes.length) {
            return 0x00;
        }
        return bytes[offset];
    };
    ops.getBytes = function (offset, length) {
        const result = new Uint8Array(length);
        result.fill(0);
        if (offset < bytes.length) {
            result.set(bytes.slice(offset));
        }
        return ethers_1.ethers.utils.arrayify(result);
    };
    ops.byteLength = bytes.length;
    return ops;
}
exports.disassemble = disassemble;
//# sourceMappingURL=disasm.js.map