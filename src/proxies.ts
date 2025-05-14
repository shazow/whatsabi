/**
 * @module proxies
 * This module contains code to resolve a variety of types of proxies.
 *
 * The resolvers are detected and configured by whatsabi.autoload(...).
 *
 * If you already know which proxy it is and how it's configured, then the resolvers could be used manually too.
 *
 * @example
 * Using WhatsABI to only resolve proxies with a known bytecode:
 * ```ts
 * const address = "0x...";
 *
 * // Skip this and use the regular `provider` if you don't already have the bytecode or don't care about saving an RPC call. :)
 * const bytecode = "0x..."; // Already loaded from somewhere
 * const cachedCodeProvider = whatsabi.providers.WithCachedCode(provider, {
 *   [address]: bytecode,
 * });
 *
 * const result = whatsabi.autoload(address, {
 *   provider: cachedCodeProvider,
 *   abiLoader: false, // Skip ABI loaders
 *   signatureLookup: false, // Skip looking up selector signatures
 * })
 *
 * if (result.address !== address) console.log(`Resolved proxy: ${address} -> ${result.address}`);
 * if (result.proxies.length > 0) console.log("Proxies detected:", result.proxies);
 * // Note that some proxies can only be resolved relative to a selector, like DiamondProxy. These will need to be resolved manually via result.proxies.
 * ```
 *
 * @example
 * Resolve a DiamondProxy:
 * ```ts
 * // Let's say we have a result with a DiamondProxy in it, from the above example
 * const resolver = result.proxies[0] as whatsabi.proxies.DiamondProxyResolver;
 * 
 * // DiamondProxies have different contracts mapped relative to the selector,
 * // so we must resolve them against a selector.
 * const selector = "0x6e9960c3";  // function getAdmin() returns (address)
 *
 * const implementationAddress = await resolver.resolve(provider, address, selector);
 * ```
 *
 * @example
 * Get all facets and selectors for a DiamondProxy:
 * ```ts
 * // Let's say we have a result with a DiamondProxy in it, from the above example
 * const diamondResolver = result.proxies[0] as DiamondProxyResolver;
 * const facets = await diamondResolver.facets(provider, address); // All possible address -> selector[] mappings
 * ```
 */
import type { StorageProvider, CallProvider } from "./providers.js";
import { addSlotOffset, readArray, joinSlot } from "./slots.js";
import { addressWithChecksum } from "./utils.js";

export interface ProxyResolver {
    readonly name: string;
    resolve(provider: StorageProvider|CallProvider, address: string, selector?: string): Promise<string>
    toString(): string,
}


// Some helpers:

const _zeroAddress = "0x0000000000000000000000000000000000000000";

// Convert 32 byte hex to a 20 byte hex address
function addressFromPadded(data:string): string {
    return "0x" + data.slice(data.length - 40);
}


// Resolvers:

export class BaseProxyResolver {
    name: string;

    constructor(name?: string) {
        this.name = name || this.constructor.name;
    }

    toString(): string {
        return this.name;
    }
}

export class GnosisSafeProxyResolver extends BaseProxyResolver implements ProxyResolver {
    async resolve(provider: StorageProvider, address: string): Promise<string> {
        const slotPosition = 0; // masterCopy() is always first slot
        return addressFromPadded(await provider.getStorageAt(address, slotPosition));
    }
}

// 2016-era upgradeable proxy by Nick Johnson
// https://gist.github.com/Arachnid/4ca9da48d51e23e5cfe0f0e14dd6318f
export class LegacyUpgradeableProxyResolver extends BaseProxyResolver implements ProxyResolver {
    async resolve(provider: StorageProvider, address: string): Promise<string> {
        const slotPosition = 1; // // _dist is in the second slot
        return addressFromPadded(await provider.getStorageAt(address, slotPosition));
    }
}

const EIP1967FallbackSelectors = [
    "0x5c60da1b", // implementation()
    "0xda525716", // childImplementation()
    "0xa619486e", // masterCopy()
    "0xbb82aa5e", // comptrollerImplementation()
];

export class EIP1967ProxyResolver extends BaseProxyResolver implements ProxyResolver {
    override name = "EIP1967Proxy";

    async resolve(provider: StorageProvider & CallProvider, address: string): Promise<string> {
        // Is there an implementation defined?
        const implAddr = addressFromPadded(await provider.getStorageAt(address, slots.EIP1967_IMPL));
        if (implAddr !== _zeroAddress) {
            return implAddr;
        }

        // Gotta find the fallback...
        const fallbackAddr = addressFromPadded(await provider.getStorageAt(address, slots.EIP1967_BEACON));
        if (fallbackAddr === _zeroAddress) {
            return _zeroAddress;
        }

        // Possible optimizations for the future:
        // 1. We could getCode and finding the correct selector using disasm, but maybe not worth it with small number of calls.
        // 2. We could use multicall3 (if available)
        for (const selector of EIP1967FallbackSelectors) {
            try {
                const addr = addressFromPadded(await provider.call({
                    to: fallbackAddr,
                    data: selector,
                }));
                if (addr !== _zeroAddress) return addr;
            } catch (e: any) {
                if (e.toString().includes("revert")) continue;
                throw e;
            }
        }
        return _zeroAddress;
    }
}

const diamondSelectors = [
    "0xcdffacc6", // Diamond Loupe uses selector "0xcdffacc6": facetAddress(bytes4 _functionSelector)
    "0x0d741577", // Some implementations (OpenZeppelin) use selector "0x0d741577": implementation(bytes4 func)
];

// ERC2535 - Diamond/Facet Proxy
export class DiamondProxyResolver extends BaseProxyResolver implements ProxyResolver {
    override name = "DiamondProxy";
    readonly storageSlot : string;

    constructor(name: string, overrideStorageSlot?: string) {
        super(name);
        this.storageSlot = overrideStorageSlot ?? slots.DIAMOND_STORAGE;
    }

    async resolve(provider: StorageProvider & CallProvider, address: string, selector: string): Promise<string> {
        if (!selector) {
            throw "DiamondProxy requires a selector to resolve to a specific facet";
        } else if (selector.startsWith("0x")) {
            selector = selector.slice(2);
        }

        // Selectors are considered "strings and byte arrays" so they're "unpadded data" (ie. end-padded) as opposed to start-padded like addresses etc.
        //
        // ethers.utils.defaultAbiCoder.encode(["bytes4", "bytes32"], ["0x" + selector, slots.DIAMOND_STORAGE])
        // keccak256("0x" + selector.padEnd(64, "0") + slots.DIAMOND_STORAGE.slice(2));
        const facetMappingSlot = joinSlot([selector.padEnd(64, "0"), this.storageSlot]);

        const facet = await provider.getStorageAt(address, facetMappingSlot);

        // It's a struct with a few fields, take the right 20 bytes
        const storageAddr = "0x" + facet.slice(facet.length - 40);
        if (storageAddr !== _zeroAddress) {
            return storageAddr;
        }

        // Try the selectors are a fallback
        for (const facetSelector of diamondSelectors) {
            try {
                const addr = addressFromPadded(await provider.call({
                    to: address,
                    data: facetSelector + selector,
                }));
                if (addr !== _zeroAddress) return addr;
            } catch (e: any) {
                if (e.toString().includes("revert")) continue;
                throw e;
            }
        }
        return _zeroAddress;
    }

    // Return the facet-to-selectors mapping
    // Note that this does not respect frozen facet state.
    async facets(provider: StorageProvider, address: string, config?: { limit: number }): Promise<Record<string, string[]>> {
        // limit is used to get partial results, mainly for testing
        let limit = config?.limit || 0;

        // Would be cool if we could read the private facets storage and return known selectors... let's do it!
        //
        // Shoutout to @banteg for sharing the rest of the owl:
        // - https://twitter.com/shazow/status/1693636008179343598
        // - https://gist.github.com/banteg/0cee21909f7c1baedfa6c3d96ffe94f2

        // TODO: Respect frozen facets?
        // let isFrozen = false;
        // if (config && !config.ignoreFrozen) {
        //     const isFrozenOffset = addSlotOffset(storageStart, 3); // isFrozen
        //     const isFrozenWord = await provider.getStorageAt(address, isFrozenOffset);
        //     isFrozen = isFrozenWord.slice(-1) === "1"
        // }
        // ... the rest of the owl :3

        // 1. Read the DiamondStorage.facets array
        //
        // struct DiamondStorage {
        //   mapping(bytes4 => SelectorToFacet) selectorToFacet;
        //   mapping(address => FacetToSelectors) facetToSelectors;
        //   address[] facets;
        //   bool isFrozen;
        // }
        const storageStart = this.storageSlot;

        const facetsOffset = addSlotOffset(storageStart, 2); // Facets live in the 3rd slot (0-indexed)
        const addressWidth = 20; // Addresses are 20 bytes
        const facets = await readArray(provider, address, facetsOffset, addressWidth);

        // 2. Read FacetToSelectors.selectors[] via facetToSelectors[address].selectors[]
        //
        // struct FacetToSelectors {
        //     bytes4[] selectors;
        //     uint16 facetPosition;
        // }

        const selectorWidth = 4;
        const facetSelectors : Record<string, string[]> = {};
        const slot = addSlotOffset(storageStart, 1); // facetToSelector in 2nd slot
        for (const f of facets) {
            const facet = addressFromPadded(f);
            const facetSelectorsSlot = joinSlot([facet, slot]);
            const selectors = await readArray(provider, address, facetSelectorsSlot, selectorWidth);
            facetSelectors[addressWithChecksum(facet)] = selectors.map(s => "0x" + s);

            if (--limit === 0) break;
        }

        return facetSelectors;
    }

    // Return all of the valid selectors that work on this DiamondProxy.
    // Note that this does not respect frozen facet state.
    async selectors(provider: StorageProvider, address: string): Promise<string[]> {
        // Get values from the mapping
        const f = await this.facets(provider, address);
        return Object.values(f).flat();
    }
}

export class ZeppelinOSProxyResolver extends BaseProxyResolver implements ProxyResolver {
    override name = "ZeppelinOSProxy";

    async resolve(provider: StorageProvider, address: string): Promise<string> {
        return addressFromPadded(await provider.getStorageAt(address, slots.ZEPPELINOS_IMPL));
    }
}

export class PROXIABLEProxyResolver extends BaseProxyResolver implements ProxyResolver {
    override name = "PROXIABLEProxy";

    async resolve(provider: StorageProvider, address: string): Promise<string> {
        return addressFromPadded(await provider.getStorageAt(address, slots.PROXIABLE));
    }
}

// https://github.com/0xsequence/wallet-contracts/blob/master/contracts/Wallet.sol
// Implementation pointer is stored in slot keyed on the deployed address.
export class SequenceWalletProxyResolver extends BaseProxyResolver implements ProxyResolver {
    override name = "SequenceWalletProxy";

    async resolve(provider: StorageProvider, address: string): Promise<string> {
        return addressFromPadded(await provider.getStorageAt(address, address.toLowerCase().slice(2)));
    }
}

// FixedProxyResolver is used when we already know the resolved address
// No additional resolving required
// Example: EIP-1167
export class FixedProxyResolver extends BaseProxyResolver implements ProxyResolver {
    override name = "FixedProxy";
    readonly resolvedAddress : string;

    constructor(name: string, resolvedAddress: string) {
        super(name);
        this.resolvedAddress = resolvedAddress;
    }

    async resolve(provider: StorageProvider, address: string): Promise<string> {
        return this.resolvedAddress;
    }
};


// Lookups:


// BYTE32's representing references to known proxy storage slots.
export const slots : Record<string, string> = {
    // EIP-1967: Proxy Storage Slots
    // bytes32(uint256(keccak256('eip1967.proxy.implementation')) - 1)
    EIP1967_IMPL: "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc",

    // EIP-1967
    // Beacon slot is a fallback if implementation is not set.
    // bytes32(uint256(keccak256('eip1967.proxy.beacon')) - 1)).
    // Beacon fallback has selectors:
    // - implementation()
    // - childImplementation()
    // - masterCopy() in Gnosis Safe
    // - comptrollerImplementation() in Compound
    EIP1967_BEACON: "0xa3f0ad74e5423aebfd80d3ef4346578335a9a72aeaee59ff6cb3582b35133d50",

    // https://github.com/OpenZeppelin/openzeppelin-labs/blob/54ad91472fdd0ac4c34aa97d3a3da45c28245510/initializer_with_sol_editing/contracts/UpgradeabilityProxy.sol
    // bytes32(uint256(keccak256("org.zeppelinos.proxy.implementation")))
    ZEPPELINOS_IMPL: "0x7050c9e0f4ca769c69bd3a8ef740bc37934f8e2c036e5a723fd8ee048ed3f8c3",

    // ERC-1822: Universal Upgradeable Proxy Standard (UUPS)
    // bytes32(uint256(keccak256("PROXIABLE")))
    PROXIABLE: "0xc5f16f0fcc639fa48a6947836d9850f504798523bf8c9a3a87d5876cf622bcf7",

    // Gnosis Safe Proxy Factor 1.1.1
    // Not actually a slot, but there's a PUSH32 to the masterCopy() selector
    // masterCopy value lives in the 0th slot on the contract
    GNOSIS_SAFE_SELECTOR: "0xa619486e00000000000000000000000000000000000000000000000000000000",

    // Diamond Proxy, as used by ZkSync Era contract
    // https://etherscan.io/address/0x32400084c286cf3e17e7b677ea9583e60a000324#code
    // keccak256("diamond.standard.diamond.storage") - 1;
    DIAMOND_STORAGE: "0xc8fcad8db84d3cc18b4c41d551ea0ee66dd599cde068d998e57d5e09332c131b",

    // Same as above but some implementations don't do -1
    DIAMOND_STORAGE_1: "0xc8fcad8db84d3cc18b4c41d551ea0ee66dd599cde068d998e57d5e09332c131c",

    // EIP-1167 minimal proxy standard
    // Parsed in disasm
}


export const slotResolvers : Record<string, ProxyResolver> = {
    [slots.EIP1967_IMPL]: new EIP1967ProxyResolver("EIP1967Proxy"),
    [slots.EIP1967_BEACON]: new EIP1967ProxyResolver("EIP1967Proxy"),
    [slots.ZEPPELINOS_IMPL]: new ZeppelinOSProxyResolver("ZeppelinOSProxy"),
    [slots.PROXIABLE]: new PROXIABLEProxyResolver("PROXIABLE"),
    [slots.GNOSIS_SAFE_SELECTOR]: new GnosisSafeProxyResolver("GnosisSafeProxy"),
    [slots.DIAMOND_STORAGE]: new DiamondProxyResolver("DiamondProxy"),
    [slots.DIAMOND_STORAGE_1]: new DiamondProxyResolver("DiamondProxy", slots.DIAMOND_STORAGE_1),

    // Not sure why, there's a compiler optimization that adds 1 or 2 to the normal slot?
    // Would love to understand this, if people have ideas
    "0xc8fcad8db84d3cc18b4c41d551ea0ee66dd599cde068d998e57d5e09332c131d": new DiamondProxyResolver("DiamondProxy"),

    // Off-by-one slot version of EIP1967, some examples in the wild who choose to do the -1 at runtime (See issue #178)
    "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbd": new EIP1967ProxyResolver("EIP1967Proxy"),
};
