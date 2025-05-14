import { test, describe } from 'vitest';

import { ethers } from "ethers";
import { createPublicClient, createWalletClient, http } from 'viem';
import { Web3 } from "web3";

import { withCache } from "../internal/filecache";
import { CompatibleProvider, Provider } from "../providers.js";

const env = {
    INFURA_API_KEY: process.env.INFURA_API_KEY,
    ETHERSCAN_API_KEY: process.env.ETHERSCAN_API_KEY,

    PROVIDER: process.env.PROVIDER,
    PROVIDER_RPC_URL: process.env.PROVIDER_RPC_URL,
    ETH_RPC_URL: process.env.ETH_RPC_URL, // Override for all
};

const DEFAULT_PUBLIC_RPC = "https://ethereum-rpc.publicnode.com";


/**
 * Make a CompatibleProvider for testing relative to the environment we're testing against.
 */
export function makeProvider(rpc_url?: string): Provider {
    return CompatibleProvider(function() {
        if (!rpc_url) {
            if (env.ETH_RPC_URL) {
                rpc_url = env.ETH_RPC_URL;
            } else if (env.INFURA_API_KEY) {
                rpc_url = "https://mainnet.infura.io/v3/" + env.INFURA_API_KEY;
            } else {
                rpc_url = env.PROVIDER_RPC_URL;
            }
        }

        if (env.PROVIDER?.startsWith("viem")) {
            const transport = http(rpc_url ?? DEFAULT_PUBLIC_RPC);
            if (env.PROVIDER.endsWith("publicClient")) return createPublicClient({ transport });
            if (env.PROVIDER.endsWith("transport")) return transport({});
            return createWalletClient({ transport });
        }

        if (env.PROVIDER === "web3") {
            return new Web3(rpc_url ?? DEFAULT_PUBLIC_RPC);
        }

        if (!env.PROVIDER || env.PROVIDER === "ethers") {
            if (rpc_url) return new ethers.JsonRpcProvider(rpc_url);
            if (env.INFURA_API_KEY) return new ethers.InfuraProvider("homestead", env.INFURA_API_KEY);
            return new ethers.JsonRpcProvider(DEFAULT_PUBLIC_RPC);
        }

        throw new Error("Unknown PROVIDER: " + env.PROVIDER);
    }());
}

const provider = makeProvider();

type ItConcurrent = typeof test.skip;

type TestWithContext = (
    name: string,
    fn: (context: any) => void,
    timeout?: number
) => void;

// TODO: Switch to using test.extend? https://vitest.dev/api/#test-extend

function testerWithContext(tester: ItConcurrent, context: any): TestWithContext {
    return (name, fn, timeout) => tester(name, () => fn(context), timeout);
}

export function describe_cached(d: string, fn: (context: any) => void) {
    return describe(d, () => fn({ provider, env, withCache }));
}

// TODO: Port this to context-aware wrapper
export const online_test = testerWithContext(process.env["ONLINE"] ? test : test.skip, { provider, env });
export const cached_test = testerWithContext(!process.env["SKIP_CACHED"] ? test : test.skip, { provider, env, withCache });
export { test };

if (process.env["ONLINE"] === undefined) {
    console.log("Skipping online tests. Set ONLINE env to run them.");
}
