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
