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

On DeepSeek, an image is a flat **384 input tokens** regardless of how much
text it carries (the API resizes to ~800×800 before inference). Measured:

| Route (735 tokens of prose) | Billed input tokens |
|-----------------------------|---------------------|
| Prompt sent as text | ~800 |
| Prompt sent as image (800×800) | ~435 (384 img + ~51 text) |

So ~735 tokens of content → ~435 billed = **~46% input-token saving**, and the
image cap is flat so the ratio improves as you pack more (up to the fidelity
ceiling). Output tokens are unaffected.

## Prereqs

All deps are npm packages (no system tools required). Install at the repo
root: `npm install`. Scripts are Node ESM (`.mjs`), called directly.

| Dependency | Purpose |
|------------|---------|
| `@napi-rs/canvas` | Text → PNG rasterization (prebuilt binaries, OS-independent) |
| `pngjs` | PNG decode (used in tests) |
| bundled `fonts/RobotoMono-Regular.ttf` | Default mono font (Apache-2.0) |

A vision-capable model is needed to read the rendered image. This session's
deepseek provider exposes `deepseek-v4-flash-vision-exp` (add it via
`~/.pi/agent/models.json` — see below). Other vision models (Kimi K3 on
fireworks, Claude, GPT) also work.

## Empirical fidelity (2026-08, deepseek-v4-flash-vision-exp)

**Text-image, 800×800, Roboto Mono pointsize 14**: ~2940 chars (~735 tokens)
at **~90% char fidelity** typical, occasionally near-perfect (~99%) — OCR is
non-deterministic run-to-run. Pointsize ≥ 16 or smaller fonts collapse
fidelity sharply. Code/symbols/identifiers OCR worse than prose.

**Resolution ceiling**: DeepSeek and Kimi K3 both resize images to ~800×800
before inference. Larger canvases do NOT add capacity — they downsample and
fidelity drops (1600px → ~51% on DeepSeek). 800×800 is the sweet spot.

**Honest bottom line**: the channel is *lossy*. ~90% char fidelity means a
735-token prompt has ~70 corrupted chars. Fine for prose/system context where
typos are tolerable; **unsuitable for code, JSON, exact identifiers, or
anything a single wrong symbol breaks.** For those, send text.

## Workflow

1. Write the prompt to a text file.

2. Render:

```bash
node <skill-dir>/scripts/render-text-img.mjs \
  --text-file prompt.txt --out tmp/image-prompt/prompt.png \
  --size 800 --pointsize 14
```

3. Send to a vision model. If the parent model supports images, `read` the
   PNG and act on the transcribed prompt. Otherwise launch a subagent with a
   vision model:

```
subagent agent=worker model=<vision-model-id> task="Read the image at /path/prompt.png. Transcribe all text exactly, then carry out what the transcribed text says."
```

4. On Telegram, `telegram_attach` the PNG if the user wants to see it.

## Tuning knobs

- `--pointsize 14` is the reliable default on 800×800. Higher = fewer chars but
  marginally better OCR; lower collapses OCR.
- `--size 800` matches the model's internal resize. Going larger is pointless.
- `--font <path>` overrides the bundled Roboto Mono (try others for your
  model; fidelity is font-dependent).
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
