import { test, expect } from "@jest/globals";
const online_test = process.env["ONLINE"] ? test : test.skip;

import { ethers } from "ethers";
import { whatsabi } from "../index";


const { INFURA_API_KEY } = process.env;
const provider = INFURA_API_KEY ? (new ethers.providers.InfuraProvider("homestead", INFURA_API_KEY)) : ethers.getDefaultProvider();


online_test('README usage', async () => {
  const address = "0x7a250d5630b4cf539739df2c5dacb4c659f2488d"; // Or your fav contract address
  const code = await provider.getCode(address); // Load the bytecode

  const selectors = whatsabi.selectorsFromBytecode(code); // Get the callable selectors
  // console.log(selectors); // ["0x02751cec", "0x054d50d4", "0x18cbafe5", ...]
  expect(selectors).toContain("0x02751cec")
  expect(selectors).toContain("0x054d50d4")
  expect(selectors).toContain("0x18cbafe5")

  const abi = whatsabi.abiFromBytecode(code);
  // console.log(abi);

  expect(abi).toContainEqual({ type: 'function', selector: '0xe8e33700', payable: false })
  expect(abi).toContainEqual({ type: 'function', selector: '0xf305d719', payable: true })
})
