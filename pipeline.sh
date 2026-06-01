#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

bail() {
    echo "FAIL: $*" >&2
    exit 1
}

NODE_MAJOR=$(node -v | cut -d. -f1 | tr -d 'v')
if [ "$NODE_MAJOR" -gt 25 ]; then
    MISENODE_ROOT="$HOME/.local/share/mise/installs/node"
    COMPATIBLE=$(ls -1 "$MISENODE_ROOT" 2>/dev/null | grep -E '^2[0-5]\.' | sort -V | tail -1 || true)
    if [ -n "$COMPATIBLE" ]; then
        export PATH="$MISENODE_ROOT/$COMPATIBLE/bin:$PATH"
        echo "==> Switched to Node $COMPATIBLE"
    else
        bail "Node >= 26 is unsupported. Install Node 18–25 via 'mise install node@22'."
    fi
fi

echo "==> 1. Generating tests"
bash test/test_generator/generate_tests.sh

echo "==> 2. Generating raw string fuzz tests"
python3 test/test_generator/gen_raw_tests.py --seed 1 -n 100

echo "==> 3. Generating parser"
npx tree-sitter generate

echo "==> 4. Running tree-sitter tests"
npx tree-sitter test

echo "==> 5. Running cargo tests"
cargo test

echo "==> 6. Building Node native addon"
npx node-gyp rebuild

echo "==> 7. Running Node binding tests"
npm run test:node

echo "==> 8. npm pack & publish (dry-run)"
npm pack --dry-run
npm publish --dry-run

echo "==> 9. cargo publish (dry-run)"
cargo publish --dry-run

echo
echo "All steps completed successfully."
