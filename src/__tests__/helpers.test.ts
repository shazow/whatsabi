import { expect, describe, it } from "vitest";

import { abiFillEmptyNames } from "../helpers";
import { ABI } from "../abi";

describe("abiFillEmptyNames", () => {
  type testCase = {
    name: string;
    abi: Array<ABI[number] | unknown>;
    want: Array<ABI[number] | unknown>;
  };

  const testCases: testCase[] = [
    {
      name: "Basic test",
      abi: [
        {
          type: "function",
          selector: "0x95d376d7",
          payable: false,
          stateMutability: "payable",
          inputs: [
            {
              type: "tuple",
              name: "",
              components: [
                { type: "uint32", name: "" },
                { type: "bytes", name: "" },
                { type: "bytes32", name: "" },
                { type: "uint64", name: "" },
                { type: "address", name: "" },
              ],
            },
            { type: "bytes", name: "" },
          ],
          outputs: [
            {
              type: "tuple",
              name: "",
              components: [
                { type: "uint32", name: "" },
                { type: "bytes", name: "" },
                { type: "bytes32", name: "" },
                { type: "uint64", name: "" },
                { type: "address", name: "" },
              ],
            },
            { type: "bytes", name: "" },
          ],
          sig: "assignJob((uint32,bytes,bytes32,uint64,address),bytes)",
          name: "assignJob",
          constant: false,
        },
      ],
      want: [
        {
          type: "function",
          selector: "0x95d376d7",
          payable: false,
          stateMutability: "payable",
          inputs: [
            {
              type: "tuple",
              name: "",
              components: [
                { type: "uint32", name: "field0" },
                { type: "bytes", name: "field1" },
                { type: "bytes32", name: "field2" },
                { type: "uint64", name: "field3" },
                { type: "address", name: "field4" },
              ],
            },
            { type: "bytes", name: "" },
          ],
          outputs: [
            {
              type: "tuple",
              name: "",
              components: [
                { type: "uint32", name: "field0" },
                { type: "bytes", name: "field1" },
                { type: "bytes32", name: "field2" },
                { type: "uint64", name: "field3" },
                { type: "address", name: "field4" },
              ],
            },
            { type: "bytes", name: "" },
          ],
          sig: "assignJob((uint32,bytes,bytes32,uint64,address),bytes)",
          name: "assignJob",
          constant: false,
        },
      ],
    },
    {
      name: "Nested tuple test",
      abi: [
        {
          name: "test",
          selector: "0x12345679",
          inputs: [
            {
              name: "",
              type: "tuple",
              components: [
                {
                  type: "tuple",
                  name: "",
                  components: [
                    {
                      type: "tuple",
                      name: "",
                      components: [
                        { type: "uint256", name: "" },
                        { type: "address", name: "x" },
                      ],
                    },
                    {
                      type: "tuple",
                      name: "n1",
                      components: [
                        { type: "uint256", name: "y" },
                        { type: "address", name: "" },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
          stateMutability: "view",
          type: "function",
        },
      ],
      want: [
        {
          name: "test",
          selector: "0x12345679",
          inputs: [
            {
              name: "",
              type: "tuple",
              components: [
                {
                  type: "tuple",
                  name: "field0",
                  components: [
                    {
                      type: "tuple",
                      name: "field0",
                      components: [
                        {
                          type: "uint256",
                          name: "field0",
                        },
                        { type: "address", name: "x" },
                      ],
                    },
                    {
                      type: "tuple",
                      name: "n1",
                      components: [
                        { type: "uint256", name: "y" },
                        {
                          type: "address",
                          name: "field1",
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
          stateMutability: "view",
          type: "function",
        },
      ],
    },
    {
      name: "Other Tuple types: Tuple[] and Tuple[k]",
      abi: [
        {
          name: "test",
          selector: "0x12345679",
          inputs: [
            {
              name: "",
              type: "tuple",
              components: [
                {
                  name: "",
                  type: "tuple[]",
                  components: [
                    { name: "", type: "uint256" },
                    { name: "", type: "uint256" },
                  ],
                },
                {
                  name: "",
                  type: "tuple[2]",
                  components: [
                    { name: "", type: "uint256" },
                    { name: "", type: "uint256" },
                  ],
                },
              ],
            },
          ],
          stateMutability: "view",
          type: "function",
        },
      ],
      want: [
        {
          name: "test",
          selector: "0x12345679",
          inputs: [
            {
              name: "",
              type: "tuple",
              components: [
                {
                  name: "field0",
                  type: "tuple[]",
                  components: [
                    { name: "field0", type: "uint256" },
                    { name: "field1", type: "uint256" },
                  ],
                },
                {
                  name: "field1",
                  type: "tuple[2]",
                  components: [
                    { name: "field0", type: "uint256" },
                    { name: "field1", type: "uint256" },
                  ],
                },
              ],
            },
          ],
          stateMutability: "view",
          type: "function",
        },
      ],
    },
    {
      name: "Empty ABI",
      abi: [],
      want: [],
    },
  ];

  testCases.forEach((tc) => {
    it(tc.name, () => {
      expect(abiFillEmptyNames(tc.abi as ABI)).toStrictEqual(tc.want);
    });
  });
});