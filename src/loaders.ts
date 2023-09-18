import { addressWithChecksum, fetchJSON } from "./utils.js";

export interface ABILoader {
  loadABI(address: string): Promise<any[]>;
}

// Load ABIs from multiple providers until a result is found.
export class MultiABILoader implements ABILoader {
  loaders: ABILoader[];

  constructor(loaders: ABILoader[]) {
    this.loaders = loaders;
  }

  async loadABI(address: string): Promise<any[]> {
    for (const loader of this.loaders) {
      const r = await loader.loadABI(address);

      // Return the first non-empty result
      if (r.length > 0) return Promise.resolve(r);
    }
    return Promise.resolve([]);
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

    const r = await fetchJSON(url);
    if (r.status === "0") {
        if (r.result === "Contract source code not verified") return [];

        throw new Error("Etherscan error: " + r.result, {
            cause: {
                url: url,
                response: r,
            },
        });
    }
    return JSON.parse(r.result);
  }
}

// https://sourcify.dev/
export class SourcifyABILoader implements ABILoader {
  async loadABI(address: string): Promise<any[]> {
    // Sourcify doesn't like it when the address is not checksummed
    address = addressWithChecksum(address);

    try {
      // Full match index includes verification settings that matches exactly
      return (await fetchJSON("https://repo.sourcify.dev/contracts/full_match/1/" + address + "/metadata.json")).output.abi;
    } catch (error: any) {
      if (error.status !== 404) throw error;
    }

    
    try {
      // Partial match index is for verified contracts whose settings didn't match exactly
      return (await fetchJSON("https://repo.sourcify.dev/contracts/partial_match/1/" + address + "/metadata.json")).output.abi;
    } catch (error: any) {
      if (error.status !== 404) throw error;
    }

    return [];
  }
}

export interface SignatureLookup {
  loadFunctions(selector: string): Promise<string[]>;
  loadEvents(hash: string): Promise<string[]>;
}

// Load signatures from multiple providers until a result is found.
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
      const r = await fetchJSON(url);
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

// openchain.xyz
// Formerly: https://sig.eth.samczsun.com/
export class OpenChainSignatureLookup implements SignatureLookup {
  async load(url: string): Promise<any> {
    try {
      const r = await fetchJSON(url);
      if (!r.ok) throw new Error("OpenChain API bad response: " + JSON.stringify(r));
      return r;
    } catch (error: any) {
      if (error.status === 404) return [];
      throw error;
    }
  }

  async loadFunctions(selector: string): Promise<string[]> {
    const r = await this.load("https://api.openchain.xyz/signature-database/v1/lookup?function=" + selector);
    return (r.result.function[selector] || []).map((item:any) => item.name);
  }

  async loadEvents(hash: string): Promise<string[]> {
    const r = await this.load("https://api.openchain.xyz/signature-database/v1/lookup?event=" + hash);
    return (r.result.event[hash] || []).map((item:any) => item.name);
  }
}

export class SamczunSignatureLookup extends OpenChainSignatureLookup {};

export const defaultABILoader: ABILoader = new MultiABILoader([new SourcifyABILoader(), new EtherscanABILoader()]);
export const defaultSignatureLookup: SignatureLookup = new MultiSignatureLookup([new OpenChainSignatureLookup(), new FourByteSignatureLookup()]);
