import { test, expect } from "@jest/globals";

import { ethers } from "ethers";
import { whatsabi } from "../index";
import { autoload } from "../auto";

const { INFURA_API_KEY, ETHERSCAN_API_KEY } = process.env;
const provider = INFURA_API_KEY ? (new ethers.providers.InfuraProvider("homestead", INFURA_API_KEY)) : ethers.getDefaultProvider();


test('autoload selectors', async () => {
  const address = "0x4A137FD5e7a256eF08A7De531A17D0BE0cc7B6b6"; // Random unverified contract
  const abi = await autoload(address, {
    provider: provider,
    abiLoader: false,
    signatureLookup: false,
  });
  expect(abi).toContainEqual({"inputs": [{"type": "bytes"}], "payable": true, "selector": "0x6dbf2fa0", "stateMutability": "payable", "type": "function"});
  expect(abi).toContainEqual({"inputs": [{"type": "bytes"}], "payable": true, "selector": "0xec0ab6a7", "stateMutability": "payable", "type": "function"});
})


test('autoload full', async () => {
  const address = "0x4A137FD5e7a256eF08A7De531A17D0BE0cc7B6b6"; // Random unverified contract
  const abi = await autoload(address, {
    provider: provider,
    abiLoader: new whatsabi.loaders.MultiABILoader([
      new whatsabi.loaders.SourcifyABILoader(),
      new whatsabi.loaders.EtherscanABILoader({ apiKey: ETHERSCAN_API_KEY }),
    ]),
    signatureLookup: new whatsabi.loaders.MultiSignatureLookup([
      new whatsabi.loaders.SamczunSignatureLookup(),
      new whatsabi.loaders.FourByteSignatureLookup(),
    ]),
  });
  expect(abi).toContainEqual({"constant": false, "inputs": [{"type": "address"}, {"type": "uint256"}, {"type": "bytes"}], "name": "call", "payable": false, "selector": "0x6dbf2fa0", "sig": "call(address,uint256,bytes)", "stateMutability": "payable", "type": "function"})

  expect(abi).toContainEqual({"inputs": [{"type": "bytes"}], "payable": true, "selector": "0xec0ab6a7", "stateMutability": "payable", "type": "function"});
})
