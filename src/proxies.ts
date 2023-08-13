import { ethers } from "ethers";

import { StorageProvider, CallProvider } from "./types";

export interface ProxyResolver {
    resolve(provider: StorageProvider|CallProvider, address: string, selector?: string): Promise<string>
    toString(): string,
}


// Some helpers:


const _zeroAddress = "0x0000000000000000000000000000000000000000";

// Convert 32 byte hex to a 20 byte hex address
function callToAddress(data:string): string {
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
        return callToAddress(await provider.getStorageAt(address, slotPosition));
    }
}

// 2016-era upgradeable proxy by Nick Johnson
// https://gist.github.com/Arachnid/4ca9da48d51e23e5cfe0f0e14dd6318f
export class LegacyUpgradeableProxyResolver extends BaseProxyResolver implements ProxyResolver {
    async resolve(provider: StorageProvider, address: string): Promise<string> {
        const slotPosition = 1; // // _dist is in the second slot
        return callToAddress(await provider.getStorageAt(address, slotPosition));
    }
}

const EIP1967FallbackSelectors = [
    "0x5c60da1b", // implementation()
    "0xda525716", // childImplementation()
    "0xa619486e", // masterCopy()
    "0xbb82aa5e", // comptrollerImplementation()
];

export class EIP1967ProxyResolver extends BaseProxyResolver implements ProxyResolver {
    async resolve(provider: StorageProvider & CallProvider, address: string): Promise<string> {
        // Is there an implementation defined?
        const implAddr = callToAddress(await provider.getStorageAt(address, slots.EIP1967_IMPL));
        if (implAddr !== _zeroAddress) {
            return implAddr;
        }

        // Gotta find the fallback...
        const fallbackAddr = callToAddress(await provider.getStorageAt(address, slots.EIP1967_BEACON));
        if (fallbackAddr === _zeroAddress) {
            return _zeroAddress;
        }

        // Possible optimizations for the future:
        // 1. We could getCode and finding the correct selector using disasm, but maybe not worth it with small number of calls.
        // 2. We could use multicall3 (if available)
        for (const selector of EIP1967FallbackSelectors) {
            try {
                const addr = callToAddress(await provider.call({
                    to: fallbackAddr,
                    data: selector,
                }));
                if (addr !== _zeroAddress) return addr;
            } catch (e: any) {
                if (e.toString().includes("reverted")) continue;
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
    async resolve(provider: StorageProvider & CallProvider, address: string, selector: string): Promise<string> {
        if (!selector) {
            throw "DiamondProxy requires a selector to resolve to a specific facet";
        } else if (selector.startsWith("0x")) {
            selector = selector.slice(2);
        }

        const facetMappingSlot = ethers.utils.keccak256(
            // ethers.utils.defaultAbiCoder.encode(["bytes4", "bytes32"], ["0x" + selector, slots.DIAMOND_STORAGE])
            "0x" + selector.padEnd(64, "0") + slots.DIAMOND_STORAGE.slice(2)
        );

        const facet = await provider.getStorageAt(address, facetMappingSlot);

        // It's a struct with a few fields, take the right 20 bytes
        const storageAddr = "0x" + facet.slice(facet.length - 40);
        if (storageAddr !== _zeroAddress) {
            return storageAddr;
        }

        // Try the selectors are a fallback
        for (const facetSelector of diamondSelectors) {
            try {
                const addr = callToAddress(await provider.call({
                    to: address,
                    data: facetSelector + selector,
                }));
                if (addr !== _zeroAddress) return addr;
            } catch (e: any) {
                if (e.toString().includes("reverted")) continue;
                throw e;
            }
        }
        return _zeroAddress;
    }

    // TODO: Would be cool if we could read the private facets storage and return known selectors too
    //
    // Notes:
    // 0x32400084c286cf3e17e7b677ea9583e60a000324 (ZkSync Era)
    // - The struct that contains the facet storage lives in 0xc8fcad8db84d3cc18b4c41d551ea0ee66dd599cde068d998e57d5e09332c131b:
    //     struct DiamondStorage {
    //       mapping(bytes4 => SelectorToFacet) selectorToFacet;
    //       mapping(address => FacetToSelectors) facetToSelectors;
    //       address[] facets;
    //       bool isFrozen;
    //     }
    // - There's an address[] in the 3rd position that we can read (slot 2 because 0-indexed)
    // - Adding 2 to the storage pointer, we get ending with d instead of b, reading that storage we get:
    //   cast storage $ADDRESS 0xc8fcad8db84d3cc18b4c41d551ea0ee66dd599cde068d998e57d5e09332c131d
    //   0x0000000000000000000000000000000000000000000000000000000000000005
    //   ^ Length of the array
    // - We hash the pointer to get the position of the first element:
    // - cast keccak 0xc8fcad8db84d3cc18b4c41d551ea0ee66dd599cde068d998e57d5e09332c131d
    //   0xc0d727610ea16241eff4447d08bb1b4595f7d2ec4515282437a13b7d0df4b922
    //   ^ first element position
    //   cast storage 0xc0d727610ea16241eff4447d08bb1b4595f7d2ec4515282437a13b7d0df4b922
    //   0x000000000000000000000000f1fb730b7f8e8391b27b91f8f791e10e4a53cecc
    //   ^ first element
    //   cast storage 0xc0d727610ea16241eff4447d08bb1b4595f7d2ec4515282437a13b7d0df4b923
    //   0x0000000000000000000000006df4a6d71622860dcc64c1fd9645d9a5be96f088
    //   ^ second element, etc
    // - Next we need to read slot 1 for each address: mapping(address => FacetToSelectors) facetToSelectors; 
    // - TODO: The rest of the owl
    //
    //async selectors(provider: StorageProvider, address: string): Promise<string[]> {
    //}
}

export class ZeppelinOSProxyResolver extends BaseProxyResolver implements ProxyResolver {
    async resolve(provider: StorageProvider, address: string): Promise<string> {
        return callToAddress(await provider.getStorageAt(address, slots.ZEPPELINOS_IMPL));
    }
}

export class PROXIABLEProxyResolver extends BaseProxyResolver implements ProxyResolver {
    async resolve(provider: StorageProvider, address: string): Promise<string> {
        return callToAddress(await provider.getStorageAt(address, slots.PROXIABLE));
    }
}

// https://github.com/0xsequence/wallet-contracts/blob/master/contracts/Wallet.sol
// Implementation pointer is stored in slot keyed on the deployed address.
export class SequenceWalletProxyResolver extends BaseProxyResolver implements ProxyResolver {
    async resolve(provider: StorageProvider, address: string): Promise<string> {
        return callToAddress(await provider.getStorageAt(address, address.toLowerCase().slice(2)));
    }

    toString(): string {
        return "SequenceWalletProxy";
    }
}

// FixedProxyResolver is used when we already know the resolved address
// No additional resolving required
// Example: EIP-1167
export class FixedProxyResolver extends BaseProxyResolver implements ProxyResolver {
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

    // Not sure why, there's a compiler optimization that adds 2 to the normal slot?
    // Would love to understand this, if people have ideas
    ["0xc8fcad8db84d3cc18b4c41d551ea0ee66dd599cde068d998e57d5e09332c131d"]: new DiamondProxyResolver("DiamondProxy"),
};
