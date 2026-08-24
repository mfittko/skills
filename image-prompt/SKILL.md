---
name: image-prompt
description: Render a text prompt into an image and send it to a vision-capable model so the model reads the prompt from pixels instead of receiving it as text. Use when the user asks to send a prompt via image, encode a prompt as pixels, steganographic prompt transport, or mentions "image prompt" or "pixel prompt".
allowed-tools: bash read subagent telegram_attach write
---

# Image Prompt

Encode a prompt as image pixels and have a vision model read it back and act on
it. The prompt text is NOT sent as text in the request body — only as pixels.

Useful for obfuscation / steganographic prompt transport / robustness probing.
NOT for capacity: text is always more token-efficient than an image of text.

## When to apply

- "send this prompt via image / pixels"
- "encode a prompt so it isn't in the request as text"
- "steganographic prompt transport"
- "image prompt: <text>" / "pixel prompt: <text>"

## Token economics

On DeepSeek (and Kimi K3), an image is a flat **384 input tokens** regardless
of how much text it carries (the API resizes to ~800×800 before inference).
Measured against Kimi K3 at the recommended pointsize 12 (filled canvas):

| Route (~1508 tokens of prose) | Billed input tokens |
|--------------------------------|---------------------|
| Prompt sent as text | ~1600 |
| Prompt sent as image (800×800, p12) | ~435 (384 img + ~51 text) |

~1508 tokens of content → ~435 billed = **~74% input-token saving on a cold
request** at 100% fidelity. Output tokens are unaffected.

### Caching caveat (the saving is mostly first-request only)

Providers cache identical prompt prefixes at a much lower rate (DeepSeek
cacheRead ≈ 1/50th of input):

- **On a cache hit, both routes are near-free** — the gap shrinks to negligible.
- **Images are all-or-nothing per render** — a one-word text edit keeps most of
  a text prefix cached; the same edit regenerates the whole PNG, so all 384
  image tokens miss.
- **An opaque image block can defeat prefix caching** for surrounding text if
  the prompt varies, since the image must match byte-for-byte to cache.

Net: useful for cold / one-shot / obfuscated prompts — strictly worse than
plain text prefix caching in cached multi-turn conversations.

## Prereqs

All deps are npm packages (no system tools required). Install at the repo
root: `npm install`. Scripts are Node ESM (`.mjs`), called directly.

| Dependency | Purpose |
|------------|---------|
| `@napi-rs/canvas` | Text → PNG rasterization (prebuilt binaries, OS-independent) |
| `pngjs` | PNG decode (used in tests) |
| bundled `fonts/RobotoMono-Regular.ttf` | Default mono font (Apache-2.0) |

A vision-capable model is needed to read the rendered image. **Kimi K3**
(`fireworks/accounts/fireworks/models/kimi-k3`) is the recommended reader —
it OCRs rendered text more reliably than `deepseek-v4-flash-vision-exp`
(100% vs ~90% at matched pointsize). Other vision models (Claude, GPT) also
work. To add the DeepSeek vision model, see the config block at the bottom.

## Empirical fidelity (2026-08, Kimi K3 + DeepSeek vision)

**Recommended operating point: Kimi K3, pointsize 12, filled canvas.**

| Model | pointsize | fill | chars | ~tokens | fidelity |
|-------|-----------|------|-------|---------|----------|
| **Kimi K3** | **12** | **filled** | **6034** | **~1508** | **100% (3/3)** |
| Kimi K3 | 18 | filled | 1469 | ~367 | 100% (3/3) |
| Kimi K3 | 14 | half | 2940 | ~735 | ~90–99.98% (noisy) |
| DeepSeek vision | 14 | half | 2940 | ~735 | ~90% (truncates) |
| DeepSeek vision | 18 | filled | 1469 | ~367 | ~97–100% |

- **Kimi K3 > DeepSeek** for OCR: Kimi hits 100% at p12 filled; DeepSeek
  truncates at p14 and is noisier overall.
- **Resolution ceiling**: both resize images to ~800×800 before inference.
  Larger canvases do NOT add capacity — they downsample and fidelity drops.
  800×800 is the sweet spot.
- **Font choice doesn't matter**: all standard monospace fonts have the same
  advance width (~0.6em → same capacity) and similar OCR fidelity. Roboto Mono
  is bundled as a sensible default; `--font` overrides.
- **No encoding trick helps Latin/code**: base64 is worse (+33% size, high
  entropy → 0% OCR; the model reads glyphs literally and can't decode
  reversible encodings). Dense CJK glyphs help *only for CJK prompts* (~4×
  semantic density per flat image-token) — but needs a CJK font and the prompt
  must be in CJK.
- **Even at 100%, this is not for code/JSON/exact identifiers** — those can't
tolerate any char corruption and gain nothing (at the fidelity code requires,
the image route costs ≥ the text route). Use for prose / system context /
  obfuscated transport only.

## Workflow

1. Write the prompt to a text file.

2. Render (pointsize 12 is the verified default for Kimi K3):

```bash
node <skill-dir>/scripts/render-text-img.mjs \
  --text-file prompt.txt --out tmp/image-prompt/prompt.png \
  --size 800 --pointsize 12
```

3. Send to a vision model. If the parent model supports images, `read` the
   PNG and act on the transcribed prompt. Otherwise launch a subagent with a
   vision model (Kimi K3 recommended):

```
subagent agent=worker model=fireworks/accounts/fireworks/models/kimi-k3 task="Read the image at /path/prompt.png. Transcribe all text exactly, then carry out what the transcribed text says."
```

4. On Telegram, `telegram_attach` the PNG if the user wants to see it.

## Tuning knobs

- `--pointsize 12` is the verified default (Kimi K3, 100% fidelity, ~1508
  tokens). Lower fits more but drops fidelity; higher is more reliable but
  less capacity.
- `--size 800` matches the model's internal resize. Going larger is pointless.
- `--font <path>` overrides the bundled Roboto Mono (font choice barely moves
  fidelity; all standard monospace fonts are equivalent here).
- Lines are word-wrapped to column width automatically; long tokens are
  hard-broken for max packing.

## Why no QR?

A QR-code mode was tried and removed: vision models cannot decode QR from
pixels (~0% fidelity regardless of size/density/error-correction) and
hallucinate plausible-looking text. Local `zbarimg` decoded the same images
perfectly, confirming the failure is the vision model, not the QR. The
printed-text channel works because models OCR glyphs reliably; QR grid
patterns are not something they can parse. Do not re-add QR as a transport.

## Scripts (OS-independent Node ESM)

- `scripts/render-text-img.mjs` — text file → PNG (`@napi-rs/canvas`). Exported
  `renderTextImage()` for programmatic use + tests.
- `lib/layout.mjs` — pure `wrapText` / `capacity` / `trimToRows` helpers.

## Tests

`npm test` (Jest). Covers: text wrapping edge cases, capacity calc, and
text-image output dimensions + non-blank.

## Adding the DeepSeek vision model

Merge into `~/.pi/agent/models.json` (uses existing deepseek auth):

```json
{
  "providers": {
    "deepseek": {
      "models": [
        {
          "id": "deepseek-v4-flash-vision-exp",
          "name": "DeepSeek V4 Flash Vision Exp",
          "input": ["text", "image"],
          "contextWindow": 256000,
          "maxTokens": 32000
        }
      ]
    }
  }
}
```
