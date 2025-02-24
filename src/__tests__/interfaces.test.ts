import { expect, test } from 'vitest';

import { abiToInterfaces, createInterfaceIndex } from '../interfaces';


test('createInterfaceIndex', async ({ }) => {
    const known = {
        "ERC-20": [
            "function totalSupply() view returns (uint256)",
            "function balanceOf(address) view returns (uint256)",
            "function transfer(address, uint256) returns (bool)",
            "function allowance(address, address) returns (uint256)",
            "function approve(address, uint256) returns (bool)",
            "function transferFrom(address, address, uint256) returns (bool)",
        ],
    };

    const got = createInterfaceIndex(known);
    expect(got).toEqual({
        "ERC-20": new Set([
            "18160ddd",
            "70a08231",
            "a9059cbb",
            "dd62ed3e",
            "095ea7b3",
            "23b872dd",
        ]),
    });

});

test('abiToInterfaces', async ({ }) => {
    // Given a set of interfaces, get the interfaces that it implements
    const selectors = [
        // bunch of stuff
        "0x02751cec", "0x054d50d4", "0x18cbafe5", "0x1f00ca74", "0x2195995c", "0x38ed1739", "0x4a25d94a", "0x5b0d5984", "0x5c11d795", "0x791ac947", "0x7ff36ab5", "0x85f8c259", "0x8803dbee", "0xad5c4648", "0xad615dec", "0xaf2979eb", "0xb6f9de95", "0xbaa2abde", "0xc45a0155", "0xd06ca61f", "0xded9382a", "0xe8e33700", "0xf305d719", "0xfb3bdb41",

        // erc20
        "0x18160ddd", "0x70a08231", "0xa9059cbb", "0xdd62ed3e", "0x095ea7b3", "0x23b872dd",

        // erc165, no 0x prefix
        "01ffc9a7"
    ];

    const got = abiToInterfaces(selectors);
    expect(got).toEqual(["ERC-20", "ERC-165"]);
});

test('abiToInterfaces with signatures', async ({ }) => {
    const sigs = [
        "function totalSupply() view returns (uint256)",
        "function balanceOf(address) view returns (uint256)",
        "function transfer(address, uint256) returns (bool)",
        "function allowance(address, address) returns (uint256)",
        "function approve(address, uint256) returns (bool)",
        "function transferFrom(address, address, uint256) returns (bool)",
    ];

    const got = abiToInterfaces(sigs);
    expect(got).toEqual(["ERC-20"]);
});

