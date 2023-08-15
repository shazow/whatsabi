#!/usr/bin/env ts-node-script

import { ethers } from "ethers";
import { whatsabi } from "../src/index";

const { INFURA_API_KEY } = process.env;
const provider = INFURA_API_KEY ? (new ethers.providers.InfuraProvider("homestead", INFURA_API_KEY)) : ethers.getDefaultProvider();

async function main() {
    const address = process.env["ADDRESS"] || process.argv[2];

    let r = await whatsabi.autoload(address, {
        provider,
        onProgress: (phase: string, ...args: string[]) => {
            console.debug("progress:", phase, ...args);
        }
    });

    while (true) {
        const iface = new ethers.utils.Interface(r.abi);
        console.log("autoload", iface.format(ethers.utils.FormatTypes.full));

        if (!r.followProxies) break;

        console.log("following proxies...");
        r = await r.followProxies();
    }
}

main().then().catch(err => {
    console.error("Failed:", err)
    process.exit(2);
})
