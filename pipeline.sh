#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

bail() {
    echo "FAIL: $*" >&2
    exit 1
}

# --- Defaults ---
SKIP_GENERATE=false
SKIP_FUZZ=false
SKIP_NODE=false
SKIP_PUBLISH=false
FUZZ_SEED=1
FUZZ_COUNT=100

usage() {
    cat <<EOF
Usage: $0 [FLAGS]

  --skip-generate   Skip M2 test generation (step 1)
  --skip-fuzz       Skip raw string fuzz test generation (step 2)
  --skip-node       Skip Node native build and tests (step 6,7)
  --skip-publish    Skip npm/cargo publish dry-runs (step 8,9)
  --seed N          Fuzz generator seed (default: $FUZZ_SEED)
  --fuzz-count N    Number of fuzz tests (default: $FUZZ_COUNT)
  -h, --help        Show this help
EOF
    exit 0
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --skip-generate) SKIP_GENERATE=true; shift ;;
        --skip-fuzz)    SKIP_FUZZ=true; shift ;;
        --skip-node)    SKIP_NODE=true; shift ;;
        --skip-publish) SKIP_PUBLISH=true; shift ;;
        --seed)         FUZZ_SEED="$2"; shift 2 ;;
        --fuzz-count)   FUZZ_COUNT="$2"; shift 2 ;;
        -h|--help)      usage ;;
        *) bail "Unknown flag: $1" ;;
    esac
done

# --- Node version guard ---
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

# --- Pipeline ---

if $SKIP_GENERATE; then
    echo "==> Skipping M2 test generation (--skip-generate)"
else
    echo "==> 1. Generating M2 tests"
    bash test/test_generator/generate_tests.sh
fi

if $SKIP_FUZZ; then
    echo "==> Skipping fuzz tests (--skip-fuzz)"
else
    echo "==> 2. Generating raw string fuzz tests"
    python3 test/test_generator/gen_raw_tests.py --seed "$FUZZ_SEED" -n "$FUZZ_COUNT"
fi

echo "==> 3. Generating parser"
npx tree-sitter generate

echo "==> 4. Running tree-sitter tests"
npx tree-sitter test

echo "==> 5. Running cargo tests"
cargo test

if $SKIP_NODE; then
    echo "==> Skipping Node steps (--skip-node)"
else
    echo "==> 6. Building Node native addon"
    npx node-gyp rebuild

    echo "==> 7. Running Node binding tests"
    npm run test:node
fi

if $SKIP_PUBLISH; then
    echo "==> Skipping publish dry-runs (--skip-publish)"
else
    echo "==> 8. npm pack & publish (dry-run)"
    npm pack --dry-run
    npm publish --dry-run

    echo "==> 9. cargo publish (dry-run)"
    cargo publish --dry-run
fi

echo
echo "All steps completed successfully."
