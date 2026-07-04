#!/bin/sh
# Removes Cursor co-author trailer from commit messages.
# Install: cp scripts/strip-cursor-coauthor.sh .git/hooks/prepare-commit-msg && chmod +x .git/hooks/prepare-commit-msg
sed -i.bak '/^Co-authored-by: Cursor <cursoragent@cursor.com>$/d' "$1"
rm -f "$1.bak"
