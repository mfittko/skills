#!/usr/bin/env node
/**
 * Render text (or a file) into a QR code PNG.
 * OS-independent: uses the pure-JS `qrcode` package.
 *
 * Usage:
 *   node render-qr.mjs --text "prompt" --out out.png [--size 12] [--level M]
 *   node render-qr.mjs --text-file in.txt --out out.png
 */
import fs from "node:fs/promises";
import path from "node:path";
import QRCode from "qrcode";

function parseArgs(argv) {
  const a = { text: "", textFile: "", out: "", size: 12, level: "M" };
  for (let i = 2; i < argv.length; i++) {
    switch (argv[i]) {
      case "--text": a.text = argv[++i]; break;
      case "--text-file": a.textFile = argv[++i]; break;
      case "--out": a.out = argv[++i]; break;
      case "--size": a.size = parseInt(argv[++i], 10); break;
      case "--level": a.level = argv[++i]; break;
      case "-h": case "--help": a.help = true; break;
      default: throw new Error(`unknown arg: ${argv[i]}`);
    }
  }
  return a;
}

const HELP = `Usage: render-qr.mjs --text "str" --out out.png [--size 12] [--level L|M|Q|H]
       render-qr.mjs --text-file in.txt --out out.png
`;

export async function renderQr(text, { size = 12, level = "M" } = {}) {
  return QRCode.toBuffer(text, {
    errorCorrectionLevel: level,
    margin: 1,
    width: size * 80, // pixel width of the output PNG
    color: { dark: "#000000", light: "#ffffff" },
  });
}

async function main() {
  const a = parseArgs(process.argv);
  if (a.help || !a.out || (!a.text && !a.textFile)) { process.stdout.write(HELP); process.exit(a.help ? 0 : 2); }
  const text = a.textFile ? await fs.readFile(a.textFile, "utf8") : a.text;
  const png = await renderQr(text, { size: a.size, level: a.level });
  await fs.mkdir(path.dirname(a.out) || ".", { recursive: true });
  await fs.writeFile(a.out, png);
  process.stdout.write(`${a.out}\n`);
}

import { fileURLToPath } from "node:url";
const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) await main();
