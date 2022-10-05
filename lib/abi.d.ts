export interface ABIFunction {
    type: "function";
    name?: string;
    nameCandidates?: string[];
    selector: string;
    payable?: boolean;
}
export interface ABIEvent {
    type: "event";
    name?: string;
    nameCandidates?: string[];
    hash: string;
}
export declare type ABI = (ABIFunction | ABIEvent)[];
