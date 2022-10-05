"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultSignatureLookup = exports.defaultABILoader = exports.SamczunSignatureLookup = exports.Byte4SignatureLookup = exports.MultiSignatureLookup = exports.SourcifyABILoader = exports.EtherscanABILoader = exports.MultiABILoader = void 0;
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
    constructor(config) {
        if (config === undefined)
            config = {};
        this.apiKey = config.apiKey;
        this.baseURL = config.baseURL || "https://api.etherscan.io/api";
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
// https://sourcify.dev/
class SourcifyABILoader {
    async loadABI(address) {
        const url = "https://repo.sourcify.dev/contracts/full_match/1/" + address + "/metadata.json";
        const r = await (0, web_1.fetchJson)(url);
        return JSON.parse(r.result);
    }
}
exports.SourcifyABILoader = SourcifyABILoader;
class MultiSignatureLookup {
    constructor(lookups) {
        this.lookups = lookups;
    }
    async loadFunctions(selector) {
        return Promise.all(this.lookups.map(lookup => lookup.loadFunctions(selector))).then(results => Array.from(new Set(results.flat())));
    }
    async loadEvents(hash) {
        return Promise.all(this.lookups.map(lookup => lookup.loadFunctions(hash))).then(results => Array.from(new Set(results.flat())));
    }
}
exports.MultiSignatureLookup = MultiSignatureLookup;
// https://www.4byte.directory/
class Byte4SignatureLookup {
    async load(url) {
        try {
            const r = await (0, web_1.fetchJson)(url);
            if (r.results === undefined)
                return [];
            return r.results.map((r) => { return r.text_signature; });
        }
        catch (error) {
            if (error.status === 404)
                return [];
            throw error;
        }
    }
    async loadFunctions(selector) {
        return this.load("https://www.4byte.directory/api/v1/signatures/?hex_signature=" + selector);
    }
    async loadEvents(hash) {
        return this.load("https://www.4byte.directory/api/v1/event-signatures/?hex_signature=" + hash);
    }
}
exports.Byte4SignatureLookup = Byte4SignatureLookup;
// https://sig.eth.samczsun.com/
class SamczunSignatureLookup {
    async load(url) {
        try {
            const r = await (0, web_1.fetchJson)(url);
            if (!r.ok)
                throw new Error("Samczun API bad response: " + JSON.stringify(r));
            return r;
        }
        catch (error) {
            if (error.status === 404)
                return [];
            throw error;
        }
    }
    async loadFunctions(selector) {
        const r = await this.load("https://sig.eth.samczsun.com/api/v1/signatures?function=" + selector);
        return r.result.function[selector].map((item) => item.name);
    }
    async loadEvents(hash) {
        const r = await this.load("https://sig.eth.samczsun.com/api/v1/signatures?event=" + hash);
        return r.result.event[hash].map((item) => item.name);
    }
}
exports.SamczunSignatureLookup = SamczunSignatureLookup;
exports.defaultABILoader = new MultiABILoader([new SourcifyABILoader(), new EtherscanABILoader()]);
exports.defaultSignatureLookup = new MultiSignatureLookup([new SamczunSignatureLookup(), new Byte4SignatureLookup()]);
//# sourceMappingURL=loaders.js.map