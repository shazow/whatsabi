#!/usr/bin/env ts-node-script

// Example usage:
// ./src.ts/bin/dot.ts 0x7a250d5630b4cf539739df2c5dacb4c659f2488d | dot -Tpng  | feh -

import { ethers } from "ethers";

import { withCache } from "../internal/filecache";
import { Program, Function } from "../disasm";
import { disasm } from '../disasm';
import { mnemonics } from "../opcodes";

const { INFURA_API_KEY } = process.env;
const provider = INFURA_API_KEY ? (new ethers.providers.InfuraProvider("homestead", INFURA_API_KEY)) : ethers.getDefaultProvider();


export function* programToDotGraph(p: Program) {
    yield "digraph JUMPS {";
    yield "\tnode [shape=record];\n";

    const nameLookup = Object.fromEntries(Object.entries(p.selectors).map(([k, v]) => [v, k]));

    function toID(n: number): string {
        return (nameLookup[n] || ethers.utils.hexlify(n));
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
        const tags = fn.opTags && Array.from(fn.opTags).map(op => mnemonics[op]).join("|")

        yield `\t"${id}" [label="{ ${id} | { ${tags} } }"]`;
        yield `\t"${id}" -> { ${j.map(n => '"' + toID(n.start) + '"').join(" ")} }`;

        jumps.push(...j);
    }

    yield "}";
}


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
    const iter = programToDotGraph(program);

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
