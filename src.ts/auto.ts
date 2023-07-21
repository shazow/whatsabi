import { Provider } from "@ethersproject/abstract-provider";
import { Fragment } from "@ethersproject/abi";

import { ABI } from "./abi";
import { ABILoader, SignatureLookup, defaultABILoader, defaultSignatureLookup } from "./loaders";
import { abiFromBytecode } from "./disasm";

function isAddress(address: string) {
    return address.length === 42 && address.startsWith("0x");
}

export const defaultConfig = {
    onProgress: (_: string) => {},
    onError: (phase: string, err: Error) => { console.error(phase + ":", err); return false; },
}

export type AutoloadConfig = {
    provider: Provider;

    abiLoader?: ABILoader|false;
    signatureLookup?: SignatureLookup|false;

    // Hooks
    onProgress?: (phase: string) => void;
    onError?: (phase: string, error: Error) => boolean|void; // Return true-y to abort, undefined/false-y to continue

    // Enable pulling function metadata from WhatsABI's static analysis, still unreliable
    enableExperimentalMetadata?: boolean;
}

// auto is a convenience helper for doing All The Things to load an ABI of a contract.
// FIXME: It's kinda half-done, not parallelized
export async function autoload(address: string, config: AutoloadConfig): Promise<ABI> {
  const onProgress = config.onProgress || defaultConfig.onProgress;
  const onError = config.onError || defaultConfig.onError;
  const provider = config.provider;

  if (config === undefined) {
    throw new Error("autoload: config is undefined, must include 'provider'");
  }
  let abiLoader = config.abiLoader;
  if (abiLoader === undefined) abiLoader = defaultABILoader;

  if (!isAddress(address)) {
    onProgress("resolveName");
    address = await provider.resolveName(address) || address;
  }

  if (abiLoader) {
    // Attempt to load the ABI from a contract database, if exists
    onProgress("abiLoader");
    try {
      return await abiLoader.loadABI(address);
    } catch (error: any) {
      // TODO: Catch useful errors
      if (onError("abiLoad", error) === true) return [];
    }
  }

  // Load from code
  onProgress("getCode");
  const code = await provider.getCode(address);
  let abi = abiFromBytecode(code);

  let signatureLookup = config.signatureLookup;
  if (signatureLookup === undefined) signatureLookup = defaultSignatureLookup;
  if (!signatureLookup) return abi; // Bail

  // Load signatures from a database
  onProgress("signatureLookup");
  for (const a of abi) {
    if (a.type === "function") {
      const r = await signatureLookup.loadFunctions(a.selector);

      if (r.length >= 1) {
        a.sig = r[0];

        // Let ethers.js extract as much metadata as it can from the signature
        const extracted = JSON.parse(Fragment.from("function " + a.sig).format("json"));
        if (extracted.outputs.length === 0) {
          // Outputs not included in signature databases -_- (unless something changed)
          // Let whatsabi keep its best guess, if any.
          delete(extracted.outputs);
        }

        Object.assign(a, extracted)
      }
      if (r.length > 1) a.sigAlts = r.slice(1);

    } else if (a.type === "event") {
      const r = await signatureLookup.loadEvents(a.hash);

      if (r.length >= 1) {
        a.sig = r[0];

        // Let ethers.js extract as much metadata as it can from the signature
        Object.assign(a, JSON.parse(Fragment.from("event " + a.sig).format("json")))
      }
      if (r.length > 1) a.sigAlts = r.slice(1);
    }
  }

  return abi;
}
