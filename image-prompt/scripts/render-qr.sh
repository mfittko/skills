#!/usr/bin/env bash
# Render text (or a file) into a QR code PNG.
# Lazy: qrencode CLI does it all. No python, no deps.
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  render-qr.sh --text "prompt string" --out <out.png> [--size 10]
  render-qr.sh --text-file <input.txt> --out <out.png> [--size 10]

Environment:
  PI_QR_SIZE   default module pixel size (default: 10)

Notes:
  Outputs a PNG. Large prompts lower error correction; keep prompts short.
  If qrencode is missing: brew install qrencode
EOF
}

TEXT=""
TEXT_FILE=""
OUT=""
SIZE="${PI_QR_SIZE:-10}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --text) TEXT="${2:-}"; shift 2 ;;
    --text-file) TEXT_FILE="${2:-}"; shift 2 ;;
    --out) OUT="${2:-}"; shift 2 ;;
    --size) SIZE="${2:-10}"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "unknown arg: $1" >&2; usage; exit 2 ;;
  esac
done

if [[ -z "$OUT" ]]; then echo "--out required" >&2; usage; exit 2; fi
if [[ -z "$TEXT" && -z "$TEXT_FILE" ]]; then echo "--text or --text-file required" >&2; usage; exit 2; fi
command -v qrencode >/dev/null || { echo "qrencode not found. brew install qrencode" >&2; exit 3; }

mkdir -p "$(dirname "$OUT")"

if [[ -n "$TEXT_FILE" ]]; then
  qrencode -o "$OUT" -s "$SIZE" -l M -8 < "$TEXT_FILE"
else
  qrencode -o "$OUT" -s "$SIZE" -l M -8 "$TEXT"
fi

echo "$OUT"
