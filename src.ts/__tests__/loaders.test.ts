import { describe, expect, test } from '@jest/globals';

import { defaultABILoader, defaultSelectorLookup } from "../loaders";
import { selectorsFromABI } from "../index";

// Skip online tests unless ONLINE env is set
const online_test = process.env["ONLINE"] ? test : test.skip;

// TODO: Add fixtures so that tests are runnable offline

describe('loaders module', () => {
  online_test('defaultABILoader', async () => {
    const abi = await defaultABILoader.loadABI("0x7a250d5630b4cf539739df2c5dacb4c659f2488d");
    const selectors = selectorsFromABI(abi);
    const hashes = Object.keys(selectors);
    hashes.sort();
    expect(hashes).toStrictEqual(['0x02751cec', '0x054d50d4', '0x18cbafe5', '0x1f00ca74', '0x2195995c', '0x38ed1739', '0x4a25d94a', '0x5b0d5984', '0x5c11d795', '0x791ac947', '0x7ff36ab5', '0x85f8c259', '0x8803dbee', '0xad5c4648', '0xad615dec', '0xaf2979eb', '0xb6f9de95', '0xbaa2abde', '0xc45a0155', '0xd06ca61f', '0xded9382a', '0xe8e33700', '0xf305d719', '0xfb3bdb41']);

    expect(selectors["0x7ff36ab5"]).toStrictEqual("swapExactETHForTokens(uint256,address[],address,uint256)");
  });

  online_test('defaultSelectorLookup', async () => {
    const expected = "swapExactETHForTokens(uint256,address[],address,uint256)";
    const selector = Object.keys(selectorsFromABI([expected]))[0];
    expect(selector).toBe("0x7ff36ab5");

    const r = await defaultSelectorLookup.loadSelectors(selector);
    expect(r).toContain(expected);
  });
})
