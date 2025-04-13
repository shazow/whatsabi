#!/usr/bin/env -S tsx

import { ethers } from "ethers";
import { readFileSync } from "fs";

import { withCache } from "../src/internal/filecache.js";
import { bytecodeToString } from '../src/internal/debug.js';
import type { bytecodeToStringConfig } from '../src/internal/debug.js';

const env = {
    INFURA_API_KEY: process.env.INFURA_API_KEY,
    OPCODES_JSON: process.env.OPCODES_JSON,
    ETH_RPC_URL: process.env.ETH_RPC_URL,
};

const defaultProvider = env.INFURA_API_KEY ? (new ethers.InfuraProvider("homestead", env.INFURA_API_KEY)) : ethers.getDefaultProvider("homestead");

async function main() {
    const address = process.env["ADDRESS"] || process.argv[2];
    const jumpdest = process.env["JUMPDEST"] || process.argv[3];
    const boundary = process.env["BOUNDARY"] || process.argv[4];

    let provider = defaultProvider;
    if (env.ETH_RPC_URL) {
        provider = new ethers.JsonRpcProvider(env.ETH_RPC_URL);
    }

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

    const config : bytecodeToStringConfig = {};

    if (env.OPCODES_JSON) {
        const opcodes = JSON.parse(readFileSync(env.OPCODES_JSON, 'utf8'));

        config.opcodeLookup = Object.fromEntries(
            Object.entries(opcodes).map(([k, v]) => [parseInt(k, 16), v as string])
        );
    }
    if (jumpdest) {
        const pos = jumpdest.startsWith("0x") ? parseInt(jumpdest, 16) : parseInt(jumpdest); 
        config.startPos = config.highlightPos = pos;
        config.stopPos = pos + 40;
    }
    if (boundary) {
        config.boundaryPos = Number(boundary);
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
