// BYTE32's representing references to known proxy storage slots.
export const knownProxySlots : Record<string, string> = {
    // ERC-1967: Proxy Storage Slots
    // bytes32(uint256(keccak256('eip1967.proxy.implementation')) - 1)
    "360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc": "eip1967.proxy.implementation",

    // EPI-1967
    // Beacon slot is a fallback if implementation is not set.
    // bytes32(uint256(keccak256('eip1967.proxy.beacon')) - 1)).
    "a3f0ad74e5423aebfd80d3ef4346578335a9a72aeaee59ff6cb3582b35133d50": "eip1967.proxy.beacon",

    // Beacon fallback has selectors:
    // - implementation()
    // - childImplementation()
    // - masterCopy() in Gnosis Safe
    // - comptrollerImplementation() in Compound

    // https://github.com/OpenZeppelin/openzeppelin-labs/blob/54ad91472fdd0ac4c34aa97d3a3da45c28245510/initializer_with_sol_editing/contracts/UpgradeabilityProxy.sol
    // bytes32(uint256(keccak256("org.zeppelinos.proxy.implementation")))
    "7050c9e0f4ca769c69bd3a8ef740bc37934f8e2c036e5a723fd8ee048ed3f8c3": "org.zeppelinos.proxy.implementation",

    // ERC-1822: Universal Upgradeable Proxy Standard (UUPS)
    // bytes32(uint256(keccak256("PROXIABLE")))
    "c5f16f0fcc639fa48a6947836d9850f504798523bf8c9a3a87d5876cf622bcf7": "PROXIABLE",

    // Gnosis Safe Proxy Factor 1.1.1
    // Not actually a slot, but there's a PUSH32 to the masterCopy() selector
    "0xa619486e00000000000000000000000000000000000000000000000000000000": "masterCopy()",
};

