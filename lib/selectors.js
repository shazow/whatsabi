"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.selectorsFromBytecode = exports.selectorsFromABI = void 0;
const abi_1 = require("@ethersproject/abi");
const hash_1 = require("@ethersproject/hash");
const disasm_1 = require("./disasm");
// Load function selectors mapping from ABI, parsed using ethers.js
// Mapping is selector hash to signature
function selectorsFromABI(abi) {
    const r = {};
    for (const el of abi) {
        if (typeof (el) !== "string" && el.type !== "function")
            continue;
        const f = abi_1.FunctionFragment.from(el).format();
        r[(0, hash_1.id)(f).substring(0, 10)] = f;
    }
    return r;
}
exports.selectorsFromABI = selectorsFromABI;
// Load function selectors from EVM bytecode by parsing JUMPI instructions
function selectorsFromBytecode(code) {
    const abi = (0, disasm_1.abiFromBytecode)(code);
    if (abi.length === 0)
        return [];
    let selectors = [];
    for (const a of abi) {
        if (a.type !== "function")
            continue;
        selectors.push(a.selector);
    }
    return selectors;
}
exports.selectorsFromBytecode = selectorsFromBytecode;
//# sourceMappingURL=selectors.js.map