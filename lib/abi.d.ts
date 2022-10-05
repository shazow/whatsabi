export interface ABIFunction {
    type: "function";
    name?: string;
    nameAlts?: string[];
    selector: string;
    payable?: boolean;
}
export interface ABIEvent {
    type: "event";
    name?: string;
    nameAlts?: string[];
    hash: string;
}
export declare type ABI = (ABIFunction | ABIEvent)[];
