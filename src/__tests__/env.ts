import { test } from 'vitest';

import { ethers } from "ethers";
import { createPublicClient, http } from 'viem';

import { withCache } from "../internal/filecache";
import { CompatibleProvider } from "../types.js";

const env = {
    INFURA_API_KEY: process.env.INFURA_API_KEY,
    ETHERSCAN_API_KEY: process.env.ETHERSCAN_API_KEY,
    PROVIDER: process.env.PROVIDER,
};

const provider = CompatibleProvider(function() {
    if (env.PROVIDER === "viem") {
        return createPublicClient({
            transport: http(env.INFURA_API_KEY ? "https://mainnet.infura.io/v3/" + env.INFURA_API_KEY : undefined),
        });
    }
    return env.INFURA_API_KEY ? (new ethers.InfuraProvider("homestead", env.INFURA_API_KEY)) : ethers.getDefaultProvider("homestead");
}());

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
