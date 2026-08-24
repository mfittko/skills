// Pure text-layout helpers — no I/O, no canvas. Easily unit-testable.

/**
 * Word-wrap text to a column width.
 * - Tabs → 4 spaces.
 * - Existing newlines are preserved as hard breaks.
 * - Words longer than `cols` are hard-broken across lines (max packing).
 * - Empty input → single empty string.
 *
 * @param {string} text
 * @param {number} cols  max chars per line (>=1)
 * @returns {string} wrapped text joined by "\n"
 */
export function wrapText(text, cols) {
  if (cols < 1) cols = 1;
  const clean = String(text).replace(/\t/g, "    ");
  const out = [];
  for (const para of clean.split("\n")) {
    if (para === "") { out.push(""); continue; }
    // pre-break long tokens so they fit (preserve empty tokens = spaces)
    const tokens = [];
    for (const w of para.split(" ")) {
      if (w.length === 0) { tokens.push(""); continue; }
      for (let i = 0; i < w.length; i += cols) tokens.push(w.slice(i, i + cols));
    }
    let line = "", cur = 0;
    for (const w of tokens) {
      const chunk = cur === 0 ? w : " " + w;
      if (cur + chunk.length <= cols) { line += chunk; cur += chunk.length; }
      else { out.push(line); line = w; cur = w.length; }
    }
    out.push(line);
  }
  return out.join("\n");
}

/**
 * Compute grid capacity for a square canvas.
 * @param {number} size     canvas side in px
 * @param {number} charWidth   px advance per glyph
 * @param {number} lineHeight  px line height
 * @returns {{cols:number, rows:number, chars:number}}
 */
export function capacity(size, charWidth, lineHeight) {
  const cols = Math.max(1, Math.floor(size / charWidth));
  const rows = Math.max(1, Math.floor(size / lineHeight));
  return { cols, rows, chars: cols * rows };
}

/**
 * Truncate wrapped text to at most `rows` lines.
 */
export function trimToRows(wrapped, rows) {
  return wrapped.split("\n").slice(0, rows).join("\n");
}
