import { ABI } from "./abi";
declare type OpCode = number;
export declare function pushWidth(instruction: OpCode): number;
export declare function isPush(instruction: OpCode): boolean;
export declare function isLog(instruction: OpCode): boolean;
export declare class BytecodeIter {
    bytecode: Uint8Array;
    nextStep: number;
    nextPos: number;
    posBuffer: number[];
    posBufferSize: number;
    constructor(bytecode: string, config?: {
        bufferSize?: number;
    });
    hasMore(): boolean;
    next(): OpCode;
    step(): number;
    pos(): number;
    at(posOrRelativeStep: number): OpCode;
    value(): Uint8Array;
    valueAt(posOrRelativeStep: number): Uint8Array;
}
export declare function abiFromBytecode(bytecode: string): ABI;
export {};
