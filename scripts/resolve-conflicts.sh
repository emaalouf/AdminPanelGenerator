#!/bin/bash

# Auto-resolve merge conflicts by choosing main branch version
# Run this script from the project root: bash scripts/resolve-conflicts.sh

echo "🔧 Resolving merge conflicts..."

# Check if we're in a merge conflict state
if ! git status | grep -q "both modified\|Unmerged paths"; then
  echo "✅ No merge conflicts detected. You're good to go!"
  exit 0
fi

echo ""
echo "📝 Resolving conflicts in db.js and package.json..."

# For db.js - keep main version
if [ -f "developer-panel/backend/routes/db.js" ]; then
  git checkout --theirs developer-panel/backend/routes/db.js
  git add developer-panel/backend/routes/db.js
  echo "✅ Resolved: developer-panel/backend/routes/db.js (kept main version)"
fi

# For package.json - keep main version
if [ -f "developer-panel/backend/package.json" ]; then
  git checkout --theirs developer-panel/backend/package.json
  git add developer-panel/backend/package.json
  echo "✅ Resolved: developer-panel/backend/package.json (kept main version)"
fi

echo ""
echo "✨ Conflicts resolved! Now you can:"
echo "   1. Run: git status (to verify)"
echo "   2. Run: git commit (to complete the merge)"
echo ""
echo "⚠️  Note: If you were merging, you'll need to complete the merge commit."
