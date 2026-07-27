# Changelog

Notable changes, newest first. Versions are development milestones, not releases.

## 1.0.2

- The repository is now also a **plugin marketplace**: `.claude-plugin/marketplace.json` lets anyone install with `/plugin marketplace add <owner>/smart-annotator` — no clone, no build.
- Added `displayName` for directory listings.

## 1.0.1

- Annotation panel starts wider (400 px) with taller comment boxes and larger region thumbnails — less cramped before you touch the resize handle.
- UI language now follows the browser (Chinese locales open in Chinese, everything else in English). An explicit choice still wins and is remembered.
- Region drag is clamped to the document area, so a box can no longer be dragged past the content it's meant to mark.

## 1.0.0 — first public release
Packaged as an installable plugin with an open annotation-pack format.

### Highlights accumulated so far

- **v10** — Resizable annotation panel (drag, capped at 1/3 of the window). Border scale collapsed from five weights to two (plus one content accent); hierarchy now expressed through shadow depth. "Send notes only" for large sources (auto-on above 120 KB — a 378 KB source produced a 3 KB brief). Embedded previews use a separate storage key so they can't clobber the host session. Two-pass iframe height measurement for full-height apps. UI-screenshot mode: notes on a screenshot target the *code behind it*, not the image.
- **v9** — Per-note receipt and per-hunk accept/reject. Verification is local and heuristic, labelled honestly. Undetected notes can be re-submitted against the already-revised draft. Multi-file results parsed from `<<<FILE>>>` blocks.
- **v8** — Bilingual UI (English default) and multi-document tabs; the brief follows the UI language and merges every annotated document into one submission.
- **v7** — Real structure anchors: Excel cell addresses (quoted sheet names, merged cells, multi-sheet), CSV A1 refs, PDF/PPT page numbers. Region boxes aggregate into ranges.
- **v6** — Autosave and restore, plus annotation-pack reload. Degrades safely when browser storage is unavailable or over quota.
- **v5** — "Creative Mode" visual identity with inlined Archivo Black / Space Mono.
- **v4** — Word, Excel, PDF, PowerPoint, images and CSV. Binary formats convert to an annotatable view and are rewritten in place, preserving format.
- **v3** — Packaged as a skill; export-a-file replaced copying long text; fixed a JSON export that silently failed on large payloads; interactive mode (iframe) so scripted pages actually run.
- **v2** — `marked` for reliable Markdown; region annotation with screenshots for multimodal models.
- **v1** — Single-file prototype: text and block annotation, batch prompt, line diff.
