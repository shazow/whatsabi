import { Provider } from "@ethersproject/abstract-provider";
export declare function getCode(provider: Provider, address: string): Promise<string>;
export interface ABILoader {
    loadABI(address: string): Promise<any[]>;
}
export declare class EtherscanABILoader implements ABILoader {
    apiKey?: string;
    baseURL: string;
    constructor(apiKey?: string);
    loadABI(address: string): Promise<any[]>;
}
export declare class SourcifyABILoader implements ABILoader {
    baseURL: string;
    constructor();
    loadABI(address: string): Promise<any[]>;
}
export interface SelectorLookup {
    loadSelectors(selector: string): Promise<string[]>;
}
export declare class Byte4SelectorLookup implements SelectorLookup {
    loadSelectors(selector: string): Promise<string[]>;
}
export declare class SamczunSelectorLookup implements SelectorLookup {
    loadSelectors(selector: string): Promise<string[]>;
}
export declare const defaultABILoader: ABILoader;
export declare const defaultSelectorLookup: SelectorLookup;
