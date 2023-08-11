import {describe, expect, test} from '@jest/globals';

import { hexToBytes, bytesToHex, keccak256 } from "../utils";

describe('Utils', () => {
  test.each([
    [new Uint8Array([0,1,2,3]), "0x00010203"],
    [new Uint8Array([42,69,255]), "0x2a45ff"],
    [new Uint8Array([255]), "0xff"],
    [new Uint8Array([255,255]), "0xffff"],
    [new Uint8Array([0,255,0,255]), "0x00ff00ff"],
  ])("bytesToHex %s", (bytes, expected) => {
    expect(bytesToHex(bytes)).toStrictEqual(expected);
  });

  test.each([
    ["0x00010203", new Uint8Array([0,1,2,3])],
    ["00010203", new Uint8Array([0,1,2,3])],
    ["0x0000102030", new Uint8Array([0,1,2,3])],
    ["0x2a45ff", new Uint8Array([42,69,255])],
    ["0xff", new Uint8Array([255])],
    ["0xffff", new Uint8Array([255,255])],
    ["0x00ff00ff", new Uint8Array([0,255,0,255])],
  ])("hexToBytes %s", (hex, expected) => {
    expect(hexToBytes(hex)).toStrictEqual(expected);
  });

  test.each([
    ["0x00010203", "0x00010203"],
  ])("keccak256 %s", (hex, expected) => {
    expect(keccak256(hex)).toStrictEqual(expected);
  });

});

