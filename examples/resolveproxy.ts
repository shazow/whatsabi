#!/usr/bin/env -S ts-node-script --esm

import { ethers } from "ethers";

import { disasm } from '../src/disasm.js';
import { withCache } from "../src/internal/filecache.js";
import { opcodes } from "../src/opcodes.js";
import { CompatibleProvider } from "../src/types.js";

const { INFURA_API_KEY } = process.env;
const provider = CompatibleProvider(INFURA_API_KEY ? (new ethers.InfuraProvider("homestead", INFURA_API_KEY)) : ethers.getDefaultProvider("homestead"));

async function main() {
    const address = process.env["ADDRESS"] || process.argv[2];
    const selector = process.env["SELECTOR"] || process.argv[3];

    console.debug("Loading code for address:", address);
    const code = await withCache(
        `${address}_abi`,
        async () => {
            return await provider.getCode(address)
        },
    );

    const program = disasm(code);

    let hasDelegateCall = false;
    for (const fn of Object.values(program.dests)) {
        if (fn.opTags.has(opcodes.DELEGATECALL)) {
            hasDelegateCall = true;
            break;
        }
    }

    for (const resolver of program.proxies) {
        console.log("Proxy found:", resolver.toString());

        const addr = await resolver.resolve(provider, address, selector);
        if (addr === "0x0000000000000000000000000000000000000000") continue;

        console.log("Resolved to address:", addr);
        return;
    }

    if (hasDelegateCall && program.proxies.length === 0) {
        console.log("DELEGATECALL detected but no proxies found");
    } else {
        console.log("No DELEGATECALL detected");
        return;
    }

}

main().then().catch(err => {
    console.error("Failed:", err)
    process.exit(2);
})
