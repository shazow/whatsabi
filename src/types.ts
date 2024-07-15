import { bytesToHex } from "./utils.js";


export interface StorageProvider {
    getStorageAt(address: string, slot: number|string): Promise<string>
}

export interface CallProvider {
    call(transaction: {to: string, data: string}): Promise<string>;
}

export interface CodeProvider {
    getCode(address: string): Promise<string>;
}

export interface ENSProvider {
    getAddress(name: string): Promise<string>;
}

export interface Provider extends StorageProvider, CallProvider, CodeProvider, ENSProvider {};

export interface AnyProvider {}; // TODO: Can we narrow this more?


// Abstract away web3 provider inconsistencies

export function CompatibleProvider(provider: any): Provider {
    if (typeof provider.getAddress === "function") {
        return new GenericProvider(provider);
    }
    if (typeof provider.resolveName === "function") {
        // Ethers-like
        if (typeof provider.send === "function") {
            return new EthersProvider(provider);
        }
        // Probably FallbackProvider or a different custom wrapper?
        // Need to use higher-level functions.
        return new GenericProvider(provider);
    }
    if (typeof provider.getEnsAddress === "function") {
        return new ViemProvider(provider);
    }
    if (typeof provider.eth !== undefined) {
        return new Web3Provider(provider);
    }

    throw new Error("Unsupported provider, please open an issue: https://github.com/shazow/whatsabi/issues");
}

// RPCPRovider thesis is: let's stop trying to adapt to every RPC wrapper library's high-level functions
// and instead have a discovery for the lowest-level RPC call function that we can use directly.
// At least whenever possible. Higher-level functionality like getAddress is still tricky.
abstract class RPCProvider implements Provider {
    provider: any;

    constructor(provider: any) {
        this.provider = provider;
    }

    abstract send(method: string, params: Array<any>): Promise<any>;

    getStorageAt(address: string, slot: number|string): Promise<string> {
        if (typeof slot === "number") {
            slot = bytesToHex(slot);
        }
        return this.send("eth_getStorageAt", [address, slot, "latest"]);
    }

    call(transaction: {to: string, data: string}): Promise<string> {
        return this.send("eth_call", [
            {
                from: "0x0000000000000000000000000000000000000001",
                to: transaction.to,
                data: transaction.data,
            },
            "latest"
        ]);
    }

    getCode(address: string): Promise<string> {
        return this.send("eth_getCode", [address, "latest"]);
    }

    abstract getAddress(name: string): Promise<string>;

}

class GenericProvider implements Provider {
    provider: any;

    constructor(provider: any) {
        this.provider = provider;
    }

    getStorageAt(address: string, slot: number|string): Promise<string> {
        if ("getStorageAt" in this.provider) {
            return this.provider.getStorageAt(address, slot);
        }
        return this.provider.getStorage(address, slot);
    }

    call(transaction: {to: string, data: string}): Promise<string> {
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
    send(method: string, params: Array<any>): Promise<any> {
        // this.provider is the web3 instance, we need web3.provider
        const r = this.provider.currentProvider.request({method, params, "jsonrpc": "2.0", id: "1"});
        return r.then((resp : JSONRPCResponse) => {
            if (resp.result) return resp.result;
            else if (resp.error) throw new Error(resp.error.message);
            return resp;
        });
    }

    getAddress(name: string): Promise<string> {
        return this.provider.eth.ens.getAddress(name)
    }
}


class EthersProvider extends RPCProvider {
    send(method: string, params: Array<any>): Promise<any> {
        return this.provider.send(method, params);
    }

    getAddress(name: string): Promise<string> {
        return this.provider.resolveName(name);
    }
}

class ViemProvider extends RPCProvider {
    send(method: string, params: Array<any>): Promise<any> {
        return this.provider.transport.request({method, params});
    }

    getAddress(name: string): Promise<string> {
        return this.provider.getEnsAddress({name});
    }
}
