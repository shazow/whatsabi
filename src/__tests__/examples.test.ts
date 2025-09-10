import { expect } from 'vitest';

import { whatsabi } from "../index";

import { cached_test, online_test } from "./env";

const TIMEOUT = 25000;

cached_test('README usage', async ({ provider, withCache }) => {

    const address = "0x00000000006c3852cbEf3e08E8dF289169EdE581"; // Or your fav contract address

    const code = await withCache(
        `${address}_code`,
        async () => {
            return await provider.getCode(address)
        },
    )

    const selectors = whatsabi.selectorsFromBytecode(code); // Get the callable selectors

    // console.log(selectors); // ["0x06fdde03", "0x46423aa7", "0x55944a42", ...]
    expect(selectors).toEqual(expect.arrayContaining(["0x06fdde03", "0x46423aa7", "0x55944a42"]));

    {
        const abi = whatsabi.abiFromBytecode(code);
        // console.log(abi);
        // [
        //        {"type": "event", "hash": "0x721c20121297512b72821b97f5326877ea8ecf4bb9948fea5bfcb6453074d37f"},
        //        {"type": "function", "payable": true, "selector": "0x06fdde03"},
        //        {"type": "function", "payable": true, "selector": "0x46423aa7"},
        //        ...
        // ]

        expect(abi).toContainEqual({ "hash": "0x721c20121297512b72821b97f5326877ea8ecf4bb9948fea5bfcb6453074d37f", "type": "event" });
        expect(abi).toContainEqual(
            { "payable": true, "selector": "0xb3a34c4c", "type": "function", "stateMutability": "payable", "inputs": [{ "type": "bytes", "name": "" }], "outputs": [{ "type": "bytes", "name": "" }] },
        );
    }

    const signatureLookup = new whatsabi.loaders.OpenChainSignatureLookup();
    {
        const sig = await signatureLookup.loadFunctions("0x06fdde03");
        expect(sig).toStrictEqual(["name()"]);
    }
    {
        const sig = await signatureLookup.loadFunctions("0x46423aa7");
        expect(sig).toStrictEqual(["getOrderStatus(bytes32)"]);
    }

    const event = await signatureLookup.loadEvents("0x721c20121297512b72821b97f5326877ea8ecf4bb9948fea5bfcb6453074d37f");
    expect(event).toContainEqual("CounterIncremented(uint256,address)")
}, TIMEOUT)

online_test('README autoload', async ({ provider }) => {
    const address = "0x00000000006c3852cbEf3e08E8dF289169EdE581"; // Or your fav contract address

    {
        let result = await whatsabi.autoload(address, {
            provider: provider,

            // * Optional loaders:
            // abiLoader: whatsabi.loaders.defaultABILoader,
            // signatureLoader: whatsabi.loaders.defaultSignatureLookup,

            // There is a handy helper for adding the default loaders but with your own settings
            ...whatsabi.loaders.defaultsWithEnv({
                CHAIN_ID: 42161,
                //ETHERSCAN_API_KEY: "MYSECRETAPIKEY",
            }),

            // * Optional hooks:
            // onProgress: (phase: string) => { ... }
            // onError: (phase: string, context: any) => { ... }

            onProgress: (phase) => console.log("autoload progress", phase),
            onError: (phase, context) => console.log("autoload error", phase, context),

            // * Optional settings:
            // followProxies: false,
            // enableExperimentalMetadata: false,
        });
        expect(result.abi).toContainEqual(
            // 'function name() pure returns (string contractName)'
            { "inputs": [], "name": "name", "outputs": [{ "internalType": "string", "name": "contractName", "type": "string" }], "stateMutability": "pure", "type": "function" }
        );

        if (result.followProxies) {
            result = await result.followProxies();
        }
    }

    {
        const { abi, address } = await whatsabi.autoload("0x4f8AD938eBA0CD19155a835f617317a6E788c868", {
            provider,
            followProxies: true,
        });
        expect(abi.length).toBeGreaterThan(0);
        expect(address).toBe("0x964f84048f0d9bb24b82413413299c0a1d61ea9f");
    }

    {
        // Check defaultsWithEnv decomposition
        const { abiLoader, signatureLookup } = whatsabi.loaders.defaultsWithEnv({});
        expect(abiLoader).toBeDefined();
        expect(signatureLookup).toBeDefined();
    }

}, TIMEOUT);
