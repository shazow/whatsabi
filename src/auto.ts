import { Fragment, FunctionFragment } from "ethers";

import type { AnyProvider } from "./types.js";
import type { ABI, ABIFunction } from "./abi.js";
import { type ProxyResolver, DiamondProxyResolver } from "./proxies.js";
import type { ABILoader, SignatureLookup } from "./loaders.js";

import { CompatibleProvider } from "./types.js";
import { defaultABILoader, defaultSignatureLookup } from "./loaders.js";
import { abiFromBytecode, disasm } from "./disasm.js";

function isAddress(address: string) {
    return address.length === 42 && address.startsWith("0x") && Number(address) >= 0;
}

export const defaultConfig = {
    onProgress: (_: string) => {},
    onError: (phase: string, err: Error) => { console.error(phase + ":", err); return false; },
}

export type AutoloadResult = {
    address: string,
    abi: ABI;

    // List of resolveable proxies detected in the contract
    proxies: ProxyResolver[],

    // Follow proxies to next result.
    // If multiple proxies were detected, some reasonable ordering of attempts will be made.
    // Note: Some proxies operate relative to a specific selector (such as DiamondProxy facets), in this case we'll need to specify a selector that we care about.
    followProxies?: (selector?: string) => Promise<AutoloadResult>,
}

export type AutoloadConfig = {
    provider: AnyProvider;

    abiLoader?: ABILoader|false;
    signatureLookup?: SignatureLookup|false;

    // Hooks:

    // Called during various phases: resolveName, getCode, abiLoader, signatureLookup, followProxies
    onProgress?: (phase: string, ...args: any[]) => void;

    // Called during any encountered errors during a given phase
    onError?: (phase: string, error: Error) => boolean|void; // Return true-y to abort, undefined/false-y to continue

    // Called to resolve invalid addresses, uses provider's built-in resolver otherwise
    addressResolver?: (name: string) => Promise<string>;

    // Settings:

    // Enable following proxies automagically, if possible. Return the final result.
    // Note that some proxies are relative to a specific selector (such as DiamondProxies), so they will not be followed
    followProxies?: boolean;

    // Enable pulling additional metadata from WhatsABI's static analysis, still unreliable
    enableExperimentalMetadata?: boolean;
}

// auto is a convenience helper for doing All The Things to load an ABI of a contract.
export async function autoload(address: string, config: AutoloadConfig): Promise<AutoloadResult> {
    const onProgress = config.onProgress || defaultConfig.onProgress;
    const onError = config.onError || defaultConfig.onError;
    const provider = CompatibleProvider(config.provider);

    const result : AutoloadResult = {
        address,
        abi: [],
        proxies: [],
    };

    if (config === undefined) {
        throw new Error("autoload: config is undefined, must include 'provider'");
    }
    let abiLoader = config.abiLoader;
    if (abiLoader === undefined) abiLoader = defaultABILoader;

    if (!isAddress(address)) {
        onProgress("resolveName", {address});
        if (config.addressResolver) {
            address = await config.addressResolver(address);
        } else {
            address = await provider.getAddress(address);
        }
    }

    // Load code, we need to disasm to find proxies
    onProgress("getCode", {address});
    const bytecode = await provider.getCode(address)
    if (!bytecode) return result; // Must be an EOA

    const program = disasm(bytecode);

    // FIXME: Sort them in some reasonable way
    result.proxies = program.proxies;

    // Mapping of address-to-valid-selectors. Non-empty mapping values will prune ABIs to the selectors before returning.
    // This is mainly to support multiple proxies and diamond proxies.
    const facets: Record<string, string[]> = {
        [address]: [],
    };

    if (result.proxies.length === 1 && result.proxies[0] instanceof DiamondProxyResolver) {
        onProgress("loadDiamondFacets", {address});
        const diamondProxy = result.proxies[0] as DiamondProxyResolver;
        const f = await diamondProxy.facets(provider, address);
        Object.assign(facets, f);

    } else if (result.proxies.length > 0) {
        result.followProxies = async function(selector?: string): Promise<AutoloadResult> {
            for (const resolver of result.proxies) {
                onProgress("followProxies", {resolver: resolver, address});
                const resolved = await resolver.resolve(provider, address, selector);
                if (resolved !== undefined) return await autoload(resolved, config);
            }
            onError("followProxies", new Error("failed to resolve proxy"));
            return result;
        };

        if (config.followProxies) {
            return await result.followProxies();
        }
    }

    if (abiLoader) {
        // Attempt to load the ABI from a contract database, if exists
        onProgress("abiLoader", {address, facets: Object.keys(facets)});
        const loader = abiLoader;
        try {
            const addresses = Object.keys(facets);
            const promises = addresses.map(addr => loader.loadABI(addr));
            const results = await Promise.all(promises);
            const abis = Object.fromEntries(results.map((abi, i) => {
                return [addresses[i], abi];
            }));
            result.abi = pruneFacets(facets, abis);
            if (result.abi.length > 0) return result;
        } catch (error: any) {
            // TODO: Catch useful errors
            if (onError("abiLoad", error) === true) return result;
        }
    }

    // Load from code
    onProgress("abiFromBytecode", {address});
    result.abi = abiFromBytecode(program);

    if (!config.enableExperimentalMetadata) {
        result.abi = stripUnreliableABI(result.abi);
    }

    // Add any extra ABIs we found from facets
    result.abi.push(... Object.values(facets).flat().map(selector => {
        return {
            type: "function",
            selector,
        } as ABIFunction;
    }));

    let signatureLookup = config.signatureLookup;
    if (signatureLookup === undefined) signatureLookup = defaultSignatureLookup;
    if (!signatureLookup) return result; // Bail

    // Load signatures from a database
    onProgress("signatureLookup", {abiItems: result.abi.length});

    let promises : Promise<void>[] = [];

    for (const a of result.abi) {
        if (a.type === "function") {
            promises.push(signatureLookup.loadFunctions(a.selector).then((r) => {
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
            }));
        } else if (a.type === "event") {
            promises.push(signatureLookup.loadEvents(a.hash).then((r) => {
                if (r.length >= 1) {
                    a.sig = r[0];

                    // Let ethers.js extract as much metadata as it can from the signature
                    Object.assign(a, JSON.parse(Fragment.from("event " + a.sig).format("json")))
                }
                if (r.length > 1) a.sigAlts = r.slice(1);
            }));
        }
    }

    await Promise.all(promises);

    return result;
}

function stripUnreliableABI(abi: ABI): ABI {
    const r: ABI = [];
    for (const a of abi) {
        if (a.type !== "function") continue;
        r.push({
            type: "function",
            selector: a.selector,
        });
    }
    return r;
}

function pruneFacets(facets: Record<string, string[]>, abis: Record<string, ABI>): ABI {
    const r: ABI = [];
    for (const [addr, abi] of Object.entries(abis)) {
        const allowSelectors = new Set(facets[addr]);
        if (allowSelectors.size === 0) {
            // Skip pruning if the mapping is empty
            r.push(...abi);
            continue;
        }
        for (let a of abi) {
            if (a.type !== "function") {
                r.push(a);
                continue;
            }
            a = a as ABIFunction;
            let selector = a.selector;
            if (selector === undefined && a.name) {
                selector = FunctionFragment.getSelector(a.name, a.inputs);
            }
            if (allowSelectors.has(selector)) {
                r.push(a);
            }
        }
    }
    return r;
}
