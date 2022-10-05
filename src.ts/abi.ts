export interface ABIFunction {
    type: "function";
    name?: string;
    nameCandidates?: string[];
    selector: string;
    payable?: boolean;
    // TODO: constant: boolean;
    // TODO: inputs: {type: name}[];
    // TODO: outputs: {type, name}[];
};

export interface ABIEvent {
    type: "event",
    name?: string;
    nameCandidates?: string[];
    hash: string,
    // TODO: ...
};

export type ABI = (ABIFunction|ABIEvent)[];
