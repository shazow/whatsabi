import { test, expect } from "@jest/globals";
const online_test = process.env["ONLINE"] ? test : test.skip;

import { ethers } from "ethers";
import { whatsabi } from "../index";


const { INFURA_API_KEY } = process.env;
const provider = INFURA_API_KEY ? (new ethers.providers.InfuraProvider("homestead", INFURA_API_KEY)) : ethers.getDefaultProvider();


online_test('README usage', async () => {
  const address = "0x00000000006c3852cbEf3e08E8dF289169EdE581"; // Or your fav contract address
  const code = await provider.getCode(address); // Load the bytecode

  const selectors = whatsabi.selectorsFromBytecode(code); // Get the callable selectors
  
  // console.log(selectors); // ["0x00000000", "0x06fdde03", "0x46423aa7", "0x55944a42", ...]
  expect(selectors).toEqual(expect.arrayContaining(["0x00000000", "0x06fdde03", "0x46423aa7", "0x55944a42"]));

  const abi = whatsabi.abiFromBytecode(code);
  // console.log(abi);
  // [
  //    {"type": "event", "hash": "0x721c20121297512b72821b97f5326877ea8ecf4bb9948fea5bfcb6453074d37f"},
  //    {"type": "function", "payable": true, "selector": "0x06fdde03"},
  //    {"type": "function", "payable": true, "selector": "0x46423aa7"},
  //    ...
  // ]

  expect(abi).toContainEqual({"hash": "0x721c20121297512b72821b97f5326877ea8ecf4bb9948fea5bfcb6453074d37f", "type": "event"})
  expect(abi).toContainEqual({"payable": true, "selector": "0x06fdde03", "type": "function"})

  const signatureLookup = new whatsabi.loaders.SamczunSignatureLookup();
  {
    const sig = await signatureLookup.loadFunctions("0x06fdde03");
    expect(sig).toStrictEqual(["name()"]);
  }
  {
    const sig = await signatureLookup.loadFunctions("0x46423aa7");
    expect(sig).toStrictEqual(["getOrderStatus(bytes32)"]);
  }

  const event = await signatureLookup.loadEvents("0x721c20121297512b72821b97f5326877ea8ecf4bb9948fea5bfcb6453074d37f");
  expect(event).toContainEqual("CounterIncremented(uint256,address)")
})
