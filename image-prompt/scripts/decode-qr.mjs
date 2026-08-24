#!/usr/bin/env node
/**
 * Decode a QR code PNG back to text.
 * OS-independent: uses pure-JS `pngjs` + `jsqr`.
 *
 * Usage: node decode-qr.mjs <image.png>
 */
import fs from "node:fs/promises";
import { PNG } from "pngjs";
import jsQR from "jsqr";

export async function decodeQr(pngBuffer) {
  const png = PNG.sync.read(pngBuffer);
  const res = jsQR(png.data, png.width, png.height);
  if (!res) throw new Error("no QR code found in image");
  return res.data;
}

async function main() {
  const file = process.argv[2];
  if (!file) { process.stderr.write("Usage: decode-qr.mjs <image.png>\n"); process.exit(2); }
  const buf = await fs.readFile(file);
  process.stdout.write(await decodeQr(buf));
  process.stdout.write("\n");
}

import { fileURLToPath } from "node:url";
import path from "node:path";
const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) await main();
