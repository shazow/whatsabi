"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultProvider = exports.defaultSelectorLookup = exports.defaultABILoader = exports.getCode = void 0;
const web_1 = require("@ethersproject/web");
const ethers_1 = require("ethers");
async function getCode(provider, address) {
    return await provider.getCode(address);
}
exports.getCode = getCode;
class EtherscanABILoader {
    constructor(baseURL, apiKey) {
        this.apiKey = apiKey;
        this.baseURL = baseURL || "https://api.etherscan.io/api";
    }
    async loadABI(address) {
        let url = this.baseURL + '?module=contract&action=getabi&address=' + address;
        if (this.apiKey)
            url += "&apikey=" + this.apiKey;
        const r = await (0, web_1.fetchJson)(url);
        return JSON.parse(r.result);
    }
}
class Byte4SelectorLookup {
    async loadSelectors(selector) {
        const url = "https://www.4byte.directory/api/v1/signatures/?hex_signature=" + selector;
        const r = await (0, web_1.fetchJson)(url);
        return r.results.map((r) => { return r.text_signature; });
    }
}
exports.defaultABILoader = new EtherscanABILoader();
exports.defaultSelectorLookup = new Byte4SelectorLookup();
exports.defaultProvider = (0, ethers_1.getDefaultProvider)();
//# sourceMappingURL=loaders.js.map