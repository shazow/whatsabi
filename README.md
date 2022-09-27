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
import { getDefaultProvider } from "ethers";
import { selectorsFromBytecode } from "@shazow/whatsabi";


const address = "0x7a250d5630b4cf539739df2c5dacb4c659f2488d"; // Or your fav contract address
const code = await getDefaultProvider().getCode(address); // Load the bytecode

const selectors = selectorsFromBytecode(code); // Get the callable selectors
console.log(selectors); // ["0x02751cec", "0x054d50d4", "0x18cbafe5", ...]

```


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
