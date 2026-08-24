import { wrapText, capacity, trimToRows } from "../lib/layout.mjs";

describe("wrapText", () => {
  test("wraps a line that exceeds cols", () => {
    const out = wrapText("hello world foo bar", 10);
    // each line <= 10 chars
    for (const line of out.split("\n")) expect(line.length).toBeLessThanOrEqual(10);
    expect(out).toContain("hello");
    expect(out).toContain("world");
  });

  test("preserves explicit newlines as hard breaks", () => {
    expect(wrapText("a\nb\nc", 100)).toBe("a\nb\nc");
  });

  test("preserves empty lines", () => {
    expect(wrapText("a\n\nb", 100)).toBe("a\n\nb");
  });

  test("expands tabs to 4 spaces", () => {
    expect(wrapText("a\tb", 100)).toBe("a    b");
  });

  test("hard-breaks a single token longer than cols", () => {
    const out = wrapText("abcdefghijklmnopqrstuvwxyz", 5);
    expect(out).toBe("abcde\nfghij\nklmno\npqrst\nuvwxy\nz");
  });

  test("cols < 1 is clamped to 1", () => {
    const out = wrapText("abc", 0);
    expect(out).toBe("a\nb\nc");
  });
});

describe("capacity", () => {
  test("computes cols and rows for a square canvas", () => {
    const c = capacity(800, 8.4, 17);
    expect(c.cols).toBe(Math.floor(800 / 8.4));
    expect(c.rows).toBe(Math.floor(800 / 17));
    expect(c.chars).toBe(c.cols * c.rows);
  });

  test("clamps to at least 1x1 on tiny canvases", () => {
    const c = capacity(1, 100, 100);
    expect(c.cols).toBe(1);
    expect(c.rows).toBe(1);
  });
});

describe("trimToRows", () => {
  test("truncates to the given number of lines", () => {
    expect(trimToRows("a\nb\nc\nd", 2)).toBe("a\nb");
  });
  test("no-op when under the limit", () => {
    expect(trimToRows("a\nb", 5)).toBe("a\nb");
  });
});
