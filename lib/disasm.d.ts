import { Opcode } from "./thirdparty/ethers.js/opcodes";
export declare type Operation = {
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
export declare function disassemble(bytecode: string): Bytecode;
