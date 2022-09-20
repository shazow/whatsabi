import {describe, expect, test} from '@jest/globals';

import {extractABI} from './index';

import { SAMPLE_CODE } from "./sample";

describe('index module', () => {
  test('extractABI', () => {
    const r = extractABI(SAMPLE_CODE);
    expect(r).toBe("bar");
  });
});
