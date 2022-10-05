![WhatsABI](assets/logo.png)

# WhatsABI

Guess an ABI from an Ethereum contract address, even if it's unverified.

We parse EVM bytecode to find 4-byte `JUMPI` instructions and confirm that
they're valid internal `JUMPDEST` targets.

By getting the 4-byte function signature hash selectors, we can use them to
call functions on unverified contracts that were compiled using bytecode layout
techniques similar to Solidity.

We can also look up the 4-byte selectors on APIs like
[4byte.directory](https://www.4byte.directory/) to discover possible original
function signatures.

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
//  {"type": "function", "payable": true, "selector": "0x06fdde03"},
//  {"type": "function", "payable": true, "selector": "0x46423aa7"},
//   ...

// We also have a suite of database loaders for convenience
const signatureLookup = new whatsabi.loaders.SamczunSignatureLookup();
console.log(await signatureLookup.loadFunctions("0x06fdde03"));
// -> ["name()"]);
console.log(await signatureLookup.loadFunctions("0x46423aa7"));
// -> ["getOrderStatus(bytes32)"]);

// We also have event loaders!
console.log(await signatureLookup.loadEvents("0x721c20121297512b72821b97f5326877ea8ecf4bb9948fea5bfcb6453074d37f");
// -> ["CounterIncremented(uint256,address)"]

// There are more fancy loaders in whatsabi.loaders.*, take a look!
```

## See Also

* [abi.w1nt3r.xyz](https://abi.w1nt3r.xyz/) - A frontend for whatsabi by [@w1nt3r_eth](https://twitter.com/w1nt3r_eth) - [github.com/w1nt3r-eth/abi.w1nt3r.xyz](https://github.com/w1nt3r-eth/abi.w1nt3r.xyz)


## Caveats

* Event parsing is janky, haven't found a reliable pattern so assume it's best
  effort. Feel free to open an issue with good failure examples, especially
  false negatives.
* This technique of parsing function selectors from the EVM bytecode only works
  if the bytecode layout is similar to how Solidity compiles it. It's possible
  to write assembly/bytecode that does not conform to this layout, which will
  fail to detect function selectors. Note that functions are not a native thing
  in the EVM, but rather it's an abstraction layer built on top of it by
  compilers.
* This library does not try to guess the function arguments, if any. That would
  be a cool addition in the future!


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
