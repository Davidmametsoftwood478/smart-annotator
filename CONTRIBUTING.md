# Contributing

Small project, simple rules.

## Where to make changes

Edit **`src/annotator.template.html`** — never the built file. `skills/smart-annotator/assets/annotator.html` is generated and committed; overwriting it by hand will be lost on the next build.

```bash
npm install
npm run build      # regenerates the committed asset
```

Commit both the template change and the rebuilt asset, so installing from a clone always works without a build step.

## Testing

There's no test runner. Before opening a PR, open the built file and check the paths you touched:

- render Markdown / HTML / CSV, and an interactive HTML page with a `<script>`
- add one of each annotation kind (text, block, region)
- export the brief and the JSON pack — both should download and be non-empty
- refresh mid-annotation and restore
- paste a fake revision into the result dialog: hunks toggle, receipt counts correctly, apply writes back

The browser console should stay clean.

## Conventions

- Keep the tool **single-file and offline**. New runtime dependencies get inlined at build time or don't go in.
- Anything that can't be done offline in a browser belongs in `skills/smart-annotator/scripts/build_annotator.py`, not in the HTML.
- Add user-facing strings to **both** `I18N.en` and `I18N.zh`.
- Be honest in the UI. If a check is heuristic, say so rather than asserting a verdict.
