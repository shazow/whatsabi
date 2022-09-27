import { Provider } from "@ethersproject/abstract-provider";
export declare function getCode(provider: Provider, address: string): Promise<string>;
export interface ABILoader {
    loadABI(address: string): Promise<any[]>;
}
export interface SelectorLookup {
    loadSelectors(selector: string): Promise<string[]>;
}
export declare const defaultABILoader: ABILoader;
export declare const defaultSelectorLookup: SelectorLookup;
export declare const defaultProvider: Provider;
