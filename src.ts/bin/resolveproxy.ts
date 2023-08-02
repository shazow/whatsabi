#!/usr/bin/env ts-node-script

import { ethers } from "ethers";

import { disasm } from '../disasm';
import { knownProxySlots } from '../proxies';
import { withCache } from "../internal/filecache";
import { opcodes } from "../opcodes";

const { INFURA_API_KEY } = process.env;
const provider = INFURA_API_KEY ? (new ethers.providers.InfuraProvider("homestead", INFURA_API_KEY)) : ethers.getDefaultProvider();

async function main() {
    const address = process.env["ADDRESS"] || process.argv[2];

    console.debug("Loading code for address:", address);
    const code = await withCache(
        `${address}_abi`,
        async () => {
            return await provider.getCode(address)
        },
    );

    const program = disasm(code);

    for (const proxySlot of program.proxySlots) {
        console.log("Proxy slot found:", proxySlot, "=>", knownProxySlots[proxySlot]);
    }

    let hasDelegateCall = false;
    for (const fn of Object.values(program.dests)) {
        if (fn.opTags.has(opcodes.DELEGATECALL)) {
            hasDelegateCall = true;
            break;
        }
    }

    console.log("Has DELEGATECALL opcode?", hasDelegateCall);
}

main().then().catch(err => {
    console.error("Failed:", err)
    process.exit(2);
})
