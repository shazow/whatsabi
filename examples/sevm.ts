#!/usr/bin/env -S ts-node-script --esm

import { readFileSync } from "fs";
import { ethers } from "ethers";
import { withCache } from "../src/internal/filecache.js";

// @ts-ignore
import { Contract } from "sevm";


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

  const c = new Contract(code);
  console.log(c);
  console.log(c.functions); /* Get functions */
  console.log(c.getEvents); /* Get events */
};

main().then().catch(err => {
    console.error("Failed:", err)
    process.exit(2);
})
