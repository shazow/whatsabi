import { Provider } from "@ethersproject/abstract-provider";
import { fetchJson } from "@ethersproject/web";


export async function getCode(provider: Provider, address: string): Promise<string> {
  return await provider.getCode(address);
}

export interface ABILoader {
  loadABI(address: string): Promise<any[]>;
}

export class MultiABILoader implements ABILoader {
  loaders: ABILoader[];
  mode: "any"|"all";

  constructor(loaders: ABILoader[]) {
    this.loaders = loaders;
    this.mode = "any"; 
  }

  async loadABI(address: string): Promise<any[]> {
    if (this.mode === "any") {
      return Promise.any(
        this.loaders.map(
          loader => loader.loadABI(address)
        )
      );
    }

    let r: { [key: string]: any } = {};
    await Promise.all(
      this.loaders.map(
        loader => loader.loadABI(address)
      )
    ).then((results) => results.flat().map((fragment:any) => {
      // Dedupe results
      const key = fragment.type + ":" + fragment.name;
      if (r[key] !== undefined) return;
      r[key] = fragment;
    }))

    return Object.values(r);
  }
}


export class EtherscanABILoader implements ABILoader {
  apiKey?: string;
  baseURL: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey;
    this.baseURL = "https://api.etherscan.io/api";
  }

  async loadABI(address: string): Promise<any[]> {
    let url = this.baseURL + '?module=contract&action=getabi&address=' + address;
    if (this.apiKey) url += "&apikey=" + this.apiKey;

    const r = await fetchJson(url);
    return JSON.parse(r.result);
  }
}

export class SourcifyABILoader implements ABILoader {
  baseURL: string;

  constructor() {
    this.baseURL = "https://repo.sourcify.dev/contracts/full_match/1";
  }

  async loadABI(address: string): Promise<any[]> {
    const url = this.baseURL + "/" + address + "/metadata.json";
    const r = await fetchJson(url);
    return JSON.parse(r.result);
  }
}

export interface SelectorLookup {
  loadSelectors(selector: string): Promise<string[]>;
}

export class MultiSelectorLookup implements SelectorLookup {
  lookups: SelectorLookup[];

  constructor(lookups: SelectorLookup[]) {
    this.lookups = lookups;
  }

  async loadSelectors(selector: string): Promise<string[]> {
    return Promise.all(
      this.lookups.map(
        lookup => lookup.loadSelectors(selector)
      )
    ).then(results => Array.from(new Set(results.flat())))
  }
}

// https://www.4byte.directory/
export class Byte4SelectorLookup implements SelectorLookup {
  async loadSelectors(selector: string): Promise<string[]> {
    const url = "https://www.4byte.directory/api/v1/signatures/?hex_signature=" + selector;
    try {
      const r = await fetchJson(url);
      return r.results.map((r: any): string => { return r.text_signature });
    } catch (error: any) {
      if (error.status === 404) return [];
      throw error;
    }
  }
}

// https://sig.eth.samczsun.com/
export class SamczunSelectorLookup implements SelectorLookup {
  async loadSelectors(selector: string): Promise<string[]> {
    const url = "https://sig.eth.samczsun.com/api/v1/signatures/?function=" + selector;
    try {
      const r = await fetchJson(url);
      return r.results.map((r: any): string => { return r.text_signature });
    } catch (error: any) {
      if (error.status === 404) return [];
      throw error;
    }
  }
}

export const defaultABILoader: ABILoader = new MultiABILoader([new SourcifyABILoader(), new EtherscanABILoader()]);
export const defaultSelectorLookup: SelectorLookup = new MultiSelectorLookup([new SamczunSelectorLookup(), new Byte4SelectorLookup()]);
