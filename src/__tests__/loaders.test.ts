import { expect, describe, vi, afterEach } from 'vitest';

import {
  defaultABILoader,
  defaultSignatureLookup,

  SourcifyABILoader,
  SourcifyABILoaderError,
  EtherscanV2ABILoader,
  BlockscoutABILoader,
  BlockscoutABILoaderError,
  AnyABILoader,
  MultiABILoader,
  MultiABILoaderError,

  OpenChainSignatureLookup,
  SamczunSignatureLookup,
  FourByteSignatureLookup,
} from "../loaders";
import type {
  ABILoader
} from "../loaders";

import { selectorsFromABI } from "../index";

import { describe_cached, online_test, test } from "./env";

const SLOW_ETHERSCAN_TIMEOUT = 30000;

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('loaders: ABILoader', () => {
  online_test('defaultABILoader', async () => {
    const addr = "0x7a250d5630b4cf539739df2c5dacb4c659f2488d";
    const abi = await defaultABILoader.loadABI(addr);
    const selectors = selectorsFromABI(abi);
    const hashes = Object.keys(selectors);
    hashes.sort();
    expect(hashes).toStrictEqual(['0x02751cec', '0x054d50d4', '0x18cbafe5', '0x1f00ca74', '0x2195995c', '0x38ed1739', '0x4a25d94a', '0x5b0d5984', '0x5c11d795', '0x791ac947', '0x7ff36ab5', '0x85f8c259', '0x8803dbee', '0xad5c4648', '0xad615dec', '0xaf2979eb', '0xb6f9de95', '0xbaa2abde', '0xc45a0155', '0xd06ca61f', '0xded9382a', '0xe8e33700', '0xf305d719', '0xfb3bdb41']);

    expect(selectors["0x7ff36ab5"]).toStrictEqual("swapExactETHForTokens(uint256,address[],address,uint256)");
  });

  online_test('SourcifyABILoader', async () => {
    const loader = new SourcifyABILoader();
    const abi = await loader.loadABI("0x7a250d5630b4cf539739df2c5dacb4c659f2488d"); // Unchecksummed address
    const selectors = Object.values(selectorsFromABI(abi));
    const sig = "swapExactETHForTokens(uint256,address[],address,uint256)";
    expect(selectors).toContain(sig);
  })

  online_test('EtherscanV2ABILoader', async ({ env }) => {
    const loader = new EtherscanV2ABILoader({ apiKey: env["ETHERSCAN_API_KEY"] });
    const abi = await loader.loadABI("0x7a250d5630b4cf539739df2c5dacb4c659f2488d");
    const selectors = Object.values(selectorsFromABI(abi));
    const sig = "swapExactETHForTokens(uint256,address[],address,uint256)";
    expect(selectors).toContain(sig);
  }, SLOW_ETHERSCAN_TIMEOUT)

  online_test('BlockscoutABILoader', async ({ env }) => {
    const loader = new BlockscoutABILoader({
      apiKey: env["BLOCKSCOUT_API_KEY"],
    });
    const abi = await loader.loadABI("0x7a250d5630b4cf539739df2c5dacb4c659f2488d");
    const selectors = Object.values(selectorsFromABI(abi));
    const sig = "swapExactETHForTokens(uint256,address[],address,uint256)";
    expect(selectors).toContain(sig);
  })

  online_test('BlockscoutABILoader_chainId', async ({ env }) => {
    const loader = new BlockscoutABILoader({
      apiKey: env["BLOCKSCOUT_API_KEY"],
      chainId: 8453,
    });
    const abiPromise = loader.loadABI("0x4200000000000000000000000000000000000006"); // WETH9 predeploy on Base
    if (!env["BLOCKSCOUT_API_KEY"]) {
      const error = await abiPromise.then(
        () => undefined,
        (error) => error,
      );
      expect(error).toBeInstanceOf(BlockscoutABILoaderError);
      expect(error.context).toMatchObject({ status: 402 });
      return;
    }

    const abi = await abiPromise;
    const selectors = Object.values(selectorsFromABI(abi));
    expect(selectors).toContain("deposit()");
  })

  online_test('MultiABILoader', async ({ env }) => {
    // A contract that is verified on etherscan but not sourcify
    const address = "0xa9a57f7d2A54C1E172a7dC546fEE6e03afdD28E2";
    const loader = new MultiABILoader([
      new SourcifyABILoader(),
      new EtherscanV2ABILoader({ apiKey: env["ETHERSCAN_API_KEY"] }),
    ]);
    const abi = await loader.loadABI(address);
    const sig = "getMagistrate()";
    const selectors = Object.values(selectorsFromABI(abi));
    expect(selectors).toContain(sig);
  }, SLOW_ETHERSCAN_TIMEOUT);

  online_test('SourcifyABILoader_getContract', async () => {
    const loader = new SourcifyABILoader();
    const result = await loader.getContract("0x7a250d5630b4cf539739df2c5dacb4c659f2488d");
    const selectors = Object.values(selectorsFromABI(result.abi));
    const sig = "swapExactETHForTokens(uint256,address[],address,uint256)";
    expect(selectors).toContain(sig);
    expect(result.name).toStrictEqual("UniswapV2Router02")
    expect(result.loader?.name).toStrictEqual("SourcifyABILoader");
    expect(result.loaderResult?.compilation).toBeDefined();
    expect(result.loaderResult?.metadata?.output?.userdoc).toBeDefined();
    expect(result.loaderResult?.metadata?.output?.devdoc).toBeDefined();

    const sources = result.getSources && await result.getSources();
    expect(sources && sources[0].content).toContain("pragma solidity");
  })

  online_test('SourcifyABILoader_getContract_UniswapV3Factory', async () => {
    const loader = new SourcifyABILoader();
    const { abi, name } = await loader.getContract("0x1F98431c8aD98523631AE4a59f267346ea31F984");
    const selectors = Object.values(selectorsFromABI(abi));
    const sig = "owner()";
    expect(selectors).toContain(sig);
    expect(name).toEqual("UniswapV3Factory");
  })

  online_test('EtherscanV2ABILoader_getContract', async ({ env }) => {
    const loader = new EtherscanV2ABILoader({ apiKey: env["ETHERSCAN_API_KEY"] });
    const result = await loader.getContract("0x7a250d5630b4cf539739df2c5dacb4c659f2488d");
    const selectors = Object.values(selectorsFromABI(result.abi));
    const sig = "swapExactETHForTokens(uint256,address[],address,uint256)";
    expect(selectors).toContain(sig);

    const sources = result.getSources && await result.getSources();
    expect(sources && sources[0].content).toContain("pragma solidity");

  }, SLOW_ETHERSCAN_TIMEOUT)

  online_test('EtherscanV2ABILoader_getContract_UniswapV3Factory', async ({ env }) => {
    const loader = new EtherscanV2ABILoader({ apiKey: env["ETHERSCAN_API_KEY"] });
    const { abi, name } = await loader.getContract("0x1F98431c8aD98523631AE4a59f267346ea31F984");
    const selectors = Object.values(selectorsFromABI(abi));
    const sig = "owner()";
    expect(selectors).toContain(sig);
    expect(name).toEqual("UniswapV3Factory");
  }, SLOW_ETHERSCAN_TIMEOUT)

  online_test('EtherscanV2ABILoader_getContract_CompoundUSDCProxy', async ({ env }) => {
    const loader = new EtherscanV2ABILoader({ apiKey: env["ETHERSCAN_API_KEY"] });
    const result = await loader.getContract("0xc3d688b66703497daa19211eedff47f25384cdc3");
    expect(result.name).toEqual("TransparentUpgradeableProxy");
    expect(result.loaderResult?.Proxy).toBeTruthy();
    expect(result.loaderResult?.Implementation).toMatch(/^0x[0-9a-f]{40}$/);
  }, SLOW_ETHERSCAN_TIMEOUT)

  online_test('BlockscoutABILoader_getContract', async ({ env }) => {
    const loader = new BlockscoutABILoader({
      apiKey: env["BLOCKSCOUT_API_KEY"],
    });
    const result = await loader.getContract("0x7a250d5630b4cf539739df2c5dacb4c659f2488d");
    const selectors = Object.values(selectorsFromABI(result.abi));
    const sig = "swapExactETHForTokens(uint256,address[],address,uint256)";
    expect(selectors).toContain(sig);
    expect(result.name).toStrictEqual("UniswapV2Router02")
    expect(result.loader?.name).toStrictEqual("BlockscoutABILoader");
    expect(result.loaderResult?.source_code).toBeDefined();
    expect(result.loaderResult?.compiler_settings).toBeDefined();

    const sources = result.getSources && await result.getSources();
    expect(sources && sources[0].content).toContain("pragma solidity");
  })

  online_test('BlockscoutABILoader_getContract_UniswapV3Factory', async ({ env }) => {
    const loader = new BlockscoutABILoader({
      apiKey: env["BLOCKSCOUT_API_KEY"],
    });
    const { abi, name } = await loader.getContract("0x1F98431c8aD98523631AE4a59f267346ea31F984");
    const selectors = Object.values(selectorsFromABI(abi));
    const sig = "owner()";
    expect(selectors).toContain(sig);
    expect(name).toEqual("UniswapV3Factory");
  })

  online_test('MultiABILoader_getContract_UniswapV3Factory', async ({ env }) => {
    const address = "0x1F98431c8aD98523631AE4a59f267346ea31F984";
    const loader = new MultiABILoader([
      new SourcifyABILoader(),
      new EtherscanV2ABILoader({ apiKey: env["ETHERSCAN_API_KEY"] }),
    ]);
    const { abi, name } = await loader.getContract(address);
    const sig = "owner()";
    const selectors = Object.values(selectorsFromABI(abi));
    expect(selectors).toContain(sig);
    expect(name).toEqual("UniswapV3Factory");
  }, SLOW_ETHERSCAN_TIMEOUT);

  online_test('MultiABILoader_SourcifyOnly_getContract_UniswapV3Factory', async () => {
    const address = "0x1F98431c8aD98523631AE4a59f267346ea31F984";
    const loader = new MultiABILoader([
      new SourcifyABILoader(),
    ]);
    const result = await loader.getContract(address);
    const sig = "owner()";
    const selectors = Object.values(selectorsFromABI(result.abi));
    expect(selectors).toContain(sig);
    expect(result.name).toEqual("UniswapV3Factory");
    expect(result.loader?.name).toStrictEqual(SourcifyABILoader.name);
    expect(result.loaderResult?.compilation).toBeDefined();
  }, SLOW_ETHERSCAN_TIMEOUT);

  online_test('MultiABILoader_EtherscanOnly_getContract_UniswapV3Factory', async ({ env }) => {
    const address = "0x1F98431c8aD98523631AE4a59f267346ea31F984";
    const loader = new MultiABILoader([
      new EtherscanV2ABILoader({ apiKey: env["ETHERSCAN_API_KEY"] }),
    ]);
    const res = await loader.getContract(address);
    const sig = "owner()";
    const selectors = Object.values(selectorsFromABI(res.abi));
    expect(selectors).toContain(sig);
    expect(res.name).toEqual("UniswapV3Factory");

    const sources = res.getSources && await res.getSources();
    expect(
      sources?.find(s => s.path?.endsWith("contracts/libraries/UnsafeMath.sol"))?.content
    ).contains("pragma solidity");
  }, SLOW_ETHERSCAN_TIMEOUT);
});

describe('loaders: SourcifyABILoader v2', () => {
  test('loadABI uses the Sourcify v2 contract endpoint', async () => {
    const abi = [{ type: "function", name: "balanceOf" }];
    const fetch = vi.fn(async (url: string) => {
      const parsedURL = new URL(url);
      expect(parsedURL.pathname).toBe("/server/v2/contract/8453/0x0000000000000000000000000000000000000001");
      expect(parsedURL.searchParams.get("fields")).toBe("abi");
      expect(url).not.toContain("/repository/contracts/");
      return {
        ok: true,
        json: async () => ({ abi }),
      };
    });
    vi.stubGlobal("fetch", fetch);

    const loader = new SourcifyABILoader({ chainId: 8453 });

    await expect(loader.loadABI("0x0000000000000000000000000000000000000001")).resolves.toStrictEqual(abi);
    expect(fetch).toHaveBeenCalledOnce();
  });

  test('getContract maps the Sourcify v2 contract response', async () => {
    const abi = [{ type: "function", name: "transfer" }];
    const metadata = { output: { devdoc: { title: "A token" }, userdoc: {} } };
    const fetch = vi.fn(async (url: string) => {
      const parsedURL = new URL(url);
      expect(parsedURL.pathname).toBe("/server/v2/contract/8453/0x0000000000000000000000000000000000000001");

      // Sources are large, so they're only fetched when getSources() is called
      if (parsedURL.searchParams.get("fields") === "sources") {
        return {
          ok: true,
          json: async () => ({
            sources: {
              "Token.sol": { content: "contract Token {}" },
            },
            match: "match",
          }),
        };
      }

      expect(parsedURL.searchParams.get("fields")).toBe("abi,compilation,metadata");
      return {
        ok: true,
        json: async () => ({
          abi,
          compilation: {
            name: "Token",
            compilerVersion: "0.8.30+commit.73712a01",
            compilerSettings: {
              evmVersion: "paris",
              optimizer: { runs: 200 },
            },
          },
          metadata,
          match: "match",
        }),
      };
    });
    vi.stubGlobal("fetch", fetch);

    const loader = new SourcifyABILoader({ chainId: 8453 });
    const result = await loader.getContract("0x0000000000000000000000000000000000000001");

    expect(result).toMatchObject({
      abi,
      name: "Token",
      ok: true,
      evmVersion: "paris",
      compilerVersion: "0.8.30+commit.73712a01",
      runs: 200,
    });
    expect(result.loaderResult?.metadata).toStrictEqual(metadata);
    expect(fetch).toHaveBeenCalledOnce();

    await expect(result.getSources?.()).resolves.toStrictEqual([{ path: "Token.sol", content: "contract Token {}" }]);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  test('treats a 404 as unverified', async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: false,
      status: 404,
      statusText: "Not Found",
    })));

    const loader = new SourcifyABILoader({ chainId: 8453 });
    const address = "0x0000000000000000000000000000000000000001";

    await expect(loader.loadABI(address)).resolves.toStrictEqual([]);
    const r = await loader.getContract(address);
    expect(r.ok).toBeFalsy();
    expect(r.abi).toStrictEqual([]);
  });

  test('propagates network failures instead of reporting unverified', async () => {
    // The v1 API returned strict CORS on a miss, so "Failed to fetch" used to
    // read as not-found; with v2 it's a real failure and must surface, or
    // MultiABILoader would report "unverified" while Sourcify was unreachable.
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("Failed to fetch") }));

    const loader = new SourcifyABILoader({ chainId: 8453 });
    const address = "0x0000000000000000000000000000000000000001";

    await expect(loader.loadABI(address)).rejects.toThrow(SourcifyABILoaderError);
    await expect(loader.getContract(address)).rejects.toThrow(SourcifyABILoaderError);
  });
});

describe('loaders: BlockscoutABILoader', () => {
  test.each([
    ["JSON", JSON.stringify({ message: "Not found" }), "application/json"],
    ["non-JSON", "<html>Not found</html>", "text/html"],
  ])('treats %s 404 responses as ordinary misses', async (_, body, contentType) => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(
      body,
      {
        status: 404,
        statusText: "Not Found",
        headers: { "Content-Type": contentType },
      },
    )));

    const loader = new BlockscoutABILoader({
      baseURL: "https://eth.blockscout.test/api",
    });
    const address = "0x0000000000000000000000000000000000000001";

    await expect(loader.loadABI(address)).resolves.toStrictEqual([]);
    await expect(loader.getContract(address)).resolves.toMatchObject({
      abi: [],
      ok: false,
    });
  });

  test('returns an ABI when optional contract metadata is missing', async () => {
    const abi = [{ type: "function", name: "deposit", inputs: [] }];
    vi.stubGlobal("fetch", vi.fn(async () => new Response(
      JSON.stringify({ abi }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    )));

    const loader = new BlockscoutABILoader({
      baseURL: "https://eth.blockscout.test/api",
    });
    const address = "0x0000000000000000000000000000000000000001";

    await expect(loader.loadABI(address)).resolves.toStrictEqual(abi);
    await expect(loader.getContract(address)).resolves.toMatchObject({
      abi,
      name: null,
      ok: true,
    });
  });

  test.each(['getContract', 'loadABI'] as const)(
    '%s preserves non-JSON error responses',
    async (method) => {
      const responseBody = "<html>Service unavailable</html>";
      vi.stubGlobal("fetch", vi.fn(async () => new Response(
        responseBody,
        {
          status: 503,
          statusText: "Service Unavailable",
          headers: { "Content-Type": "text/html" },
        },
      )));

      const loader = new BlockscoutABILoader({
        baseURL: "https://eth.blockscout.test/api",
      });
      const address = "0x0000000000000000000000000000000000000001";
      const error = await loader[method](address).then(
        () => undefined,
        (error) => error,
      );

      expect(error).toBeInstanceOf(BlockscoutABILoaderError);
      expect(error.message).toContain("503 Service Unavailable");
      expect(error.context).toMatchObject({
        address,
        status: 503,
        response: responseBody,
      });
    },
  );

  test.each(['getContract', 'loadABI'] as const)(
    '%s throws on unsuccessful HTTP responses',
    async (method) => {
      const address = "0x0000000000000000000000000000000000000001";
      const responseBody = {
        error: "Proceed with API key or make a X402 payment to continue",
      };
      vi.stubGlobal("fetch", vi.fn(async () => new Response(
        JSON.stringify(responseBody),
        {
          status: 402,
          statusText: "Payment Required",
          headers: { "Content-Type": "application/json" },
        },
      )));

      const loader = new BlockscoutABILoader({
        baseURL: "https://api.blockscout.test/8453/api",
      });
      const error = await loader[method](address).then(
        () => undefined,
        (error) => error,
      );

      expect(error).toBeInstanceOf(BlockscoutABILoaderError);
      expect(error.message).toContain("402 Payment Required");
      expect(error.message).toContain(responseBody.error);
      expect(error.context).toMatchObject({
        address,
        status: 402,
        response: responseBody,
      });
    },
  );
});

describe_cached("loaders: ABILoader suite", async ({ env }) => {
  // Addess we know won't have a verified ABI 
  const knownUnverified = "0x0000000000000000000000000000000000000001";

  function makeTest(loader: ABILoader, knownVerified: string) {
    online_test(`${loader.name} unverified getContract`, async () => {
      const r = await loader.getContract(knownUnverified);
      expect(r.ok).toBeFalsy();
      expect(r.abi).toStrictEqual([]);
    });

    online_test(`${loader.name} unverified loadABI`, async () => {
      const r = await loader.loadABI(knownUnverified);
      expect(r).toStrictEqual([]);
    });

    online_test(`${loader.name} verified getContract`, async () => {
      const r = await loader.getContract(knownVerified);
      expect(r.ok).toBeTruthy();
      expect(r.abi).not.toStrictEqual([]);
    });
  }

  const uniswapV2Router = "0x7a250d5630b4cf539739df2c5dacb4c659f2488d";

  const loaders = [
    new SourcifyABILoader(),
    new EtherscanV2ABILoader({ apiKey: env["ETHERSCAN_API_KEY"] }),
    new BlockscoutABILoader({ apiKey: env["BLOCKSCOUT_API_KEY"] }),
    new AnyABILoader(),
  ];

  for (const loader of loaders) {
    makeTest(loader, uniswapV2Router);
  }

  makeTest(new MultiABILoader(loaders), uniswapV2Router);
});


describe('loaders: SignatureLookup', () => {
  online_test('defaultSignatureLookup', async () => {
    const sig = "swapExactETHForTokens(uint256,address[],address,uint256)";
    const selector = "0x7ff36ab5"
    const selectors = selectorsFromABI([sig]);
    expect(Object.keys(selectors)).toContain(selector);

    const r = await defaultSignatureLookup.loadFunctions(selector);
    expect(r).toContain(sig);
  });

  online_test('SamczunSignatureLookup', async () => {
    const lookup = new SamczunSignatureLookup();
    const selectors = await lookup.loadFunctions("0x7ff36ab5");
    const sig = "swapExactETHForTokens(uint256,address[],address,uint256)";
    expect(selectors).toContain(sig);
  })

  online_test('OpenChainSignatureLookup', async () => {
    const lookup = new OpenChainSignatureLookup();
    const selectors = await lookup.loadFunctions("0x7ff36ab5");
    const sig = "swapExactETHForTokens(uint256,address[],address,uint256)";
    expect(selectors).toContain(sig);
  })

  online_test('FourByteSignatureLookup', async () => {
    const lookup = new FourByteSignatureLookup();
    const selectors = await lookup.loadFunctions("0x7ff36ab5");
    const sig = "swapExactETHForTokens(uint256,address[],address,uint256)";
    expect(selectors).toContain(sig);
  })
});


describe('loaders: helpers', () => {
  test('SourcifyABILoader.stripPathPrefix', () => {
    expect(
      SourcifyABILoader.stripPathPrefix("/contracts/full_match/1/0x1F98431c8aD98523631AE4a59f267346ea31F984/sources/contracts/interfaces/IERC20Minimal.sol")
    ).toEqual("contracts/interfaces/IERC20Minimal.sol");

    expect(
      SourcifyABILoader.stripPathPrefix("/contracts/full_match/1/0x1F98431c8aD98523631AE4a59f267346ea31F984/metadata.json")
    ).toEqual("metadata.json");
  });

  test('BlockscoutABILoader baseURL from chainId', () => {
    // chainId routes through the multichain gateway, like EtherscanV2ABILoader
    expect(
      new BlockscoutABILoader({ apiKey: "key", chainId: 8453 }).baseURL
    ).toEqual("https://api.blockscout.com/8453/api");

    // No config keeps the historical default
    expect(new BlockscoutABILoader().baseURL).toEqual("https://eth.blockscout.com/api");

    // An explicit baseURL wins over chainId
    expect(
      new BlockscoutABILoader({ baseURL: "https://base.blockscout.com/api", chainId: 8453 }).baseURL
    ).toEqual("https://base.blockscout.com/api");
  });
});


describe('loaders: MultiABILoader with degraded loaders', () => {
  const address = "0xc0Da02939E1441F497fd74F78cE7Decb17B66529";
  const verifiedABI = [
    { type: "event", name: "NewImplementation" },
    { type: "function", name: "implementation" },
  ];

  const failingLoader = (status?: number): ABILoader => ({
    name: "FailingLoader",
    getContract: async () => {
      throw Object.assign(new Error(`upstream failure${status ? " " + status : ""}`), status ? { cause: { status } } : {});
    },
    loadABI: async () => {
      throw Object.assign(new Error(`upstream failure${status ? " " + status : ""}`), status ? { cause: { status } } : {});
    },
  });

  const okLoader: ABILoader = {
    name: "OkLoader",
    getContract: async () => ({ abi: verifiedABI, name: "Verified", ok: true }),
    loadABI: async () => verifiedABI,
  };

  test('continues to the next loader when one fails', async () => {
    const loader = new MultiABILoader([failingLoader(503), okLoader]);

    expect(await loader.loadABI(address)).toEqual(verifiedABI);

    const r = await loader.getContract(address);
    expect(r.abi).toEqual(verifiedABI);
    expect(r.name).toEqual("Verified");
    expect(r.ok).toBeTruthy();
  });

  test('still treats a 404 as an ordinary miss', async () => {
    const loader = new MultiABILoader([failingLoader(404), okLoader]);

    expect(await loader.loadABI(address)).toEqual(verifiedABI);
    expect((await loader.getContract(address)).name).toEqual("Verified");
  });

  test('throws an aggregate error when no loader can answer', async () => {
    const loader = new MultiABILoader([failingLoader(503), failingLoader()]);

    await expect(loader.loadABI(address)).rejects.toThrow(MultiABILoaderError);
    const err: MultiABILoaderError = await loader.getContract(address).then(
      () => { throw new Error("expected getContract to reject") },
      (e) => e,
    );
    expect(err).toBeInstanceOf(MultiABILoaderError);
    expect(err.context?.failures).toHaveLength(2);
    // Kept for compatibility with the pre-aggregate error shape.
    expect(err.context?.loader?.name).toEqual("FailingLoader");
  });

  test('throws rather than reporting unverified when a loader was unreachable', async () => {
    // A clean miss from one loader cannot prove "unverified" while another
    // loader was down: the contract might only be indexed by the broken one.
    const loader = new MultiABILoader([failingLoader(503), failingLoader(404)]);

    await expect(loader.loadABI(address)).rejects.toThrow(MultiABILoaderError);
    await expect(loader.getContract(address)).rejects.toThrow(MultiABILoaderError);
  });

  test('returns the empty result when every loader misses', async () => {
    const loader = new MultiABILoader([failingLoader(404), failingLoader(404)]);

    expect(await loader.loadABI(address)).toEqual([]);
    const r = await loader.getContract(address);
    expect(r.abi).toEqual([]);
    expect(r.ok).toBeFalsy();
  });
});
