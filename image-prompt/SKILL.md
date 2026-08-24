---
name: image-prompt
description: Render a text prompt into an image (printed text, or QR as a novelty) and send it to a vision-capable model so the model reads the prompt from pixels instead of receiving it as text. Use when the user asks to send a prompt via image, encode a prompt as pixels, steganographic prompt transport, test whether a model can read a QR code, or mentions "image prompt" or "pixel prompt".
allowed-tools: bash read subagent telegram_attach write
---

# Image Prompt

Encode a prompt as image pixels and have a vision model read it back and act on
it. The prompt text is NOT sent as text in the request body — only as pixels.

Two modes:

1. **Text-image (works)** — render the prompt as printed text in a PNG. Vision
   models OCR this near-perfectly. This is the reliable channel.
2. **QR code (novelty, does not work)** — render the prompt as a QR code.
   Vision models cannot decode QR from pixels and hallucinate plausible text.
   Kept as a robustness probe only.

## When to apply

- "send this prompt via image / pixels"
- "encode a prompt so it isn't in the request as text"
- "steganographic prompt transport"
- "can the model read a QR code?"
- "image prompt: <text>" / "pixel prompt: <text>"

## Why

The prompt is absent from the request body as text — it exists only as image
pixels. This is useful for obfuscation / steganography / robustness probing,
not for capacity (text is always more token-efficient than an image of text).

## Prereqs

- `qrencode` (QR render): `brew install qrencode`
- `zbar` (QR decode / local verify): `brew install zbar`
- ImageMagick (text render): `brew install imagemagick`
- A vision-capable model. This session's deepseek provider has
  `deepseek-v4-flash-vision-exp` available (image input). Other vision models
  (Kimi K3 on fireworks, Claude, GPT) also work.

## Empirical limits (2026-08)

Tested against `deepseek-v4-flash-vision-exp` and `kimi-k3`:

- **Text-image, 800×800, pointsize 14, Andale Mono**: ~2940 chars (~735
  tokens) at **99.98% fidelity**; ~3600 chars (~900 tokens) at ~87%.
- **Resolution ceiling**: both DeepSeek and Kimi K3 resize images to ~800×800
  before inference. Larger canvases do NOT add capacity — they get downsampled
  and fidelity drops (1600px → ~51% on DeepSeek). 800×800 is the sweet spot.
- **Smaller fonts collapse past pointsize 12**: point 10 → ~38%, point 8 →
  ~27%. The vision encoder cannot resolve the glyphs.
- **QR codes**: ~0% fidelity regardless of size, density, or error correction.
  The model returns plausible-looking but wrong text (e.g. `HELLO` →
  `Hello, World!`). Do not use QR as a prompt transport.

## Workflow

### Text-image mode (recommended)

1. Write the prompt to a text file.

2. Render:

```bash
bash <skill-dir>/scripts/render-text-img.sh --text-file prompt.txt --out tmp/image-prompt/prompt.png --pointsize 14 --size 800
```

3. Send to a vision model. If the parent model supports images, `read` the
   PNG and act on the transcribed prompt. Otherwise launch a subagent with a
   vision model:

```
subagent agent=worker model=<vision-model-id> task="Read the image at /path/prompt.png. Transcribe all text exactly, then carry out what the transcribed text says."
```

4. On Telegram, `telegram_attach` the PNG if the user wants to see it.

### QR mode (novelty only — expect failure)

```bash
bash <skill-dir>/scripts/render-qr.sh --text "short prompt" --out tmp/image-prompt/qr.png --size 12
bash <skill-dir>/scripts/decode-qr.sh tmp/image-prompt/qr.png   # local verify only
```

## Tuning knobs

- `--pointsize 14` is the reliable maximum on 800×800. Drop to 12 only if you
  need ~600 more chars and can accept ~92% fidelity.
- `--size 800` matches the model's internal resize. Going larger is pointless.
- Long lines are word-wrapped to column width automatically.

## Scripts

- `scripts/render-text-img.sh` — text file → PNG canvas (ImageMagick). The
  working channel.
- `scripts/render-qr.sh` — text/file → QR PNG (`qrencode`). Novelty.
- `scripts/decode-qr.sh` — PNG → text (`zbarimg`). Local QR verification only;
  never rely on the model for this.
