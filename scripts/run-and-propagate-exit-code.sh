#!/usr/bin/env bash
set -u

"$@"
suite_exit=$?
echo "SUITE_EXIT=$suite_exit"
exit "$suite_exit"
