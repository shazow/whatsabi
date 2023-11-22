import { describe, bench } from 'vitest';

import { describe_cached, KNOWN_ADDRESSES } from "./env";

import { Contract } from "sevm";
import { disasm } from "../disasm.js";

describe_cached("bench: whatsabi vs sevm", async ({ provider, withCache}) => {
    describe.each(KNOWN_ADDRESSES)("decompile $address ($label)", async ({address}) => {
        const code = await withCache(`${address}_code`, provider.getCode.bind(provider, address))

        bench('disassemble with whatsabi', () => {
            disasm(code);
        })

        bench('disassemble with sevm', () => {
            new Contract(code);
        })
    });
});
