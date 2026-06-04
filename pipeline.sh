#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

bail() { echo "FAIL: $*" >&2; exit 1; }

RED='\033[31m'
GREEN='\033[32m'
YELLOW='\033[33m'
BLUE='\033[34m'
NC='\033[0m'
CYAN='\033[36m'
GRAY='\033[90m'

VERBOSE=false
SHOW_TESTS=false
SKIP_M2=false
SKIP_GENERATE=false
SKIP_WASM=false
SKIP_TESTS=false
SKIP_CARGO=false
SKIP_NODE=false
RUN_DRY_PUBLISH=false

usage() {
    cat <<EOF
Usage: $0 [FLAGS]

  -v, --verbose         Show generate-step parser symbol count
  -t, --show-tests      Show full test output; without it only summaries are printed
  -Sm, --skip-m2        Skip M2 test generation (step 1)
  -Sg, --skip-generate  Skip parser generation (step 2)
  -Sw, --skip-wasm      Skip Wasm generation (step 3)
  -St, --skip-tests     Skip tree-sitter, Cargo, and Node tests (steps 4, 5, 7)
  -Sc, --skip-cargo     Skip Cargo tests and Cargo publish dry-run (steps 5, 9)
  -Sn, --skip-node      Skip Node native build, tests, and npm publish dry-run (steps 6, 7, 8)
  -Dp, --dry-publish    Run npm/cargo publish dry-runs (steps 8, 9)
  -h, --help            Show this help
EOF
    exit 0
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        -v|--verbose)        VERBOSE=true ;;
        -t|--show-tests)     SHOW_TESTS=true ;;
        -Sm|--skip-m2)       SKIP_M2=true ;;
        -Sg|--skip-generate) SKIP_GENERATE=true ;;
        -Sw|--skip-wasm)     SKIP_WASM=true ;;
        -St|--skip-tests)    SKIP_TESTS=true ;;
        -Sc|--skip-cargo)    SKIP_CARGO=true ;;
        -Sn|--skip-node)     SKIP_NODE=true ;;
        -Dp|--dry-publish)   RUN_DRY_PUBLISH=true ;;
        -h|--help)           usage ;;
        *)                   bail "Unknown flag: $1" ;;
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

ok() { echo -e "    ${GREEN}OK${NC}"; }
fail_badge() { echo -e "${RED}FAIL${NC}"; }
warn_badge() { echo -e "${YELLOW}WARN${NC}"; }

color_num() {
    echo -e "${YELLOW}$1${NC}"
}

skip_step() {
    local step="$1" label="$2" reason="$3"
    echo
    echo -e "${GRAY} ==> (${step}) ${label} [${NC}${reason}${GRAY}]${NC}"
}
step() {
    local step="$1" label="$2"
    echo
    echo -e "${CYAN} ==> (${step})${BLUE} ${label}${NC}"
}


print_highlighted_matches() {
    local text="$1"
    local had_any=false

    while IFS= read -r line; do
        had_any=true
        echo -e "${RED}    ${NC} $line"
    done < <(printf '%s\n' "$text" | grep -iE '^error|^Error' || true)

    # while IFS= read -r line; do
    #     had_any=true
    #     echo -e "${YELLOW}    ${NC} $line"
    # done < <(printf '%s\n' "$text" | grep -i 'warn' || true)

    $had_any || true
}

badge() {
    local passed="$1" total="$2" skipped="${3:-0}"
    local effective=$((passed + skipped))

    if [ "$effective" -eq "$total" ]; then
        if [ "$skipped" -gt 0 ]; then
            echo -e "    ${GREEN}OK ($passed/$passed) ${NC}[${YELLOW}$skipped skipped${NC}]"
        else
            echo -e "    ${GREEN}OK ($passed/$total)${NC}"
        fi
    else
        if [ "$skipped" -gt 0 ]; then
            echo -e "    ${RED}FAIL ($passed/$total)${NC} [$skipped skipped]"
        else
            echo -e "    ${RED}FAIL ($passed/$total)${NC}"
        fi
    fi
}

parser_stat_from_line() {
    sed -n "$1"p src/parser.c | awk '{print $NF}' | tr -d ','
}

# -------------------------------------------------------------------
# Step 1 – M2 tests
# -------------------------------------------------------------------
if $SKIP_M2; then
    skip_step 1 "M2 test generation" "--skip-m2"
else
    step 1 "M2 test generation"
    M2_OUT=$(bash test/test_generator/generate_tests.sh 2>&1) || {
        echo "$M2_OUT"
        fail_badge
        exit 1
    }
    if [ -n "$M2_OUT" ]; then
        print_highlighted_matches "$M2_OUT"
        if $SHOW_TESTS; then
            echo "$M2_OUT"
        fi
    fi
fi

# -------------------------------------------------------------------
# Step 2 – Generate parser
# -------------------------------------------------------------------
if $SKIP_GENERATE; then
    skip_step 2 "Generating tree-sitter parser" "--skip-generate"
else
    step 2 "Generating tree-sitter parser"
    GENERATE_OUT=$(npx tree-sitter generate 2>&1) || {
        echo "$GENERATE_OUT"
        fail_badge
        exit 1
    }
    if [ -n "$GENERATE_OUT" ]; then
        print_highlighted_matches "$GENERATE_OUT"
        if $SHOW_TESTS; then
            echo "$GENERATE_OUT"
        fi
    fi
    if $VERBOSE; then
        echo "    avg speed:    $(color_num "$TS_AVG_SPEED bytes/ms")"
        echo "    tokens:       $(color_num "$(parser_stat_from_line 14)")"
        echo "    symbols:      $(color_num "$(parser_stat_from_line 12)")"
        echo "    states:       $(color_num "$(parser_stat_from_line 10)")"
        echo "    large states: $(color_num "$(parser_stat_from_line 11)")"
    fi
fi

# -------------------------------------------------------------------
# Step 3 – Generate Wasm parser
# -------------------------------------------------------------------
if $SKIP_GENERATE; then
    skip_step 3 "Generate Wasm parser" "--skip-generate"
elif $SKIP_WASM; then
    skip_step 3 "Generate Wasm parser" "--skip-wasm"
else
    step 3 "Generating Wasm parser"
    npm run build:wasm
fi

# -------------------------------------------------------------------
# Step 4 – tree-sitter tests
# -------------------------------------------------------------------
if $SKIP_TESTS; then
    skip_step 4 "tree-sitter tests" "--skip-tests"
else
    step 4 "Running tree-sitter tests"
    TS_OUT=$(npx tree-sitter test 2>&1) || {
        echo
        echo "    $TS_OUT"
        fail_badge
        exit 1
    }
    TS_PASS=$(echo "$TS_OUT" | grep -c '✓' || true)
    TS_SKIP=$(echo "$TS_OUT" | grep -c '⌀' || true)
    TS_TOTAL=$(( $(echo "$TS_OUT" | grep -cE '^[[:space:]]*[0-9]+\.' || true) ))
    badge "$TS_PASS" "$TS_TOTAL" "$TS_SKIP"
    TS_AVG_SPEED=$(npx tree-sitter test --json-summary 2>/dev/null | node -e '
let input = "";
process.stdin.on("data", chunk => input += chunk);
process.stdin.on("end", () => {
  const summary = JSON.parse(input);
  const rates = [];

  function visit(node) {
    if (node && typeof node === "object") {
      if (typeof node.parse_rate === "number") rates.push(node.parse_rate);
      if (Array.isArray(node.children)) node.children.forEach(visit);
      if (Array.isArray(node.parse_results)) node.parse_results.forEach(visit);
    }
  }

  visit(summary);

  if (rates.length === 0) return;
  const avg = rates.reduce((a, b) => a + b, 0) / rates.length;
  process.stdout.write(avg.toFixed(0));
});
' || true)

    print_highlighted_matches "$TS_OUT"
    if $SHOW_TESTS; then
        echo "$TS_OUT"
    fi
fi

# -------------------------------------------------------------------
# Step 5 – Cargo tests
# -------------------------------------------------------------------
if $SKIP_TESTS; then
    skip_step 5 "Cargo tests" "--skip-tests"
elif $SKIP_CARGO; then
    skip_step 5 "Cargo tests" "--skip-cargo"
else
    step 5 "Cargo tests: "
    CARGO_OUT=$(cargo test 2>&1) || {
        echo
        echo "$CARGO_OUT"
        fail_badge
        exit 1
    }
    CARGO_PASS=$(echo "$CARGO_OUT" | grep -oP '(\d+) passed' | head -1 | grep -oP '\d+' || echo 0)
    CARGO_FAIL=$(echo "$CARGO_OUT" | grep -oP '(\d+) failed' | head -1 | grep -oP '\d+' || echo 0)
    CARGO_SKIP=$(echo "$CARGO_OUT" | grep -oP '(\d+) ignored' | head -1 | grep -oP '\d+' || echo 0)
    CARGO_TOTAL=$((CARGO_PASS + CARGO_FAIL))
    badge "$CARGO_PASS" "$CARGO_TOTAL" "$CARGO_SKIP"
    print_highlighted_matches "$CARGO_OUT"
    if $SHOW_TESTS; then
        echo "$CARGO_OUT"
    fi
fi

# -------------------------------------------------------------------
# Step 6 – Node native build
# -------------------------------------------------------------------
if $SKIP_NODE; then
    skip_step 6 "Node native build" "--skip-node"
else
    step 6 "Node native build: "
    NODE_BUILD_OUT=$(npx node-gyp rebuild 2>&1) || {
        echo
        echo "$NODE_BUILD_OUT"
        fail_badge
        exit 1
    }
    ok
    print_highlighted_matches "$NODE_BUILD_OUT"
    if $SHOW_TESTS; then
        echo "$NODE_BUILD_OUT"
    fi
fi

# -------------------------------------------------------------------
# Step 7 – Node tests
# -------------------------------------------------------------------
if $SKIP_TESTS; then
    skip_step 7 "Node tests" "--skip-tests"
elif $SKIP_NODE; then
    skip_step 7 "Node tests" "--skip-node"
else
    step 7 "Node tests: "
    NODE_OUT=$(npm run test:node 2>&1) || true
    NODE_TESTS=$(echo "$NODE_OUT" | grep -oP 'ℹ tests \K\d+' || echo 0)
    NODE_SUITES=$(echo "$NODE_OUT" | grep -oP 'ℹ suites \K\d+' || echo 0)
    NODE_PASS=$(echo "$NODE_OUT" | grep -oP 'ℹ pass \K\d+' || echo 0)
    NODE_FAIL=$(echo "$NODE_OUT" | grep -oP 'ℹ fail \K\d+' || echo 0)
    NODE_SKIP=$(echo "$NODE_OUT" | grep -oP 'ℹ skipped \K\d+' || echo 0)
    NODE_TODO=$(echo "$NODE_OUT" | grep -oP 'ℹ todo \K\d+' || echo 0)
    NODE_DURATION=$(echo "$NODE_OUT" | grep -oP 'ℹ duration_ms \K[0-9.]+' || echo 0)
    NODE_TOTAL=$((NODE_PASS + NODE_FAIL + NODE_SKIP))
    if [ "$NODE_FAIL" -gt 0 ]; then
        badge "$NODE_PASS" "$NODE_TOTAL" "$NODE_SKIP"
        print_highlighted_matches "$NODE_OUT"
        echo "$NODE_OUT"
        exit 1
    fi
    badge "$NODE_PASS" "$NODE_TOTAL" "$NODE_SKIP"

    print_highlighted_matches "$NODE_OUT"
    if $SHOW_TESTS; then
        echo "$NODE_OUT"
    fi
fi

# -------------------------------------------------------------------
# Step 8 – npm publish dry-run
# -------------------------------------------------------------------
if $SKIP_NODE; then
    skip_step 8 "npm publish dry-run" "--skip-node"
elif ! $RUN_DRY_PUBLISH; then
    skip_step 8 "npm publish dry-run" "--dry-publish not set"
else
    step 8 "npm publish dry-run: "
    NPM_OUT=$(npm publish --dry-run 2>&1) || {
        echo
        echo "$NPM_OUT"
        warn_badge
        print_highlighted_matches "$NPM_OUT"
        if $SHOW_TESTS; then
            echo "$NPM_OUT"
        fi
        exit 1
    }
    if echo "$NPM_OUT" | grep -qi 'err'; then
        warn_badge
        print_highlighted_matches "$NPM_OUT"
        echo "$NPM_OUT"
    else
        ok
        print_highlighted_matches "$NPM_OUT"
        if $SHOW_TESTS; then
            echo "$NPM_OUT"
        fi
    fi
fi

# -------------------------------------------------------------------
# Step 9 – Cargo publish dry-run
# -------------------------------------------------------------------
if $SKIP_CARGO; then
    skip_step 9 "Cargo publish dry run" "--skip-cargo"
elif ! $RUN_DRY_PUBLISH; then
    skip_step 9 "Cargo publish dry run" "--dry-publish not set"
else
    step 9 "Cargo publish dry run"
    CARGO_DRY=$(cargo publish --dry-run --allow-dirty 2>&1) || {
        echo
        echo "$CARGO_DRY"
        warn_badge
        print_highlighted_matches "$CARGO_DRY"
        if $SHOW_TESTS; then
            echo "$CARGO_DRY"
        fi
        exit 1
    }
    CARGO_WARN=$(echo "$CARGO_DRY" | grep -ci 'warning' || true)
    if [ "$CARGO_WARN" -gt 0 ]; then
        echo -e "${YELLOW}${CARGO_WARN} warning(s)${NC}"
    else
        ok
    fi
    print_highlighted_matches "$CARGO_DRY"
    if $SHOW_TESTS; then
        echo "$CARGO_DRY"
    fi
fi

echo
echo "All steps completed successfully."
