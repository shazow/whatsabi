import { expect, describe, test } from 'vitest';

import { cached_test, online_test, makeProvider } from './env';

import { disasm } from '../disasm';
import { addSlotOffset, readArray, joinSlot } from "../slots.js";
import * as proxies from '../proxies';

import { ZEPPELINOS_USDC, WANDERWING } from './__fixtures__/proxies'

// TODO: Test for proxy factories to not match

describe('proxy detection', () => {
    test('Minimal Proxy Pattern', async () => {
        // https://eips.ethereum.org/EIPS/eip-1167
        // includes deploy instructions
        const bytecode = "0x3d602d80600a3d3981f3363d3d373d3d3d363d73bebebebebebebebebebebebebebebebebebebebe5af43d82803e903d91602b57fd5bf3";

        const program = disasm(bytecode);
        expect(program.proxies[0]).toBeInstanceOf(proxies.FixedProxyResolver);
        const proxy = program.proxies[0] as proxies.FixedProxyResolver;
        expect(proxy.resolvedAddress).toBe("0xbebebebebebebebebebebebebebebebebebebebe");
        expect(proxy.name).toBe("FixedProxy");
        expect(proxy.toString()).toBe("FixedProxy");
    });

    test('EIP-1167 Proxy: Uniswap v1', async () => {
        // const address = "0x09cabec1ead1c0ba254b09efb3ee13841712be14";
        const bytecode = "0x3660006000376110006000366000732157a7894439191e520825fe9399ab8655e0f7085af41558576110006000f3";
        const want = "0x2157a7894439191e520825fe9399ab8655e0f708";
        const program = disasm(bytecode);
        expect(program.proxies[0]).toBeInstanceOf(proxies.FixedProxyResolver);
        const proxy = program.proxies[0] as proxies.FixedProxyResolver;
        expect(proxy.resolvedAddress).toBe(want);
    });

    test('Solady Minimal Proxy: CWIA', async () => {
        // https://github.com/Vectorized/solady/blob/main/src/utils/LibClone.sol
        const bytecode = "0x36602c57343d527f9e4ac34f21c619cefc926c8bd93b54bf5a39c7ab2127a895af1cc0691d7e3dff593da1005b363d3d373d3d3d3d610016806062363936013d73bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb5af43d3d93803e606057fd5bf3e127ce638293fa123be79c25782a5652581db2340016";
        const program = disasm(bytecode);
        expect(program.proxies[0]).toBeInstanceOf(proxies.FixedProxyResolver);
        const proxy = program.proxies[0] as proxies.FixedProxyResolver;
        const want = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
        expect(proxy.resolvedAddress).toBe(want);
    });

    test('SequenceWallet Proxy', async () => {
        // Gas-optimized version of EIP-1167
        // https://github.com/0xsequence/wallet-contracts/blob/master/contracts/Wallet.sol
        const bytecode = "0x363d3d373d3d3d363d30545af43d82803e903d91601857fd5bf3";
        const program = disasm(bytecode);
        expect(program.proxies[0]).toBeInstanceOf(proxies.SequenceWalletProxyResolver);
    });

    test('Gnosis Safe Proxy Factory', async () => {
        // https://eips.ethereum.org/EIPS/eip-1167
        const bytecode = "0x608060405273ffffffffffffffffffffffffffffffffffffffff600054167fa619486e0000000000000000000000000000000000000000000000000000000060003514156050578060005260206000f35b3660008037600080366000845af43d6000803e60008114156070573d6000fd5b3d6000f3fea265627a7a72315820d8a00dc4fe6bf675a9d7416fc2d00bb3433362aa8186b750f76c4027269667ff64736f6c634300050e0032";

        const program = disasm(bytecode);
        expect(program.proxies[0]).toBeInstanceOf(proxies.GnosisSafeProxyResolver);
        expect(program.proxies[0].name).toBe("GnosisSafeProxy");
    });

    test('ZeppelinOS Proxy', async () => {
        const bytecode = ZEPPELINOS_USDC;
        const program = disasm(bytecode);
        expect(program.proxies[0]).toBeInstanceOf(proxies.ZeppelinOSProxyResolver);
    });

    // TODO: Make this work
    test.skip('EIP-1967 Proxy: Wanderwing', async () => {
        const bytecode = WANDERWING;
        const program = disasm(bytecode);
        expect(program.proxies[0]).toBeInstanceOf(proxies.EIP1967ProxyResolver);
    });
});

describe('known proxy resolving', () => {
    online_test('Safe: Proxy Factory 1.1.1', async ({ provider }) => {
        const address = "0x655a9e6b044d6b62f393f9990ec3ea877e966e18";
        // Need to call masterCopy() or getStorageAt for 0th slot
        const resolver = new proxies.GnosisSafeProxyResolver();
        const got = await resolver.resolve(provider, address);
        const want = "0x34cfac646f301356faa8b21e94227e3583fe3f5f";
        expect(got).toEqual(want);
    });

    online_test('EIP-1967 Proxy: Aztec TransparentUpgradeableProxy', async ({ provider }) => {
        const address = "0xff1f2b4adb9df6fc8eafecdcbf96a2b351680455";
        const resolver = new proxies.EIP1967ProxyResolver();
        const got = await resolver.resolve(provider, address);
        const wantImplementation = "0x7d657ddcf7e2a5fd118dc8a6ddc3dc308adc2728";

        expect(got).toEqual(wantImplementation);
    });

    online_test('EIP-1967 Proxy: NFTX', async ({ provider }) => {
        const address = "0x3E135c3E981fAe3383A5aE0d323860a34CfAB893";
        const resolver = new proxies.EIP1967ProxyResolver();
        const got = await resolver.resolve(provider, address);
        const wantImplementation = "0xccb1cfc9caa2b73a82ad23a9b3219da900485880";

        expect(got).toEqual(wantImplementation);
    });

    online_test('EIP-2535 Diamond Proxy: ZkSync Era', async ({ provider }) => {
        // More diamond proxies, if we need sometime: https://gist.github.com/banteg/74fa02c5457f2141bba11dd431fc2b57

        const address = "0x32400084C286CF3E17e7B677ea9583e60a000324";
        const resolver = new proxies.DiamondProxyResolver();
        const selector = "0x6e9960c3";  // function getAdmin() returns (address)
        const got = await resolver.resolve(provider, address, selector);

        // ZkSync updates their proxies so it's annoying to maintain the desired mapping
        expect(got).not.toEqual("0x0000000000000000000000000000000000000000");
    });

    online_test('EIP-2535 Diamond Proxy: Read facets from internal storage', async ({ provider }) => {
        const address = "0x32400084C286CF3E17e7B677ea9583e60a000324";
        const resolver = new proxies.DiamondProxyResolver();
        const got = await resolver.selectors(provider, address);

        expect(got).to.not.equal([]);
    });

    // FIXME: Is there one on mainnet? Seems they're all on polygon
    //online_test('SequenceWallet Proxy', async() => {
    //});

    cached_test('LayerrProxy on Sepolia', async({ withCache }) => {
        // For issue #139: https://github.com/shazow/whatsabi/issues/139
        const provider = makeProvider("https://ethereum-sepolia-rpc.publicnode.com");
        const address = "0x2f4eeccbe817e2b9f66e8123387aa81bae08dfec";
        const code = await withCache(
            `${address}_code`,
            async () => {
                return await provider.getCode(address)
            },
        );

        const program = disasm(code);
        const resolver = program.proxies[0];
        const got = await resolver.resolve(provider, address);
        const wantImplementation = "0x0000000000f7a60f1c88f317f369e3d8679c6689";

        expect(got).toEqual(wantImplementation);
    });
});


describe('contract proxy resolving', () => {
    cached_test('Create2Beacon Proxy', async ({ provider, withCache }) => {
        const address = "0x581acd618ba7ef6d3585242423867adc09e8ed60";
        const code = await withCache(
            `${address}_code`,
            async () => {
                return await provider.getCode(address)
            },
        )

        const program = disasm(code);
        expect(program.proxies.length).toEqual(1);

        const resolver = program.proxies[0];
        const got = await resolver.resolve(provider, address);

        const wantImplementation = "0xaddc3e67a500f7037cd622b11df291a6351bfb64";
        expect(got).toEqual(wantImplementation);
    });

    cached_test('Vyper Minimal Proxy', async ({ provider, withCache }) => {
        const address = "0x2d5d4869381c4fce34789bc1d38acce747e295ae";
        const code = await withCache(
            `${address}_code`,
            async () => {
                return await provider.getCode(address)
            },
        )

        const program = disasm(code);
        expect(program.proxies.length).toEqual(1);

        const resolver = program.proxies[0];
        const got = await resolver.resolve(provider, address);

        const wantImplementation = "0x9c13e225ae007731caa49fd17a41379ab1a489f4";
        expect(got).toEqual(wantImplementation);
    });
});


describe('proxy internal slot reading', () => {
    test('addSlotOffset', async () => {
        const slot = "0xc8fcad8db84d3cc18b4c41d551ea0ee66dd599cde068d998e57d5e09332c131b";
        const got = addSlotOffset(slot, 2);

        expect(got).to.equal("0xc8fcad8db84d3cc18b4c41d551ea0ee66dd599cde068d998e57d5e09332c131d");
    });

    test('joinSlot', async() => {
        const got = joinSlot(["0xf3acf6a03ea4a914b78ec788624b25cec37c14a4", "0xc8fcad8db84d3cc18b4c41d551ea0ee66dd599cde068d998e57d5e09332c131c"]);
        const want = "0x42983d3cf213719a972df53d14775d9ca74cc01b862f850a60cf959f26ffe0a2";
        expect(got).toEqual(want);
    });

    online_test('ReadArray: Addresses and Selectors', async ({ provider }) => {
        const address = "0x32400084C286CF3E17e7B677ea9583e60a000324";
        const facetsOffset = addSlotOffset(proxies.slots.DIAMOND_STORAGE, 2); // Facets live in the 3rd slot (0-indexed)

        const addressWidth = 20; // Addresses are 20 bytes
        const facets = await readArray(provider, address, facetsOffset, addressWidth);
        expect(facets.length).to.not.equal(0);

        // Read selectors
        const storageStart = addSlotOffset(proxies.slots.DIAMOND_STORAGE, 1); // facetToSelector in 2nd slot
        const facetAddress = "0x" + facets[0];
        const facetToSelectorSlot = joinSlot([facetAddress, storageStart]);
        const selectorWidth = 4;
        const got = await readArray(provider, address, facetToSelectorSlot, selectorWidth);
        expect(got.length).to.not.equal(0);
    });
});


describe('multiple proxy resolving', () => {
    cached_test('resolve WeightedRateSetCollectionPool', async ({ withCache, provider }) => {
        const address = "0x56C5Aef1296d004707475c8440f540DdA409b53D";
        const code = await withCache(
            `${address}_code`,
            async () => {
                return await provider.getCode(address)
            },
        );
        const program = disasm(code);

        expect(program.proxies.length).to.be.equal(4);
    });

});
