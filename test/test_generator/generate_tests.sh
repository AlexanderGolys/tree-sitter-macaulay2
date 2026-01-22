#!/bin/bash

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Project root is two levels up from test/test_generator
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

cd "$PROJECT_ROOT" || exit 1

M2 --script test/test_generator/generate_test.m2

if [ $? -eq 0 ]; then
    :
else
    echo "Error: Macaulay2 script failed."
    exit 1
fi
