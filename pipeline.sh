#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

bail() { echo "FAIL: $*" >&2; exit 1; }

SKIP_GENERATE=false
SKIP_NODE=false
SKIP_PUBLISH=false

usage() {
    cat <<EOF
Usage: $0 [FLAGS]

  --skip-generate   Skip M2 test generation (step 1)
  --skip-node       Skip Node native build and tests (step 5,6)
  --skip-publish    Skip npm/cargo publish dry-runs (step 7,8)
  -h, --help        Show this help
EOF
    exit 0
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --skip-generate) SKIP_GENERATE=true; shift ;;
        --skip-node)     SKIP_NODE=true; shift ;;
        --skip-publish)  SKIP_PUBLISH=true; shift ;;
        -h|--help)       usage ;;
        *) bail "Unknown flag: $1" ;;
    esac
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

if $SKIP_GENERATE; then
    echo "==> Skipping M2 test generation (--skip-generate)"
else
    echo "==> 1. Generating M2 tests"
    bash test/test_generator/generate_tests.sh
fi

echo "==> 2. Generating parser"
npx tree-sitter generate

echo "==> 3. Running tree-sitter tests"
npx tree-sitter test

echo "==> 4. Running cargo tests"
cargo test

if $SKIP_NODE; then
    echo "==> Skipping Node steps (--skip-node)"
else
    echo "==> 5. Building Node native addon"
    npx node-gyp rebuild

    echo "==> 6. Running Node binding tests"
    npm run test:node
fi

if $SKIP_PUBLISH; then
    echo "==> Skipping publish dry-runs (--skip-publish)"
else
    echo "==> 7. npm pack & publish (dry-run)"
    npm pack --dry-run
    npm publish --dry-run

    echo "==> 8. cargo publish (dry-run)"
    cargo publish --dry-run
fi

echo
echo "All steps completed successfully."
