set -e

export DISPLAY="${DISPLAY:-:1}"

cd /twitter_api_safe_proxy/packages/server

(
	until curl -sf http://127.0.0.1:3000/ >/dev/null 2>&1; do
		sleep 1
	done
	/opt/google/chrome/chrome --no-first-run --no-default-browser-check "http://127.0.0.1:3000/"
) &

exec node dist/debug/server.js
