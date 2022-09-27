"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const loaders_1 = require("./loaders");
const index_1 = require("./index");
// TODO: Add fixtures so that tests are runnable offline
(0, globals_1.describe)('loaders module', () => {
    (0, globals_1.test)('defaultABILoader', async () => {
        const abi = await loaders_1.defaultABILoader.loadABI("0x7a250d5630b4cf539739df2c5dacb4c659f2488d");
        const selectors = (0, index_1.selectorsFromABI)(abi);
        const hashes = Object.keys(selectors);
        hashes.sort();
        (0, globals_1.expect)(hashes).toStrictEqual(['0x02751cec', '0x054d50d4', '0x18cbafe5', '0x1f00ca74', '0x2195995c', '0x38ed1739', '0x4a25d94a', '0x5b0d5984', '0x5c11d795', '0x791ac947', '0x7ff36ab5', '0x85f8c259', '0x8803dbee', '0xad5c4648', '0xad615dec', '0xaf2979eb', '0xb6f9de95', '0xbaa2abde', '0xc45a0155', '0xd06ca61f', '0xded9382a', '0xe8e33700', '0xf305d719', '0xfb3bdb41']);
        (0, globals_1.expect)(selectors["0x7ff36ab5"]).toStrictEqual("swapExactETHForTokens(uint256,address[],address,uint256)");
    });
    (0, globals_1.test)('defaultSelectorLookup', async () => {
        const expected = "swapExactETHForTokens(uint256,address[],address,uint256)";
        const selector = Object.keys((0, index_1.selectorsFromABI)([expected]))[0];
        (0, globals_1.expect)(selector).toBe("0x7ff36ab5");
        const r = await loaders_1.defaultSelectorLookup.loadSelectors(selector);
        (0, globals_1.expect)(r).toContain(expected);
    });
});
//# sourceMappingURL=loaders.test.js.map