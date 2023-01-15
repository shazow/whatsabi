#!/usr/bin/env ts-node-script

// Example usage:
// ./src.ts/bin/dot.ts 0x7a250d5630b4cf539739df2c5dacb4c659f2488d | dot -Tpng  | feh -

import { ethers } from "ethers";

import { withCache } from "../internal/filecache";
import { programToDotGraph } from '../internal/debug';
import { disasm } from '../disasm';

const { INFURA_API_KEY } = process.env;
const provider = INFURA_API_KEY ? (new ethers.providers.InfuraProvider("homestead", INFURA_API_KEY)) : ethers.getDefaultProvider();

async function main() {
    const address = process.env["ADDRESS"] || process.argv[2];

    if (!address || !address.startsWith("0x")) {
        console.error("Invalid address: " + address);
        process.exit(1);
    }

    const code = await withCache(
        `${address}_abi`,
        async () => {
            return await provider.getCode(address)
        },
    );

    const program = disasm(code);
    console.log(programToDotGraph(program));
}

main().then().catch(err => {
    console.error("Failed:", err)
    process.exit(2);
})
