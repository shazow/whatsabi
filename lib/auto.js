"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.autoload = void 0;
const abi_1 = require("@ethersproject/abi");
const loaders_1 = require("./loaders");
const disasm_1 = require("./disasm");
// auto is a convenience helper for doing All The Things to load an ABI of a contract.
// FIXME: It's kinda half-done, not parallelized
async function autoload(address, config) {
    if (config === undefined) {
        throw new Error("autoload: config is undefined, must include 'provider'");
    }
    let abiLoader = config.abiLoader;
    if (abiLoader === undefined)
        abiLoader = loaders_1.defaultABILoader;
    if (abiLoader) {
        // Attempt to load the ABI from a contract database, if exists
        try {
            return await abiLoader.loadABI(address);
        }
        catch (error) {
            // TODO: Catch useful errors
        }
    }
    // Load from code
    const code = await config.provider.getCode(address);
    let abi = (0, disasm_1.abiFromBytecode)(code);
    let signatureLookup = config.signatureLookup;
    if (signatureLookup === undefined)
        signatureLookup = loaders_1.defaultSignatureLookup;
    if (!signatureLookup)
        return abi; // Bail
    // Load signatures from a database
    for (const a of abi) {
        if (a.type === "function") {
            const r = await signatureLookup.loadFunctions(a.selector);
            if (r.length >= 1) {
                a.sig = r[0];
                // Let ethers.js extract as much metadata as it can from the signature
                const extracted = JSON.parse(abi_1.Fragment.from("function " + a.sig).format("json"));
                if (extracted.outputs.length === 0) {
                    // Outputs not included in signature databases -_- (unless something changed)
                    // Let whatsabi keep its best guess, if any.
                    delete (extracted.outputs);
                }
                Object.assign(a, extracted);
            }
            if (r.length > 1)
                a.sigAlts = r.slice(1);
        }
        else if (a.type === "event") {
            const r = await signatureLookup.loadEvents(a.hash);
            if (r.length >= 1) {
                a.sig = r[0];
                // Let ethers.js extract as much metadata as it can from the signature
                Object.assign(a, JSON.parse(abi_1.Fragment.from("event " + a.sig).format("json")));
            }
            if (r.length > 1)
                a.sigAlts = r.slice(1);
        }
    }
    return abi;
}
exports.autoload = autoload;
//# sourceMappingURL=auto.js.map