import { ethers } from "ethers";
import { test } from '@jest/globals';

import { withCache } from "../internal/filecache";

const env = {
    INFURA_API_KEY: process.env.INFURA_API_KEY,
    ETHERSCAN_API_KEY: process.env.ETHERSCAN_API_KEY,
};

const provider = env.INFURA_API_KEY ? (new ethers.providers.InfuraProvider("homestead", env.INFURA_API_KEY)) : ethers.getDefaultProvider();

type ItConcurrent = typeof test.skip;

type TestWithContext = (
  name: string,
  fn: (context: any) => void,
  timeout?: number
) => void;

function testerWithContext(tester: ItConcurrent, context: any): TestWithContext {
    return (name, fn, timeout) => tester(name, () => fn(context), timeout);
}

// TODO: Port this to context-aware wrapper
export const online_test = testerWithContext(process.env["ONLINE"] ? test : test.skip, { provider, env });
export const cached_test = testerWithContext(!process.env["SKIP_CACHED"] ? test : test.skip, { provider, env, withCache });

if (process.env["ONLINE"] === undefined) {
    console.log("Skipping online tests. Set ONLINE env to run them.");
}
