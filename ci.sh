#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

bail() { echo "FAIL: $*" >&2; exit 1; }

SKIP_M2=false
SKIP_GENERATE=false

while [[ $# -gt 0 ]]; do
    case "$1" in
        --skip-m2)       SKIP_M2=true ;;
        --skip-generate) SKIP_GENERATE=true ;;
        -h|--help)
            echo "Usage: $0 [--skip-m2] [--skip-generate]"
            echo "  --skip-m2        Skip M2 test generation (step 1)"
            echo "  --skip-generate  Skip tree-sitter generate (step 2)"
            exit 0 ;;
        *) bail "Unknown flag: $1" ;;
    esac
    shift
done

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

if $SKIP_M2; then
    echo "==> Skipping M2 test generation (--skip-m2)"
else
    echo "==> 1. Generating M2 tests"
    bash test/test_generator/generate_tests.sh || echo "==> M2 test generation failed (M2 may not be installed)"
fi

if $SKIP_GENERATE; then
    echo "==> Skipping parser generation (--skip-generate)"
else
    echo "==> 2. Generating parser"
    npx tree-sitter generate
fi

echo "==> 3. Running tree-sitter tests"
npx tree-sitter test

echo "==> 4. Running cargo tests"
cargo test

echo "==> 5. Building Node native addon"
npx node-gyp rebuild

echo "==> 6. Running Node binding tests"
npm run test:node

echo
echo "All steps completed successfully."
