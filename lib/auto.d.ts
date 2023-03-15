import { Provider } from "@ethersproject/abstract-provider";
import { ABI } from "./abi";
import { ABILoader, SignatureLookup } from "./loaders";
export declare function autoload(address: string, config: {
    provider: Provider;
    abiLoader?: ABILoader | false;
    signatureLookup?: SignatureLookup | false;
}): Promise<ABI>;
