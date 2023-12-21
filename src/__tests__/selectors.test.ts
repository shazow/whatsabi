import { expect, test } from 'vitest';

import { selectorsFromBytecode } from '../index';

import { cached_test, describe_cached } from "./env";


cached_test('cached online: selectorsFromBytecode for Uniswap v2 Router', async ({ provider, withCache }) => {
  const address = "0x7a250d5630b4cf539739df2c5dacb4c659f2488d";

  const code = await withCache(
    `${address}_code`,
    async () => {
      return await provider.getCode(address)
    },
  )

  const r = selectorsFromBytecode(code);
  r.sort();

  expect(r).toStrictEqual(['0x02751cec', '0x054d50d4', '0x18cbafe5', '0x1f00ca74', '0x2195995c', '0x38ed1739', '0x4a25d94a', '0x5b0d5984', '0x5c11d795', '0x791ac947', '0x7ff36ab5', '0x85f8c259', '0x8803dbee', '0xad5c4648', '0xad615dec', '0xaf2979eb', '0xb6f9de95', '0xbaa2abde', '0xc45a0155', '0xd06ca61f', '0xded9382a', '0xe8e33700', '0xf305d719', '0xfb3bdb41']);
});

cached_test('cached online: selectorsFromBytecode for 0x00000000 method', async ({ provider, withCache }) => {
  // Via https://twitter.com/smithbot_eth/status/1576368841072201728
  // Note: This contract self-destructs and reinits with new code occasionally,
  // so this test could break. Would be nice to have an immutable contract with
  // a zero selector.
  const address = "0x000000000000Df8c944e775BDe7Af50300999283";

  const code = await withCache(
    `${address}_code`,
    async () => {
      return await provider.getCode(address)
    },
  )

  const r = selectorsFromBytecode(code);
  expect(r).toEqual(expect.arrayContaining(['0x00000000', '0xf04f2707']))
});

describe_cached("detecting zero selector", async ({ provider, withCache}) => {
  // Check positive cases
  test.each([
    {address: "0x000000000000Df8c944e775BDe7Af50300999283"},
  ])("check presence: $address", async ({address}) => {
    const code = await withCache(`${address}_code`, provider.getCode.bind(provider, address))
    const r = selectorsFromBytecode(code);
    expect(r).toEqual(expect.arrayContaining(['0x00000000']))
  });

  // Check negative cases
  test.each([
    {address: "0x99aa182ed0e2b6c47132e95686d2c73cdeff307f"},
    {address: "0xb1116d0a09f06d3e22a264c0c233d80e93abec10"},
    {address: "0xb60e36e2d67a34b4eae678cad779e281e4c6d58c"},
  ])("check absence: $address", async ({address}) => {
    const code = await withCache(`${address}_code`, provider.getCode.bind(provider, address))
    const r = selectorsFromBytecode(code);
    expect(r).to.not.equal(expect.arrayContaining(['0x00000000']))
  });
});

cached_test('cached online: selectorsFromBytecode that had 0x000000000 false positives', async({ provider, withCache }) => {
});
