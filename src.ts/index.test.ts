import {describe, expect, test} from '@jest/globals';
import { getDefaultProvider } from "ethers";

import { selectorsFromBytecode, selectorsFromABI } from './index';

import { SAMPLE_CODE, SAMPLE_ABI } from "./fixtures/sample2";

describe('index module', () => {
  test('extractABI', () => {
    const abi = selectorsFromABI(SAMPLE_ABI)
    const expected = Object.keys(abi);
    expected.sort();

    const r = selectorsFromBytecode(SAMPLE_CODE);
    r.sort();

    expect(r).toStrictEqual(expected);
  });

  test('online: extractABI for Uniswap v2 Router', async () => {
    const address = "0x7a250d5630b4cf539739df2c5dacb4c659f2488d";

    const code = await getDefaultProvider().getCode(address);
    const r = selectorsFromBytecode(code);
    r.sort();

    expect(r).toStrictEqual(['0x02751cec', '0x054d50d4', '0x18cbafe5', '0x1f00ca74', '0x2195995c', '0x38ed1739', '0x4a25d94a', '0x5b0d5984', '0x5c11d795', '0x791ac947', '0x7ff36ab5', '0x85f8c259', '0x8803dbee', '0xad5c4648', '0xad615dec', '0xaf2979eb', '0xb6f9de95', '0xbaa2abde', '0xc45a0155', '0xd06ca61f', '0xded9382a', '0xe8e33700', '0xf305d719', '0xfb3bdb41']);
  });
});