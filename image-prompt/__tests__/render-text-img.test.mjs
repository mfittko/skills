import { PNG } from "pngjs";
import { renderTextImage } from "../scripts/render-text-img.mjs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FONT = path.join(__dirname, "..", "fonts", "RobotoMono-Regular.ttf");

describe("renderTextImage", () => {
  test("produces a PNG of the requested square size", async () => {
    const { png, cols, rows } = await renderTextImage({
      text: "hello world", size: 200, point: 14, fontPath: FONT, margin: 2,
    });
    const img = PNG.sync.read(png);
    expect(img.width).toBe(200);
    expect(img.height).toBe(200);
    expect(cols).toBeGreaterThan(0);
    expect(rows).toBeGreaterThan(0);
  });

  test("output is not blank (contains dark pixels)", async () => {
    const { png } = await renderTextImage({
      text: "The quick brown fox", size: 200, point: 14, fontPath: FONT, margin: 2,
    });
    const img = PNG.sync.read(png);
    let dark = 0;
    for (let i = 0; i < img.data.length; i += 4) {
      const r = img.data[i], g = img.data[i + 1], b = img.data[i + 2];
      if (r < 128 && g < 128 && b < 128) dark++;
    }
    expect(dark).toBeGreaterThan(50);
  });

  test("respecting cols fits within canvas width", async () => {
    const text = "x".repeat(5000);
    const { png, cols } = await renderTextImage({
      text, size: 400, point: 14, fontPath: FONT, margin: 2,
    });
    expect(cols).toBeLessThanOrEqual(400);
    const img = PNG.sync.read(png);
    expect(img.width).toBe(400);
  });
});
