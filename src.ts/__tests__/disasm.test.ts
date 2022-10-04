import {describe, expect, test} from '@jest/globals';

import { BytecodeIter, pushWidth } from "../disasm";

describe('BytecodeIter', () => {
  test('opcodes', () => {
    const bytecode = "604260005260206000F3";
    // [00]	PUSH1	42
    // [02]	PUSH1	00
    // [04]	MSTORE
    // [05]	PUSH1	20
    // [07]	PUSH1	00
    // [09]	RETURN

    const code = new BytecodeIter(bytecode, { bufferSize: 4 });

    expect(code.next()).toBe(0x60);

    expect(code.posBuffer.length).toBe(1);
    expect(code.posBuffer[0]).toBe(0);
    expect(pushWidth(code.bytecode[0])).toBe(1);

    expect(code.pos()).toBe(0);
    expect(code.step()).toBe(0);

    expect(code.value()).toEqual(new Uint8Array([0x42]));
    expect(code.next()).toBe(0x60);

    expect(code.pos()).toBe(2); // Pos goes up byte 2 because PUSH1
    expect(code.step()).toBe(1);

    expect(code.value()).toEqual(new Uint8Array([0x00]));
    expect(code.next()).toBe(0x52);
    expect(code.next()).toBe(0x60);
    expect(code.value()).toEqual(new Uint8Array([0x20]));
    expect(code.next()).toBe(0x60);
    expect(code.value()).toEqual(new Uint8Array([0x00]));

    // Relative peek back
    expect(code.at(-1)).toBe(0x60);
    expect(code.valueAt(-1)).toEqual(new Uint8Array([0x00]));
    expect(code.at(-2)).toBe(0x60);
    expect(code.valueAt(-2)).toEqual(new Uint8Array([0x20]));
    expect(code.at(-3)).toBe(0x52);
    expect(code.valueAt(-3)).toEqual(new Uint8Array());
    expect(code.at(-4)).toBe(0x60);

    expect(code.hasMore()).toBe(true);
    expect(code.next()).toBe(0xF3);
    expect(code.hasMore()).toBe(false);

    expect(code.next()).toBe(0x00); // STOP, default value after hasMore is done
  });

  test('buffer', () => {
    const code = new BytecodeIter("604260005260206000F3", { bufferSize: 1 });

    // Exceed buffer
    expect(() => code.at(-1)).toThrow("buffer does not contain relative step");
    expect(() => code.at(-2)).toThrow("buffer does not contain relative step");
    expect(() => code.valueAt(-1)).toThrow("buffer does not contain relative step");
    expect(() => code.at(-999)).toThrow("buffer does not contain relative step");
    expect(() => code.valueAt(-999)).toThrow("buffer does not contain relative step");

    expect(code.pos()).toBe(-1);
    expect(code.step()).toBe(-1);

    expect(code.next()).toBe(0x60);
    expect(code.at(-1)).toBe(0x60);
    expect(code.valueAt(-1)).toEqual(new Uint8Array([0x42]));
    expect(() => code.at(-2)).toThrow("buffer does not contain relative step");

    expect(code.pos()).toBe(0);
    expect(code.step()).toBe(0);

    // Exceed bytecode
    expect(code.at(999)).toBe(undefined);
    expect(code.valueAt(999)).toEqual(new Uint8Array());
  })
});
