import {describe, expect, test} from '@jest/globals';

import { selectorsFromBytecode, selectorsFromABI } from './index';

import { SAMPLE_CODE, SAMPLE_ABI } from "./sample2";

describe('index module', () => {
  test('extractABI', () => {
    const abi = selectorsFromABI(SAMPLE_ABI)
    const expected = Object.keys(abi);
    expected.sort();

    const r = selectorsFromBytecode(SAMPLE_CODE);
    r.sort();

    expect(r).toStrictEqual(expected);
  });
});
