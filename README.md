![WhatsABI](assets/logo.png)

# WhatsABI

Guess an ABI and detect proxies from an Ethereum bytecode, even if it's unverified.

WhatsABI is perfect for building procedural frontends, embedding in wallets, block explorers, or doing bytecode analysis.

🤝 Used by **Otterscan, Sourcify, Ondora, Rivet,** [and more great projects](#projects-powered-by-whatsabi).

## Features

**What can WhatsABI do**?
- Return selectors from bytecode.
- Look up function signatures from selectors.
- Helpers for looking up ABI and signatures from public databases (like Sourcify, Etherscan, Blockscout, OpenChain, 4Byte).
- ✨ Resolve proxy contracts!
- Small bundle (less than 15 KB) that works with Ethers.js, Viem, and others.

**WhatsABI is different from other EVM analysis tools in some important ways:**
- Built in Typescript with minimal dependencies, so that it is **runnable in the browser and embeddable in wallets.**
- Algorithms used are limited to `O(instructions)` with a small constant factor, so that **complex contracts don't cause it to time out or use unbounded memory.**
- Does not rely on source code, so it **works with unverified contracts.**
- Does not assume the source language, so it can work for source languages other than Solidity (Vyper, or even hand-written assembly).
- Permissive open source (MIT-licensed), so that anyone can use it.

## Usage

Generated docs: https://shazow.github.io/whatsabi/

Quick start:

```typescript
import { ethers } from "ethers";
import { whatsabi } from "@shazow/whatsabi";

// Works with any provider (or client) library like Ethers.js, Viem, or Web3.js!
const provider = ethers.getDefaultProvider();
const address = "0x00000000006c3852cbEf3e08E8dF289169EdE581"; // Or your fav contract address

// Quick-start:

const result = await whatsabi.autoload(address, { provider });
console.log(result.abi);
// -> [ ... ]
```

Another quick example with Viem:

```typescript
import { createPublicClient, http } from 'viem'
import { mainnet } from 'viem/chains'
import { whatsabi } from "@shazow/whatsabi";
 
const client = createPublicClient({ chain: mainnet, transport: http() })
const result = await whatsabi.autoload(address, { provider: client });
```


Breaking it down, here's what autoload is doing on the inside:

```typescript
const code = await provider.getCode(address); // Load the bytecode

// Get just the callable selectors
const selectors = whatsabi.selectorsFromBytecode(code);
console.log(selectors); // -> ["0x06fdde03", "0x46423aa7", "0x55944a42", ...]

// Get an ABI-like list of interfaces
const abi = whatsabi.abiFromBytecode(code);
console.log(abi);
// -> [
//  {"type": "event", "hash": "0x721c20121297512b72821b97f5326877ea8ecf4bb9948fea5bfcb6453074d37f"},
//  {"type": "function", "payable": true, "selector": "0x06fdde03", ...},
//  {"type": "function", "payable": true, "selector": "0x46423aa7", ...},
//   ...

// We also have a suite of database loaders for convenience
const signatureLookup = new whatsabi.loaders.OpenChainSignatureLookup();
console.log(await signatureLookup.loadFunctions("0x06fdde03"));
// -> ["name()"]);
console.log(await signatureLookup.loadFunctions("0x46423aa7"));
// -> ["getOrderStatus(bytes32)"]);

// We also have event loaders!
console.log(await signatureLookup.loadEvents("0x721c20121297512b72821b97f5326877ea8ecf4bb9948fea5bfcb6453074d37f"));
// -> ["CounterIncremented(uint256,address)"]

// There are more fancy loaders in whatsabi.loaders.*, take a look!

// Here's a multiloader with an Etherscan API key, it can be used with autoload below.
// Each source will be attempted until a result is found.
const loader = new whatsabi.loaders.MultiABILoader([
  new whatsabi.loaders.SourcifyABILoader(),
  new whatsabi.loaders.EtherscanABILoader({
    apiKey: "...", // Replace the value with your Etherscan API key
  }),
  new whatsabi.loaders.BlockscoutABILoader({
    apiKey: "...", // Replace the value with your Blockscout API key
  }),
]);
const { abi, name, /* ... other metadata */ } = await loader.getContract(address));
```

See [whatsabi.loaders](https://shazow.github.io/whatsabi/modules/whatsabi.loaders.html) for more examples of what our loaders can do, like loading verified contract source code and compiler settings.

All together with our do-all-the-things helper:

```typescript
...

let result = await whatsabi.autoload(address, {
  provider: provider,

  // * Optional loaders:
  // abiLoader: whatsabi.loaders.defaultABILoader,
  // signatureLoader: whatsabi.loaders.defaultSignatureLookup,

  // There is a handy helper for adding the default loaders but with your own settings
  ... whatsabi.loaders.defaultsWithEnv({
    SOURCIFY_CHAIN_ID: 42161,
    ETHERSCAN_BASE_URL: "https://api.arbiscan.io/api",
    ETHERSCAN_API_KEY: "MYSECRETAPIKEY",
  }),

  // * Optional hooks:
  // onProgress: (phase: string) => { ... }
  // onError: (phase: string, context: any) => { ... }

  onProgress: (phase) => console.log("autoload progress", phase),
  onError: (phase, context) => console.log("autoload error", phase, context),

  // * Optional overrides:
  // addressResolver: (name: string) => Promise<string>

  // * Optional settings:
  // followProxies: false,
  // enableExperimentalMetadata: false,
});

console.log(result.abi);

// Detail will vary depending on whether `address` source code was available,
// or if bytecode-loaded selector signatures were available, or
// if WhatsABI had to guess everything from just bytecode.

// We can even detect and resolve proxies!
if (result.followProxies) {
    console.log("Proxies detected:", result.proxies);

    result = await result.followProxies();
    console.log(result.abi);
}
```

Or we can auto-follow resolved proxies, and expand parts of the result object:

```typescript
const { abi, address } = await whatsabi.autoload(
    "0x4f8AD938eBA0CD19155a835f617317a6E788c868",
    {
        provider,
        followProxies: true,
    },
});

console.log("Resolved to:", address);
// -> "0x964f84048f0d9bb24b82413413299c0a1d61ea9f"
```


## See Also

### Projects powered by WhatsABI

* ⭐ [otterscan.io](https://otterscan.io/) - Open source block explorer, [contract interactions powered by WhatsABI](https://x.com/otterscan/status/1817261257994756569)
* ⭐ [sourcify.dev](https://sourcify.dev/) - Verified source code API, proxy resolving powered by WhatsABI
* ⭐ [rivet](https://github.com/paradigmxyz/rivet) - Developer Wallet & DevTools for Anvil
* ⭐ [ondora.xyz](https://www.ondora.xyz/) - Cross-chain explorer and search engine
* ⭐ [thirdweb](https://thirdweb.com/) - Web3 SDK, automatic ABI Resolution powered by WhatsABI
* [callthis.link](https://callthis.link/) - Transaction builder powered by WhatsABI
* [abi.w1nt3r.xyz](https://abi.w1nt3r.xyz/) - A frontend for whatsabi by [@w1nt3r_eth](https://twitter.com/w1nt3r_eth)
* [ethcmd.com](https://www.ethcmd.com/) - Contract explorer frontend, [uses whatsabi for unverified contracts](https://github.com/verynifty/ethcmd)
* [monobase.xyz](https://monobase.xyz) - Universal frontend, [uses whatsabi for unverified contracts](https://twitter.com/nazar_ilamanov/status/1659648915195707392)
* [savvy](https://svvy.sh/) - Contract explorer with in-browser devnet execution
* [blockscout](https://www.blockscout.com/) - Open source block explorer
* [curvegrid](https://www.curvegrid.com/) - Platform for building EVM applications
* [tevm](https://tevm.sh/) - EVM toolkit for TypeScript

### Talks & Presentations

* [The Bytecode with Shafu - WhatsABI](https://www.youtube.com/watch?v=Io8bcYFjoEE) (July 2024)
* [WhatsABI? - Seminar for Spearbit](https://www.youtube.com/watch?v=sfgassm8SKw) (April 2023)

## Some Cool People Said...

> Omg WhatsABI by @shazow is so good that it can solve CTFs.  
> In one of my CTFs, students are supposed to find calldata that doesn’t revert  
> WhatsABI just spits out the solution automatically😂 I’m impressed!👏
>  
> 🗣️ [Nazar Ilamanov](https://twitter.com/nazar_ilamanov/status/1661240265955495936), creator of [monobase.xyz](https://monobase.xyz/)

> WhatsABI by @shazow takes contract bytecode, disassembled it into a set of EVM instructions, and then looks for the common Solidity's dispatch pattern.  
> Check out the source, it's actually very elegant!
>  
> 🗣️ [WINTΞR](https://twitter.com/w1nt3r_eth/status/1575848038223921152), creator of [abi.w1nt3r.xyz](https://abi.w1nt3r.xyz/)

> really cool stuff from @shazow  
> deduce a contract's ABI purely from bytecode
>  
> 🗣️ [t11s](https://twitter.com/transmissions11/status/1574851435971215360), from Paradigm

## Caveats

* If the contract is verified, `autoload` will just fetch the registered ABI and everything should be perfect either way.
* Finding valid function selectors from bytecode works great!
* Detecting Solidity-style function modifiers (view, payable, etc) is still unreliable.
* There's some minimal attempts at guessing the presence of arguments, but also unreliable.
* Call graph traversal only supports static jumps right now. Dynamic jumps are skipped until we add abstract stack tracing, this is the main cause of above's unreliability.
* Event parsing is janky, haven't found a reliable pattern so assume it's best
  effort. Feel free to open an issue with good failure examples, especially
  false negatives.

## Development

```console
$ cat .env  # Write an .env file with your keys, or `cp .env.example .env`
export INFURA_API_KEY="..."
export ETHERSCAN_API_KEY="..."
export BLOCKSCOUT_API_KEY="..."
$ nix develop  # Or use your system's package manager to install node/ts/etc
[dev] $ npm install
[dev] $ ONLINE=1 make test
```


## Thanks

* ⭐ [Herd Labs](https://www.herd.eco/) for sponsoring WhatsABI.
* [ethers.js](https://github.com/ethers-io/ethers.js/) for being excellent, and
  having a helpful assembler sub-package was inspiring.
* [@jacobdehart](https://twitter.com/jacobdehart) for the library name and logo
  that is totally a wasabi and not a green poop!
* [Etherscan](https://etherscan.io/) for increasing our API limits.


## License

MIT
