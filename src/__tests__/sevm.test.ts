import { expect, bench } from 'vitest';

// @ts-ignore
import { Contract } from "sevm";

import type { ABI, ABIFunction, ABIEvent } from "../abi.js";

import { whatsabi } from "../index.js";
import { cached_test } from "./env";

type sevmPublicFunction = {
    readonly payable: boolean;
    readonly visibility: string;
    readonly constant: boolean;
    readonly returns: string[];
};

function abiFromBytecode(bytecode: string): ABI {
    const abi : ABI = [];

    const c = new Contract(bytecode);
    for (const [selector, fn] of Object.entries(c.functions as Record<string, sevmPublicFunction>)) {
        // let mutability = fn.payable ? "payable" : "nonpayable";
        // TODO: Can we get view or pure?
        // TODO: Can we get inputs/outputs?
        // TODO: Look at returns
        const a = {
            type: "function",
            selector: "0x" + selector, // Add 0x
        } as ABIFunction;
        if (fn.payable) a.payable = true;
        abi.push(a);
    }

    for (const [topic, _] of Object.entries(c.getEvents())) {
        abi.push({
            type: "event",
            hash: topic,
        } as ABIEvent);
    }

    return abi;
}

cached_test('whatsabi vs sevm: abiFromBytecode', async ({ provider, withCache }) => {
    // Uniswap v2
    const address = "0x7a250d5630b4cf539739df2c5dacb4c659f2488d";

    const code = await withCache(`${address}_code`, provider.getCode.bind(address))

    const [a, b] = [abiFromBytecode, whatsabi.abiFromBytecode].map(getABI => {
        const abi = getABI(code);
        const functions = abi.filter(a => a.type === "function") as ABIFunction[];
        const selectors = functions.map(abi => abi.selector);
        return selectors;
    });

    expect(a).toStrictEqual(b);
});

