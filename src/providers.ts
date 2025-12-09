import { bytesToHex } from "./utils.js";
import * as errors from "./errors.js";


export interface StorageProvider {
    getStorageAt(address: string, slot: number | string, block?: BlockTagOrNumber): Promise<string>
}

export interface CallProvider {
    call(transaction: { to: string, data: string }, block?: BlockTagOrNumber): Promise<string>;
}

export interface CodeProvider {
    getCode(address: string, block?: BlockTagOrNumber): Promise<string>;
}

export interface ENSProvider {
    getAddress(name: string): Promise<string>;
}

export interface Provider extends StorageProvider, CallProvider, CodeProvider, ENSProvider { };


export interface AnyProvider { }; // TODO: Can we narrow this more?


export type BlockTagOrNumber = 'latest' | 'earliest' | 'pending' | 'safe' | 'finalized' | number | bigint;

function fromBlockTagOrNumber(block: BlockTagOrNumber): string {
    if (typeof block === 'number' || typeof block === 'bigint') {
        return bytesToHex(block);
    }
    return block;
}


interface EIP1193RequestArguments {
    readonly method: string;
    readonly params?: readonly unknown[] | object;
}

interface EIP1193 {
    request(args: EIP1193RequestArguments): Promise<unknown>;
}


// Abstract away web3 provider inconsistencies

function isCompatibleProvider(provider: any): boolean {
    // FIXME: Is there a better way to use the TypeScript type system to do this?
    // `provider isinstance Provider` does not work because Provider is an interface, not a class. Should it be?
    return (
        typeof provider.getStorageAt === "function" &&
        typeof provider.call === "function" &&
        typeof provider.getCode === "function" &&
        typeof provider.getAddress === "function"
    );
}

export function CompatibleProvider(provider: any): Provider {
    if (isCompatibleProvider(provider)) {
        // Already compatible, avoid rewrapping it
        return provider;
    }
    if (typeof provider.getAddress === "function") {
        return new HighLevelProvider(provider);
    }
    if (typeof provider.resolveName === "function") {
        // Ethers-like
        if (typeof provider.send === "function") {
            return new EthersProvider(provider);
        }
        // Probably FallbackProvider or a different custom wrapper?
        // Need to use higher-level functions.
        return new HighLevelProvider(provider);
    }
    if (typeof provider.getEnsAddress === "function") {
        return new ViemProvider(provider);
    }
    if (typeof provider?.eth?.ens?.getAddress === "function") {
        return new Web3Provider(provider);
    }
    if (typeof provider.request === "function") {
        // Might be a viem transport, or something else
        return new RPCProvider(provider);
    }

    throw new errors.ProviderError("Unsupported provider, please open an issue: https://github.com/shazow/whatsabi/issues", {
        context: { provider },
    });
}

/**
 * Wrap an existing provider into one that will return a fixed getCode result for items defined in codeCache.
 * The cache is treated as read-only, it will not be updated. Mainly used to avoid an extra RPC call when we already have the bytcode.
 *
 * For more advanced behaviours, consider copying this code and modifying it to your needs.
 *
 * @param provider - Any existing provider
 * @param codeCache - Object containing address => code mappings
 * @returns {Provider} - Provider that will return a fixed getCode result for items defined in codeCache.
 * @example
 * ```ts
 * const address = "0x0000000000000000000000000000000000000001";
 * const bytecode = "0x6001600101"
 * const cachedProvider = WithCachedCode(provider, {
 *   [address]: bytecode,
 * });
 * const code = await cachedProvider.getCode(address);
 * console.log(code); // "0x6001600101"
 * ```
 */
export function WithCachedCode(provider: AnyProvider, codeCache: Record<string, string>): Provider {
    const compatibleProvider = CompatibleProvider(provider);
    const p = Object.create(compatibleProvider); // use compatibleProvider as the prototype
    p.getCode = async function getCode(address: string): Promise<string> {
        if (codeCache[address]) {
            return codeCache[address];
        }
        return await compatibleProvider.getCode(address);
    };
    return p;
}

/**
 * Wrap an existing Provider into one that will always use a specified
 * blockTag for requests.
 *
 * This helper is to avoid plumbing the blockTag throughout the whatsabi stack,
 * and because it's more ergonomic to use the same blockTag consistently across
 * a given provider.
 *
 * @param provider - An existing Provider
 * @param blockNumber - Block tag or number to use for all requests
 * @returns {Provider} - Provider that will use the specified blockTag for all requests.
 * @example
 * ```ts
 * import { createPublicClient, http } from 'viem'
 * import { mainnet } from 'viem/chains'
 * const client = createPublicClient({ chain: mainnet, transport: http() })
 * const blockNumber = await client.getBlockNumber() // or "latest", "earliest", etc.
 * const blockProvider = whatsabi.providers.WithBlockNumber(client, blockNumber);
 * const r = await whatsabi.autoload(address, { provider: blockProvider });
 */
export function WithBlockNumber(provider: Provider, blockNumber: BlockTagOrNumber): Provider {
    const p = Object.create(provider); // use compatibleProvider as the prototype
    p.getCode = async function getCode(address: string): Promise<string> {
        return await provider.getCode(address, blockNumber);
    };
    p.getStorageAt = async function getStorageAt(address: string, slot: number | string): Promise<string> {
        return await provider.getStorageAt(address, slot, blockNumber);
    };
    p.call = async function call(transaction: { to: string, data: string }): Promise<string> {
        return await provider.call(transaction, blockNumber);
    };
    return p;
}


// RPCProvider thesis is: let's stop trying to adapt to every RPC wrapper library's high-level functions
// and instead have a discovery for the lowest-level RPC call function that we can use directly.
// At least whenever possible. Higher-level functionality like getAddress is still tricky.
class RPCProvider implements Provider, EIP1193 {
    provider: any;

    constructor(provider: any) {
        this.provider = provider;
    }

    // Based on EIP-1193
    request(req: { method: string, params?: object | Array<unknown> }): Promise<any> {
        return this.provider.request(req);
    }

    getStorageAt(address: string, slot: number | string, block: BlockTagOrNumber = "latest"): Promise<string> {
        return this.request({
            method: "eth_getStorageAt",
            params: [
                address,
                typeof slot === 'number' ? bytesToHex(slot) : slot,
                fromBlockTagOrNumber(block),
            ],
        });
    }

    call(transaction: { to: string, data: string }, block: BlockTagOrNumber = "latest"): Promise<string> {
        return this.request({
            method: "eth_call",
            params: [
                {
                    from: "0x0000000000000000000000000000000000000001",
                    to: transaction.to,
                    data: transaction.data,
                },
                fromBlockTagOrNumber(block),
            ],
        });
    }

    getCode(address: string, block: BlockTagOrNumber = "latest"): Promise<string> {
        return this.request({
            method: "eth_getCode",
            params: [
                address,
                fromBlockTagOrNumber(block),
            ]
        });
    }

    getAddress(name: string): Promise<string> {
        throw new MissingENSProviderError("Provider does not implement getAddress, required to resolve ENS", {
            context: { name, provider: this.provider },
        });
    }
}

export class MissingENSProviderError extends errors.ProviderError { };

// HighLevelProvider is used for high-level providers like ethers' FallbackProvider
class HighLevelProvider implements Provider {
    provider: any;

    constructor(provider: any) {
        this.provider = provider;
    }

    getStorageAt(address: string, slot: number | string): Promise<string> {
        if ("getStorageAt" in this.provider) {
            return this.provider.getStorageAt(address, slot);
        }
        return this.provider.getStorage(address, slot);
    }

    call(transaction: { to: string, data: string }): Promise<string> {
        return this.provider.call(transaction);
    }

    getCode(address: string): Promise<string> {
        return this.provider.getCode(address);
    }

    getAddress(name: string): Promise<string> {
        return this.provider.getAddress(name);
    }
}

type JSONRPCResponse = {
    result?: string,
    error?: {
        id: number,
        message: string,
    };
};

class Web3Provider extends RPCProvider {
    request({ method, params }: EIP1193RequestArguments): Promise<any> {
        // this.provider is the web3 instance, we need web3.provider
        const r = this.provider.currentProvider.request({ method, params, "jsonrpc": "2.0", id: "1" });
        return r.then((resp: JSONRPCResponse) => {
            if (resp.result) return resp.result;
            else if (resp.error) throw new Web3ProviderError(resp.error.message, {
                context: { method, params, resp },
            });
            return resp;
        });
    }

    getAddress(name: string): Promise<string> {
        return this.provider.eth.ens.getAddress(name)
    }
}

export class Web3ProviderError extends errors.ProviderError { };


class EthersProvider extends RPCProvider {
    request(args: EIP1193RequestArguments): Promise<any> {
        // Fun fact: Before 2020, EIP1193 draft had used .send(method, params) instead of .request({method, params})
        return this.provider.send(args.method, args.params);
    }

    getAddress(name: string): Promise<string> {
        return this.provider.resolveName(name);
    }
}

class ViemProvider extends RPCProvider {
    request(args: EIP1193RequestArguments): Promise<any> {
        return this.provider.transport.request(args);
    }

    getAddress(name: string): Promise<string> {
        return this.provider.getEnsAddress({ name });
    }
}
