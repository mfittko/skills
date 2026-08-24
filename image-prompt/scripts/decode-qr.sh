#!/usr/bin/env bash
# Decode a QR code image back to text, using zbarimg.
# Used to verify a rendered QR round-trips, and as a local fallback.
set -euo pipefail

usage() { echo "Usage: decode-qr.sh <image.png>"; }

[[ $# -ge 1 ]] || { usage; exit 2; }
command -v zbarimg >/dev/null || { echo "zbarimg not found. brew install zbar" >&2; exit 3; }

# zbarimg prints "QR-Code:<text>"; strip the prefix.
zbarimg --quiet --raw "$1"
