#!/bin/sh
# Builds wordpress/dist/dank-sync.zip, ready to upload in WordPress → Plugins.
#   sh wordpress/dank-sync/tools/build.sh [path to hello-theme-dank]
# 1. copies the account calculation out of the theme (tools/extract-calc.php);
# 2. runs the plugin tests, including the comparison with the real account page;
# 3. zips the plugin without tests and tools.
set -eu
PLUGIN="$(cd "$(dirname "$0")/.." && pwd)"
THEME="${1:-$PLUGIN/../theme-src/hello-theme-dank}"
DIST="$PLUGIN/../dist"

php "$PLUGIN/tools/extract-calc.php" "$THEME"
php "$PLUGIN/tests/core-test.php" > /dev/null
php "$PLUGIN/tests/account-test.php" "$THEME" 2>/dev/null | tail -1

mkdir -p "$DIST"
rm -f "$DIST/dank-sync.zip"
cd "$PLUGIN/.."
zip -qr "$DIST/dank-sync.zip" dank-sync -x 'dank-sync/tests/*' 'dank-sync/tools/*' '*.DS_Store'
echo "built $(cd "$DIST" && pwd)/dank-sync.zip"
