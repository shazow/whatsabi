import { Provider } from "@ethersproject/abstract-provider";

import { ABI } from "./abi";
import { ABILoader, SignatureLookup } from "./loaders";
import { abiFromBytecode } from "./disasm";

// auto is a convenience helper for doing All The Things to load an ABI of a contract.
// FIXME: It's kinda half-done, not parallelized
export async function autoload(address:string, config: {provider: Provider, abiLoader?: ABILoader, signatureLookup?: SignatureLookup}): Promise<ABI> {
  if (config.abiLoader) {
    // Attempt to load the ABI from a contract database, if exists
    try {
      return await config.abiLoader.loadABI(address);
    } catch (error: any) {
      // TODO: Catch useful errors
    }
  }

  // Load from code
  const code = await config.provider.getCode(address);
  let abi = abiFromBytecode(code);

  if (!config.signatureLookup) return abi; // Bail

  // Load signatures from a database
  for (const a of abi) {
    if (a.type === "function") {
      const r = await config.signatureLookup.loadFunctions(a.selector);
      if (r.length >= 1) a.name = r[0];
      if (r.length > 1) a.nameAlts = r.slice(1);
    } else if (a.type === "event") {
      const r = await config.signatureLookup.loadEvents(a.hash);
      if (r.length >= 1) a.name = r[0];
      if (r.length > 1) a.nameAlts = r.slice(1);
    }
  }

  return abi;
}
