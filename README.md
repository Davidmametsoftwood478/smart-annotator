# 🖍️ Smart Annotator

**Annotate AI output in bulk — then let AI apply every note in one pass.**

中文说明请看 [README.zh-CN.md](README.zh-CN.md)

You rarely accept an AI draft as-is. The usual loop is: spot a problem → prompt → wait → spot the next one → prompt again. Ten problems, ten round trips, and each pass can quietly break something that was already fine.

Smart Annotator flips that. Mark up the whole draft the way you'd comment on a document — highlight a phrase, comment on a paragraph, drag a box around a chart — let the notes pile up, then submit them **all at once**. You get back a revised version with a per-note receipt telling you which notes actually landed.

<!-- Add a screenshot here: docs/screenshot.png -->

---

## Why not just paste "fix these 8 things" into a chat?

Because models drop instructions when they get dense. The [instruction-following benchmark](https://arxiv.org/abs/2507.11538) found frontier models at **68% accuracy** under high instruction density, with a measurable **bias toward earlier instructions** — the notes at the bottom of your list are the ones that get silently skipped.

This tool addresses that in two ways:

- **Every note is anchored.** Not "the intro is too long" but a note attached to exact text, a real cell address (`Sheet1!B3`), or a page number. Anchoring removes the ambiguity that makes models drift.
- **Every note is verified.** After the revision comes back, the tool checks each note against the actual text and reports `6 of 8 notes show a change`. The two that didn't can be re-submitted in one click, against the already-revised draft.

Batch editing without verification is a leap of faith. With verification it's just faster.

---

## Two ways to use it

### 1. Standalone — one file, no install, works offline

Download **[`skills/smart-annotator/assets/annotator.html`](skills/smart-annotator/assets/annotator.html)** and double-click it. That's the whole app: no server, no build, no account. Fonts and libraries are inlined; nothing phones home.

Handles **Markdown, HTML, plain text, CSV and images** directly in the page.

### 2. As a Claude plugin — drop a file in chat and say "annotate this"

Install this repo as a plugin (see below) and the workflow becomes:

1. You say **"annotate this file"** and attach a `.docx` / `.xlsx` / `.pdf` / `.pptx` / `.md` / image.
2. Claude converts it into an annotatable view and hands you the tool.
3. You mark it up, click **Export brief**, drag the file back into the chat.
4. Claude applies every note and returns the file **in its original format**.

This is how you get Word / Excel / PDF / PowerPoint support — the conversion runs on Claude's side so the standalone file stays small and offline.

---

## What you can annotate

| Type | How | Anchor recorded |
|---|---|---|
| Text | Select it | quoted text + block id |
| Block / paragraph | Hover, click 💬 | block id |
| Visual region | Click **▭ Region**, drag a box | underlying HTML + a screenshot |
| Spreadsheet cell | Click a cell | **real address** — `Sheet1!B3`, ranges as `B2:D5` |
| PDF / slide page | Drag a box on the page | **real page number** |

Interactive HTML runs for real: pages with `<script>` render in an iframe, so you can click through to the state you want and *then* annotate it.

---

## Features

- **Three annotation modes** — text highlight, whole block, freeform region box
- **Batch submit** — all notes go in one structured brief, not one prompt per fix
- **Per-note receipt** — heuristic check of which notes actually produced a change, with one-click re-submit for the ones that didn't
- **Per-change review** — accept or reject each diff hunk individually, like code review
- **Multi-document** — annotate several files side by side in tabs; export one combined brief
- **Real structure anchors** — Excel cell addresses, PDF/slide page numbers
- **Autosave & restore** — survives a refresh; annotation packs reload for later rounds
- **Bilingual** — follows your browser language (Chinese locales get Chinese, everything else English), switchable in one click and remembered; the brief follows the UI language
- **Bring your own AI, or none** — call Anthropic / any OpenAI-compatible endpoint directly with your key, or just export the brief and paste it anywhere

---

## Install as a plugin

```bash
git clone https://github.com/USERNAME/smart-annotator.git
```

Then add it as a plugin from the cloned directory. The built asset is committed, so **no build step is required** to install and use it.

For the document formats (`.docx` / `.xlsx` / `.pdf` / `.pptx`), the conversion script needs:

```bash
pip install -r requirements.txt
# .pptx page rendering additionally needs LibreOffice (`soffice`) on PATH.
# Without it, .pptx falls back to a per-slide text view automatically.
```

Markdown, HTML, CSV, text and images need none of this.

---

## Build from source

Only needed if you change `src/annotator.template.html`.

```bash
npm install
npm run build     # -> skills/smart-annotator/assets/annotator.html
```

The build inlines `marked`, `html2canvas` and two woff2 fonts into a single self-contained file, and fails loudly if any placeholder is left unfilled.

---

## The annotation pack is an open format

Every export can be dumped as JSON — original text, every note, anchors, and region screenshots as base64. It's documented in **[docs/annotation-pack.schema.json](docs/annotation-pack.schema.json)**, so you can wire the annotations into your own pipeline instead of Claude's. Nothing here is a lock-in.

---

## Known limits

Stated plainly, because they're real:

- **Receipt verification is heuristic.** It checks whether the quoted text still appears unchanged. A note like *"add a source after this sentence"* legitimately leaves the sentence intact and will show as "no change detected" — the UI says so and asks you to confirm those yourself.
- **`<canvas>` charts can't be edited.** A screenshot captures the pixels, but there's no HTML behind them to change. SVG / HTML / CSS visuals are fine.
- **html2canvas isn't a browser.** Complex CSS, cross-origin images and some custom fonts won't render perfectly in region screenshots.
- **Screenshots don't survive the text round-trip.** Dragging the `.md` brief back into a chat carries the notes and the underlying HTML snippet, but not the images. Use the JSON pack if the model needs to *see* the region.
- **Rewriting binary formats depends on the document tooling**, and complex layouts (merged cells, slide masters, heavy PDF typography) are where it's most likely to be imperfect.

---

## How it works

Four layers: render → annotate → assemble → apply. Full design notes, data structures and the reasoning behind each trade-off are in **[docs/architecture.zh-CN.md](docs/architecture.zh-CN.md)** (Chinese).

---

## License

MIT — see [LICENSE](LICENSE).
