import { test } from '@jest/globals';

// Skip online tests unless ONLINE env is set
export const online_test = process.env["ONLINE"] !== undefined ? test : test.skip;
export const cached_test = !process.env["SKIP_CACHED"] ? test : test.skip;

if (process.env["ONLINE"] === undefined) {
    console.log("Skipping online tests. Set ONLINE env to run them.");
}
