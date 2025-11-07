#!/bin/bash
# Script to create GitHub issue for test failure diagnosis
# This script requires GitHub CLI (gh) to be authenticated

set -e

ISSUE_FILE=".github/ISSUE_TEST_FAILURE_19171956533.md"

if [ ! -f "$ISSUE_FILE" ]; then
    echo "Error: Issue file not found: $ISSUE_FILE"
    exit 1
fi

# Extract title from the markdown file (looking for "## Issue Title")
TITLE=$(grep "^## Issue Title" "$ISSUE_FILE" -A 1 | tail -n 1)

if [ -z "$TITLE" ]; then
    echo "Error: Could not extract title from issue file"
    exit 1
fi

echo "Creating GitHub issue..."
echo "Title: $TITLE"
echo ""

# Create the issue using gh CLI
# The --body-file flag will use the markdown file as the issue body
gh issue create \
    --title "$TITLE" \
    --body-file "$ISSUE_FILE" \
    --label "bug,testing,CI/CD"

echo ""
echo "✅ Issue created successfully!"
echo ""
echo "You can view all issues at: https://github.com/shazow/whatsabi/issues"
