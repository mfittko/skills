#!/usr/bin/env node
/**
 * Render a text file into a square PNG canvas using a compact monospace font.
 * OS-independent: uses @napi-rs/canvas (prebuilt binaries) + bundled TTF.
 *
 * Usage:
 *   node render-text-img.mjs --text-file prompt.txt --out out.png \
 *       [--size 800] [--pointsize 14] [--font path/to.ttf] [--margin 2]
 *
 * Output: writes PNG, prints `out.png\tcols=N rows=N chars=N point=P` to stdout.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createCanvas, GlobalFonts } from "@napi-rs/canvas";
import { wrapText, capacity, trimToRows } from "../lib/layout.mjs";

// ponytail: a QR-code mode was tried here and removed — vision models cannot
// decode QR from pixels (~0% fidelity, they hallucinate). Printed text works
// because models OCR glyphs. Don't re-add QR as a transport.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_FONT = path.join(__dirname, "..", "fonts", "RobotoMono-Regular.ttf");

// ponytail: default pointsize 12 — verified best on Kimi K3 (100% fidelity, ~1508 tokens
// in a flat 384-image-token slot). DeepSeek vision is noisier; see SKILL.md.
function parseArgs(argv) {
  const a = { textFile: "", out: "", size: 800, point: 12, font: DEFAULT_FONT, margin: 2 };
  for (let i = 2; i < argv.length; i++) {
    switch (argv[i]) {
      case "--text-file": a.textFile = argv[++i]; break;
      case "--out": a.out = argv[++i]; break;
      case "--size": a.size = parseInt(argv[++i], 10); break;
      case "--pointsize": a.point = parseInt(argv[++i], 10); break;
      case "--font": a.font = argv[++i]; break;
      case "--margin": a.margin = parseInt(argv[++i], 10); break;
      case "-h": case "--help": a.help = true; break;
      default: throw new Error(`unknown arg: ${argv[i]}`);
    }
  }
  return a;
}

const HELP = `Usage: render-text-img.mjs --text-file <in.txt> --out <out.png> [--size 800] [--pointsize 12] [--font ttf] [--margin 2]
Default font: bundled RobotoMono-Regular.ttf (Apache-2.0).
`;

export async function renderTextImage({ text, size, point, fontPath, margin }) {
  if (!GlobalFonts.has("RobotoMono")) {
    const buf = await fs.readFile(fontPath);
    GlobalFonts.register(buf, "RobotoMono");
  }
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = "#000000";
  ctx.font = `${point}px "RobotoMono"`;
  ctx.textBaseline = "top";

  // Measure advance width of a representative mono glyph.
  const charWidth = ctx.measureText("M").width;
  const lineHeight = Math.round(point * 1.2);
  const { cols, rows } = capacity(size - margin * 2, charWidth, lineHeight);

  const wrapped = trimToRows(wrapText(text, cols), rows);
  const lines = wrapped.split("\n");
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], margin, margin + i * lineHeight);
  }
  const png = canvas.toBuffer("image/png");
  return { png, cols, rows, chars: wrapped.length, point, size };
}

async function main() {
  const a = parseArgs(process.argv);
  if (a.help || !a.out || !a.textFile) { process.stdout.write(HELP); process.exit(a.help ? 0 : 2); }
  const text = await fs.readFile(a.textFile, "utf8");
  const res = await renderTextImage({
    text, size: a.size, point: a.point, fontPath: a.font, margin: a.margin,
  });
  await fs.mkdir(path.dirname(a.out) || ".", { recursive: true });
  await fs.writeFile(a.out, res.png);
  process.stdout.write(`${a.out}\tcols=${res.cols} rows=${res.rows} chars=${res.chars} point=${res.point}\n`);
}

// skip main when imported as a module (tests)
const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) await main();
