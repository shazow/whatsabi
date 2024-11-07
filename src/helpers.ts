import type { ABI, ABIFunction, ABIInOut } from "./abi.js";

// Regular expression to match tuple types.
// Example: tuple, tuple[], tuple[5]
const reTupleType = /^tuple(\[\d*\])?$/;

/**
 * Fills tuple component's empty names in an ABI with generated names
 *
 * @example
 * Input: {
 *   "type": "function",
 *   "selector": "0x95d376d7",
 *   "payable": false,
 *   "stateMutability": "payable",
 *   "inputs": [
 *     {
 *       "type": "tuple",
 *       "name": "",
 *       "components": [
 *         { "type": "uint32", "name": "" },
 *         { "type": "bytes", "name": "" },
 *         { "type": "bytes32", "name": "" },
 *         { "type": "uint64", "name": "" },
 *         { "type": "address", "name": "" }
 *       ]
 *     },
 *     { "type": "bytes", "name": "" }
 *   ],
 *   "sig": "assignJob((uint32,bytes,bytes32,uint64,address),bytes)",
 *   "name": "assignJob",
 *   "constant": false
 * }
 *
 * Output: {
 *   "type": "function",
 *   "selector": "0x95d376d7",
 *   "payable": false,
 *   "stateMutability": "payable",
 *   "inputs": [
 *     {
 *       "type": "tuple",
 *       "name": "",
 *       "components": [
 *         { "type": "uint32", "name": "field0" },
 *         { "type": "bytes", "name": "field1" },
 *         { "type": "bytes32", "name": "field2" },
 *         { "type": "uint64", "name": "field3" },
 *         { "type": "address", "name": "field4" }
 *       ]
 *     },
 *     { "type": "bytes", "name": "" }
 *   ],
 *   "sig": "assignJob((uint32,bytes,bytes32,uint64,address),bytes)",
 *   "name": "assignJob",
 *   "constant": false
 * }
 *
 * @param abi The ABI to process
 * @param options Configuration options
 * @returns A new ABI with filled parameter names
 */
export function abiFillEmptyNames(abi: ABI): ABI {
  function processComponents(components: ABIInOut[]): void {
    components.forEach((component, index) => {
      component.name ||= `field${index}`;
      if (component.type.match(reTupleType) && component.components) {
        processComponents(component.components);
      }
    });
  }

  const result: ABI = abi.map((item) => {
    if (item.type === "function") {
      const func: ABIFunction = { ...item };
      func.inputs?.forEach((input) => {
        if (input.type.match(reTupleType) && input.components) {
          processComponents(input.components);
        }
      });
      func.outputs?.forEach((output) => {
        if (output.type.match(reTupleType) && output.components) {
          processComponents(output.components);
        }
      });
      return func;
    }
    return item;
  });

  return result;
}
