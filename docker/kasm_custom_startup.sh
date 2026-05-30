set -e

export DISPLAY="${DISPLAY:-:1}"

rm -f /home/kasm-user/.config/google-chrome/Singleton*

cd /twitter_api_safe_proxy/packages/server

exec node dist/debug/server.js
