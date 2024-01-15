import { addressWithChecksum, fetchJSON } from "./utils.js";

export interface ABILoader {
  loadABI(address: string): Promise<any[]>;
  getContract(address: string): Promise<ContractData | null>
}

export interface ContractData {
  abi: any[];
  name: string;
  evmVersion: string;
  compilerVersion: string;
  runs: number;
}

// Load ABIs from multiple providers until a result is found.
export class MultiABILoader implements ABILoader {
  loaders: ABILoader[];

  constructor(loaders: ABILoader[]) {
    this.loaders = loaders;
  }

  async getContract(address: string): Promise<ContractData | null> {
    for (const loader of this.loaders) {
      try {
        const r = await loader.getContract(address);
        if (r && r.abi.length > 0) return Promise.resolve(r);
      } catch (error: any) {
        if (error.status === 404) continue;
        throw error;
      }
    }
    return null
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

  async getContract(address: string): Promise<ContractData | null> {
    let url = this.baseURL + '?module=contract&action=getsourcecode&address=' + address;
    if (this.apiKey) url += "&apikey=" + this.apiKey;

    const r = await fetchJSON(url);
    if (r.status === "0") {
        if (r.result === "Contract source code not verified") return {abi: [], name: '', evmVersion: 'Default', compilerVersion: '', runs: 0};

        throw new Error("Etherscan error: " + r.result);
    }

    const result = r.result[0];
    return {
      abi: JSON.parse(result.ABI),
      name: result.ContractName,
      evmVersion: result.EVMVersion,
      compilerVersion: result.CompilerVersion,
      runs: result.Runs,
    };
  }

  async loadABI(address: string): Promise<any[]> {
    let url = this.baseURL + '?module=contract&action=getabi&address=' + address;
    if (this.apiKey) url += "&apikey=" + this.apiKey;

    const r = await fetchJSON(url);
    if (r.status === "0") {
        if (r.result === "Contract source code not verified") return [];

        throw new Error("Etherscan error: " + r.result);
    }

    return JSON.parse(r.result);
  }
}

function isSourcifyNotFound(error: any): boolean {
    return (
      // Sourcify returns strict CORS only if there is no result -_-
      error.message === "Failed to fetch" ||
      error.status === 404
    );
}

// https://sourcify.dev/
export class SourcifyABILoader implements ABILoader {
  chainId?: number;

  constructor(config?: {chainId?: number}) {
    this.chainId = config?.chainId ?? 1;
  }

  async getContract(address: string): Promise<ContractData | null> {
    // Sourcify doesn't like it when the address is not checksummed
    address = addressWithChecksum(address);

    try {
        // Full match index includes verification settings that matches exactly
        const r = await fetchJSON("https://repo.sourcify.dev/contracts/full_match/"+ this.chainId + "/" + address + "/metadata.json");
        return {
            abi: r.output.abi,
            name: r.devdoc?.title || r.userdoc?.title || '', // Sourcify includes a title from the Natspec comments
            evmVersion: r.settings.evmVersion,
            compilerVersion: r.compiler.version,
            runs: r.settings.optimizer.runs,
        };
    } catch (error: any) {
        if (!isSourcifyNotFound(error)) throw error;
    }

    try {
        // Partial match index is for verified contracts whose settings didn't match exactly
        const r = await fetchJSON("https://repo.sourcify.dev/contracts/partial_match/" + this.chainId + "/" + address + "/metadata.json");
        return {
            abi: r.output.abi,
            name: r.metadata.contractName,
            evmVersion: r.metadata.evmVersion,
            compilerVersion: r.compiler.version,
            runs: r.metadata.settings.runs,
        };
    } catch (error: any) {
        if (!isSourcifyNotFound(error)) throw error;
    }

    return {abi: [], name: '', evmVersion: 'Default', compilerVersion: '', runs: 0};
  }

  async loadABI(address: string): Promise<any[]> {
    // Sourcify doesn't like it when the address is not checksummed
    address = addressWithChecksum(address);

    try {
      // Full match index includes verification settings that matches exactly
      return (await fetchJSON("https://repo.sourcify.dev/contracts/full_match/"+ this.chainId + "/" + address + "/metadata.json")).output.abi;
    } catch (error: any) {
      if (!isSourcifyNotFound(error)) throw error;
    }

    try {
      // Partial match index is for verified contracts whose settings didn't match exactly
      return (await fetchJSON("https://repo.sourcify.dev/contracts/partial_match/" + this.chainId + "/" + address + "/metadata.json")).output.abi;
    } catch (error: any) {
      if (!isSourcifyNotFound(error)) throw error;
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

export class SamczunSignatureLookup extends OpenChainSignatureLookup {}

export const defaultABILoader: ABILoader = new MultiABILoader([new SourcifyABILoader(), new EtherscanABILoader()]);
export const defaultSignatureLookup: SignatureLookup = new MultiSignatureLookup([new OpenChainSignatureLookup(), new FourByteSignatureLookup()]);

type LoaderEnv = {
  ETHERSCAN_API_KEY?: string,
  ETHERSCAN_BASE_URL?: string,
  SOURCIFY_CHAIN_ID?: string|number,
}

/** @deprecated Use defaultsWithEnv instead, this function is outdated and will be removed soon. */
export function defaultsWithAPIKeys(apiKeys: LoaderEnv): Record<string, ABILoader|SignatureLookup> {
  return defaultsWithEnv(apiKeys);
}

/**
 * Return params to use with whatsabi.autoload(...)
 *
 * @example
 * ```ts
 * whatsabi.autoload(address, {provider, ...defaultsWithEnv(process.env)})
 * ```
 *
 * @example
 * ```ts
 * whatsabi.autoload(address, {
 *   provider,
 *   ...defaultsWithEnv({
 *     SOURCIFY_CHAIN_ID: 42161,
 *     ETHERSCAN_BASE_URL: "https://api.arbiscan.io/api",
 *     ETHERSCAN_API_KEY: "MYSECRETAPIKEY",
 *   }),
 * })
 * ```
 */
export function defaultsWithEnv(env: LoaderEnv): Record<string, ABILoader|SignatureLookup> {
  return {
    abiLoader: new MultiABILoader([
      new SourcifyABILoader({chainId: env.SOURCIFY_CHAIN_ID && Number(env.SOURCIFY_CHAIN_ID) || undefined}),
      new EtherscanABILoader({apiKey: env.ETHERSCAN_API_KEY, baseURL: env.ETHERSCAN_BASE_URL}),
    ]),
    signatureLookup: new MultiSignatureLookup([
      new OpenChainSignatureLookup(),
      new FourByteSignatureLookup(),
    ]),
  }
}
