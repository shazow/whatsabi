/**
 * @module loaders
 * @example
 * Verified contract source code:
 * ```ts
 * const loader = whatsabi.loaders.defaultsWithEnv(env);
 * const result = await loader.getContract(address);
 * const sources = await result.getSources();
 *
 * for (const s of sources) {
 *   console.log(s.path, " -> ", s.content + "...");
 * }
 * ```
 *
 * @example
 * Combine loaders with custom settings behind a single interface, or use {@link defaultsWithEnv} as a shortcut for this.
 * ```ts
 * const loader = new whatsabi.loaders.MultiABILoader([
 *   new whatsabi.loaders.SourcifyABILoader({ chainId: 8453 }),
 *   new whatsabi.loaders.EtherscanV2ABILoader({
 *     apiKey: "...", // Replace the value with your API key
 *     chainId: 8453,
 *   }),
 * ]);
 * ```
 */
import { fetchJSON } from "./utils.js";
import * as errors from "./errors.js";

export type ContractResult = {
    abi: any[];
    name: string | null;
    ok: boolean; // False if no result is found
    evmVersion?: string;
    compilerVersion?: string;
    runs?: number;


    /**
     * getSources returns the imports -> source code mapping for the contract, if available.
     *
     * Caveats:
     * - Not all loaders support this, so the property could be undefined.
     * - This call could trigger additional fetch requests, depending on the loader.
     **/
    getSources?: () => Promise<ContractSources>;

    /**
     * Loader that provided the result.
     * We can make assumptions about the verified status if a verifying loader returned the result.
     */
    loader?: ABILoader;

    /**
     * Contains the full result from the loader provder.
     * There are no stability guarantees for the data layout of the result, so it's marked as experimental.
     *
     * Any useful attributes that can be normalized across loaders should be uplifted into ContractResult.
     * Please open an issue if you end up relying on rawResponse for properties that should be uplifted.
     *
     * @experimental
     */
    loaderResult?: EtherscanContractResult | SourcifyContractMetadata | any;
}

/**
 * ContractSources is a list of source files.
 * If the source was flattened, it will lack a path attribute.
 *
 * @example
 * ```typescript
 * [{"content": "pragma solidity =0.7.6;\n\nimport ..."}]
 * ```
 *
 * @example
 * ```typescript
 * [{"path": "contracts/Foo.sol", "content:" "pragma solidity =0.7.6;\n\nimport ..."}]
 * ```
 **/
export type ContractSources = Array<{ path?: string, content: string }>;


const emptyContractResult: ContractResult = {
    ok: false,

    abi: [],
    name: null,
    evmVersion: "",
    compilerVersion: "",
    runs: 0,
}

export interface ABILoader {
    readonly name: string;

    loadABI(address: string): Promise<any[]>;
    getContract(address: string): Promise<ContractResult>
}

/** Load ABIs from multiple providers until a result is found. */
export class MultiABILoader implements ABILoader {
    readonly name: string = "MultiABILoader";

    loaders: ABILoader[];

    /// Note: This callback is used to pull out which loader succeeded without modifying the return API.
    /// We can remove it once we switch to using getContract for autoload.
    /// @internal
    onLoad?: (loader: ABILoader) => void;

    constructor(loaders: ABILoader[]) {
        this.loaders = loaders;
    }

    async getContract(address: string): Promise<ContractResult> {
        for (const loader of this.loaders) {
            try {
                const r = await loader.getContract(address);
                if (r && r.abi.length > 0) {
                    if (this.onLoad) this.onLoad(loader);
                    return r;
                }
            } catch (err: any) {
                if (err.cause?.status === 404) continue;

                throw new MultiABILoaderError("MultiABILoader getContract error: " + err.message, {
                    context: { loader, address },
                    cause: err,
                });
            }
        }
        return emptyContractResult;
    }

    async loadABI(address: string): Promise<any[]> {
        for (const loader of this.loaders) {
            try {
                const r = await loader.loadABI(address);

                // Return the first non-empty result
                if (r.length > 0) {
                    if (this.onLoad) this.onLoad(loader);
                    return r;
                }
            } catch (err: any) {
                if (err.cause?.status === 404) continue;

                throw new MultiABILoaderError("MultiABILoader loadABI error: " + err.message, {
                    context: { loader, address },
                    cause: err,
                });
            }
        }
        return [];
    }
}

export class MultiABILoaderError extends errors.LoaderError { };

export class EtherscanABILoaderError extends errors.LoaderError { };

/// Etherscan Contract Source API response
export type EtherscanContractResult = {
    SourceCode: string;
    ABI: string;
    ContractName: string;
    CompilerVersion: string;
    OptimizationUsed: number;
    Runs: number;
    ConstructorArguments: string;
    EVMVersion: string;
    Library: string;
    LicenseType: string;
    Proxy: "1" | "0";
    Implementation: string;
    SwarmSource: string;
}


/** Etherscan v2 API loader */
export class EtherscanV2ABILoader implements ABILoader {
    readonly name: string = "EtherscanV2ABILoader";
    apiKey?: string;
    baseURL: string;

    constructor(config: { apiKey: string, chainId?: number }) {
        this.apiKey = config.apiKey;
        this.baseURL = `https://api.etherscan.io/v2/api?chainid=${config?.chainId ?? 1}`;
    }

    /** Etherscan helper for converting the encoded SourceCode result arg to a decoded ContractSources. */
    #toContractSources(result: { SourceCode: string }): ContractSources {
        if (!result.SourceCode.startsWith("{{")) {
            return [{ content: result.SourceCode }];
        }

        // Etherscan adds an extra {} to the encoded JSON
        const s = JSON.parse(result.SourceCode.slice(1, result.SourceCode.length - 1));

        // Flatten sources
        // { "sources": {"foo.sol": {"content": "..."}}}
        const sources = s.sources as Record<string, { content: string }>;
        return Object.entries(sources).map(
            ([path, source]) => {
                return { path, content: source.content };
            }
        )
    }

    async getContract(address: string): Promise<ContractResult> {
        const url = new URL(this.baseURL)
        const params = {
            module: "contract",
            action: "getsourcecode",
            address: address,
            ...(this.apiKey && { apikey: this.apiKey }),
        };

        // Using .set() to overwrite any default values that may be present in baseURL
        Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));

        try {
            const r = await fetchJSON(url.toString());
            if (r.status === "0") {
                if (r.result === "Contract source code not verified") return emptyContractResult;
                throw new Error(r.result);    // This gets wrapped below
            }

            // Status 1 means success, but the result could still be empty
            if (r.result.length > 0 && r.result[0].ABI === "Contract source code not verified") {
                return emptyContractResult;
            }

            const result = r.result[0] as EtherscanContractResult;
            return {
                abi: JSON.parse(result.ABI),
                name: result.ContractName,
                evmVersion: result.EVMVersion,
                compilerVersion: result.CompilerVersion,
                runs: result.Runs,

                getSources: async () => {
                    try {
                        return this.#toContractSources(result);
                    } catch (err: any) {
                        throw new EtherscanABILoaderError("EtherscanABILoader getContract getSources error: " + err.message, {
                            context: { url, address },
                            cause: err,
                        });
                    }
                },

                ok: true,
                loader: this,
                loaderResult: result,
            };
        } catch (err: any) {
            throw new EtherscanABILoaderError("EtherscanABILoader getContract error: " + err.message, {
                context: { url, address },
                cause: err,
            });
        }
    }

    async loadABI(address: string): Promise<any[]> {
        const url = new URL(this.baseURL)
        const params = {
            module: "contract",
            action: "getabi",
            address: address,
            ...(this.apiKey && { apikey: this.apiKey }),
        };

        // Using .set() to overwrite any default values that may be present in baseURL
        Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));

        try {
            const r = await fetchJSON(url.toString());

            if (r.status === "0") {
                if (r.result === "Contract source code not verified") return [];
                throw new Error(r.result); // This gets wrapped below
            }

            return JSON.parse(r.result);

        } catch (err: any) {
            throw new EtherscanABILoaderError("EtherscanABILoader loadABI error: " + err.message, {
                context: { url, address },
                cause: err,
            });
        }
    }
}

/**
  * Alias to the EtherscanV2ABILoader
  */
export class EtherscanABILoader extends EtherscanV2ABILoader {};

/**
  * EtherscanV1ABILoader
  * @deprecated v1 API is deprecated, use EtherscanV2ABILoader instead. This may be removed in a future release.
  */
export class EtherscanV1ABILoader extends EtherscanV2ABILoader {
    readonly name: string = "EtherscanV1ABILoader";

    constructor(config?: { apiKey?: string, baseURL?: string }) {
        if (config === undefined) config = {};
        super({ apiKey: config.apiKey ?? "" });
        this.baseURL = config.baseURL || "https://api.etherscan.io/api";
    }
};

function isSourcifyNotFound(error: any): boolean {
    return (
        // Sourcify returns strict CORS only if there is no result -_-
        error.message === "Failed to fetch" ||
        error.status === 404
    );
}

// https://sourcify.dev/
export class SourcifyABILoader implements ABILoader {
    readonly name = "SourcifyABILoader";

    chainId?: number;

    constructor(config?: { chainId?: number }) {
        this.chainId = config?.chainId ?? 1;
    }

    static stripPathPrefix(path: string): string {
        return path.replace(/^\/contracts\/(full|partial)_match\/\d*\/\w*\/(sources\/)?/, "");
    }

    async #loadContract(url: string): Promise<ContractResult> {
        try {
            const r = await fetchJSON(url);
            const files: Array<{ name: string, path: string, content: string }> = r.files ?? r;

            // Metadata is usually the first one
            const metadata = files.find((f) => f.name === "metadata.json")
            if (metadata === undefined) throw new SourcifyABILoaderError("metadata.json not found");

            // Note: Sometimes metadata.json contains sources, but not always. So we can't rely on just the metadata.json
            const m = JSON.parse(metadata.content) as SourcifyContractMetadata;

            // Sourcify includes a title from the Natspec comments
            let name = m.output.devdoc?.title;
            if (!name && m.settings.compilationTarget) {
                // Try to use the compilation target name as a fallback
                const targetNames = Object.values(m.settings.compilationTarget);
                if (targetNames.length > 0) {
                    name = targetNames[0];
                }
            }

            return {
                abi: m.output.abi,
                name: name ?? null,
                evmVersion: m.settings.evmVersion,
                compilerVersion: m.compiler.version,
                runs: m.settings.optimizer.runs,

                // TODO: Paths will have a sourcify prefix, do we want to strip it to help normalize? It doesn't break anything keeping the prefix, so not sure.
                // E.g. /contracts/full_match/1/0x1F98431c8aD98523631AE4a59f267346ea31F984/sources/contracts/interfaces/IERC20Minimal.sol
                // Can use stripPathPrefix helper to do this, but maybe we want something like getSources({ normalize: true })?
                getSources: async () => files.map(({ path, content }) => { return { path, content } }),

                ok: true,
                loader: this,
                loaderResult: m,
            };
        } catch (err: any) {
            if (isSourcifyNotFound(err)) return emptyContractResult;
            throw new SourcifyABILoaderError("SourcifyABILoader load contract error: " + err.message, {
                context: { url },
                cause: err,
            });
        }
    }

    async getContract(address: string): Promise<ContractResult> {
        {
            // Full match index includes verification settings that matches exactly
            const url = "https://sourcify.dev/server/files/" + this.chainId + "/" + address;
            const r = await this.#loadContract(url);
            if (r.ok) return r;
        }

        {
            // Partial match index is for verified contracts whose settings didn't match exactly
            const url = "https://sourcify.dev/server/files/any/" + this.chainId + "/" + address;
            const r = await this.#loadContract(url);
            if (r.ok) return r;
        }

        return emptyContractResult;
    }

    async loadABI(address: string): Promise<any[]> {
        {
            // Full match index includes verification settings that matches exactly
            const url = "https://sourcify.dev/server/repository/contracts/full_match/" + this.chainId + "/" + address + "/metadata.json";
            try {
                return (await fetchJSON(url)).output.abi;
            } catch (err: any) {
                if (!isSourcifyNotFound(err)) {
                    throw new SourcifyABILoaderError("SourcifyABILoader loadABI error: " + err.message, {
                        context: { address, url },
                        cause: err,
                    });
                }
            }
        }

        {
            // Partial match index is for verified contracts whose settings didn't match exactly
            const url = "https://sourcify.dev/server/repository/contracts/partial_match/" + this.chainId + "/" + address + "/metadata.json";
            try {
                return (await fetchJSON(url)).output.abi;
            } catch (err: any) {
                if (!isSourcifyNotFound(err)) {
                    throw new SourcifyABILoaderError("SourcifyABILoader loadABI error: " + err.message, {
                        context: { address, url },
                        cause: err,
                    });
                }
            }
        }

        return [];
    }
}

export class SourcifyABILoaderError extends errors.LoaderError { };

/// Sourcify Contract metadata from API response
export interface SourcifyContractMetadata {
    compiler: {
        version: string;
    };
    language: string;
    output: {
        abi: any[];
        devdoc?: any;
        userdoc?: any;
    };
    settings: {
        compilationTarget: Record<string, string>;
        evmVersion: string;
        libraries: Record<string, string>;
        metadata: Record<string, string>;
        optimizer: any;
        remappings: string[];
    };
    sources: Record<string, any>;
    version: number;
}

/** Blockscout API loader: https://docs.blockscout.com/ */
export class BlockscoutABILoader implements ABILoader {
    readonly name = "BlockscoutABILoader";

    apiKey?: string;
    baseURL: string;

    constructor(config?: { apiKey?: string; baseURL?: string }) {
        if (config === undefined) config = {};
        this.apiKey = config.apiKey;
        this.baseURL = config.baseURL || "https://eth.blockscout.com/api";
    }

    /** Blockscout helper for converting the result arg to a decoded ContractSources. */
    #toContractSources(result: {
        file_path?: string;
        source_code?: string;
        additional_sources?: Array<{ file_path: string; source_code: string }>;
    }): ContractSources {
        const sources: ContractSources = [];

        if (result.source_code) {
            sources.push({
                path: result.file_path,
                content: result.source_code,
            });
        }

        result.additional_sources?.forEach((source) => {
            sources.push({
                path: source.file_path,
                content: source.source_code,
            });
        });

        return sources;
    }

    async getContract(address: string): Promise<ContractResult> {
        let url = this.baseURL + `/v2/smart-contracts/${address}`;
        if (this.apiKey) url += "?apikey=" + this.apiKey;

        try {
            const r = await fetch(url);
            const result = (await r.json()) as BlockscoutContractResult;

            if (
                !result.abi ||
                !result.name ||
                !result.compiler_version ||
                !result.source_code
            ) {
                return emptyContractResult;
            }

            return {
                abi: result.abi,
                name: result.name,
                evmVersion: result.evm_version || "",
                compilerVersion: result.compiler_version,
                runs: result.optimization_runs || 200,

                getSources: async () => {
                    try {
                        return this.#toContractSources(result);
                    } catch (err: any) {
                        throw new BlockscoutABILoaderError(
                            "BlockscoutABILoader getContract getSources error: " +
                            err.message,
                            {
                                context: { url, address },
                                cause: err,
                            }
                        );
                    }
                },

                ok: true,
                loader: this,
                loaderResult: result,
            };
        } catch (err: any) {
            throw new BlockscoutABILoaderError(
                "BlockscoutABILoader getContract error: " + err.message,
                {
                    context: { url, address },
                    cause: err,
                }
            );
        }
    }

    async loadABI(address: string): Promise<any[]> {
        let url = this.baseURL + `/v2/smart-contracts/${address}`;
        if (this.apiKey) url += "?apikey=" + this.apiKey;

        try {
            const r = await fetch(url);
            const result = (await r.json()) as BlockscoutContractResult;
            if (!result.abi) {
                return [];
            }
            return result.abi;
        } catch (err: any) {
            throw new BlockscoutABILoaderError(
                "BlockscoutABILoader loadABI error: " + err.message,
                {
                    context: { url, address },
                    cause: err,
                }
            );
        }
    }
}

export class BlockscoutABILoaderError extends errors.LoaderError { }

/// Blockscout Contract Source API response
export type BlockscoutContractResult = {
    // Basic contract information
    name?: string;
    language?: string;
    license_type?: string;

    // Verification status
    is_verified?: boolean;
    is_fully_verified?: boolean;
    is_partially_verified?: boolean;
    is_verified_via_sourcify?: boolean;
    is_verified_via_eth_bytecode_db?: boolean;
    verified_twin_address_hash?: string;
    certified?: boolean;

    // Source code and files
    source_code?: string;
    source_code_html?: string;
    file_path?: string;
    file_path_html?: string;
    additional_sources?: Array<{ file_path: string; source_code: string }>;
    sourcify_repo_url?: string | null;

    // Bytecode and implementation
    creation_bytecode?: string;
    deployed_bytecode?: string;
    is_changed_bytecode?: boolean;
    is_self_destructed?: boolean;

    // Contract interface
    abi?: any[];
    has_methods_read?: boolean;
    has_methods_write?: boolean;
    has_custom_methods_read?: boolean;
    has_custom_methods_write?: boolean;
    can_be_visualized_via_sol2uml?: boolean;

    // Constructor and initialization
    constructor_args?: string;
    decoded_constructor_args?: any[];

    // Compiler settings
    compiler_version?: string;
    compiler_settings?: any;
    evm_version?: string;
    optimization_enabled?: boolean;
    optimization_runs?: number | null;

    // Contract type specifics
    is_blueprint?: boolean;
    is_vyper_contract?: boolean;

    // Proxy-related
    proxy_type?: string;
    implementations?: Array<{ address?: string; name?: string }>;
    has_methods_read_proxy?: boolean;
    has_methods_write_proxy?: boolean;
};


function isAnyABINotFound(error: any): boolean {
    return (
        error.status === 404 ||
        // "ABI not found" or "Not found"
        /not found/i.test(error.message)
    );
}

/** https://anyabi.xyz/ */
export class AnyABILoader implements ABILoader {
    readonly name = "AnyABILoader";

    chainId?: number;

    constructor(config?: { chainId?: number }) {
        this.chainId = config?.chainId ?? 1;
    }

    async #fetchAnyABI(address: string): Promise<ContractResult> {
        const url = "https://anyabi.xyz/api/get-abi/" + this.chainId + "/" + address;
        try {
            const r = await fetchJSON(url);
            const { abi, name }: { abi: any[]; name: string } = r;

            return {
                abi: abi,
                name: name,
                ok: true,
                loader: this,
                loaderResult: r,
            };
        } catch (err: any) {
            if (isAnyABINotFound(err)) return emptyContractResult;
            throw new AnyABILoaderError("AnyABILoader load contract error: " + err.message, {
                context: { url },
                cause: err,
            });
        }
    }

    async getContract(address: string): Promise<ContractResult> {
        {
            const r = await this.#fetchAnyABI(address);
            if (r.ok) return r;
        }

        return emptyContractResult;
    }

    async loadABI(address: string): Promise<any[]> {
        {
            const r = await this.#fetchAnyABI(address);
            if (r.ok) return r.abi;
        }

        return [];
    }
}

export class AnyABILoaderError extends errors.LoaderError { };

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
            if (r.length > 0) return r;
        }
        return [];
    }

    async loadEvents(hash: string): Promise<string[]> {
        for (const lookup of this.lookups) {
            const r = await lookup.loadEvents(hash);

            // Return the first non-empty result
            if (r.length > 0) return r;
        }
        return [];
    }
}

/** https://www.4byte.directory/ */
export class FourByteSignatureLookup implements SignatureLookup {
    async load(url: string): Promise<string[]> {
        try {
            const r = await fetchJSON(url);
            if (r.results === undefined) return [];
            return r.results.map((r: any): string => { return r.text_signature });
        } catch (err: any) {
            if (err.status === 404) return [];
            throw new FourByteSignatureLookupError("FourByteSignatureLookup load error: " + err.message, {
                context: { url },
                cause: err,
            });
        }
    }
    async loadFunctions(selector: string): Promise<string[]> {
        // Note: Could also lookup directly on Github, but not sure that's a good idea
        return this.load("https://www.4byte.directory/api/v1/signatures/?hex_signature=" + selector);
    }

    async loadEvents(hash: string): Promise<string[]> {
        return this.load("https://www.4byte.directory/api/v1/event-signatures/?hex_signature=" + hash);
    }
}

export class FourByteSignatureLookupError extends errors.LoaderError { };

/**
 * https://openchain.xyz/
 * Formerly: https://sig.eth.samczsun.com/
 */
export class OpenChainSignatureLookup implements SignatureLookup {
    async load(url: string): Promise<any> {
        try {
            const r = await fetchJSON(url);
            if (!r.ok) throw new Error("OpenChain API bad response: " + JSON.stringify(r));
            return r;
        } catch (err: any) {
            if (err.status === 404) return [];
            throw new OpenChainSignatureLookupError("OpenChainSignatureLookup load error: " + err.message, {
                context: { url },
                cause: err,
            });
        }
    }

    async loadFunctions(selector: string): Promise<string[]> {
        const r = await this.load("https://api.openchain.xyz/signature-database/v1/lookup?function=" + selector);
        return (r.result.function[selector] || []).map((item: any) => item.name);
    }

    async loadEvents(hash: string): Promise<string[]> {
        const r = await this.load("https://api.openchain.xyz/signature-database/v1/lookup?event=" + hash);
        return (r.result.event[hash] || []).map((item: any) => item.name);
    }
}

export class OpenChainSignatureLookupError extends errors.LoaderError { };

export class SamczunSignatureLookup extends OpenChainSignatureLookup { }

const defaultEnv = typeof process !== "undefined" ? process.env : {};

export const defaultABILoader: ABILoader = new MultiABILoader([new SourcifyABILoader(), new EtherscanV2ABILoader({ apiKey: defaultEnv?.ETHERSCAN_API_KEY! })]);
export const defaultSignatureLookup: SignatureLookup = new MultiSignatureLookup([new OpenChainSignatureLookup(), new FourByteSignatureLookup()]);

type LoaderEnv = {
    CHAIN_ID?: string | number,
    SOURCIFY_CHAIN_ID?: string | number,
    ETHERSCAN_API_KEY: string,
    ETHERSCAN_CHAIN_ID?: string | number,
}

/**
 * Return params to use with whatsabi.autoload(...)
 *
 * @example
 * ```ts
 * whatsabi.autoload(address, {provider, ...whatsabi.loaders.defaultsWithEnv(process.env)})
 * ```
 *
 * @example
 * ```ts
 * whatsabi.autoload(address, {
 *     provider,
 *     ...whatsabi.loaders.defaultsWithEnv({
 *         // Use this CHAIN_ID for all loaders that support specifying a chain
 *         CHAIN_ID: 8453,
 *         ETHERSCAN_API_KEY: "MYSECRETAPIKEY",
 *     }),
 * })
 * ```
 *
 * @example
 * ```ts
 * whatsabi.autoload(address, {
 *     provider,
 *     ...whatsabi.loaders.defaultsWithEnv({
 *         // Override specific chain IDs per-loader
 *         SOURCIFY_CHAIN_ID: 42161,
 *         ETHERSCAN_CHAIN_ID: 8453,
 *         ETHERSCAN_API_KEY: "MYSECRETAPIKEY",
 *     }),
 * })
 * ```
 *
 * @example
 * Can be useful for stand-alone usage too!
 * ```ts
 * const { abiLoader, signatureLookup } = whatsabi.loaders.defaultsWithEnv(env);
 * ```
 */
export function defaultsWithEnv(env: LoaderEnv): Record<string, ABILoader | SignatureLookup> {
    return {
        abiLoader: new MultiABILoader([
            new SourcifyABILoader({
                chainId: Number(env.SOURCIFY_CHAIN_ID ?? env.CHAIN_ID) || undefined,
            }),
            new EtherscanV2ABILoader({
                apiKey: env.ETHERSCAN_API_KEY,
                chainId: Number(env.ETHERSCAN_CHAIN_ID ?? env.CHAIN_ID) || undefined,
            }),
        ]),
        signatureLookup: new MultiSignatureLookup([
            new OpenChainSignatureLookup(),
            new FourByteSignatureLookup(),
        ]),
    };
}  
