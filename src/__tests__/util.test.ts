import { expect, test, describe } from 'vitest';

import { ethers } from "ethers";

import { hexToBytes, bytesToHex } from "../utils";

describe('Utils', () => {
  test.each([
    new Uint8Array([0, 1, 2, 3]),
    new Uint8Array([42, 69, 255]),
    new Uint8Array([255]),
    new Uint8Array([255, 255]),
    new Uint8Array([0, 255, 0, 255]),
  ])("bytesToHex %s", (bytes) => {
    expect(bytesToHex(bytes)).toStrictEqual(ethers.hexlify(bytes));
  });

  test("bytesToHex padding", () => {
    expect(bytesToHex(new Uint8Array([0]), 20)).toStrictEqual("0x0000000000000000000000000000000000000000");
    expect(bytesToHex(new Uint8Array([255, 255, 255]), 20)).toStrictEqual("0x0000000000000000000000000000000000ffffff");
  });


  test.each([
    "0x00010203",
    "0x0000102030",
    "0x2a45ff",
    "0xff",
    "0xffff",
    "0x00ff00ff",
  ])("hexToBytes %s", (hex) => {
    expect(hexToBytes(hex)).toStrictEqual(ethers.getBytes(hex));
  });

});
