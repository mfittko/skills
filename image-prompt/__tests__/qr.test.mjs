import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { renderQr } from "../scripts/render-qr.mjs";
import { decodeQr } from "../scripts/decode-qr.mjs";

let tmp;
beforeEach(async () => { tmp = await fs.mkdtemp(path.join(os.tmpdir(), "ip-qr-")); });
afterEach(async () => { await fs.rm(tmp, { recursive: true, force: true }); });

describe("QR render → decode round-trip", () => {
  test("short ascii round-trips exactly", async () => {
    const text = "What is 17 times 23? Reply with just the number.";
    const png = await renderQr(text, { size: 12, level: "M" });
    const out = path.join(tmp, "qr.png");
    await fs.writeFile(out, png);
    const decoded = await decodeQr(await fs.readFile(out));
    expect(decoded).toBe(text);
  });

  test("unicode round-trips", async () => {
    const text = "密码学测试 — encryption + 加密";
    const png = await renderQr(text, { size: 16, level: "H" });
    expect(await decodeQr(png)).toBe(text);
  });

  test("file-based render round-trips", async () => {
    const text = "https://github.com/mfittko/pi-skills PR #2";
    const png = await renderQr(text);
    const out = path.join(tmp, "qr2.png");
    await fs.writeFile(out, png);
    expect(await decodeQr(await fs.readFile(out))).toBe(text);
  });
});
