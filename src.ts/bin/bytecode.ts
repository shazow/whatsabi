#!/usr/bin/env ts-node-script

import { ethers } from "ethers";
import { readFileSync } from "fs";

import { withCache } from "../__tests__/offline";
import { bytecodeToString, bytecodeToStringConfig } from '../disasm';

const { INFURA_API_KEY, OPCODES_JSON } = process.env;
const provider = INFURA_API_KEY ? (new ethers.providers.InfuraProvider("homestead", INFURA_API_KEY)) : ethers.getDefaultProvider();

async function main() {
    const address = process.env["ADDRESS"] || process.argv[2];

    if (!address || !address.startsWith("0x")) {
        console.error("Invalid address: " + address);
        process.exit(1);
    }

    console.debug("Loading code for address:", address);

    const code = await withCache(
        `${address}_abi`,
        async () => {
            return await provider.getCode(address)
        },
    )

    const config : bytecodeToStringConfig = {};

    if (OPCODES_JSON) {
        const opcodes = JSON.parse(readFileSync(OPCODES_JSON, 'utf8'));

        config.opcodeLookup = Object.fromEntries(
            Object.entries(opcodes).map(([k, v]) => [parseInt(k, 16), v as string])
        );
    }

    const iter = bytecodeToString(code, config);
    while (true) {
        const {value, done} = iter.next()
        if (done) break;
        console.log(value);
    }
}

main().then().catch(err => {
    console.error("Failed:", err)
    process.exit(2);
})
