import { expect } from 'vitest';
import { test } from "./env";

import { whatsabi } from "../index";

const fakeProvider = whatsabi.providers.CompatibleProvider({
    request: () => { },
});

test('provider WithCachedCode with CompatibleProvider', async () => {
    const address = "0x0000000000000000000000000000000000000001";
    const provider = whatsabi.providers.WithCachedCode(fakeProvider, {
        [address]: "0xf00",
    });

    expect(await provider.getCode(address)).toStrictEqual("0xf00");
    expect(await provider.getCode("not cached")).toBeUndefined();
});

test('provider WithCachedCode with AnyProvider', async () => {
    const anyProvider = {
        request: () => { },
    };
    const address = "0x0000000000000000000000000000000000000001";
    const provider = whatsabi.providers.WithCachedCode(anyProvider, {
        [address]: "0xf00",
    });

    expect(await provider.getCode(address)).toStrictEqual("0xf00");
    expect(await provider.getCode("not cached")).toBeUndefined();
});

test('provider WithBlockNumber with bigint', async () => {
    let capturedBlock: any;
    const mockProvider = whatsabi.providers.CompatibleProvider({
        request: ({ method, params }: any) => {
            if (method === 'eth_getCode') {
                capturedBlock = params[1];
                return "0x1234";
            }
        },
    });

    const blockNumber = 1234567890123456789n; // BigInt
    const provider = whatsabi.providers.WithBlockNumber(mockProvider, blockNumber);

    await provider.getCode("0x0000000000000000000000000000000000000001");

    expect(capturedBlock).toBe("0x112210f47de98115"); // Hex representation of the BigInt
});
