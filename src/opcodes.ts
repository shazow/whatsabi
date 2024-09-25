export type OpCode = number;

// Some opcodes we care about, doesn't need to be a complete list
export const opcodes: Readonly<{ [key: string]: OpCode }> = Object.freeze({
  STOP: 0x00,
  ADD: 0x01,
  MUL: 0x02,
  SUB: 0x03,
  DIV: 0x04,
  SDIV: 0x05,
  MOD: 0x06,
  SMOD: 0x07,
  ADDMOD: 0x08,
  MULMOD: 0x09,
  EXP: 0x0a,
  SIGNEXTEND: 0x0b,
  LT: 0x10,
  GT: 0x11,
  SLT: 0x12,
  SGT: 0x13,
  EQ: 0x14,
  ISZERO: 0x15,
  AND: 0x16,
  OR: 0x17,
  XOR: 0x18,
  NOT: 0x19,
  BYTE: 0x1a,
  SHL: 0x1b,
  SHR: 0x1c,
  SAR: 0x1d,
  SHA3: 0x20,
  ADDRESS: 0x30,
  BALANCE: 0x31,
  ORIGIN: 0x32,
  CALLER: 0x33,
  CALLVALUE: 0x34,
  CALLDATALOAD: 0x35,
  CALLDATASIZE: 0x36,
  CALLDATACOPY: 0x37,
  CODESIZE: 0x38,
  CODECOPY: 0x39,
  GASPRICE: 0x3a,
  EXTCODESIZE: 0x3b,
  EXTCODECOPY: 0x3c,
  RETURNDATASIZE: 0x3d,
  RETURNDATACOPY: 0x3e,
  EXTCODEHASH: 0x3f,
  BLOCKHASH: 0x40,
  COINBASE: 0x41,
  TIMESTAMP: 0x42,
  NUMBER: 0x43,
  DIFFICULTY: 0x44,
  GASLIMIT: 0x45,
  CHAINID: 0x46,
  SELFBALANCE: 0x47,
  POP: 0x50,
  MLOAD: 0x51,
  MSTORE: 0x52,
  MSTORE8: 0x53,
  SLOAD: 0x54,
  SSTORE: 0x55,
  JUMP: 0x56,
  JUMPI: 0x57,
  PC: 0x58,
  MSIZE: 0x59,
  GAS: 0x5a,
  JUMPDEST: 0x5b,
  PUSH0: 0x5f,
  PUSH1: 0x60,
  PUSH2: 0x61,
  PUSH3: 0x62,
  PUSH4: 0x63,
  PUSH5: 0x64,
  PUSH6: 0x65,
  PUSH7: 0x66,
  PUSH8: 0x67,
  PUSH9: 0x68,
  PUSH10: 0x69,
  PUSH11: 0x6a,
  PUSH12: 0x6b,
  PUSH13: 0x6c,
  PUSH14: 0x6d,
  PUSH15: 0x6e,
  PUSH16: 0x6f,
  PUSH17: 0x70,
  PUSH18: 0x71,
  PUSH19: 0x72,
  PUSH20: 0x73,
  PUSH21: 0x74,
  PUSH22: 0x75,
  PUSH23: 0x76,
  PUSH24: 0x77,
  PUSH25: 0x78,
  PUSH26: 0x79,
  PUSH27: 0x7a,
  PUSH28: 0x7b,
  PUSH29: 0x7c,
  PUSH30: 0x7d,
  PUSH31: 0x7e,
  PUSH32: 0x7f,
  DUP1: 0x80,
  DUP2: 0x81,
  DUP3: 0x82,
  DUP4: 0x83,
  DUP5: 0x84,
  DUP6: 0x85,
  DUP7: 0x86,
  DUP8: 0x87,
  DUP9: 0x88,
  DUP10: 0x89,
  DUP11: 0x8a,
  DUP12: 0x8b,
  DUP13: 0x8c,
  DUP14: 0x8d,
  DUP15: 0x8e,
  DUP16: 0x8f,
  SWAP1: 0x90,
  SWAP2: 0x91,
  SWAP3: 0x92,
  SWAP4: 0x93,
  SWAP5: 0x94,
  SWAP6: 0x95,
  SWAP7: 0x96,
  SWAP8: 0x97,
  SWAP9: 0x98,
  SWAP10: 0x99,
  SWAP11: 0x9a,
  SWAP12: 0x9b,
  SWAP13: 0x9c,
  SWAP14: 0x9d,
  SWAP15: 0x9e,
  SWAP16: 0x9f,
  LOG0: 0xa0,
  LOG1: 0xa1,
  LOG2: 0xa2,
  LOG3: 0xa3,
  LOG4: 0xa4,
  CREATE: 0xf0,
  CALL: 0xf1,
  CALLCODE: 0xf2,
  RETURN: 0xf3,
  DELEGATECALL: 0xf4,
  CREATE2: 0xf5,
  STATICCALL: 0xfa,
  REVERT: 0xfd,
  INVALID: 0xfe,
  SUICIDE: 0xff,
} as const);

export const mnemonics: Readonly<{ [key: OpCode]: string }> = Object.freeze(
  Object.fromEntries(
    Object.entries(opcodes).map(([k, v]) => [v, k])
  )
);

// Return PUSHN width of N if PUSH instruction, otherwise 0
export function pushWidth(op: OpCode): number {
    if (op < opcodes.PUSH1 || op > opcodes.PUSH32) return 0;
    return op - opcodes.PUSH1 + 1;
}

export function isPush(op: OpCode): boolean {
    return !(op < opcodes.PUSH1 || op > opcodes.PUSH32);
}

export function isDup(op: OpCode): boolean {
    return !(op < opcodes.DUP1 || op > opcodes.DUP16);
}

export function isLog(op: OpCode): boolean {
    return op >= opcodes.LOG1 && op <= opcodes.LOG4;
}

export function isSwap(op: OpCode): boolean {
    return op >= opcodes.SWAP1 && op <= opcodes.SWAP16;
}

export function isHalt(op: OpCode): boolean {
    return op === opcodes.STOP || op === opcodes.RETURN || op >= opcodes.REVERT; // includes opcodes.SUICIDE, opcodes.INVALID
}

export function isCompare(op: OpCode): boolean {
    // LT, GT, LTE, GTE, EQ
    return !(op < 0x10 || op > 0x14)
}

export function stackPush(op: OpCode): number {
    return (isSwap(op) || isLog(op) || noStackPush.has(op)) ? 0 : 1;
}

export function stackPop(op: OpCode): number {
    return hasStackArgs[op] || 0;
}

// Partial set of ops that don't push to stack (not including log and swap)
const noStackPush = new Set<OpCode>([
    opcodes.STOP,
    opcodes.CALLDATACOPY,
    opcodes.CODECOPY,
    opcodes.EXTCODECOPY,
    opcodes.RETURNDATACOPY,
    opcodes.POP,
    opcodes.MSTORE,
    opcodes.MSTORE8,
    opcodes.SSTORE,
    opcodes.JUMP,
    opcodes.JUMPI,
    opcodes.JUMPDEST,
    opcodes.RETURN,
    opcodes.REVERT,
    opcodes.INVALID,
    opcodes.SUICIDE,
]);

const hasStackArgs : Readonly<{ [key: OpCode]: number }> = Object.freeze({
    [opcodes.ADD]: 2,
    [opcodes.MUL]: 2,
    [opcodes.SUB]: 2,
    [opcodes.DIV]: 2,
    [opcodes.SDIV]: 2,
    [opcodes.MOD]: 2,
    [opcodes.SMOD]: 2,
    [opcodes.ADDMOD]: 3,
    [opcodes.MULMOD]: 3,
    [opcodes.EXP]: 2,
    [opcodes.SIGNEXTEND]: 2,
    [opcodes.LT]: 2,
    [opcodes.GT]: 2,
    [opcodes.SLT]: 2,
    [opcodes.SGT]: 2,
    [opcodes.EQ]: 2,
    [opcodes.ISZERO]: 1,
    [opcodes.AND]: 2,
    [opcodes.OR]: 2,
    [opcodes.XOR]: 2,
    [opcodes.NOT]: 1,
    [opcodes.BYTE]: 2,
    [opcodes.SHL]: 2,
    [opcodes.SHR]: 2,
    [opcodes.SAR]: 2,
    [opcodes.SHA3]: 2,
    [opcodes.BALANCE]: 1,
    [opcodes.CALLDATALOAD]: 1,
    [opcodes.CALLDATACOPY]: 3,
    [opcodes.CODECOPY]: 3,
    [opcodes.EXTCODESIZE]: 1,
    [opcodes.EXTCODECOPY]: 4,
    [opcodes.RETURNDATACOPY]: 3,
    [opcodes.EXTCODEHASH]: 1,
    [opcodes.BLOCKHASH]: 1,
    [opcodes.POP]: 1,
    [opcodes.MLOAD]: 1,
    [opcodes.MSTORE]: 2,
    [opcodes.MSTORE8]: 2,
    [opcodes.SLOAD]: 1,
    [opcodes.SSTORE]: 2,
    [opcodes.JUMP]: 1,
    [opcodes.JUMPI]: 2,
    [opcodes.LOG0]: 2,
    [opcodes.LOG1]: 3,
    [opcodes.LOG2]: 4,
    [opcodes.LOG3]: 5,
    [opcodes.LOG4]: 6,
    [opcodes.CREATE]: 3,
    [opcodes.CALL]: 7,
    [opcodes.CALLCODE]: 7,
    [opcodes.RETURN]: 2,
    [opcodes.DELEGATECALL]: 6,
    [opcodes.CREATE2]: 4,
    [opcodes.STATICCALL]: 6,
    [opcodes.REVERT]: 2,
    [opcodes.SUICIDE]: 1,
})

