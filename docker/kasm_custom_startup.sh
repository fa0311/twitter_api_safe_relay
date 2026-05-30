set -e

rm -f /twitter_api_safe_proxy/user_data/*/Singleton*

cd /twitter_api_safe_proxy/packages/server

exec node dist/debug/server.js
