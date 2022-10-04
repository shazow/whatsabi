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
const address = "0x7a250d5630b4cf539739df2c5dacb4c659f2488d"; // Or your fav contract address
const code = await provider.getCode(address); // Load the bytecode

// Get just the callable selectors
const selectors = whatsabi.selectorsFromBytecode(code);
console.log(selectors); // ["0x02751cec", "0x054d50d4", "0x18cbafe5", ...]

// Get an ABI-like list of interfaces
const abi = whatsabi.abiFromBytecode(code);
console.log(abi);
// [
//     { type: 'function', selector: '0xe8e33700', payable: false },
//     { type: 'function', selector: '0xf305d719', payable: true },
//     ...

```

## See Also

* [abi.w1nt3r.xyz](https://abi.w1nt3r.xyz/) - A frontend for whatsabi by [@w1nt3r_eth](https://twitter.com/w1nt3r_eth) - [github.com/w1nt3r-eth/abi.w1nt3r.xyz](https://github.com/w1nt3r-eth/abi.w1nt3r.xyz)


## Caveats

* This technique of parsing function selectors from the EVM bytecode only works
  if the bytecode layout is similar to how Solidity compiles it. It's possible
  to write assembly/bytecode that does not conform to this layout, which will
  fail to detect function selectors. Note that functions are not a native thing
  in the EVM, but rather it's an abstraction layer built on top of it by
  compilers.
* This library does not try to guess the function arguments, if any. That would
  be a cool addition in the future!


## Thanks

* [ethers.js](https://github.com/ethers-io/ethers.js/) for doing at least half
  of the hard work, even including an EVM bytecode parser for some reason!
* [@jacobdehart](https://twitter.com/jacobdehart) for the library name and logo
  that is totally a wasabi and not a green poop!


## License

MIT
