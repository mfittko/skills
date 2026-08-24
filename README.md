# ∏ skills

Personal, opinionated collection of [Pi](https://github.com/earendil-works/pi) agent skills. No warranty given.

## Installation

Install as a Pi package (recommended):

```bash
# From GitHub
pi install git:github.com/mfittko/pi-skills

# Or project-local
pi install -l git:github.com/mfittko/pi-skills
```

Update to latest:

```bash
pi update git:github.com/mfittko/pi-skills
```

Filter to load only specific skills:

```json
{
  "packages": [
    {
      "source": "git:github.com/mfittko/pi-skills",
      "skills": ["presentation-builder"]
    }
  ]
}
```

## Requirements

### presentation-builder

| Dependency | Purpose |
|-----------|---------|
| [pi-subagents](https://www.npmjs.com/package/pi-subagents) extension | Parallel variant generation and review passes via async workers |
| [Slidev](https://sli.dev) (`@slidev/cli`) | Deck rendering and dev server |
| [Playwright](https://playwright.dev) (`playwright-chromium`) | Automated screenshot capture for visual review |
| Node.js 20+ | Runtime for Slidev and capture scripts |

Install the pi-subagents extension:
```bash
pi extensions add pi-subagents
```

Install deck tooling in your project (or use the template `package.json`):
```bash
npm install -D @slidev/cli @slidev/theme-default playwright-chromium
npx playwright install chromium
```

### audio-note

| Dependency | Purpose |
|-----------|----------|
| [pi-telegram](https://github.com/mfittko/pi-telegram) bridge | Native voice-note delivery (optional) |
| `telegram-tts-kokoro` or `telegram-tts-local` | High-quality TTS backend (optional) |
| `say` + `ffmpeg` | macOS fallback TTS pipeline |

The skill works without Telegram — it can generate `.ogg`/`.m4a` files locally using macOS `say` + `ffmpeg` as a fallback.

### image-prompt

| Dependency | Purpose |
|----------|---------|
| [`@napi-rs/canvas`](https://www.npmjs.com/package/@napi-rs/canvas) | Render prompt text into a PNG (prebuilt binaries, OS-independent) |
| `pngjs` | PNG decode (used in tests) |
| A vision-capable model | Reads the rendered image (e.g. `deepseek-v4-flash-vision-exp`) |

```bash
npm install
```

### deslop

No external dependencies. Works with any Pi session. The skill is self-contained — load it for any writing, editing, or review task.

## Skills

### presentation-builder

Create polished Slidev pitch decks using a parallel-variant chain workflow:

1. **Briefing** — structured context from codebase/user input
2. **Variant generation** — 3 variants per slide via async worker, pick/combine best
3. **Story review** — coherence + deslop + tightening pass
4. **Assembly** — dark glass-card theme, Slidev frontmatter
5. **Visual review** — Playwright screenshots, fix overflow/spacing

See [presentation-builder/SKILL.md](presentation-builder/SKILL.md) for the full workflow.

### deslop

Remove AI writing patterns from prose and presentations. Combined general prose deslop (articles, memos, scientific writing) with presentation-specific rules (headlines, bullets, labels, layout).

Triggers: "deslop", "de-AI", "make it sound human", "remove AI patterns", "scrub this deck", "tighten slides"

See [deslop/SKILL.md](deslop/SKILL.md) for rules and references.

### audio-note

Generate spoken replies and audio artifacts. Supports native Telegram voice-note delivery via pi-telegram, or local file generation with configurable TTS backends.

Triggers: "audio", "voice summary", "voice note", "spoken version", "read this aloud"

See [audio-note/SKILL.md](audio-note/SKILL.md) for the full workflow.

### image-prompt

Render a text prompt into an image and send it to a vision-capable model so the model reads the prompt from pixels instead of receiving it as text. Useful for obfuscation / steganographic prompt transport.

Text-image mode on 800×800 at pointsize 14 carries ~2940 chars (~735 tokens) at ~90% OCR fidelity (noisy). The prompt is absent from the request body as text — only pixels.

Triggers: "image prompt", "pixel prompt", "send prompt via image", "encode prompt as pixels"

See [image-prompt/SKILL.md](image-prompt/SKILL.md) for the full workflow, token economics, and empirical limits.

## Usage

Once installed as a package, both skills are automatically available in all Pi sessions. No manual symlinking needed.

### Manual setup (alternative)

```bash
# Symlink individual skills into your global skills directory
ln -s /path/to/skills/presentation-builder ~/.pi/agent/skills/presentation-builder
ln -s /path/to/skills/deslop ~/.pi/agent/skills/deslop
```

### As project-local skills

```bash
# In your project
mkdir -p .pi/skills
cp -r /path/to/skills/presentation-builder .pi/skills/
cp -r /path/to/skills/deslop .pi/skills/
```

## Skill interaction

The `presentation-builder` skill references `deslop` rules during Phase 2 (variant generation) and Phase 3 (story review). Both skills can be loaded simultaneously — the presentation-builder will apply deslop constraints automatically when generating and reviewing slide content.

## Credits

The deslop skill is based on [stephenturner/skill-deslop](https://github.com/stephenturner/skill-deslop). The tropes catalog originates from [tropes.fyi](https://tropes.fyi) by [ossama.is](https://ossama.is).
