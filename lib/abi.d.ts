export type StateMutability = "nonpayable" | "payable" | "view" | "pure";
export type ABIFunction = {
    type: "function";
    selector: string;
    outputs?: {
        type: string;
        length?: number;
        name?: string;
    }[];
    inputs?: {
        type: string;
    }[];
    sig?: string;
    sigAlts?: string[];
    payable?: boolean;
    stateMutability?: StateMutability;
};
export type ABIEvent = {
    type: "event";
    hash: string;
    sig?: string;
    sigAlts?: string[];
};
export type ABI = (ABIFunction | ABIEvent)[];
