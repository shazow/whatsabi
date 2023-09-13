import { bytesToHex } from "./utils";


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
        return new Web3Provider(provider);
    }
    if (typeof provider.getStorage === "function") {
        return new Ethers6Provider(provider);
    }
    if (typeof provider.getCode === "function") {
        return new Ethers5Provider(provider);
    }
    if (typeof provider.getBytecode === "function") {
        return new ViemProvider(provider);
    }

    throw new Error("Unsupported provider, please open an issue: https://github.com/shazow/whatsabi/issues");
}

class Web3Provider implements Provider {
    provider: any;

    constructor(provider: any) {
        this.provider = provider;
    }

    getStorageAt(address: string, slot: number|string): Promise<string> {
        return this.provider.getStorageAt(address, slot);
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

class Ethers5Provider extends Web3Provider {
    getAddress(name: string): Promise<string> {
        return this.provider.resolveName(name);
    }
}

class Ethers6Provider extends Ethers5Provider {
    getStorageAt(address: string, slot: number|string): Promise<string> {
        return this.provider.getStorage(address, slot);
    }
}

class ViemProvider extends Web3Provider {
    getStorageAt(address: string, slot: number|string): Promise<string> {
        if (typeof slot === "number") {
            slot = bytesToHex(slot);
        }
        return this.provider.getStorageAt({address, slot});
    }

    call(transaction: {to: string, data: string}): Promise<string> {
        // Note: We can't use viem's provider.call because it does some fun dynamic module loading optimizations (maybe also related to auto batching?) which segfaults on some enviornments.
        return this.provider.transport.request({method: "eth_call", params: [{
            from: "0x0000000000000000000000000000000000000001",
            to: transaction.to,
            data: transaction.data,
        }, "latest"]});
    }

    getCode(address: string): Promise<string> {
        return this.provider.getBytecode({address});
    }

    getAddress(name: string): Promise<string> {
        return this.provider.getEnsAddress({name});
    }
}
