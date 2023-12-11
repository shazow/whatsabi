import { expect, describe, test } from 'vitest';

import { cached_test, online_test } from './env';

import { disasm } from '../disasm';
import { addSlotOffset, readArray } from "../slots.js";
import * as proxies from '../proxies';

import { ZEPPELINOS_USDC } from './__fixtures__/proxies'

const ZKSYNC_FACETS = {
    '0x9b1a10bdc4a40219544c835263b2ca3f3e689693': ['0x0c4dd810', '0xce9dcf16', '0x7739cbe7', '0xa9a2d18a'],
    '0xa389bf185b301c8e20e79e3098e71399914035df': ['0x6c0960f9', '0xb473318e', '0x042901c7', '0x263b7f8e', '0xe4948f43', '0xeb672419'],
    '0xf002dfbc52c250a2e14c148041adb8567a0b19bd': ['0xe58bb639', '0xed6d06c0', '0x86cb9909', '0x0707ac09', '0xf235757f', '0x1cc5d103', '0xbe6f11cf', '0x4623c91d', '0x5437988d', '0x0b508883',],
    '0xab458acbd8ff9b6cf7b8a029705a02f70dcdbf7d': ['0x73fb9297', '0x36d4eb84', '0x27ae4c16', '0x0551448c', '0x8043760a', '0xbeda4b12', '0x17338945', '0x587809c7',],
    '0x8c0f38f13526fcb379a80b87f4debdbcc9caecbd': ['0xcdffacc6', '0x52ef6b2c', '0xadfca15e', '0x7a0ed627', '0xa7cd63b7', '0xfe10226d', '0x79823c9a', '0x4fc07d75', '0xd86970d8', '0xfd791f3c', '0x8665b150', '0x631f4bac', '0x0ec6b0b7', '0x1b60e626', '0xe39d3bff', '0x0ef240a0', '0xfe26699e', '0x39607382', '0xaf6a2dcd', '0xa1954fc5', '0xa39980a0', '0x46657fe9', '0x18e3a941', '0x3db920ce', '0x29b98c67', '0xbd7c5412', '0xc3bbd2d7', '0xe81e0ba1', '0xfacd743b', '0x9cd939e4', '0x56142d7a', '0x74f4d30d'],
};

// TODO: Test for proxy factories to not match

describe('proxy detection', () => {
    test('Minimal Proxy Pattern', async () => {
        // https://eips.ethereum.org/EIPS/eip-1167
        const bytecode = "0x3d602d80600a3d3981f3363d3d373d3d3d363d73bebebebebebebebebebebebebebebebebebebebe5af43d82803e903d91602b57fd5bf3";

        const program = disasm(bytecode);
        expect(program.proxies[0]).toBeInstanceOf(proxies.FixedProxyResolver);
        const proxy = program.proxies[0] as proxies.FixedProxyResolver;
        expect(proxy.resolvedAddress).toBe("0xbebebebebebebebebebebebebebebebebebebebe");
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
        // FIXME: Need to refactor proxySlots, since the slot is dynamic
        const bytecode = "0x363d3d373d3d3d363d30545af43d82803e903d91601857fd5bf3";
        const program = disasm(bytecode);
        expect(program.proxies[0]).toBeInstanceOf(proxies.SequenceWalletProxyResolver);
    });

    test('Gnosis Safe Proxy Factory', async () => {
        // https://eips.ethereum.org/EIPS/eip-1167
        const bytecode = "0x608060405273ffffffffffffffffffffffffffffffffffffffff600054167fa619486e0000000000000000000000000000000000000000000000000000000060003514156050578060005260206000f35b3660008037600080366000845af43d6000803e60008114156070573d6000fd5b3d6000f3fea265627a7a72315820d8a00dc4fe6bf675a9d7416fc2d00bb3433362aa8186b750f76c4027269667ff64736f6c634300050e0032";

        const program = disasm(bytecode);
        expect(program.proxies[0]).toBeInstanceOf(proxies.GnosisSafeProxyResolver);
    });

    test('ZeppelinOS Proxy', async () => {
        const bytecode = ZEPPELINOS_USDC;
        const program = disasm(bytecode);
        expect(program.proxies[0]).toBeInstanceOf(proxies.ZeppelinOSProxyResolver);
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
        const wantImplementation = "0x8430be7b8fd28cc58ea70a25c9c7a624f26f5d09";

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
        const selector = "0xeb672419"; // requestL2Transaction(address _contractL2,uint256 _l2Value,bytes _calldata,uint256 _l2GasLimit,uint256 _l2GasPerPubdataByteLimit,bytes[] _factoryDeps,address _refundRecipient)
        const got = await resolver.resolve(provider, address, selector);

        // ZkSync updates their proxies so it's annoying to maintain the desired mapping
        expect(got).not.toEqual("0x0000000000000000000000000000000000000000");
    });

    online_test('EIP-2535 Diamond Proxy: Read facets from internal storage', async ({ provider }) => {
        const address = "0x32400084C286CF3E17e7B677ea9583e60a000324";
        const resolver = new proxies.DiamondProxyResolver();
        const got = await resolver.facets(provider, address);

        expect(got).to.equal(ZKSYNC_FACETS);
    });

    // FIXME: Is there one on mainnet? Seems they're all on polygon
    //online_test('SequenceWallet Proxy', async() => {
    //});
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

    online_test('ReadArray: Addresses', async ({ provider }) => {
        const address = "0x32400084C286CF3E17e7B677ea9583e60a000324";
        const facetsOffset = addSlotOffset(proxies.slots.DIAMOND_STORAGE, 2); // Facets live in the 3rd slot (0-indexed)

        const addressWidth = 20; // Addresses are 20 bytes
        const facets = await readArray(provider, address, facetsOffset, addressWidth);

        expect(
            facets.map(h => "0x" + h)
        ).toStrictEqual([
            "0x409560de546e057ce5bd5db487edf2bb5e785bab",
            "0xf3acf6a03ea4a914b78ec788624b25cec37c14a4",
            "0x63b5ec36b09384ffa7106a80ec7cfdfca521fd08",
            "0x9e3fa34a10619fedd7ae40a3fb86fa515fcfd269",
        ]);
    });

    online_test('ReadArray: Selectors', async ({ provider }) => {
        // TODO: ...
    });
});
