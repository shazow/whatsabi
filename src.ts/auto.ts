import { Provider } from "@ethersproject/abstract-provider";

import { ABI } from "./abi";
import { ABILoader, SignatureLookup, defaultABILoader, defaultSignatureLookup } from "./loaders";
import { abiFromBytecode } from "./disasm";

// auto is a convenience helper for doing All The Things to load an ABI of a contract.
// FIXME: It's kinda half-done, not parallelized
export async function autoload(address:string, config: {provider: Provider, abiLoader?: ABILoader, signatureLookup?: SignatureLookup}): Promise<ABI> {
  let abiLoader = config.abiLoader;
  if (abiLoader === undefined) abiLoader = defaultABILoader;

  if (abiLoader) {
    // Attempt to load the ABI from a contract database, if exists
    try {
      return await abiLoader.loadABI(address);
    } catch (error: any) {
      // TODO: Catch useful errors
    }
  }

  // Load from code
  const code = await config.provider.getCode(address);
  let abi = abiFromBytecode(code);

  let signatureLookup = config.signatureLookup;
  if (signatureLookup === undefined) signatureLookup = defaultSignatureLookup;
  if (!signatureLookup) return abi; // Bail

  // Load signatures from a database
  for (const a of abi) {
    if (a.type === "function") {
      const r = await signatureLookup.loadFunctions(a.selector);
      if (r.length >= 1) a.sig = r[0];
      if (r.length > 1) a.sigAlts = r.slice(1);
    } else if (a.type === "event") {
      const r = await signatureLookup.loadEvents(a.hash);
      if (r.length >= 1) a.sig = r[0];
      if (r.length > 1) a.sigAlts = r.slice(1);
    }
  }

  return abi;
}
