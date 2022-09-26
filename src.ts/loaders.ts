import { Provider } from "@ethersproject/abstract-provider";
import { fetchJson } from "@ethersproject/web";


export async function getCode(provider: Provider, address: string): Promise<string> {
  return await provider.getCode(address);
}

export interface ABILoader {
  loadABI(address: string): Promise<any[]>;
}

class EtherscanABILoader implements ABILoader {
  readonly apiKey?: string;
  readonly baseURL: string;

  constructor(baseURL?: string, apiKey?: string) {
    this.apiKey = apiKey;
    this.baseURL = baseURL || "https://api.etherscan.io/api";
  }

  async loadABI(address: string): Promise<any[]> {
    let url = this.baseURL + '?module=contract&action=getabi&address=' + address;
    if (this.apiKey) url += "&apikey=" + this.apiKey;

    const r = await fetchJson(url);
    return JSON.parse(r.result);
  }
}

export interface SelectorLookup {
  loadSelectors(selector: string): Promise<string[]>;
}

class Byte4SelectorLookup implements SelectorLookup {
  async loadSelectors(selector: string): Promise<string[]> {
    const url = "https://www.4byte.directory/api/v1/signatures/?hex_signature=" + selector;
    const r = await fetchJson(url);
    return r.results.map((r: any): string => { return r.text_signature });
  }
}

export const defaultABILoader: ABILoader = new EtherscanABILoader();
export const defaultSelectorLookup: SelectorLookup = new Byte4SelectorLookup();
