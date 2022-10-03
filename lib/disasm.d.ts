import { ABI } from "./abi";
declare type OpCode = number;
export declare function pushWidth(instruction: number): number;
export declare function isPush(instruction: number): boolean;
export declare class CodeIter {
    bytecode: Uint8Array;
    nextCount: number;
    nextPos: number;
    posBuffer: number[];
    posBufferSize: number;
    constructor(bytecode: string, bufferSize?: number);
    hasMore(): boolean;
    next(): OpCode;
    value(): Uint8Array;
    at(pos: number): OpCode;
    valueAt(pos: number): Uint8Array;
}
export declare function abiFromBytecode(bytecode: string): ABI;
export {};
