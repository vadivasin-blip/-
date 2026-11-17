#!/usr/bin/env bash
# Сборка Windows-версии на Linux (нужен wine с поддержкой 32-бит: wine + wine32:i386).
# На Windows достаточно `npm run dist:win`.
set -euo pipefail
cd "$(dirname "$0")/.."
export WINEDEBUG=-all
RCEDIT="$HOME/.cache/electron-builder/winCodeSign/winCodeSign-2.6.0/rcedit-x64.exe"
VERSION=$(node -p "require('./package.json').version")

rm -rf release
npm run build:ui
npx electron-builder --win --x64 --dir -c.win.signAndEditExecutable=false
if [ -f "$RCEDIT" ]; then
  wine "$RCEDIT" "release/win-unpacked/Grain.exe" --set-icon build/icon.ico \
    --set-version-string FileDescription Grain --set-version-string ProductName Grain \
    --set-version-string CompanyName Grain --set-file-version "$VERSION" --set-product-version "$VERSION"
fi
npx electron-builder --win portable nsis --x64 --prepackaged release/win-unpacked -c.win.signAndEditExecutable=false
ls -la release/*.exe
