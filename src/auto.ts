import { Fragment, FunctionFragment } from "ethers";

import type { AnyProvider } from "./providers.js";
import type { ABI, ABIFunction } from "./abi.js";
import { type ProxyResolver, DiamondProxyResolver } from "./proxies.js";
import type { ABILoader, SignatureLookup, ContractResult } from "./loaders.js";
import * as errors from "./errors.js";

import { CompatibleProvider } from "./providers.js";
import { defaultABILoader, defaultSignatureLookup } from "./loaders.js";
import { abiFromBytecode, disasm } from "./disasm.js";
import { MultiABILoader } from "./loaders.js";

function isAddress(address: string) {
    return address.length === 42 && address.startsWith("0x") && Number(address) >= 0;
}

export const defaultConfig = {
    onProgress: (_: string) => { },
    onError: (phase: string, err: Error) => { console.error(phase + ":", err); return false; },
}

/** AutoloadResult is the return type for the {@link autoload} function. */
export type AutoloadResult = {
    address: string,
    abi: ABI;

    /** Whether the `abi` is loaded from a verified source */
    abiLoadedFrom?: ABILoader;

    /** Full contract metadata result, only included if {@link AutoloadConfig.loadContractResult} is true. */
    contractResult?: ContractResult;

    /** List of resolveable proxies detected in the contract */
    proxies: ProxyResolver[],

    /**
     * Follow proxies to next result.
     * If multiple proxies were detected, some reasonable ordering of attempts will be made.
     * Note: Some proxies operate relative to a specific selector (such as DiamondProxy facets), in this case we'll need to specify a selector that we care about.
     */
    followProxies?: (selector?: string) => Promise<AutoloadResult>,

    /**
     * Set to true when a CREATE or CREATE2 opcode is present in the bytecode.
     * This means that some of the results could have been mistaken from the embedded contract that gets created by the factory.
     * For example, we can have a non-proxy contract which creates a proxy contract on call. WhatsABI may not yet be able to distinguish them reliably.
     *
     * @experimental
     */
    isFactory?: boolean;
}


/**
 * AutoloadConfig specifies the configuration inputs for the {@link autoload} function.
 **/
export type AutoloadConfig = {
    /** @group Required */
    provider: AnyProvider;

    /** @group Loaders */
    abiLoader?: ABILoader | false;
    /** @group Loaders */
    signatureLookup?: SignatureLookup | false;

    /** Hooks: */

    /**
     * Called during various phases: resolveName, getCode, abiLoader, signatureLookup, followProxies
     * @group Hooks
     */
    onProgress?: (phase: string, ...args: any[]) => void;

    /**
     * Called during any encountered errors during a given phase
     * @group Hooks
     */
    onError?: (phase: string, error: Error) => boolean | void; // Return true-y to abort, undefined/false-y to continue

    /**
     * Called to resolve invalid addresses, uses provider's built-in resolver otherwise
     * @group Hooks
     */
    addressResolver?: (name: string) => Promise<string>;

    /** Settings: */

    /**
     * Enable following proxies automagically, if possible. Return the final result.
     * Note that some proxies are relative to a specific selector (such as DiamondProxies), so they will not be followed
     *
     * @group Settings
     */
    followProxies?: boolean;


    /**
     * Load full contract metadata result, include it in {@link AutoloadResult.ContractResult} if successful.
     *
     * This changes the behaviour of autoload to use {@link ABILoader.getContract} instead of {@link ABILoader.loadABI},
     * which returns a larger superset result including all of the available verified contract metadata.
     */
    loadContractResult?: boolean;

    /**
     * Enable pulling additional metadata from WhatsABI's static analysis which may be unreliable.
     * For now, this is primarily for event topics.
     *
     * @group Settings
     * @experimental
     */
    enableExperimentalMetadata?: boolean;
}

/**
 * autoload is a convenience helper for doing All The Things to load an ABI of a contract address, including resolving proxies.
 * @param address - The address of the contract to load
 * @param config - the {@link AutoloadConfig} object
 * @example
 * ```typescript
 * import { ethers } from "ethers";
 * import { whatsabi } from "@shazow/whatsabi";
 *
 * const provider = ethers.getDefaultProvider(); // substitute with your fav provider
 * const address = "0x00000000006c3852cbEf3e08E8dF289169EdE581"; // Or your fav contract address
 *
 * // Quick-start:
 *
 * const result = await whatsabi.autoload(address, { provider });
 * console.log(result.abi);
 * // -> [ ... ]
 * ```
 * @example
 * See {@link AutoloadConfig} for additional features that can be enabled.
 * ```typescript
 * const result = await whatsabi.autoload(address, {
 *   provider,
 *   followProxies: true,
 *   loadContractResult: true, // Load full contract metadata (slower)
 *   enableExperimentalMetadata: true, // Include less reliable static analysis results (e.g. event topics)
 *   // and more! See AutoloadConfig for all the options.
 * });
 * ```
 */
export async function autoload(address: string, config: AutoloadConfig): Promise<AutoloadResult> {
    if (config === undefined) {
        throw new errors.AutoloadError("config is undefined, must include 'provider'");
    }

    const onProgress = config.onProgress || defaultConfig.onProgress;
    const onError = config.onError || defaultConfig.onError;
    const provider = CompatibleProvider(config.provider);

    const result: AutoloadResult = {
        address,
        abi: [],
        proxies: [],
    };

    let abiLoader = config.abiLoader;
    if (abiLoader === undefined) abiLoader = defaultABILoader;

    if (!isAddress(address)) {
        onProgress("resolveName", { address });
        if (config.addressResolver) {
            address = await config.addressResolver(address);
        } else {
            try {
                address = await provider.getAddress(address);
            } catch (err) {
                throw new errors.AutoloadError(`Failed to resolve ENS address using provider.getAddress, try supplying your own resolver in AutoloadConfig by specifying addressResolver`, {
                    context: { address },
                    cause: err as Error,
                });
            }
        }
    }

    // Load code, we need to disasm to find proxies
    onProgress("getCode", { address });
    let bytecode: string;
    try {
        bytecode = await provider.getCode(address);
    } catch (err) {
        throw new errors.AutoloadError(`Failed to fetch contract code due to provider error: ${err instanceof Error ? err.message : String(err)}`,
            {
                context: { address },
                cause: err as Error,
            },
        );
    }
    if (!bytecode) return result; // Must be an EOA

    const program = disasm(bytecode);

    result.proxies = program.proxies; // FIXME: Sort them in some reasonable way
    result.isFactory = program.isFactory;

    // Mapping of address-to-valid-selectors. Non-empty mapping values will prune ABIs to the selectors before returning.
    // This is mainly to support multiple proxies and diamond proxies.
    const facets: Record<string, string[]> = {
        [address]: [],
    };

    if (result.proxies.length === 1 && result.proxies[0] instanceof DiamondProxyResolver) {
        // TODO: Respect config.followProxies, see https://github.com/shazow/whatsabi/issues/132
        onProgress("loadDiamondFacets", { address });
        const diamondProxy = result.proxies[0] as DiamondProxyResolver;
        const f = await diamondProxy.facets(provider, address);
        Object.assign(facets, f);

    } else if (result.proxies.length > 0) {
        result.followProxies = async function(selector?: string): Promise<AutoloadResult> {
            // This attempts to follow the first proxy that resolves successfully.
            // FIXME: If there are multiple proxies, should we attempt to merge them somehow?
            for (const resolver of result.proxies) {
                onProgress("followProxies", { resolver: resolver, address });
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
        onProgress("abiLoader", { address, facets: Object.keys(facets) });
        const loader = abiLoader;

        let abiLoadedFrom = loader;
        let originalOnLoad;
        if (loader instanceof MultiABILoader) {
            // This is a workaround for avoiding to change the loadABI signature, we can remove it if we use getContract instead.
            const onLoad = (loader: ABILoader) => {
                abiLoadedFrom = loader;
            }
            originalOnLoad = loader.onLoad;
            if (!loader.onLoad) loader.onLoad = onLoad;
            else {
                // Just in case someone uses this feature, let's wrap it to include both. Not ideal... Is there a better way here?
                const original = loader.onLoad;
                loader.onLoad = (loader: ABILoader) => { original(loader); onLoad(loader); };
            }
        }

        try {
            if (config.loadContractResult) {
                const contractResult = await loader.getContract(address);
                if (contractResult && Array.isArray(contractResult.abi) && contractResult.abi.length > 0) {
                    // We assume that a verified contract ABI contains all of the relevant resolved proxy functions
                    // so we don't need to mess with resolving facets and can return immediately.
                    result.contractResult = contractResult;
                    result.abi = contractResult.abi;
                    result.abiLoadedFrom = contractResult.loader;
                    return result;
                }
            } else {
                // Load ABIs of all available facets and merge
                const addresses = Object.keys(facets);
                const promises = addresses.map(addr => loader.loadABI(addr));
                const results = await Promise.all(promises);
                const abis = Object.fromEntries(results.map((abi, i) => {
                    return [addresses[i], abi];
                }));
                result.abi = pruneFacets(facets, abis);
                if (result.abi.length > 0) {
                    result.abiLoadedFrom = abiLoadedFrom;
                    return result;
                }
            }
        } catch (error: any) {
            // TODO: Catch useful errors
            if (onError("abiLoader", error) === true) return result;
        } finally {
            if (loader instanceof MultiABILoader) {
                loader.onLoad = originalOnLoad;
            }
        }
    }

    // Load from code
    onProgress("abiFromBytecode", { address });
    result.abi = abiFromBytecode(program);

    if (!config.enableExperimentalMetadata) {
        result.abi = stripUnreliableABI(result.abi);
    }

    // Add any extra ABIs we found from facets
    result.abi.push(...Object.values(facets).flat().map(selector => {
        return {
            type: "function",
            selector,
        } as ABIFunction;
    }));

    let signatureLookup = config.signatureLookup;
    if (signatureLookup === undefined) signatureLookup = defaultSignatureLookup;
    if (!signatureLookup) return result; // Bail

    // Load signatures from a database
    onProgress("signatureLookup", { abiItems: result.abi.length });

    let promises: Promise<void>[] = [];

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
                        delete (extracted.outputs);
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

    // Aggregate signatureLookup promises and their errors, if any
    const promiseResults = await Promise.allSettled(promises);
    const rejectedPromises = promiseResults.filter(
        (r) => r.status === "rejected",
    ) as PromiseRejectedResult[];

    if (rejectedPromises.length > 0) {
        const cause =
            rejectedPromises.length === 1
                ? rejectedPromises[0].reason
                : new AggregateError(rejectedPromises.map((r) => r.reason));
        throw new errors.AutoloadError(
            `Failed to fetch signatures due to loader error: ${cause.message}`,
            {
                context: { address },
                cause,
            },
        );
    }

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
