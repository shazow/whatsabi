"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultSelectorLookup = exports.defaultABILoader = exports.SamczunSelectorLookup = exports.Byte4SelectorLookup = exports.MultiSelectorLookup = exports.SourcifyABILoader = exports.EtherscanABILoader = exports.MultiABILoader = void 0;
const web_1 = require("@ethersproject/web");
class MultiABILoader {
    constructor(loaders) {
        this.loaders = loaders;
        this.mode = "any";
    }
    async loadABI(address) {
        if (this.mode === "any") {
            return Promise.any(this.loaders.map(loader => loader.loadABI(address)));
        }
        let r = {};
        await Promise.all(this.loaders.map(loader => loader.loadABI(address))).then((results) => results.flat().map((fragment) => {
            // Dedupe results
            const key = fragment.type + ":" + fragment.name;
            if (r[key] !== undefined)
                return;
            r[key] = fragment;
        }));
        return Object.values(r);
    }
}
exports.MultiABILoader = MultiABILoader;
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
class MultiSelectorLookup {
    constructor(lookups) {
        this.lookups = lookups;
    }
    async loadSelectors(selector) {
        return Promise.all(this.lookups.map(lookup => lookup.loadSelectors(selector))).then(results => Array.from(new Set(results.flat())));
    }
}
exports.MultiSelectorLookup = MultiSelectorLookup;
// https://www.4byte.directory/
class Byte4SelectorLookup {
    async loadSelectors(selector) {
        const url = "https://www.4byte.directory/api/v1/signatures/?hex_signature=" + selector;
        try {
            const r = await (0, web_1.fetchJson)(url);
            return r.results.map((r) => { return r.text_signature; });
        }
        catch (error) {
            if (error.status === 404)
                return [];
            throw error;
        }
    }
}
exports.Byte4SelectorLookup = Byte4SelectorLookup;
// https://sig.eth.samczsun.com/
class SamczunSelectorLookup {
    async loadSelectors(selector) {
        const url = "https://sig.eth.samczsun.com/api/v1/signatures/?function=" + selector;
        try {
            const r = await (0, web_1.fetchJson)(url);
            return r.results.map((r) => { return r.text_signature; });
        }
        catch (error) {
            if (error.status === 404)
                return [];
            throw error;
        }
    }
}
exports.SamczunSelectorLookup = SamczunSelectorLookup;
exports.defaultABILoader = new MultiABILoader([new SourcifyABILoader(), new EtherscanABILoader()]);
exports.defaultSelectorLookup = new MultiSelectorLookup([new SamczunSelectorLookup(), new Byte4SelectorLookup()]);
//# sourceMappingURL=loaders.js.map