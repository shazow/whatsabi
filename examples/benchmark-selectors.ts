#!/usr/bin/env -S ts-node-script --esm
// Read JSON blobs line-by-line, containing keys `code` and `abi`, compare results

import { ethers } from "ethers";
import { whatsabi } from "../src/index.js";

import readline from "readline";

main().then().catch(err => {
    console.error("Failed:", err)
    process.exit(2);
})

async function main() {
    const pipe = readline.createInterface({
      input: process.stdin,
      terminal: false
    });

    const result = {
        elapsed: 0, // in ms
        count: 0,
        falsePositive: 0,
        falseNegative: 0,
    };

    pipe.on('line', (line) => {
        let data: any;
        try {
            data = JSON.parse(line);
        } catch (error) {
            console.error("Failed to parse line:", error);
            return;
        }

        // Measure time spent in whatsabi
        const start = new Date();
        const selectors = whatsabi.selectorsFromBytecode(data.code);
        const end = new Date();

        // Compare results
        const want = new Set<string>();
        const sigs: Record<string, string> = {};
        ethers.Interface.from(data.abi).forEachFunction((fragment) => {
            want.add(fragment.selector);
            sigs[fragment.selector] = fragment.format();
        });
        const got = new Set<string>(selectors);

        const falsePositive = [...got].filter(x => !want.has(x));
        const falseNegative = [...want].filter(x => !got.has(x));

        result.elapsed += end.getTime() - start.getTime();
        result.count += 1;
        result.falsePositive += falsePositive.length;
        result.falseNegative += falseNegative.length;

        if (falsePositive.length > 0 || falseNegative.length > 0) {
            console.debug({
                address: data.address,
                id: result.count,
                falsePositive: falsePositive.map(s => { return {selector: s, signature: sigs[s] }}),
                falseNegative: falseNegative.map(s => { return {selector: s, signature: sigs[s] }}),
            });
        }

    });

    pipe.once('close', () => {
        console.log("Result:", result);
    });

};
