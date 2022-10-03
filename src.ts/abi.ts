export interface ABIFunction {
    type: "function";
    name?: string;
    selector: string;
    payable?: boolean;
    // TODO: constant: boolean;
    // TODO: inputs: {type: name}[];
    // TODO: outputs: {type, name}[];
};

export interface ABIError {
    type: "error",
    // TODO: ...
};

export interface ABIEvent {
    type: "event",
    // TODO: ...
};

export type ABI = (ABIFunction|ABIError|ABIEvent)[];
