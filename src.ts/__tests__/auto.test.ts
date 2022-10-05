import { test, expect } from "@jest/globals";
const online_test = process.env["ONLINE"] ? test : test.skip;

import { ethers } from "ethers";
import { whatsabi } from "../index";
import { autoload } from "../auto";


const { INFURA_API_KEY, ETHERSCAN_API_KEY } = process.env;
const provider = INFURA_API_KEY ? (new ethers.providers.InfuraProvider("homestead", INFURA_API_KEY)) : ethers.getDefaultProvider();


online_test('autoload', async () => {
  const address = "0x000000000000Df8c944e775BDe7Af50300999283";
  const abi = await autoload(address, {
    provider: provider,
    abiLoader: new whatsabi.loaders.MultiABILoader([
      new whatsabi.loaders.SourcifyABILoader(),
      new whatsabi.loaders.EtherscanABILoader({ apiKey: ETHERSCAN_API_KEY }),
    ]),
    signatureLookup: new whatsabi.loaders.MultiSignatureLookup([
      new whatsabi.loaders.SamczunSignatureLookup(),
      new whatsabi.loaders.Byte4SignatureLookup(),
    ]),
  });
  expect(abi).toContainEqual({"name": "onERC721Received(address,address,uint256,bytes)", "payable": false, "selector": "0x150b7a02", "type": "function"});
  expect(abi).toContainEqual({"name": "destroy()", "payable": false, "selector": "0x83197ef0", "type": "function"});
  expect(abi).toContainEqual({"payable": true, "selector": "0xcc066bb8", "type": "function"})
})
