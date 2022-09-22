import {describe, expect, test} from '@jest/globals';

import { fragmentsFromCode, fragmentsFromABI } from './index';

import { SAMPLE_CODE, SAMPLE_ABI } from "./sample";

describe('index module', () => {
  test('extractABI', () => {
    const expected = fragmentsFromABI(SAMPLE_ABI)
    const r = fragmentsFromCode(SAMPLE_CODE);
    expect(r).toStrictEqual(expected);
  });
});
