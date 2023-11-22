import { expect, test, describe } from 'vitest';

// @ts-ignore
import { Contract } from "sevm";

import type { ABI, ABIFunction, ABIEvent } from "../abi.js";

import { whatsabi } from "../index.js";
import { describe_cached, KNOWN_ADDRESSES } from "./env";

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

describe_cached("whatsabi vs sevm: abiFromBytecode", async ({ provider, withCache}) => {

    describe.each(KNOWN_ADDRESSES)("decompile $address ($label)", async ({address}) => {

        const code = await withCache(`${address}_code`, provider.getCode.bind(provider, address))

        test("compare selectors", async () => {
            const [a, b] = [abiFromBytecode, whatsabi.abiFromBytecode].map(getABI => {
                const abi = getABI(code);
                const functions = abi.filter(a => a.type === "function") as ABIFunction[];
                const selectors = functions.map(abi => abi.selector);
                selectors.sort();
                return selectors;
            });

            expect(a).toStrictEqual(b);
        });
    });
});
