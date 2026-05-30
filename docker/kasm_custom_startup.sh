set -e

export DISPLAY="${DISPLAY:-:1}"

cd /twitter_api_safe_proxy/packages/server

exec node dist/debug/server.js
