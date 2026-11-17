#!/bin/sh
# Stamp a new app version. Run before every commit that changes the app, so
# phones notice the update: index.html carries the version and puts it on every
# asset URL, and version.json is what a running app polls to see if it is stale.
cd "$(dirname "$0")/.." || exit 1
V=$(date +%Y.%m.%d.%H%M)
sed -i '' -E "s/window\.APP_VERSION='[^']*'/window.APP_VERSION='$V'/; s/\?v=[0-9.]+/?v=$V/g" index.html
printf '{"v":"%s"}\n' "$V" > version.json
echo "version $V"
