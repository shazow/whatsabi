import { expect } from 'vitest';
import { test } from "./env";

import { whatsabi } from "../index";

const fakeProvider = whatsabi.providers.CompatibleProvider({
    request: () => { },
});

test('provider WithCachedCode helper', async () => {
    const address = "0x0000000000000000000000000000000000000001";
    const provider = whatsabi.providers.WithCachedCode(fakeProvider, {
        [address]: "0xf00",
    });

    expect(await provider.getCode(address)).toStrictEqual("0xf00");
    expect(await provider.getCode("not cached")).toBeUndefined();
});
