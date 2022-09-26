import {describe, expect, test} from '@jest/globals';

import { fragmentsFromCode, fragmentsFromABI } from './index';

import { SAMPLE_CODE, SAMPLE_ABI } from "./sample";

describe('index module', () => {
  test('extractABI', () => {
    const abi = fragmentsFromABI(SAMPLE_ABI)
    const expected = Object.keys(abi);
    expected.sort();

    console.log("Expecting ABI:", abi);
    const r = fragmentsFromCode(SAMPLE_CODE);
    r.sort();

    expect(r).toStrictEqual(expected);
  });
});
