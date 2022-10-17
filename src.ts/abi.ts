export type ABIFunction = {
    type: "function";
    selector: string;
    sig?: string;
    sigAlts?: string[];
    payable?: boolean;
    // TODO: constant: boolean;
    // TODO: inputs: {type: name}[];
    // TODO: outputs: {type, name}[];
};

export type ABIEvent = {
    type: "event",
    hash: string,
    sig?: string;
    sigAlts?: string[];
    // TODO: ...
};

export type ABI = (ABIFunction|ABIEvent)[];
