//import { Provider } from "@ethersproject/abstract-provider";

interface StorageProvider {
    getStorageAt(address: string, slot: number|string, block?: string): Promise<string>
}

interface ProxyResolver {
    resolve(provider: StorageProvider, address: string): Promise<string>

    toString(): string,
}

export const GnosisSafeProxyResolver : ProxyResolver = {
    resolve(provider: StorageProvider, address: string): Promise<string> {
        return provider.getStorageAt(address, 0)
    },

    toString(): string {
        return "GnosisSafeProxy";
    }
}

export const EIP1967ProxyResolver : ProxyResolver = {
    resolve(provider: StorageProvider, address: string): Promise<string> {
        return provider.getStorageAt(address, "360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc");
    },

    toString(): string {
        return "EIP1967Proxy";
    }
}

export const ZeppelinOSProxyResolver : ProxyResolver = {
    resolve(provider: StorageProvider, address: string): Promise<string> {
        return provider.getStorageAt(address, "7050c9e0f4ca769c69bd3a8ef740bc37934f8e2c036e5a723fd8ee048ed3f8c3");
    },

    toString(): string {
        return "ZeppelinOSProxy";
    }
}

export const PROXIABLEProxyResolver : ProxyResolver = {
    resolve(provider: StorageProvider, address: string): Promise<string> {
        return provider.getStorageAt(address, "c5f16f0fcc639fa48a6947836d9850f504798523bf8c9a3a87d5876cf622bcf7");
    },

    toString(): string {
        return "PROXIABLEProxy";
    }
}


function NotImplemented(name: string) : ProxyResolver {
    return {
        resolve(provider: StorageProvider, address: string): Promise<string> {
            throw "NotImplemented: " + name;
        },

        toString(): string {
            return name;
        }
    }
}

// BYTE32's representing references to known proxy storage slots.
export const knownProxySlots : Record<string, ProxyResolver> = {
    // EIP-1967: Proxy Storage Slots
    // bytes32(uint256(keccak256('eip1967.proxy.implementation')) - 1)
    "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc": EIP1967ProxyResolver,

    // EIP-1967
    // Beacon slot is a fallback if implementation is not set.
    // bytes32(uint256(keccak256('eip1967.proxy.beacon')) - 1)).
    "0xa3f0ad74e5423aebfd80d3ef4346578335a9a72aeaee59ff6cb3582b35133d50": NotImplemented("eip1967.proxy.beacon"),

    // Beacon fallback has selectors:
    // - implementation()
    // - childImplementation()
    // - masterCopy() in Gnosis Safe
    // - comptrollerImplementation() in Compound

    // https://github.com/OpenZeppelin/openzeppelin-labs/blob/54ad91472fdd0ac4c34aa97d3a3da45c28245510/initializer_with_sol_editing/contracts/UpgradeabilityProxy.sol
    // bytes32(uint256(keccak256("org.zeppelinos.proxy.implementation")))
    "0x7050c9e0f4ca769c69bd3a8ef740bc37934f8e2c036e5a723fd8ee048ed3f8c3": ZeppelinOSProxyResolver,

    // ERC-1822: Universal Upgradeable Proxy Standard (UUPS)
    // bytes32(uint256(keccak256("PROXIABLE")))
    "0xc5f16f0fcc639fa48a6947836d9850f504798523bf8c9a3a87d5876cf622bcf7": PROXIABLEProxyResolver,

    // Gnosis Safe Proxy Factor 1.1.1
    // Not actually a slot, but there's a PUSH32 to the masterCopy() selector
    // masterCopy value lives in the 0th slot on the contract
    "0xa619486e00000000000000000000000000000000000000000000000000000000": GnosisSafeProxyResolver,

    // EIP-1167 minimal proxy standard
    // Parsed in disasm
};
