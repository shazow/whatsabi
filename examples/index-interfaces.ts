#!/usr/bin/env -S tsx
// Return an IndexedInterfaces object of known interfaces.
// This is hard-coded for now, we can make it pull in from other sources later.

import { whatsabi } from "../src/index.js";
import type { KnownInterfaces } from "../src/whatsabi.js";

const interfaces : KnownInterfaces = {
    "ERC-20": [
        "function totalSupply() view returns (uint256)",
        "function balanceOf(address) view returns (uint256)",
        "function transfer(address, uint256) returns (bool)",
        "function allowance(address, address) returns (uint256)",
        "function approve(address, uint256) returns (bool)",
        "function transferFrom(address, address, uint256) returns (bool)",
    ],
    "ERC-165": [
        "function supportsInterface(bytes4 interfaceId) view returns (bool)",
    ],
    "ERC-721": [
        "function balanceOf(address owner) view returns (uint256 balance)",
        "function ownerOf(uint256 tokenId) view returns (address owner)",
        "function safeTransferFrom(address from, address to, uint256 tokenId, bytes calldata data)",
        "function safeTransferFrom(address from, address to, uint256 tokenId)",
        "function transferFrom(address from, address to, uint256 tokenId)",
        "function approve(address to, uint256 tokenId)",
        "function setApprovalForAll(address operator, bool _approved)",
        "function getApproved(uint256 tokenId) view returns (address operator)",
        "function isApprovedForAll(address owner, address operator) view returns (bool)",
    ],
    "ERC-777": [
        "function name() view returns (string memory)",
        "function symbol() view returns (string memory)",
        "function granularity() view returns (uint256)",
        "function totalSupply() view returns (uint256)",
        "function balanceOf(address owner) view returns (uint256)",
        "function send(address recipient, uint256 amount, bytes calldata data)",
        "function burn(uint256 amount, bytes calldata data)",
        "function isOperatorFor(address operator, address tokenHolder) view returns (bool)",
        "function authorizeOperator(address operator)",
        "function revokeOperator(address operator)",
        "function defaultOperators() view returns (address[] memory)",
        "function operatorSend(address sender, address recipient, uint256 amount, bytes calldata data, bytes calldata operatorData)",
        "function operatorBurn(address account, uint256 amount, bytes calldata data, bytes calldata operatorData)",
    ],
    "ERC-1155": [
        "function balanceOf(address account, uint256 id) view returns (uint256)",
        "function balanceOfBatch(address[] calldata accounts, uint256[] calldata ids) view returns (uint256[] memory)",
        "function setApprovalForAll(address operator, bool approved)",
        "function isApprovedForAll(address account, address operator) view returns (bool)",
        "function safeTransferFrom( address from, address to, uint256 id, uint256 amount, bytes calldata data)",
        "function safeBatchTransferFrom( address from, address to, uint256[] calldata ids, uint256[] calldata amounts, bytes calldata data)",
    ],
    "ERC-4626": [
    ],
    "Ownable": [
        "function owner() view returns (address)",
        "function renounceOwnership()",
        "function transferOwnership(address)",
    ],
    "Multicall": [
        "function multicall(bytes[]) returns (bytes[] memory)",
    ],
    "ISafe": [
        "function execTransaction(address to, uint256 value, bytes data, uint8 operation, uint256 safeTxGas, uint256 baseGas, uint256 gasPrice, address gasToken, address refundReceiver, bytes signatures) payable returns (bool success)",
        "function checkSignatures(bytes32 dataHash, bytes data, bytes signatures) view",
        "function domainSeparator() view returns (bytes32)",
        "function nonce() view returns (uint256)",
    ],
    "EIP-1271": ["function isValidSignature(bytes32 _hash, bytes memory _signature) public view returns (bytes4 magicValue);"],
};

main().then().catch(err => {
    console.error("Failed:", err)
    process.exit(2);
})

async function main() {
    const r = whatsabi.interfaces.createInterfaceIndex(interfaces);
    // Print typescript structure
    console.log("// Generated using examples/index-interfaces.ts");
    console.log("export default {");
    for (const [key, setValue] of Object.entries(r)) {
        if (setValue.size === 0) { continue; }
        console.log(`  "${key}": new Set([${Array.from(setValue).map(v => `"${v}"`).join(", ")}]),`);
    }
    console.log("};");
};
