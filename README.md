![WhatsABI](assets/logo.png)

# WhatsABI

Guess an ABI from an Ethereum contract address, even if it's unverified.

WhatsABI does bounded-complexity static analysis to disassemble EVM bytecode and map out the possible call flows,
which allows us to discover function selectors and other metadata about the contract.

We can also look up the 4-byte selectors on APIs like
[4byte.directory](https://www.4byte.directory/) to discover possible original
function signatures.

## Features

WhatsABI is different from other EVM analysis tools in some important ways:
- Built in Typescript with minimal dependencies, so that it is **runnable in the browser and embeddable in wallets.**
- Algorithms used are limited to `O(instructions)` with a small constant factor, so that **complex contracts don't cause it to time out or use unbounded memory.**
- Does not rely on source code, so it **works with unverified contracts.**
- Does not assume the source language, so it can work for source languages other than Solidity (Vyper, or even hand-written assembly).
- Permissive open source (MIT-licensed), so that anyone can use it.
- ✨ Resolves proxies!

## Usage

```typescript
import { ethers } from "ethers";
import { whatsabi } from "@shazow/whatsabi";

const provider = new ethers.getDefaultProvider(); // substitute with your fav provider
const address = "0x00000000006c3852cbEf3e08E8dF289169EdE581"; // Or your fav contract address
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
console.log(await signatureLookup.loadEvents("0x721c20121297512b72821b97f5326877ea8ecf4bb9948fea5bfcb6453074d37f");
// -> ["CounterIncremented(uint256,address)"]

// There are more fancy loaders in whatsabi.loaders.*, take a look!
```

Bonus do-all-the-things helper:

```typescript
...

let result = await whatsabi.autoload(address, {
  provider: provider,

  // * Optional loaders:
  // abiLoader: whatsabi.loaders.defaultABILoader,
  // signatureLoader: whatsabi.loaders.defaultSignatureLookup,

  // * Optional hooks:
  // onProgress: (phase: string) => { ... }
  // onError: (phase: string, context: any) => { ... }

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
const { abi, address } = await whatsabi.autoload("0x4f8AD938eBA0CD19155a835f617317a6E788c868", {
    provider,

    followProxies: true,
});

console.log("Resolved to:", address);
// -> "0x964f84048f0d9bb24b82413413299c0a1d61ea9f"
```


## See Also

* [WhatsABI? - Seminar for Spearbit](https://www.youtube.com/watch?v=sfgassm8SKw) (April 2023)
* [abi.w1nt3r.xyz](https://abi.w1nt3r.xyz/) - A frontend for whatsabi by [@w1nt3r_eth](https://twitter.com/w1nt3r_eth) - https://github.com/w1nt3r-eth/abi.w1nt3r.xyz
* [ethcmd.com](https://www.ethcmd.com/) - Contract explorer frontend, [uses whatsabi for unverified contracts](https://github.com/verynifty/ethcmd)
* [monobase.xyz](https://monobase.xyz) - Universal frontend, [uses whatsabi for unverified contracts](https://twitter.com/nazar_ilamanov/status/1659648915195707392)

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

* Finding valid function selectors works great!
* Detecting Solidity-style function modifiers (view, payable, etc) is still unreliable.
* There's some minimal attempts at guessing the presence of arguments, but also unreliable.
* Call graph traversal only supports static jumps right now. Dynamic jumps are skipped until we add abstract stack tracing, this is the main cause of above's unreliability.
* Event parsing is janky, haven't found a reliable pattern so assume it's best
  effort. Feel free to open an issue with good failure examples, especially
  false negatives.

## Development

```console
$ cat .env
export INFURA_API_KEY="..."
export ETHERSCAN_API_KEY="..."
$ nix develop  # Or use your system's package manager to install node/ts/etc
[dev] $ npm install
[dev] $ ONLINE=1 make test
```


## Thanks

* [ethers.js](https://github.com/ethers-io/ethers.js/) for being excellent, and
  having a helpful assembler sub-package was inspiring.
* [@jacobdehart](https://twitter.com/jacobdehart) for the library name and logo
  that is totally a wasabi and not a green poop!


## License

MIT
