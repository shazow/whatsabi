export type StateMutability = "nonpayable"|"payable"|"view"|"pure";

export type ABIFunction = {
    type: "function"; // TODO: constructor, receive, fallback
    selector: string;
    name?: string;
    outputs?: {type: string, length?: number, name: string}[];
    inputs?: {type: string, name: string}[];
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

export type ABI = (ABIFunction|ABIEvent)[];
