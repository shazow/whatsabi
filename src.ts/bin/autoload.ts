#!/usr/bin/env ts-node-script

import { ethers } from "ethers";
import { whatsabi } from "../index";

const { INFURA_API_KEY } = process.env;
const provider = INFURA_API_KEY ? (new ethers.providers.InfuraProvider("homestead", INFURA_API_KEY)) : ethers.getDefaultProvider();

async function main() {
    const address = process.env["ADDRESS"] || process.argv[2];

    const r = await whatsabi.autoload(address, {
        provider,
        onProgress: (phase: string) => {
            console.debug("progress:", phase);
        }
    });

    console.log("autoload:", r);
}

main().then().catch(err => {
    console.error("Failed:", err)
    process.exit(2);
})
