#!/usr/bin/env ts-node-script

import { ethers } from "ethers";

import { disasm } from '../disasm';
import { slotResolvers } from '../proxies';
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

    let hasDelegateCall = false;
    for (const fn of Object.values(program.dests)) {
        if (fn.opTags.has(opcodes.DELEGATECALL)) {
            hasDelegateCall = true;
            break;
        }
    }

    if (program.delegateAddresses.length > 0) {
        console.log("DELEGATECALL hardcoded addresses detected:", program.delegateAddresses);
    } else if (hasDelegateCall) {
        console.log("DELEGATECALL detected but no hardcoded addresses found");
    } else {
        console.log("No DELEGATECALL detected");
        return;
    }

    for (const proxySlot of new Set(program.proxySlots)) {
        const resolver = slotResolvers[proxySlot];
        console.log("Known proxy slot found:", proxySlot, "=>", resolver.toString());

        const addr = await resolver.resolve(provider, address);
        if (addr === "0x0000000000000000000000000000000000000000") continue;

        console.log("Resolved to address:", addr);
        return;
    }
}

main().then().catch(err => {
    console.error("Failed:", err)
    process.exit(2);
})
