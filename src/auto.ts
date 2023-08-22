import { Fragment } from "ethers";

import { Provider } from "./types";
import { ABI } from "./abi";
import { ABILoader, SignatureLookup, defaultABILoader, defaultSignatureLookup } from "./loaders";
import { abiFromBytecode, disasm } from "./disasm";
import { ProxyResolver } from "./proxies";

function isAddress(address: string) {
    return address.length === 42 && address.startsWith("0x");
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
    provider: Provider;

    abiLoader?: ABILoader|false;
    signatureLookup?: SignatureLookup|false;

    // Hooks:

    // Called during various phases: resolveName, getCode, abiLoader, signatureLookup, followProxies
    onProgress?: (phase: string, ...args: any[]) => void;

    // Called during any encountered errors during a given phase
    onError?: (phase: string, error: Error) => boolean|void; // Return true-y to abort, undefined/false-y to continue


    // Settings:

    // Enable following proxies automagically, if possible. Return the final result.
    // Note that some proxies are relative to a specific selector (such as DiamondProxies), so they will not be followed
    followProxies?: boolean;

    // Enable pulling additional metadata from WhatsABI's static analysis, still unreliable
    enableExperimentalMetadata?: boolean;
}

// Shim to resolve an ENS name by trying various provider functions (ethers.js, viem, etc)
async function resolveENS(provider: any, name: string): Promise<string> {
    // Ethers.js
    if (typeof provider.resolveName === "function") {
        return await provider.resolveName(name);
    }
    // Viem
    if (typeof provider.getEnsAddress === "function") {
        return await provider.getEnsAddress({name});
    }
    // ensjs, web3.js, etc.
    if (typeof provider.getAddress === "function") {
        return await provider.getAddress(name);
    }
    // Give up and hope for the best 🙃
    return name;
}

// auto is a convenience helper for doing All The Things to load an ABI of a contract.
export async function autoload(address: string, config: AutoloadConfig): Promise<AutoloadResult> {
    const onProgress = config.onProgress || defaultConfig.onProgress;
    const onError = config.onError || defaultConfig.onError;
    const provider = config.provider;

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
        address = await resolveENS(provider, address);
    }

    // Load code, we need to disasm to find proxies
    onProgress("getCode", {address});
    const program = disasm(await provider.getCode(address));

    // FIXME: Sort them in some reasonable way
    result.proxies = program.proxies;

    if (result.proxies.length > 0) {
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
        onProgress("abiLoader", {address});
        try {
            result.abi = await abiLoader.loadABI(address);
            if (result.abi.length > 0) return result;
        } catch (error: any) {
            // TODO: Catch useful errors
            if (onError("abiLoad", error) === true) return result;
        }
    }

    // Load from code
    onProgress("getCode", {address});
    result.abi = abiFromBytecode(program);

    if (!config.enableExperimentalMetadata) {
        result.abi = stripUnreliableABI(result.abi);
    }

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

                    // Remove empty names
                    for (const input of extracted.inputs) {
                        if (input.name === "") delete(input.name);
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

