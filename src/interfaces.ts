import * as AbiFunction from 'ox/AbiFunction';

// KnownInterfaces is a mapping from interface names to lists of function signatures that belong to that interface.
export type KnownInterfaces = Record<string, Array<string>>;

// IndexedInterfaces is an optimized mapping of interface names to sorted selectors.
// NOTE: The definition of this type may change to improve efficiency, please use helpers like createInterfaceIndex to produce it.
export type IndexedInterfaces = Record<string, string>;

export function createInterfaceIndex(known: KnownInterfaces): IndexedInterfaces {
    const r : IndexedInterfaces = {};
    for (const [name, signatures] of Object.entries(known)) {
        // TODO: Strip 0x
        const selectors = signatures.map(sig => AbiFunction.getSelector(sig));
        selectors.sort();
        r[name] = selectors.join('');
    }
    return r;
}

// Given a list of selectors, return a mapping of interfaces it implements to a list of present function signatures that belong to it.
export function selectorsToInterfaces(selectors: string[], knownInterfaces?: IndexedInterfaces): string[] {
    const r: string[] = [];
    if (selectors.length === 0) return r;
    if (!knownInterfaces) { 
        // TODO: Use defaultKnownInterfaces
    }
    // XXX: Do the rest
    return r;
}
