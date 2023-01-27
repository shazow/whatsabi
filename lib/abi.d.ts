export declare type StateMutability = "nonpayable" | "payable" | "view" | "pure";
export declare type ABIFunction = {
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
export declare type ABIEvent = {
    type: "event";
    hash: string;
    sig?: string;
    sigAlts?: string[];
};
export declare type ABI = (ABIFunction | ABIEvent)[];
