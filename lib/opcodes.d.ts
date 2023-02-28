export type OpCode = number;
export declare const opcodes: Readonly<{
    [key: string]: OpCode;
}>;
export declare const mnemonics: Readonly<{
    [key: OpCode]: string;
}>;
export declare function pushWidth(op: OpCode): number;
export declare function isPush(op: OpCode): boolean;
export declare function isDup(op: OpCode): boolean;
export declare function isLog(op: OpCode): boolean;
export declare function isSwap(op: OpCode): boolean;
export declare function isHalt(op: OpCode): boolean;
export declare function isCompare(op: OpCode): boolean;
export declare function stackPush(op: OpCode): number;
export declare function stackPop(op: OpCode): number;
