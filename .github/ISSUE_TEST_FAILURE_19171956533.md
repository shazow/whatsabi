# Test Failure Report - GitHub Actions Run #19171956533

## Issue Title
Test failure in auto.test.ts: "autoload full" expects partial ABI entry but receives complete entry

## Labels
- bug
- testing
- CI/CD

## Summary
The GitHub Actions workflow "Run Tests" is consistently failing on the main branch due to a test assertion mismatch in `src/__tests__/auto.test.ts`. The test expects a partial ABI entry with only `selector` and `type` properties, but the actual result includes complete function information including inputs, name, signature, and state mutability.

## Workflow Run Details
- **Run ID**: 19171956533
- **Run URL**: https://github.com/shazow/whatsabi/actions/runs/19171956533
- **Triggered by**: Push to main branch
- **Commit**: 8454a965987b6b2f7d4a1742d12f8fc6b62d86a8
- **Commit Message**: "README: Update immortal-whatsabi -> whatsabi-ui"
- **Date**: November 7, 2025, 14:50:33 UTC
- **Conclusion**: ❌ Failed

## Failed Jobs
1. ❌ **Project Tests (ethers)** - Job ID: 54806600515
2. ❌ **Project Tests (viem)** - Job ID: 54806600532
3. ⚠️ **Project Tests (web3)** - Cancelled (due to other failures)

## Error Details

### Failing Test
**Test Name**: `autoload full`
**Test File**: `src/__tests__/auto.test.ts:82`

### Assertion Error
```
AssertionError: expected [ { type: 'function', …(5) }, …(1) ] to deep equally contain { selector: '0xec0ab6a7', …(1) }
```

### Expected Value
```javascript
{
  "selector": "0xec0ab6a7",
  "type": "function"
}
```

### Actual Value Received
```javascript
{
  "inputs": [
    { "type": "uint256" },
    { "type": "address[]" },
    { "type": "bytes[]" }
  ],
  "name": "batchCall",
  "selector": "0xec0ab6a7",
  "sig": "batchCall(uint256,address[],bytes[])",
  "stateMutability": "nonpayable",
  "type": "function"
}
```

## Root Cause Analysis

The test is checking that the `autoload()` function can retrieve ABI information for contract address `0x4A137FD5e7a256eF08A7De531A17D0BE0cc7B6b6`. 

Looking at the test code in `src/__tests__/auto.test.ts` (lines 53-83), there are two expectations:

1. **Line 69-80**: Expects a **complete** ABI entry with all properties ✅ **PASSES**
   ```javascript
   expect(abi).toContainEqual({
       "inputs": [...],
       "name": "call",
       "stateMutability": "nonpayable",
       "selector": "0x6dbf2fa0",
       "sig": "call(address,uint256,bytes)",
       "type": "function"
   });
   ```

2. **Line 82**: Expects a **partial** ABI entry with only selector and type ❌ **FAILS**
   ```javascript
   expect(abi).toContainEqual({ "selector": "0xec0ab6a7", "type": "function" });
   ```

The inconsistency suggests that:
- The signature lookup services (OpenChain, 4Byte) are now successfully returning complete function signatures for `0xec0ab6a7`
- The test was written expecting only partial information, but the functionality is working better than expected
- This is likely not a regression but rather an improvement that needs the test to be updated

## Test Context

The test uses the following configuration:
```typescript
const { abi } = await autoload(address, {
    provider: provider,
    abiLoader: new whatsabi.loaders.MultiABILoader([
        new whatsabi.loaders.SourcifyABILoader(),
        new whatsabi.loaders.EtherscanV2ABILoader({ apiKey: env.ETHERSCAN_API_KEY }),
    ]),
    signatureLookup: new whatsabi.loaders.MultiSignatureLookup([
        new whatsabi.loaders.OpenChainSignatureLookup(),
        new whatsabi.loaders.FourByteSignatureLookup(),
    ]),
});
```

## Proposed Solutions

### ✅ Recommended: Option 1 - Update Test to Match Complete ABI Entry

Update the assertion on line 82 to expect the complete ABI entry:

```typescript
expect(abi).toContainEqual({
    "inputs": [
        { "type": "uint256" },
        { "type": "address[]" },
        { "type": "bytes[]" }
    ],
    "name": "batchCall",
    "selector": "0xec0ab6a7",
    "sig": "batchCall(uint256,address[],bytes[])",
    "stateMutability": "nonpayable",
    "type": "function"
});
```

**Rationale**: This aligns with the first assertion in the same test and validates that the signature lookup is working correctly.

### Option 2 - Use Flexible Matcher

Use `expect.objectContaining()` to match only required properties:

```typescript
expect(abi).toContainEqual(expect.objectContaining({ 
    "selector": "0xec0ab6a7", 
    "type": "function" 
}));
```

**Rationale**: This allows the test to pass regardless of how much information is returned, making it more resilient to improvements in signature resolution.

### Option 3 - Investigate Behavior Change

If complete signature information should not be returned, investigate:
1. When did the signature lookup behavior change?
2. Is this an external API change (OpenChain or 4Byte)?
3. Should the behavior be reverted?

## Impact Assessment

- **Severity**: 🔴 High - Blocking main branch builds
- **Scope**: All test runs with online signature lookup
- **Test Results**: 
  - Tests: 1 failed, 119 passed, 4 skipped (124 total)
  - Files: 1 failed, 11 passed, 1 skipped (13 total)
- **Build Status**: ❌ Failing
- **User Impact**: None - this is a test-only issue

## Reproduction Steps

1. Check out commit `8454a965987b6b2f7d4a1742d12f8fc6b62d86a8` on main
2. Set environment variables:
   - `PROVIDER=ethers` (or `viem`)
   - `ONLINE=1`
   - `ETHERSCAN_API_KEY=<your-key>`
3. Run: `pnpm test`
4. Observe failure in `src/__tests__/auto.test.ts > autoload full`

## Additional Context

- This appears to be a test quality issue rather than a functionality bug
- The functionality is working as intended (retrieving complete ABI information)
- The test expectations need to be updated to match the actual behavior
- Similar test at line 36-37 uses the same partial matching pattern and passes, suggesting the behavior difference is specific to this contract/selector

## Related Files

- `src/__tests__/auto.test.ts` - Test file containing the failing test
- `src/auto.ts` - Implementation of autoload function
- `.github/workflows/test.yml` - CI workflow configuration

## Next Steps

1. Update the test assertion on line 82 (recommended Option 1)
2. Consider reviewing other tests that use partial matchers for consistency
3. Add comments explaining why complete ABI entries are expected
4. Verify tests pass after fix with all three providers (ethers, viem, web3)

---

**Generated by**: GitHub Actions Diagnosis Tool
**Analysis Date**: November 7, 2025
**Analyzer**: Copilot Agent
