import { test, describe } from 'vitest';

import { ethers } from "ethers";
import { createPublicClient, http } from 'viem';

import { withCache } from "../internal/filecache";
import { CompatibleProvider } from "../types.js";

const env = {
    INFURA_API_KEY: process.env.INFURA_API_KEY,
    ETHERSCAN_API_KEY: process.env.ETHERSCAN_API_KEY,

    PROVIDER: process.env.PROVIDER,
    PROVIDER_RPC_URL: process.env.PROVIDER_RPC_URL,
};

const provider = CompatibleProvider(function() {
    let rpc_url = env.PROVIDER_RPC_URL ?? "https://mainnet.infura.io/v3/" + env.INFURA_API_KEY;
    if (env.PROVIDER === "viem") {
        return createPublicClient({
            transport: http(rpc_url),
        });
    }
    // env.provider == "ethers"
    if (env.PROVIDER_RPC_URL) return new ethers.JsonRpcProvider(rpc_url);
    if (env.INFURA_API_KEY) return new ethers.InfuraProvider("homestead", env.INFURA_API_KEY);
    return ethers.getDefaultProvider("homestead");
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

export function describe_cached(d: string, fn: (context: any) => void) {
    return describe(d, () => fn({ provider, env, withCache }));
}

// TODO: Port this to context-aware wrapper
export const online_test = testerWithContext(process.env["ONLINE"] ? test : test.skip, { provider, env });
export const cached_test = testerWithContext(!process.env["SKIP_CACHED"] ? test : test.skip, { provider, env, withCache });

if (process.env["ONLINE"] === undefined) {
    console.log("Skipping online tests. Set ONLINE env to run them.");
}
