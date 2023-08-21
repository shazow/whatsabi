import {describe, expect, test} from '@jest/globals';

import { ethers } from "ethers";

import { hexToBytes, bytesToHex, keccak256 } from "../utils";

describe('Utils', () => {
  test.each([
    [new Uint8Array([0,1,2,3]), "0x00010203"],
    [new Uint8Array([42,69,255]), "0x2a45ff"],
    [new Uint8Array([255]), "0xff"],
    [new Uint8Array([255,255]), "0xffff"],
    [new Uint8Array([0,255,0,255]), "0x00ff00ff"],
  ])("bytesToHex %s", (bytes) => {
    expect(bytesToHex(bytes)).toStrictEqual(ethers.utils.hexlify(bytes));
  });

  test.each([
    "0x00010203",
    "0x0000102030",
    "0x2a45ff",
    "0xff",
    "0xffff",
    "0x00ff00ff",
  ])("hexToBytes %s", (hex) => {
    expect(hexToBytes(hex)).toStrictEqual(ethers.utils.arrayify(hex));
  });

  test.each([
    "0x00010203",
    "0xffff",
    "0xffff0000111122223333444455556666777788889999aaaabbbbccccddddeeee",
  ])("keccak256 %s", (hex) => {
    expect(keccak256(hex)).toStrictEqual(ethers.utils.keccak256(hex));
  });

});

