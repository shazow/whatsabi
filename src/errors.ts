export class WhatsABIError extends Error {
    override name = 'WhatsABIError';

    // Some variables included from the context scope of the error, for debugging
    context?: Record<string, any>;

    constructor(message: string, args: { context?: Record<string, any>, cause?: Error } = {}) {
        super(message, { cause: args.cause } as ErrorOptions);

        this.context = args.context;
    }
}

export class AutoloadError extends WhatsABIError {
    override name = 'AutoloadError';
}

export class LoaderError extends WhatsABIError {
    override name = 'LoaderError';
}

export class ProviderError extends WhatsABIError {
    override name = 'ProviderError';
}

export class StorageReadError extends WhatsABIError {
    override name = 'StorageReadError';
}
