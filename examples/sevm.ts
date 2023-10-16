#!/usr/bin/env -S ts-node-script --esm

import { readFileSync } from "fs";
import { ethers } from "ethers";
import { withCache } from "../src/internal/filecache.js";

// @ts-ignore
import { Contract } from "sevm";

import type { ABI, ABIFunction, ABIEvent } from "../src/abi.js";


const { INFURA_API_KEY } = process.env;
const provider = INFURA_API_KEY ? (new ethers.InfuraProvider("homestead", INFURA_API_KEY)) : ethers.getDefaultProvider("homestead");


export function abiFromBytecode(bytecode: string): ABI {
    const abi : ABI = [];

    const c = new Contract(bytecode);
    for (const [selector, fn] of Object.entries(c.functions)) {
        // let mutability = fn.payable ? "payable" : "nonpayable";
        // TODO: Can we get view or pure?
        // TODO: Can we get inputs/outputs?
        const a = {
            selector,
        } as ABIFunction;
        if (fn.payable) a.payable = true;
        abi.push(a);
    }

    for (const [topic, _] of Object.entries(c.getEvents())) {
        abi.push({
            hash: topic,
        } as ABIEvent);
    }

    return abi;
}


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

    //const c = new Contract(code);
    //console.log(c);
    //console.log(c.functions); /* Get functions */
    //console.log(c.getEvents()); /* Get events */

    const abi = abiFromBytecode(code);
    console.log(abi);
};

main().then().catch(err => {
    console.error("Failed:", err)
    process.exit(2);
})
