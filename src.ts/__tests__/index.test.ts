import { expect, test } from '@jest/globals';

import { SAMPLE_CODE, SAMPLE_ABI } from "./__fixtures__/sample";

import { selectorsFromBytecode, selectorsFromABI } from '../index';

test.only('selectorsFromBytecode', () => {
  const abi = selectorsFromABI(SAMPLE_ABI)
  const expected = Object.keys(abi);

  const r = selectorsFromBytecode(SAMPLE_CODE);
  expect(new Set(r)).toStrictEqual(new Set(expected));
});
