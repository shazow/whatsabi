import { expect } from 'vitest';

import { whatsabi } from "../index";
import { autoload } from "../auto";

import { test, online_test, makeProvider } from "./env";

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

online_test('autoload crossload', async ({ provider, env }) => {
    const address = "0xdAC17F958D2ee523a2206206994597C13D831ec7"; // USDT, available on both PulseChain and Mainnet (but only verified on mainnet)
    const pulseChainProvider = makeProvider("https://pulsechain-rpc.publicnode.com");
    {
        // Fails to find verified ABI on pulseChain
        const result = await autoload(address, {
            provider: pulseChainProvider,
            signatureLookup: false,
            abiLoader: false,
        });
        expect(result.isVerified).toBeFalsy();
        expect(result.abi).not.toContainEqual({
            "constant": true,
            "inputs": [],
            "name": "totalSupply",
            "outputs": [ { "name": "", "type": "uint256", }],
            "payable": false,
            "stateMutability": "view",
            "type": "function",
        });
    }
    {
        // Succeeds by cross-loading mainnet
        const result = await autoload(address, {
            provider: pulseChainProvider,
            signatureLookup: false,
            abiLoader: false,
            // onProgress: (phase: string, ...args: any[]) => { console.debug("Mainnet PROGRESS", phase, args); },
            crossChainLoad: {
                provider,
                signatureLookup: false,
                // onProgress: (phase: string, ...args: any[]) => { console.debug("CrossChain PROGRESS", phase, args); },
                ...whatsabi.loaders.defaultsWithEnv(env),
            }
        });
        expect(result.isVerified).toBeTruthy();
        expect(result.abi).toContainEqual({
            "constant": true,
            "inputs": [],
            "name": "totalSupply",
            "outputs": [ { "name": "", "type": "uint256", }],
            "payable": false,
            "stateMutability": "view",
            "type": "function",
        });
    }
});


