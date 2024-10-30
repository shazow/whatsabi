import { expect } from 'vitest';

import { whatsabi } from "../index";
import { autoload } from "../auto";

import { test, online_test, cached_test, makeProvider } from "./env";

const TIMEOUT = 15000;

test('autoload throws typed error', async () => {
    // @ts-expect-error: Expected 2 arguments, but got 1
    await expect(autoload("0xf00")).rejects.toThrow(/config is undefined/);

    const fakeProvider = {
        request: () => { },
    }
    await expect(autoload("abc.eth", { provider: fakeProvider })).rejects.toThrow(/Failed to resolve ENS/);
});

online_test('autoload selectors', async ({ provider }) => {
    const address = "0x4A137FD5e7a256eF08A7De531A17D0BE0cc7B6b6"; // Random unverified contract
    const { abi } = await autoload(address, {
        provider: provider,
        abiLoader: false,
        signatureLookup: false,
    });
    expect(abi).toContainEqual({ "selector": "0x6dbf2fa0", "type": "function" });
    expect(abi).toContainEqual({ "selector": "0xec0ab6a7", "type": "function" });
}, TIMEOUT);

online_test('autoload selectors with experimental metadata', async ({ provider }) => {
    const address = "0x4A137FD5e7a256eF08A7De531A17D0BE0cc7B6b6"; // Random unverified contract
    const { abi } = await autoload(address, {
        provider: provider,
        abiLoader: false,
        signatureLookup: false,
        enableExperimentalMetadata: true,
    });
    expect(abi).toContainEqual({ "inputs": [{ "type": "bytes", "name": "" }], "payable": true, "selector": "0x6dbf2fa0", "stateMutability": "payable", "type": "function" });
    expect(abi).toContainEqual({ "inputs": [{ "type": "bytes", "name": "" }], "payable": true, "selector": "0xec0ab6a7", "stateMutability": "payable", "type": "function" });
}, TIMEOUT);


online_test('autoload full', async ({ provider, env }) => {
    const address = "0x4A137FD5e7a256eF08A7De531A17D0BE0cc7B6b6"; // Random unverified contract
    const { abi } = await autoload(address, {
        provider: provider,
        // Equivalent to:
        // ...whatsabi.loaders.defaultsWithEnv(env),
        abiLoader: new whatsabi.loaders.MultiABILoader([
            new whatsabi.loaders.SourcifyABILoader(),
            new whatsabi.loaders.EtherscanABILoader({ apiKey: env.ETHERSCAN_API_KEY }),
        ]),
        signatureLookup: new whatsabi.loaders.MultiSignatureLookup([
            new whatsabi.loaders.OpenChainSignatureLookup(),
            new whatsabi.loaders.FourByteSignatureLookup(),
        ]),
        //onProgress: (phase: string, ...args: any[]) => { console.debug("PROGRESS", phase, args); },
    });
    expect(abi).toContainEqual({ "constant": false, "inputs": [{ "type": "address", "name": "" }, { "type": "uint256", "name": "" }, { "type": "bytes", "name": "" }], "name": "call", "payable": false, "selector": "0x6dbf2fa0", "sig": "call(address,uint256,bytes)", "type": "function" })

    expect(abi).toContainEqual({ "selector": "0xec0ab6a7", "type": "function" });
}, TIMEOUT);

online_test('autoload non-contract', async ({ provider, env }) => {
    const address = "0x0000000000000000000000000000000000000000"; // Random unverified contract
    const { abi } = await autoload(address, {
        provider: provider,
        ...whatsabi.loaders.defaultsWithEnv(env),
    });
    expect(abi).toStrictEqual([]);
});

online_test('autoload verified multi', async ({ provider, env }) => {
    const address = "0x8f8ef111b67c04eb1641f5ff19ee54cda062f163"; // Uniswap v3 pool, verified on Etherscan and Sourcify
    const result = await autoload(address, {
        provider: provider,
        ...whatsabi.loaders.defaultsWithEnv(env),
    });
    expect(result.abiLoadedFrom?.name).toBeTruthy();
});

online_test('autoload loadContractResult verified etherscan', async ({ provider, env }) => {
    const address = "0xc3d688b66703497daa19211eedff47f25384cdc3"; // Compound USDC proxy
    const result = await autoload(address, {
        provider: provider,
        loadContractResult: true,
        followProxies: false,
        abiLoader: new whatsabi.loaders.EtherscanABILoader({ apiKey: env.ETHERSCAN_API_KEY }),
    });
    expect(result.abiLoadedFrom?.name).toBe("EtherscanABILoader");
    expect(result.contractResult?.ok).toBeTruthy();
    expect(result.contractResult?.name).toBe("TransparentUpgradeableProxy");
    expect(result.contractResult?.compilerVersion).toBe("v0.8.15+commit.e14f2714");
    expect(result.contractResult?.loaderResult?.Proxy).toBe("1");
    expect(result.contractResult?.loaderResult?.Implementation).toMatch(/^0x[0-9a-f]{40}$/);
});

cached_test('autoload isFactory', async ({ provider, env, withCache }) => {
    const address = "0x7dB8637A5fd20BbDab1176BdF49C943A96F2E9c6"; // Factory that makes proxies

    const code = await withCache(
        `${address}_code`,
        async () => {
            return await provider.getCode(address)
        },
    )
    const result = await autoload(address, {
        provider: provider,
        ...whatsabi.loaders.defaultsWithEnv(env),
    });
    expect(result.isFactory).toBeTruthy();
});

