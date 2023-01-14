#!/usr/bin/env ts-node-script

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
