export type StateMutability = "nonpayable"|"payable"|"view"|"pure";

export type ABIFunction = {
    type: "function"; // TODO: constructor, receive, fallback
    selector: string;
    name?: string;
    outputs?: ABIOutput[];
    inputs?: ABIInput[];
    sig?: string;
    sigAlts?: string[];
    payable?: boolean;
    stateMutability?: StateMutability;
};

export type ABIEvent = {
    type: "event",
    hash: string,
    name?: string;
    sig?: string;
    sigAlts?: string[];
    // TODO: ...
};

export type ABIInput = {
    type: string;
    name: string;
    length?: number;
    components?: ABIInOut[];
}

export type ABIOutput = {
    type: string;
    name: string;
    components?: ABIInOut[];
}

export type ABIInOut = ABIInput|ABIOutput;

export type ABI = (ABIFunction|ABIEvent)[];

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
 *         { "type": "uint32", "name": "_param0" },
 *         { "type": "bytes", "name": "_param1" },
 *         { "type": "bytes32", "name": "_param2" },
 *         { "type": "uint64", "name": "_param3" },
 *         { "type": "address", "name": "_param4" }
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
 * @returns A new ABI with tuple component names filled
 */
export function fillEmptyNames(abi: ABI): ABI {
  function processComponents(components: ABIInOut[]): void {
    components.forEach((component, index) => {
      component.name ||= `_param${index}`;
      if (isTupleType(component.type) && component.components) {
        processComponents(component.components);
      }
    });
  }

  const result: ABI = abi.map((item) => {
    if (item.type === "function") {
      const func: ABIFunction = { ...item };
      func.inputs?.forEach((input) => {
        if (isTupleType(input.type) && input.components) {
          processComponents(input.components);
        }
      });
      func.outputs?.forEach((output) => {
        if (isTupleType(output.type) && output.components) {
          processComponents(output.components);
        }
      });
      return func;
    }
    return item;
  });

  return result;
}

/**
 * Checks if a type is a tuple type (e.g. "tuple", "tuple[]", "tuple[2]")
 * @param type type to check
 * @returns true if the type is a tuple type
 */
function isTupleType(type: string): boolean {
  return type.startsWith("tuple");
}