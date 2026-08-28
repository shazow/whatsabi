import { expect, describe, test } from 'vitest';

import * as Hash from 'ox/Hash';

import { cached_test, online_test, makeProvider } from './env';

import { disasm } from '../disasm';
import { addSlotOffset, readArray, joinSlot } from "../slots.js";
import { bytesToHex } from '../utils';
import * as proxies from '../proxies';

import { ZEPPELINOS_USDC, WANDERWING, LIVEPEER_MANAGER_PROXY } from './__fixtures__/proxies'

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

    test('SequenceWallet Proxy: uses a prefixed address-keyed slot', async () => {
        const address = "0x00Cd000000000000000000000000000000001234";
        const resolver = new proxies.SequenceWalletProxyResolver();
        const provider = {
            getStorageAt: async (_address: string, slot: number | string) => {
                expect(slot).toBe("0xcd000000000000000000000000000000001234");
                return "0x" + "00".repeat(32);
            },
        };

        await resolver.resolve(provider, address);
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

describe('proxy detection in the data segment', () => {
    // These are hand-built bytecodes for exercising the scan that looks for known
    // proxy slots in the data that lives after the end of the program:
    //
    //   600080fd        PUSH1 0x00 DUP1 REVERT   <- program, ends in a halt
    //   <data segment>                           <- everything after the halt
    //
    // We only reach that scan when no proxy was found in the program itself, so
    // the program here is deliberately trivial.
    const HALTING_PROGRAM = "600080fd";

    // Filler so that the data segment is long enough to be scanned even when the
    // end boundary is computed too aggressively.
    const FILLER = "11".repeat(32);

    // A solc-style CBOR metadata blob followed by its 2-byte big-endian length,
    // which is what solc appends to runtime bytecode:
    //   {"ipfs": <34-byte multihash>, "solc": <3 bytes>}
    // The blob itself is 51 bytes here, same as the real-world contract that
    // prompted this test, so the trailing length bytes are 0x0033.
    function cborMetadata(digest: string): string {
        const blob =
            "a2" +                       // map(2)
            "64" + "69706673" +          // "ipfs"
            "5822" + "1220" + digest +   // bytes(34): sha2-256 multihash
            "64" + "736f6c63" +          // "solc"
            "43" + "000606";             // bytes(3): 0.6.6
        const length = blob.length / 2;
        return blob + length.toString(16).padStart(4, "0");
    }

    const EIP1967_IMPL = proxies.slots.EIP1967_IMPL.slice(2);

    test('Slot ending flush against the CBOR metadata', async () => {
        // The slot value is the last thing before the metadata blob, so any
        // over-trimming of the metadata clips the tail of the slot and hides it.
        const bytecode = "0x" + HALTING_PROGRAM + FILLER + EIP1967_IMPL + cborMetadata("aa".repeat(32));

        const program = disasm(bytecode);
        expect(program.proxies.map(p => p.name)).toEqual(["EIP1967Proxy"]);
    });

    test('Slot inside the CBOR metadata is not a match', async () => {
        // Same shape, except the slot value only appears within the metadata blob.
        // Metadata is compiler output, not program data, so it stays out of the scan.
        const bytecode = "0x" + HALTING_PROGRAM + FILLER + FILLER + cborMetadata(EIP1967_IMPL);

        const program = disasm(bytecode);
        expect(program.proxies).toEqual([]);
    });

    test('Trailing bytes that are not a CBOR length', async () => {
        // Creation bytecode ends with constructor arguments, not with a metadata
        // length. Here the final 2 bytes (0x99a7) would be read as a 39335-byte
        // blob, which is longer than the whole bytecode.
        const constructorArgs = "000000000000000000000000490e379c9cff64944be82b849f8fd5972c7999a7";
        const bytecode = "0x" + HALTING_PROGRAM + FILLER + EIP1967_IMPL + cborMetadata("aa".repeat(32)) + constructorArgs;

        const program = disasm(bytecode);
        expect(program.proxies.map(p => p.name)).toEqual(["EIP1967Proxy"]);
    });

    // Polygon's UpgradableProxy hashes this string at runtime instead of embedding
    // the slot value, so the data segment carries the string and not the hash.
    const MATIC_SLOT_STRING = "matic.network.proxy.implementation";
    const MATIC_PREIMAGE = bytesToHex(new TextEncoder().encode(MATIC_SLOT_STRING)).slice(2);

    test('Slot pre-image in the data segment is a match', async () => {
        const bytecode = "0x" + HALTING_PROGRAM + FILLER + MATIC_PREIMAGE + cborMetadata("aa".repeat(32));

        const program = disasm(bytecode);
        expect(program.proxies.map(p => p.name)).toEqual(["MaticProxy"]);
    });

    test('Matic slot value in the data segment is a match', async () => {
        // A solc new enough to fold the keccak256 into a constant emits the slot
        // value itself, which the ordinary slot scan picks up without the pre-image.
        const bytecode = "0x" + HALTING_PROGRAM + FILLER + proxies.slots.MATIC_IMPL.slice(2) + cborMetadata("aa".repeat(32));

        const program = disasm(bytecode);
        expect(program.proxies.map(p => p.name)).toEqual(["MaticProxy"]);
    });

    test('Matic pre-image and slot constants agree', async () => {
        // Both constants are opaque hex in the source. Pin them to the string they
        // are derived from, so a typo fails here instead of silently never matching.
        expect(Object.keys(proxies.slotPreimages)).toContain("0x" + MATIC_PREIMAGE);
        expect(Hash.keccak256(new TextEncoder().encode(MATIC_SLOT_STRING), { as: "Hex" })).toEqual(proxies.slots.MATIC_IMPL);
    });

    test('Livepeer ManagerProxy', async () => {
        // No namespaced slot to match on: the implementation pointer lives in a
        // registry contract, so detection keys on the dispatch table instead.
        const program = disasm("0x" + LIVEPEER_MANAGER_PROXY);

        expect(Object.keys(program.selectors).sort()).toEqual(proxies.livepeerManagerProxySelectors.sort());
        expect(program.proxies.map(p => p.name)).toEqual(["LivepeerManagerProxy"]);
    });

    test('Livepeer ManagerProxy: resolves regardless of storage word prefixing', async () => {
        // Providers differ on whether getStorageAt prefixes the word. Sourcify's own
        // test doubles return it unprefixed, so both forms have to resolve the same.
        //
        // Assert the calldata, not just the address that comes back. The target id's
        // first byte is significant, so a resolver that blindly drops two characters
        // from an unprefixed word asks the registry about a key that does not exist,
        // and a call double that ignores its argument cannot see that happen.
        const resolver = new proxies.LivepeerManagerProxyResolver();
        const controller = "000000000000000000000000d8e8328501e9645d16cf49539efc04f734606ee4";
        // keccak256("BondingManagerTarget")
        const targetContractId = "fc6f6f33d2bb065ac61cbdd4dbe4b7adf6f3e7e6c6a3d1fe297cbf9a187092e4";
        const implementation = "000000000000000000000000be197fcbfe74de8f10460ea61644b006cc0f0bd2";

        for (const prefix of ["0x", ""]) {
            const stub = {
                getStorageAt: async (_address: string, slot: number | string) =>
                    prefix + (Number(slot) === 0 ? controller : targetContractId),
                call: async (tx: { to: string, data: string }) => {
                    expect(tx.to).toEqual("0xd8e8328501e9645d16cf49539efc04f734606ee4");
                    expect(tx.data).toEqual("0xe16c7d98" + targetContractId);
                    return prefix + implementation;
                },
            };

            const got = await resolver.resolve(stub, "0x35Bcf3c30594191d53231E4FF333E8A770453e40");
            expect(got).toEqual("0xbe197fcbfe74de8f10460ea61644b006cc0f0bd2");
        }
    });

    test('Livepeer ManagerProxy: a short storage response resolves to nothing', async () => {
        // A provider that answers "0x" rather than a zero word would otherwise produce
        // a malformed address that still reads as non-zero to the caller.
        const resolver = new proxies.LivepeerManagerProxyResolver();
        const stub = {
            getStorageAt: async () => "0x",
            call: async () => "0x",
        };

        const got = await resolver.resolve(stub, "0x35Bcf3c30594191d53231E4FF333E8A770453e40");
        expect(got).toEqual("0x0000000000000000000000000000000000000000");
    });
});

describe('metadata extraction', () => {
    const HALTING_PROGRAM = "600080fd";
    const FILLER = "11".repeat(32);

    test('solc {ipfs, solc} metadata is extracted', async () => {
        const digest = "ab".repeat(32);
        const metadata =
            "a2" +                       // map(2)
            "64" + "69706673" +          // "ipfs"
            "5822" + "1220" + digest +   // bytes(34): sha2-256 multihash
            "64" + "736f6c63" +          // "solc"
            "43" + "000606" +            // bytes(3): 0.6.6
            "0033";                      // 51-byte blob length
        const bytecode = "0x" + HALTING_PROGRAM + FILLER + metadata;

        const program = disasm(bytecode);
        expect(program.metadata).toEqual({
            ipfs: "0x1220" + digest,
            solc: "0x000606",
        });
    });

    test('no metadata extracted from constructor arguments', async () => {
        // Creation bytecode tail is constructor arguments, not CBOR metadata.
        const constructorArgs = "000000000000000000000000490e379c9cff64944be82b849f8fd5972c7999a7";
        const bytecode = "0x" + HALTING_PROGRAM + FILLER + constructorArgs;

        const program = disasm(bytecode);
        expect(program.metadata).toBeUndefined();
    });
});

describe('known proxy resolving', () => {
    test('Diamond Proxy: ABI-pads selector arguments and ignores empty responses', async () => {
        const selector = "0x12345678";
        const calldata: string[] = [];
        const provider = {
            getStorageAt: async () => "0x" + "00".repeat(32),
            call: async (tx: { data: string }) => {
                calldata.push(tx.data);
                return calldata.length === 1 ? "0x" : "0x" + "00".repeat(12) + "11".repeat(20);
            },
        };

        const got = await new proxies.DiamondProxyResolver("DiamondProxy").resolve(provider, "0x" + "22".repeat(20), selector);

        expect(calldata).toEqual([
            "0xcdffacc6" + selector.slice(2).padEnd(64, "0"),
            "0x0d741577" + selector.slice(2).padEnd(64, "0"),
        ]);
        expect(got).toBe("0x" + "11".repeat(20));
    });

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

    cached_test('Matic Proxy: DAI on Polygon', async ({ withCache }) => {
        // Polygon PoS bridged tokens use Polygon's own UpgradableProxy. The slot is
        // keccak256("matic.network.proxy.implementation"), computed at runtime by
        // solc 0.6.6, so only the pre-image scan finds it.
        const provider = makeProvider("https://polygon-bor-rpc.publicnode.com");
        const address = "0x8f3cf7ad23cd3cadbd9735aff958023239c6a063";
        const code = await withCache(
            `polygon-${address}_code`,
            async () => {
                return await provider.getCode(address)
            },
        );

        const program = disasm(code);
        expect(program.proxies.map(p => p.name)).toEqual(["MaticProxy"]);

        const resolver = program.proxies[0];
        const got = await resolver.resolve(provider, address);

        const wantImplementation = "0x490e379c9cff64944be82b849f8fd5972c7999a7";
        expect(got).toEqual(wantImplementation);
    });

    cached_test('Livepeer ManagerProxy: BondingManager on Arbitrum', async ({ withCache }) => {
        const provider = makeProvider("https://arb1.arbitrum.io/rpc");
        const address = "0x35Bcf3c30594191d53231E4FF333E8A770453e40";
        const code = await withCache(
            `arbitrum-${address}_code`,
            async () => {
                return await provider.getCode(address)
            },
        );

        const program = disasm(code);
        expect(program.proxies.map(p => p.name)).toEqual(["LivepeerManagerProxy"]);

        const resolver = program.proxies[0];
        const got = await resolver.resolve(provider, address);

        const wantImplementation = "0xbe197fcbfe74de8f10460ea61644b006cc0f0bd2";
        expect(got).toEqual(wantImplementation);

        // The target inherits controller(), setController(address) and
        // targetContractId() from the same base contract, so it carries all three
        // selectors too. Matching a subset would call every Livepeer manager
        // implementation a proxy, so check the implementation stays unmatched.
        const implCode = await withCache(
            `arbitrum-${wantImplementation}_code`,
            async () => {
                return await provider.getCode(wantImplementation)
            },
        );
        expect(disasm(implCode).proxies).toEqual([]);
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

describe('comprehensive proxy detection', () => {
    const diamondProxies = [
        "0x32400084c286cf3e17e7b677ea9583e60a000324",
        "0x3caca7b48d0573d793d3b0279b5f0029180e83b6",
        "0xc1e088fc1323b20bcbee9bd1b9fc9546db5624c5",
        "0x1231deb6f5749ef6ce6943a275a1d3e7486f4eae",
        "0x1c073d5045b1abb6924d5f0f8b2f667b1653a4c3",
        "0xe21ebcd28d37a67757b9bc7b290f4c4928a430b1",
        "0x226bf5293692610692e2c996c9875c914d2a7f73",
        "0x07f4d0691ee248b46fb71afa15f28a08d951a002",
        "0xd57474e76c9ebecc01b65a1494f0a1211df7bcd8",
    ];

    diamondProxies.map((address) => {
        cached_test('DiamondProxy: ' + address, async({ withCache, provider }) => {
            const address = "0x1231deb6f5749ef6ce6943a275a1d3e7486f4eae";
            const code = await withCache(
                `${address}_code`,
                async () => {
                    return await provider.getCode(address)
                },
            );
            const program = disasm(code);
            expect(program.proxies.length).toEqual(1);
            const resolver = program.proxies[0];
            expect(resolver.name).toEqual("DiamondProxy");

            const facets = await (resolver as proxies.DiamondProxyResolver).facets(provider, address, { limit: 1 });
            expect(facets).to.not.be.empty;
        });
    });

    cached_test('DiamondProxy: LiFi on Base', async({ withCache }) => {
        // For issue #139: https://github.com/shazow/whatsabi/issues/139
        const provider = makeProvider("https://base-rpc.publicnode.com");
        const address = "0x1231deb6f5749ef6ce6943a275a1d3e7486f4eae";
        const code = await withCache(
            `base-${address}_code`,
            async () => {
                return await provider.getCode(address)
            },
        );

        const program = disasm(code);
        expect(program.proxies.length).toEqual(1);
        const resolver = program.proxies[0];
        expect(resolver.name).toEqual("DiamondProxy");

        const selector = "0x736eac0b";
        const got = await resolver.resolve(provider, address, selector);
        expect(got).not.toEqual("0x0000000000000000000000000000000000000000");

        const facets = await (resolver as proxies.DiamondProxyResolver).facets(provider, address, { limit: 1 });
        expect(facets).to.not.be.empty;
    });

});
