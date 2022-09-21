import { ethers } from "ethers";
import {describe, expect, test} from '@jest/globals';

import { extractInternalSignatures} from './index';

import { SAMPLE_CODE, SAMPLE_ABI } from "./sample2";

describe('index module', () => {
  test('extractABI', () => {
    const expected = SAMPLE_ABI.filter((el:any) => {
      if (typeof(el) === "string") return true;
      return el.type === "function";
    }).map(el => {
      return ethers.utils.id(ethers.utils.FunctionFragment.from(el).format()).substring(0, 10);
    });
    const r = extractInternalSignatures(SAMPLE_CODE);
    expect(r).toStrictEqual(expected);
  });
});
