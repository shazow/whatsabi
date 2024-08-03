import type { Eip1193Provider } from "ethers";
import { BrowserProvider } from "ethers";
import type { BlockTag } from "ethers";

export type Web3jsProvider = {
	send: (method: string, params: unknown) => Promise<unknown>;
};
export type EthersProvider = Web3jsProvider;
export type ViemProvider = Eip1193Provider;
export { type Eip1193Provider };

// RPCPRovider thesis is: let's stop trying to adapt to every RPC wrapper library's high-level functions
// and instead have a discovery for the lowest-level RPC call function that we can use directly.
// At least whenever possible. Higher-level functionality like getAddress is still tricky.
export class RPCProvider implements Eip1193Provider {
	static fromProvider(
		provider: Web3jsProvider | EthersProvider | ViemProvider | Eip1193Provider,
	) {
		if ("request" in provider) {
			return new RPCProvider(provider);
		}
		if ("send" in provider) {
			return RPCProvider.fromWeb3jsProvider(provider);
		}
		throw new Error("Unsupported provider");
	}
	static fromWeb3jsProvider(provider: {
		send: (method: string, params: unknown) => Promise<unknown>;
	}) {
		const eip1193Provider: Eip1193Provider = {
			request: ({ method, params }) => provider.send(method, params),
		};
		return new RPCProvider(eip1193Provider);
	}

	static fromEthersProvider(provider: {
		send: (method: string, params: unknown) => Promise<unknown>;
	}) {
		const eip1193Provider: Eip1193Provider = {
			request: ({ method, params }) => provider.send(method, params),
		};
		return new RPCProvider(eip1193Provider);
	}

	static fromViemProvider(provider: Eip1193Provider) {
		return new RPCProvider(provider);
	}

	public readonly provider: Eip1193Provider;

	public readonly request: Eip1193Provider["request"];

	private readonly ethersProvider: BrowserProvider;

	constructor(provider: Eip1193Provider) {
		this.provider = provider;
		this.request = provider.request.bind(provider);
		this.ethersProvider = new BrowserProvider(provider);
	}

	getStorageAt(
		address: string,
		slot: number | string,
		blockTag: BlockTag = "latest",
	): Promise<string> {
		return this.ethersProvider.getStorage(address, slot, blockTag);
	}

	call(transaction: {
		to: string;
		data: string;
		blockTag?: BlockTag;
	}): Promise<string> {
		return this.ethersProvider.call({
			from: "0x0000000000000000000000000000000000000001",
			to: transaction.to,
			data: transaction.data,
			blockTag: transaction.blockTag ?? "latest",
		});
	}

	getCode(address: string, blockTag: BlockTag = "latest"): Promise<string> {
		return this.ethersProvider.getCode(address, blockTag);
	}

	getAddress(name: string): Promise<string | null> {
		return this.ethersProvider.resolveName(name);
	}
}
