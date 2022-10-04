import { fetchJson } from "@ethersproject/web";

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

  constructor(config?: {apiKey?: string, baseURL?: string}) {
    if (config === undefined) config = {};
    this.apiKey = config.apiKey;
    this.baseURL = config.baseURL || "https://api.etherscan.io/api";
  }

  async loadABI(address: string): Promise<any[]> {
    let url = this.baseURL + '?module=contract&action=getabi&address=' + address;
    if (this.apiKey) url += "&apikey=" + this.apiKey;

    const r = await fetchJson(url);
    return JSON.parse(r.result);
  }
}

// https://sourcify.dev/
export class SourcifyABILoader implements ABILoader {
  async loadABI(address: string): Promise<any[]> {
    const url = "https://repo.sourcify.dev/contracts/full_match/1/" + address + "/metadata.json";
    const r = await fetchJson(url);
    return JSON.parse(r.result);
  }
}

export interface SignatureLookup {
  loadFunctions(selector: string): Promise<string[]>;
  loadEvents(hash: string): Promise<string[]>;
}

export class MultiSignatureLookup implements SignatureLookup {
  lookups: SignatureLookup[];

  constructor(lookups: SignatureLookup[]) {
    this.lookups = lookups;
  }

  async loadFunctions(selector: string): Promise<string[]> {
    return Promise.all(
      this.lookups.map(
        lookup => lookup.loadFunctions(selector)
      )
    ).then(results => Array.from(new Set(results.flat())))
  }

  async loadEvents(hash: string): Promise<string[]> {
    return Promise.all(
      this.lookups.map(
        lookup => lookup.loadFunctions(hash)
      )
    ).then(results => Array.from(new Set(results.flat())))
  }
}

// https://www.4byte.directory/
export class Byte4SignatureLookup implements SignatureLookup {
  async load(url: string): Promise<string[]> {
    try {
      const r = await fetchJson(url);
      if (r.results === undefined) return [];
      return r.results.map((r: any): string => { return r.text_signature });
    } catch (error: any) {
      if (error.status === 404) return [];
      throw error;
    }
  }
  async loadFunctions(selector: string): Promise<string[]> {
    return this.load("https://www.4byte.directory/api/v1/signatures/?hex_signature=" + selector);
  }

  async loadEvents(hash: string): Promise<string[]> {
    return this.load("https://www.4byte.directory/api/v1/event-signatures/?hex_signature=" + hash);
  }
}

// https://sig.eth.samczsun.com/
export class SamczunSignatureLookup implements SignatureLookup {
  async load(url: string): Promise<string[]> {
    try {
      const r = await fetchJson(url);
      if (r.results === undefined) return [];
      return r.results.map((r: any): string => { return r.text_signature });
    } catch (error: any) {
      if (error.status === 404) return [];
      throw error;
    }
  }

  async loadFunctions(selector: string): Promise<string[]> {
    return this.load("https://sig.eth.samczsun.com/api/v1/signatures?function=" + selector);
  }

  async loadEvents(hash: string): Promise<string[]> {
    return this.load("https://sig.eth.samczsun.com/api/v1/signatures?event=" + hash);
  }
}

export const defaultABILoader: ABILoader = new MultiABILoader([new SourcifyABILoader(), new EtherscanABILoader()]);
export const defaultSignatureLookup: SignatureLookup = new MultiSignatureLookup([new SamczunSignatureLookup(), new Byte4SignatureLookup()]);
