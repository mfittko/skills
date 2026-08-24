#!/usr/bin/env bash
# Render text into a fixed-size PNG canvas using a compact monospace font.
# Maximises character density while keeping text OCR-readable by vision models.
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  render-text-img.sh --text-file <input.txt> --out <out.png> [--size 800] [--pointsize 14] [--font <path>]

Environment:
  PI_TEXT_IMG_SIZE       canvas px (default: 800)
  PI_TEXT_IMG_POINTSIZE  font pointsize (default: 14)
  PI_TEXT_IMG_FONT       ttf path (default: /System/Library/Fonts/Supplemental/Andale Mono.ttf)

Notes:
  Needs ImageMagick (magick).
  800x800 @ pointsize 14 ≈ 2940 chars (~735 tokens) at ~99% OCR fidelity.
  Larger sizes do not help: vision models resize to ~800x800 internally.
EOF
}

TEXT_FILE=""
OUT=""
SIZE="${PI_TEXT_IMG_SIZE:-800}"
POINT="${PI_TEXT_IMG_POINTSIZE:-14}"
FONT="${PI_TEXT_IMG_FONT:-/System/Library/Fonts/Supplemental/Andale Mono.ttf}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --text-file) TEXT_FILE="${2:-}"; shift 2 ;;
    --out) OUT="${2:-}"; shift 2 ;;
    --size) SIZE="${2:-800}"; shift 2 ;;
    --pointsize) POINT="${2:-12}"; shift 2 ;;
    --font) FONT="${2:-}"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "unknown arg: $1" >&2; usage; exit 2 ;;
  esac
done

[[ -n "$OUT" && -n "$TEXT_FILE" ]] || { usage; exit 2; }
command -v magick >/dev/null || { echo "magick not found. brew install imagemagick" >&2; exit 3; }
[[ -f "$FONT" ]] || { echo "font not found: $FONT" >&2; exit 3; }
mkdir -p "$(dirname "$OUT")"

python3 - "$TEXT_FILE" "$OUT" "$SIZE" "$POINT" "$FONT" <<'PY'
import sys, subprocess, os, tempfile
text_file, out, size, point, font = sys.argv[1:6]
size=int(size); point=int(point)
text = open(text_file, encoding="utf-8", errors="replace").read().replace("\t","    ")

# Andale Mono advance width ~0.6em; line height ~1.2em.
advance = point*0.60
line_h   = point*1.20
cols = max(1, int(size//advance))
rows = max(1, int(size//line_h))

# Word-wrap to cols, preserving explicit newlines as hard breaks.
lines=[]
for para in text.split("\n"):
    if para=="":
        lines.append(""); continue
    w=[]; cur=0
    for word in para.split(" "):
        chunk = word if cur==0 else " "+word
        if cur+len(chunk)<=cols:
            w.append(chunk); cur+=len(chunk)
        else:
            lines.append("".join(w)); w=[word]; cur=len(word)
    lines.append("".join(w))
lines=lines[:rows]
wrapped="\n".join(lines)

with tempfile.NamedTemporaryFile("w",suffix=".txt",delete=False,encoding="utf-8") as tf:
    tf.write(wrapped); tmp=tf.name
subprocess.run(["magick","-size",f"{size}x{size}","xc:white",
    "-font",font,"-pointsize",str(point),
    "-fill","black","-gravity","northwest","-annotate",f"+2+2",f"@{tmp}",out],check=True)
os.unlink(tmp)
print(f"{out}\tcols={cols} rows={rows} chars={len(wrapped)} point={point}")
PY
