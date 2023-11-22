import { test, describe } from 'vitest';

import { ethers } from "ethers";
import { createPublicClient, http } from 'viem';

import { withCache } from "../internal/filecache";
import { CompatibleProvider } from "../types";

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

// TODO: Switch to https://vitest.dev/api/#test-extend
function testerWithContext(tester: ItConcurrent, context: any): TestWithContext {
    return (name, fn, timeout) => tester(name, () => fn(context), timeout);
}

export function describe_cached(d: string, fn: (context: any) => void) {
    return describe(d, () => fn({ provider, env, withCache }));
}

// TODO: Port this to context-aware wrapper
export const online_test = testerWithContext(process.env["ONLINE"] ? test : test.skip, { provider, env });
export const cached_test = testerWithContext(!process.env["SKIP_CACHED"] ? test : test.skip, { provider, env, withCache });

if (process.env["ONLINE"] === undefined) {
    console.log("Skipping online tests. Set ONLINE env to run them.");
}

export const KNOWN_ADDRESSES = [
    {address: "0x7a250d5630b4cf539739df2c5dacb4c659f2488d", label: "Uniswap v2"},
    {address: "0x00000000006c3852cbEf3e08E8dF289169EdE581", label: "Seaport v1.1"},
    {address: "0x4A137FD5e7a256eF08A7De531A17D0BE0cc7B6b6", label: "Random unverified"},
    {address: "0x000000000000Df8c944e775BDe7Af50300999283", label: "Has 0x0 selector"},
];
