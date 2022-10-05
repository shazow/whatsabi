export interface ABILoader {
    loadABI(address: string): Promise<any[]>;
}
export declare class MultiABILoader implements ABILoader {
    loaders: ABILoader[];
    mode: "any" | "all";
    constructor(loaders: ABILoader[]);
    loadABI(address: string): Promise<any[]>;
}
export declare class EtherscanABILoader implements ABILoader {
    apiKey?: string;
    baseURL: string;
    constructor(config?: {
        apiKey?: string;
        baseURL?: string;
    });
    loadABI(address: string): Promise<any[]>;
}
export declare class SourcifyABILoader implements ABILoader {
    loadABI(address: string): Promise<any[]>;
}
export interface SignatureLookup {
    loadFunctions(selector: string): Promise<string[]>;
    loadEvents(hash: string): Promise<string[]>;
}
export declare class MultiSignatureLookup implements SignatureLookup {
    lookups: SignatureLookup[];
    constructor(lookups: SignatureLookup[]);
    loadFunctions(selector: string): Promise<string[]>;
    loadEvents(hash: string): Promise<string[]>;
}
export declare class Byte4SignatureLookup implements SignatureLookup {
    load(url: string): Promise<string[]>;
    loadFunctions(selector: string): Promise<string[]>;
    loadEvents(hash: string): Promise<string[]>;
}
export declare class SamczunSignatureLookup implements SignatureLookup {
    load(url: string): Promise<any>;
    loadFunctions(selector: string): Promise<string[]>;
    loadEvents(hash: string): Promise<string[]>;
}
export declare const defaultABILoader: ABILoader;
export declare const defaultSignatureLookup: SignatureLookup;
