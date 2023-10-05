#!/usr/bin/env -S ts-node-script --esm

// Example usage:
// ./examples/dot.ts 0x7a250d5630b4cf539739df2c5dacb4c659f2488d | dot -Tpng  | feh -

import { ethers } from "ethers";
import { readFileSync } from "fs";

import { withCache } from "../src/internal/filecache.js";
import { Program, Function } from "../src/disasm.js";
import { disasm } from '../src/disasm.js';
import { mnemonics } from "../src/opcodes.js";
import { defaultSignatureLookup } from "../src/loaders.js";
import { bytesToHex } from "../src/utils.js";

const { INFURA_API_KEY, SKIP_SELECTOR_LOOKUP, SKIP_TAGS } = process.env;
const provider = INFURA_API_KEY ? (new ethers.InfuraProvider("homestead", INFURA_API_KEY)) : ethers.getDefaultProvider("homestead");


export function* programToDotGraph(p: Program, lookup: { [key: string]: string }) {
    yield "digraph JUMPS {";
    yield "\tgraph [nojustify=true];\n";
    yield "\tnode [shape=record];\n";

    const nameLookup = Object.fromEntries(Object.entries(p.selectors).map(([k, v]) => [v, k]));

    function toID(n: number): string {
        return (nameLookup[n] || bytesToHex(n));
    }
    yield "\tsubgraph cluster_0 {"
    yield "\t\tlabel = Selectors;";
    yield "\t\tnode [style=filled];";
    yield "\t\trankdir=LR;";
    yield `\t\t${Object.keys(p.selectors).map(s => '"' + s + '"').join(" ")}`
    yield "\t}"

    const jumps: Function[] = Object.values(p.selectors).map(j => p.dests[j]) as Function[];
    const seen = new Set<number>();

    if (jumps.length == 0) jumps.push(...Object.values(p.dests));

    while (jumps.length > 0) {
        const fn = jumps.pop();
        if (!fn) continue;
        if (seen.has(fn.start)) continue;

        seen.add(fn.start);
        const j = fn.jumps.filter(j => j in p.dests).map(j => p.dests[j]);
        const id = toID(fn.start);
        const parts = [id];
        const tags = fn.opTags && Array.from(fn.opTags).map(op => mnemonics[op]).join("\\l")
        const lookupExtra = lookup[id];
        if (lookupExtra) parts.push(lookupExtra);
        if (!SKIP_TAGS) parts.push(tags);

        yield `\t"${id}" [label="{` + parts.join(" | ") + `} }"]`;
        yield `\t"${id}" -> { ${j.map(n => '"' + toID(n.start) + '"').join(" ")} }`;

        jumps.push(...j);
    }

    yield "}";
}


async function main() {
    const address = process.env["ADDRESS"] || process.argv[2];

    let code : string;
    if (!address) {
        console.error("Invalid address: " + address);
        process.exit(1);
    } else if (address === "-") {
        // Read contract code from stdin
        code = readFileSync(0, 'utf8').trim();
    } else {
        code = await withCache(
            `${address}_abi`,
            async () => {
                return await provider.getCode(address)
            },
        );
    }

    const program = disasm(code);

    const selectors : Array<string> = Object.keys(program.selectors);
    const lookup : { [key: string]: string }= {};
    for (const sel of selectors) {
        if (SKIP_SELECTOR_LOOKUP) break;

        const sigs = await withCache(
            `${sel}_selector`,
            async () => {
                return await defaultSignatureLookup.loadFunctions(sel);
            },
        );
        if (sigs.length === 0) continue;
        lookup[sel] = sigs[0].split("(")[0];
    }

    const iter = programToDotGraph(program, lookup);

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
