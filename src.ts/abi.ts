export type ABIFunction = {
    type: "function";
    outputs: {type: string, length: number, name?: string}[];
    selector: string;
    sig?: string;
    sigAlts?: string[];
    payable?: boolean;
    // TODO: constant: boolean;
    // TODO: inputs: {type: name}[];
};

export type ABIEvent = {
    type: "event",
    hash: string,
    sig?: string;
    sigAlts?: string[];
    // TODO: ...
};

export type ABI = (ABIFunction|ABIEvent)[];
