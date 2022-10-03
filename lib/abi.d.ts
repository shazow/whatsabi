export interface ABIFunction {
    type: "function";
    name?: string;
    selector: string;
    payable?: boolean;
}
export interface ABIError {
    type: "error";
}
export interface ABIEvent {
    type: "event";
}
export declare type ABI = (ABIFunction | ABIError | ABIEvent)[];
