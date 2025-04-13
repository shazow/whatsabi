#!/usr/bin/env -S tsx

import { ethers } from "ethers";
import { whatsabi } from "../src/index.js";

const env = {
    INFURA_API_KEY: process.env.INFURA_API_KEY,
    ETHERSCAN_API_KEY: process.env.ETHERSCAN_API_KEY,
    ETH_RPC_URL: process.env.ETH_RPC_URL,
    PROVIDER: process.env.PROVIDER,
    NETWORK: process.env.NETWORK,
    SKIP_LOOKUPS: process.env.SKIP_LOOKUPS,
};
const defaultProvider = env.INFURA_API_KEY ? (new ethers.InfuraProvider("homestead", env.INFURA_API_KEY)) : ethers.getDefaultProvider(env.NETWORK || "homestead");

// Helper
// https://stackoverflow.com/questions/11731072/dividing-an-array-by-filter-function 
const partitionBy = <T>(
  arr: T[],
  predicate: (v: T, i: number, ar: T[]) => boolean
) =>
  arr.reduce(
    (acc, item, index, array) => {
      acc[+!predicate(item, index, array)].push(item);
      return acc;
    },
    [[], []] as [T[], T[]]
  );

async function main() {
    const address = process.env["ADDRESS"] || process.argv[2];

    if (!address) {
        console.log("Usage: autoload.ts ADDRESS");
        process.exit(1);
    }

    let extraConfig : object = whatsabi.loaders.defaultsWithEnv(env);
    if (env.SKIP_LOOKUPS) {
        console.debug("Skipping lookups, only using bytecode");
        extraConfig = {
            abiLoader: false,
            signatureLookup: false,
        };
    }

    let provider = defaultProvider;
    if (env.ETH_RPC_URL) {
        provider = new ethers.JsonRpcProvider(env.ETH_RPC_URL);
    }

    let r = await whatsabi.autoload(address, {
        provider,
        onProgress: (phase: string, ...args: string[]) => {
            console.debug("progress:", phase, ...args);
        },
        ... extraConfig
    });

    while (true) {
        const [abi, unresolved] = partitionBy(r.abi, a => (a.type !== "function" || "name" in a));
        const iface = new ethers.Interface(abi);
        console.log("autoload", iface.format());
        if (unresolved) console.log("unresolved", unresolved);
        const detectedInterfaces = whatsabi.interfaces.abiToInterfaces(abi);
        if (detectedInterfaces.length) console.log("detected interfaces:", detectedInterfaces);

        if (!r.followProxies) {
            if (r.proxies.length) {
                console.log("proxies detected but not following:", r.proxies);
            }
            break;
        }

        console.log("following proxies...");
        r = await r.followProxies();
    }
}

main().then().catch(err => {
    console.error("Failed:", err)
    process.exit(2);
})
