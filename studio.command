#!/bin/bash
# Double-click to open MEC Studio.
cd "$(dirname "$0")" || exit 1
if ! command -v node >/dev/null 2>&1; then
  echo "MEC Studio needs Node.js. Install it from https://nodejs.org and try again."
  read -r -p "Press Return to close."
  exit 1
fi
exec node studio/server.js
