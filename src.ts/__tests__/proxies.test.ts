import { describe, expect } from '@jest/globals';

import { online_test } from "./env";

describe('proxy detection', () => {
});

describe('proxy resolving', () => {
  online_test('Safe: Proxy Factory 1.1.1', async () => {
      const address = "0x655a9e6b044d6b62f393f9990ec3ea877e966e18";
      // Need to call masterCopy() or getStorageAt for 0th slot
      const want = "0x34CfAC646f301356fAa8B21e94227e3583Fe3F5F";
  });
});
