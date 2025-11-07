# GitHub Issue Documentation

This directory contains diagnostic reports and tools for creating GitHub issues related to CI/CD failures and other repository issues.

## Files

### ISSUE_TEST_FAILURE_19171956533.md
Comprehensive diagnostic report for the test failure in workflow run #19171956533.

**Summary**: The "autoload full" test in `src/__tests__/auto.test.ts` is failing because it expects a partial ABI entry but receives a complete ABI entry with full function signature details. This is likely due to improvements in the signature lookup services that now return more complete information.

**Recommended fix**: Update the test assertion on line 82 to expect the complete ABI entry format, consistent with other assertions in the same test.

### create-issue.sh
Helper script to create a GitHub issue using the GitHub CLI (`gh`).

**Usage**:
```bash
# Ensure you're authenticated with GitHub CLI
gh auth login

# Run the script to create the issue
.github/create-issue.sh
```

The script will:
1. Read the issue content from ISSUE_TEST_FAILURE_19171956533.md
2. Extract the title
3. Create a new issue with appropriate labels

## Manual Issue Creation

If you prefer to create the issue manually:

1. Go to: https://github.com/shazow/whatsabi/issues/new
2. Title: `Test failure in auto.test.ts: "autoload full" expects partial ABI entry but receives complete entry`
3. Labels: `bug`, `testing`, `CI/CD`
4. Body: Copy the content from `ISSUE_TEST_FAILURE_19171956533.md`

## Analysis Summary

**What failed**: GitHub Actions workflow "Run Tests" (run #19171956533)
**When**: November 7, 2025, 14:50:33 UTC
**Where**: `src/__tests__/auto.test.ts:82` - test "autoload full"
**Why**: Test expects `{ "selector": "0xec0ab6a7", "type": "function" }` but receives a complete ABI entry with inputs, name, sig, and stateMutability
**Impact**: All test runs failing on main branch
**Severity**: High (blocking builds) but no user-facing impact
**Recommended fix**: Update test to expect complete ABI entry format
