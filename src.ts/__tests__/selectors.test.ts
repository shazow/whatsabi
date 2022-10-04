import { expect, test } from '@jest/globals';
import { ethers } from "ethers";

import { selectorsFromBytecode } from '../index';

// Skip online tests unless ONLINE env is set
const online_test = process.env["ONLINE"] !== undefined ? test : test.skip;

const { INFURA_API_KEY } = process.env;
const provider = INFURA_API_KEY ? (new ethers.providers.InfuraProvider("homestead", INFURA_API_KEY)) : ethers.getDefaultProvider();

online_test('online: selectorsFromBytecode for Uniswap v2 Router', () => {
  const address = "0x7a250d5630b4cf539739df2c5dacb4c659f2488d";

  provider.getCode(address).then(code => {
    const r = selectorsFromBytecode(code);
    r.sort();

    expect(r).toStrictEqual(['0x02751cec', '0x054d50d4', '0x18cbafe5', '0x1f00ca74', '0x2195995c', '0x38ed1739', '0x4a25d94a', '0x5b0d5984', '0x5c11d795', '0x791ac947', '0x7ff36ab5', '0x85f8c259', '0x8803dbee', '0xad5c4648', '0xad615dec', '0xaf2979eb', '0xb6f9de95', '0xbaa2abde', '0xc45a0155', '0xd06ca61f', '0xded9382a', '0xe8e33700', '0xf305d719', '0xfb3bdb41']);
  });

});

online_test('online: selectorsFromBytecode for 0x00000000 method', () => {
  // Via https://twitter.com/smithbot_eth/status/1576368841072201728
  const address = "0x000000000000Df8c944e775BDe7Af50300999283";

  provider.getCode(address).then(code => {
    const r = selectorsFromBytecode(code);
    expect(new Set(r)).toStrictEqual(new Set(['0x00000000', '0x150b7a02', '0x83197ef0', '0xcc066bb8', '0xf04f2707']))
  })
});
