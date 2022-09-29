// Based on code from https://github.com/ethers-io/ethers.js/blob/44cbc7fa4e199c1d6113ceec3c5162f53def5bb8/packages/asm/src.ts/assembler.ts
// Extracted to work around cli-focused dependencies that prevented browser embedding.

import { ethers } from "ethers";
import { Opcode } from "./thirdparty/ethers.js/opcodes";


export type Operation = {
    opcode: Opcode;
    offset: number;
    length: number;
    pushValue?: string;
};

export interface Bytecode extends Array<Operation> {
    getOperation(offset: number): Operation;
    getByte(offset: number): number;
    getBytes(offset: number, length: number): Uint8Array;
    byteLength: number;
    operationCount: number;
}

export function disassemble(bytecode: string): Bytecode {
    const ops: Array<Operation> = [ ];
    const offsets: { [ offset: number ]: Operation } = { };

    const bytes = ethers.utils.arrayify(bytecode, { allowMissingPrefix: true });

    let i = 0;
    let oob = false;
    while (i < bytes.length) {
        let opcode = Opcode.from(bytes[i]);
        if (!opcode) {
            opcode = new Opcode(`unknown (${ ethers.utils.hexlify(bytes[i]) })`, bytes[i], 0, 0);
        } else if (oob && opcode.mnemonic === "JUMPDEST") {
            opcode = new Opcode(`JUMPDEST (invalid; OOB!!)`, bytes[i], 0, 0);
        }

        const op: Operation = {
            opcode: opcode,
            offset: i,
            length: 1
        };
        offsets[i] = op;
        ops.push(op);

        i++;

        const push = opcode.isPush();
        if (push) {
            const data = ethers.utils.hexlify(bytes.slice(i, i + push));
            if (ethers.utils.hexDataLength(data) === push) {
                op.pushValue = data;
                op.length += push;
                i += push;
            } else {
                oob = true;
            }
        }
    }

    (<Bytecode>ops).getOperation = function(offset: number): Operation {
        if (offset >= bytes.length) {
            return {
                opcode: Opcode.from("STOP"),
                offset: offset,
                length: 1
            };
        }
        return (offsets[offset] || null);
    };

    (<Bytecode>ops).getByte = function(offset: number): number {
        if (offset >= bytes.length) {
            return 0x00;
        }
        return bytes[offset];
    };

    (<Bytecode>ops).getBytes = function(offset: number, length: number): Uint8Array {
        const result = new Uint8Array(length);
        result.fill(0);
        if (offset < bytes.length) {
            result.set(bytes.slice(offset));
        }
        return ethers.utils.arrayify(result);
    };

    (<Bytecode>ops).byteLength = bytes.length;

    return (<Bytecode>ops);
}

