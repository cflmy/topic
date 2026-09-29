#!/usr/bin/env bash
# 横版原图 → 竖版：裁左右条带拼接，再 cover 缩放到目标尺寸（无填色、无内缘切削）
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC_DIR="$ROOT/img/templates/source"
OUT_DIR="$ROOT/img/templates"
PORTRAIT_W=1200
PORTRAIT_H=1697
LANDSCAPE_W=1697
LANDSCAPE_H=1200
QUALITY=88

stitch_portrait() {
  local src="$1" out="$2" wing_ratio="$3"
  local W H WW
  W=$(identify -format '%w' "$src")
  H=$(identify -format '%h' "$src")
  WW=$(python3 -c "print(max(1, int($W * $wing_ratio)))")

  convert "$src" \
    \( -clone 0 -crop "${WW}x${H}+0+0" +repage \) \
    \( -clone 0 -crop "${WW}x${H}+$((W - WW))+0" +repage \) \
    -delete 0 +append \
    -resize "${PORTRAIT_W}x${PORTRAIT_H}^" \
    -gravity center -extent "${PORTRAIT_W}x${PORTRAIT_H}" \
    -quality "$QUALITY" -strip "$out"

  echo "  portrait  $(basename "$out") wing=${wing_ratio} ($(identify -format '%wx%h %b' "$out"))"
}

landscape_one() {
  local src="$1" out="$2"
  convert "$src" \
    -resize "${LANDSCAPE_W}x${LANDSCAPE_H}^" \
    -gravity center -extent "${LANDSCAPE_W}x${LANDSCAPE_H}" \
    -quality "$QUALITY" -strip "$out"
  echo "  landscape $(basename "$out") ($(identify -format '%wx%h %b' "$out"))"
}

build_pair() {
  local base="$1" wing="$2"
  stitch_portrait "$SRC_DIR/${base}.png" "$OUT_DIR/${base}.jpg" "$wing"
  landscape_one "$SRC_DIR/${base}.png" "$OUT_DIR/${base}-landscape.jpg"
}

mkdir -p "$SRC_DIR" "$OUT_DIR"

echo "Building portrait (stitch + cover) + landscape templates..."

build_pair rose-garden  0.30
build_pair blush-lace   0.30
build_pair cream-floral 0.28
build_pair xuan-paper   0.26
build_pair ink-wash     0.30

echo "Done."
