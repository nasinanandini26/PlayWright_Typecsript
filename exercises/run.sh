#!/usr/bin/env bash
# Convenience runner for the exercises/ practice modules.
#
# Usage:
#   ./exercises/run.sh 1                          # run module 1's validation only
#   ./exercises/run.sh 3 --test-name-pattern foo   # extra args pass straight through to `node --test`
#   ./exercises/run.sh all                         # run every module's validation, in order
#   HEADLESS=false ./exercises/run.sh 1            # modules 1 & 3 only: show the browser window
#
# Each module is really just:
#   node --require ts-node/register --test <that module's *.test.ts>
# This script exists so you don't have to remember the paths.
#
# Written for the macOS default /bin/bash (3.2) — no associative arrays.
set -euo pipefail
cd "$(dirname "$0")/.."

module_test_file() {
  case "$1" in
    1) echo "exercises/module-01-playwright-basics/ts/PlaywrightBasicsExercise.test.ts" ;;
    2) echo "exercises/module-02-bdd-cucumber/ts/CartSteps.test.ts" ;;
    3) echo "exercises/module-03-page-object-model/ts/BurgerMenuPage.test.ts" ;;
    4) echo "exercises/module-04-data-driven-testing/ts/DiscountExercise.test.ts" ;;
    5) echo "exercises/module-05-project-configuration/ts/ExerciseConfigReader.test.ts" ;;
    *) echo "" ;;
  esac
}

arg="${1:-}"
if [[ -z "$arg" ]]; then
  echo "Usage: $0 <1|2|3|4|5|all> [extra 'node --test' args]"
  exit 1
fi
shift

if [[ "$arg" == "all" ]]; then
  files=()
  for module in 1 2 3 4 5; do
    files+=("$(module_test_file "$module")")
  done
  exec node --require ts-node/register --test "${files[@]}" "$@"
fi

test_file="$(module_test_file "$arg")"
if [[ -z "$test_file" ]]; then
  echo "Unknown module '$arg'. Valid values: 1 2 3 4 5 all"
  exit 1
fi
exec node --require ts-node/register --test "$test_file" "$@"
