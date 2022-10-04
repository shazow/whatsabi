export interface ABIFunction {
    type: "function";
    name?: string;
    selector: string;
    payable?: boolean;
}
export interface ABIEvent {
    type: "event";
    name?: string;
    hash: string;
}
export declare type ABI = (ABIFunction | ABIEvent)[];
