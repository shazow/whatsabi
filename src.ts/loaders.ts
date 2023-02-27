import { fetchJson } from "@ethersproject/web";
import { getAddress } from "@ethersproject/address";

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
    // Sourcify doesn't like it when the address is not checksummed
    address = getAddress(address);

    const url = "https://repo.sourcify.dev/contracts/partial_match/1/" + address + "/metadata.json";
    const r = await fetchJson(url);
    return r.output.abi;
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
    for (const lookup of this.lookups) {
      const r = await lookup.loadFunctions(selector);

      // Return the first non-empty result
      if (r.length > 0) return Promise.resolve(r);
    }
    return Promise.resolve([]);
  }

  async loadEvents(hash: string): Promise<string[]> {
    for (const lookup of this.lookups) {
      const r = await lookup.loadEvents(hash);

      // Return the first non-empty result
      if (r.length > 0) return Promise.resolve(r);
    }
    return Promise.resolve([]);
  }
}

// https://www.4byte.directory/
export class FourByteSignatureLookup implements SignatureLookup {
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
    // TODO: Use github lookup?
    return this.load("https://www.4byte.directory/api/v1/signatures/?hex_signature=" + selector);
  }

  async loadEvents(hash: string): Promise<string[]> {
    return this.load("https://www.4byte.directory/api/v1/event-signatures/?hex_signature=" + hash);
  }
}

// https://sig.eth.samczsun.com/
export class SamczunSignatureLookup implements SignatureLookup {
  async load(url: string): Promise<any> {
    try {
      const r = await fetchJson(url);
      if (!r.ok) throw new Error("Samczun API bad response: " + JSON.stringify(r));
      return r;
    } catch (error: any) {
      if (error.status === 404) return [];
      throw error;
    }
  }

  async loadFunctions(selector: string): Promise<string[]> {
    const r = await this.load("https://sig.eth.samczsun.com/api/v1/signatures?function=" + selector);
    return r.result.function[selector].map((item:any) => item.name);
  }

  async loadEvents(hash: string): Promise<string[]> {
    const r = await this.load("https://sig.eth.samczsun.com/api/v1/signatures?event=" + hash);
    return r.result.event[hash].map((item:any) => item.name);
  }
}

export const defaultABILoader: ABILoader = new MultiABILoader([new SourcifyABILoader(), new EtherscanABILoader()]);
export const defaultSignatureLookup: SignatureLookup = new MultiSignatureLookup([new SamczunSignatureLookup(), new FourByteSignatureLookup()]);
