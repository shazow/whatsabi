import { expect, describe } from 'vitest';

import {
  defaultABILoader,
  defaultSignatureLookup,

  SourcifyABILoader,
  EtherscanV2ABILoader,
  BlockscoutABILoader,
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
    expect(result.loaderResult?.output?.userdoc).toBeDefined();
    expect(result.loaderResult?.output?.devdoc).toBeDefined();
  })

  online_test('SourcifyABILoader_getContract_UniswapV3Factory', async () => {
    const loader = new SourcifyABILoader();
    const { abi, name } = await loader.getContract("0x1F98431c8aD98523631AE4a59f267346ea31F984");
    const selectors = Object.values(selectorsFromABI(abi));
    const sig = "owner()";
    expect(selectors).toContain(sig);
    expect(name).toEqual("Canonical Uniswap V3 factory");
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
    expect(name).toEqual("Canonical Uniswap V3 factory");
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
    expect(result.name).toEqual("Canonical Uniswap V3 factory");
    expect(result.loader?.name).toStrictEqual(SourcifyABILoader.name);
    expect(result.loaderResult?.output?.userdoc).toBeDefined();
    expect(result.loaderResult?.output?.devdoc).toBeDefined();
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
