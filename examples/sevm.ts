#!/usr/bin/env -S ts-node-script --esm

import { readFileSync } from "fs";
import { ethers } from "ethers";
import { withCache } from "../src/internal/filecache.js";

import { EVM } from 'sevm';


const { INFURA_API_KEY } = process.env;
const provider = INFURA_API_KEY ? (new ethers.InfuraProvider("homestead", INFURA_API_KEY)) : ethers.getDefaultProvider("homestead");


async function main() {
  const address = process.env["ADDRESS"] || process.argv[2];

    let code : string;
    if (!address) {
        console.error("Invalid address: " + address);
        process.exit(1);
    } else if (address === "-") {
        // Read contract code from stdin
        code = readFileSync(0, 'utf8').trim();
    } else {
        console.debug("Loading code for address:", address);
        code = await withCache(
            `${address}_abi`,
            async () => {
                return await provider.getCode(address)
            },
        );
    }

  const evm = new EVM(code);
  console.log(evm.getFunctions()); /* Get functions */
  console.log(evm.getEvents()); /* Get events */
  console.log(evm.decompile()); /* Decompile bytecode */
  console.log(evm.containsOpcode('SELFDESTRUCT')); /* Check whether contract contains a SELFDESTRUCT */
  console.log(evm.isERC165()); /* Detect whether contract is ERC165-compliant */
};

main().then().catch(err => {
    console.error("Failed:", err)
    process.exit(2);
})
