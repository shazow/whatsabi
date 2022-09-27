"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const ethers_1 = require("ethers");
const index_1 = require("./index");
const sample2_1 = require("./fixtures/sample2");
(0, globals_1.describe)('index module', () => {
    (0, globals_1.test)('extractABI', () => {
        const abi = (0, index_1.selectorsFromABI)(sample2_1.SAMPLE_ABI);
        const expected = Object.keys(abi);
        expected.sort();
        const r = (0, index_1.selectorsFromBytecode)(sample2_1.SAMPLE_CODE);
        r.sort();
        (0, globals_1.expect)(r).toStrictEqual(expected);
    });
    (0, globals_1.test)('online: extractABI for Uniswap v2 Router', async () => {
        const address = "0x7a250d5630b4cf539739df2c5dacb4c659f2488d";
        const code = await (0, ethers_1.getDefaultProvider)().getCode(address);
        const r = (0, index_1.selectorsFromBytecode)(code);
        r.sort();
        (0, globals_1.expect)(r).toStrictEqual(['0x02751cec', '0x054d50d4', '0x18cbafe5', '0x1f00ca74', '0x2195995c', '0x38ed1739', '0x4a25d94a', '0x5b0d5984', '0x5c11d795', '0x791ac947', '0x7ff36ab5', '0x85f8c259', '0x8803dbee', '0xad5c4648', '0xad615dec', '0xaf2979eb', '0xb6f9de95', '0xbaa2abde', '0xc45a0155', '0xd06ca61f', '0xded9382a', '0xe8e33700', '0xf305d719', '0xfb3bdb41']);
    });
});
//# sourceMappingURL=index.test.js.map