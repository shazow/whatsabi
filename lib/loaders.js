"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultSelectorLookup = exports.defaultABILoader = exports.SamczunSelectorLookup = exports.Byte4SelectorLookup = exports.SourcifyABILoader = exports.EtherscanABILoader = exports.getCode = void 0;
const web_1 = require("@ethersproject/web");
async function getCode(provider, address) {
    return await provider.getCode(address);
}
exports.getCode = getCode;
class EtherscanABILoader {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseURL = "https://api.etherscan.io/api";
    }
    async loadABI(address) {
        let url = this.baseURL + '?module=contract&action=getabi&address=' + address;
        if (this.apiKey)
            url += "&apikey=" + this.apiKey;
        const r = await (0, web_1.fetchJson)(url);
        return JSON.parse(r.result);
    }
}
exports.EtherscanABILoader = EtherscanABILoader;
class SourcifyABILoader {
    constructor() {
        this.baseURL = "https://repo.sourcify.dev/contracts/full_match/1";
    }
    async loadABI(address) {
        const url = this.baseURL + "/" + address + "/metadata.json";
        const r = await (0, web_1.fetchJson)(url);
        return JSON.parse(r.result);
    }
}
exports.SourcifyABILoader = SourcifyABILoader;
// https://www.4byte.directory/
class Byte4SelectorLookup {
    async loadSelectors(selector) {
        const url = "https://www.4byte.directory/api/v1/signatures/?hex_signature=" + selector;
        const r = await (0, web_1.fetchJson)(url);
        return r.results.map((r) => { return r.text_signature; });
    }
}
exports.Byte4SelectorLookup = Byte4SelectorLookup;
// https://sig.eth.samczsun.com/
class SamczunSelectorLookup {
    async loadSelectors(selector) {
        const url = "https://sig.eth.samczsun.com/api/v1/signatures/?function=" + selector;
        const r = await (0, web_1.fetchJson)(url);
        return r.results.map((r) => { return r.text_signature; });
    }
}
exports.SamczunSelectorLookup = SamczunSelectorLookup;
exports.defaultABILoader = new SourcifyABILoader();
exports.defaultSelectorLookup = new SamczunSelectorLookup();
//# sourceMappingURL=loaders.js.map