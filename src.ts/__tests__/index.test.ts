import { ethers } from "ethers";

import { expect, test } from '@jest/globals';

import { SAMPLE_CODE, SAMPLE_ABI } from "./__fixtures__/sample";

import { selectorsFromBytecode, selectorsFromABI, abiFromBytecode } from '../index';
import {ABIFunction} from '../abi';

test('selectorsFromBytecode', () => {
  const abi = selectorsFromABI(SAMPLE_ABI)
  const expected = Object.keys(abi);

  const r = selectorsFromBytecode(SAMPLE_CODE);
  expect(new Set(r)).toStrictEqual(new Set(expected));
});

test('abiFromBytecode functions', () => {
  const r = abiFromBytecode(SAMPLE_CODE).filter(a => a.type === "function") as ABIFunction[];
  const got = Object.fromEntries(r.map(a=> [a.selector, a]));
  const sample = toKnown(SAMPLE_ABI.filter(a => a.type === "function"));
  const expected = Object.fromEntries(sample.map(a => {
    (got[a.selector] as any).name = a.name;
    return [a.selector, a]
  }))

  expect(
    got
  ).toStrictEqual(
    expected
  );
});

// toKnown converts a traditional ABI object to a subset that we know how to extract
function toKnown(abi: any[]) {
  const iface = new ethers.utils.Interface(abi);

  return abi.map(a => {
    if (a.type === "event") {
      return a;
    }
    if (a.type === "function") {
      a.selector = iface.getSighash(a.name);
    }

    // We can only tell iff there are inputs/outputs, not what they are
    if (a.inputs.length > 0) a.inputs = [{type: "bytes"}];
    else delete(a["inputs"]);

    if (a.outputs.length > 0) a.outputs = [{type: "bytes"}];
    else delete(a["outputs"]);

    delete(a["anonymous"]);
    // XXX: delete(a["name"]);

    a.payable = a.stateMutability === "payable";

    return a;
  })
}
