export interface ABIFunction {
    type: "function";
    name?: string;
    nameAlts?: string[];
    selector: string;
    payable?: boolean;
    // TODO: constant: boolean;
    // TODO: inputs: {type: name}[];
    // TODO: outputs: {type, name}[];
};

export interface ABIEvent {
    type: "event",
    name?: string;
    nameAlts?: string[];
    hash: string,
    // TODO: ...
};

export type ABI = (ABIFunction|ABIEvent)[];
