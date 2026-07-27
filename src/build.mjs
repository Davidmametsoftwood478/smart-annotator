#!/usr/bin/env node
/**
 * Build the single-file annotator.
 *
 *   npm install && npm run build
 *
 * Inlines marked (Markdown), html2canvas (region screenshots) and two woff2
 * fonts into src/annotator.template.html, then writes the result to
 * skills/smart-annotator/assets/annotator.html.
 *
 * That output file is BOTH the asset the plugin's skill ships AND the
 * standalone tool you can download and open offline. It is committed to the
 * repo so installing the plugin never requires a build step.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const p = (...s) => path.join(root, ...s);

const TEMPLATE = p('src', 'annotator.template.html');
const OUT = p('skills', 'smart-annotator', 'assets', 'annotator.html');

const need = (f) => {
  if (!fs.existsSync(f)) {
    console.error(`Missing dependency: ${path.relative(root, f)}\nRun "npm install" first.`);
    process.exit(1);
  }
  return f;
};

let tpl = fs.readFileSync(TEMPLATE, 'utf8');

// ---- fonts (inlined so the tool stays fully offline) ----
const b64 = (f) => fs.readFileSync(need(f)).toString('base64');
const archivo = b64(p('node_modules/@fontsource/archivo-black/files/archivo-black-latin-400-normal.woff2'));
const spaceMono = b64(p('node_modules/@fontsource/space-mono/files/space-mono-latin-400-normal.woff2'));
tpl = tpl.replace('/*__FONTS__*/',
`@font-face{font-family:'Archivo Black';font-style:normal;font-weight:400;font-display:swap;src:url(data:font/woff2;base64,${archivo}) format('woff2')}
@font-face{font-family:'Space Mono';font-style:normal;font-weight:400;font-display:swap;src:url(data:font/woff2;base64,${spaceMono}) format('woff2')}`);

// ---- libraries ----
const read = (f) => fs.readFileSync(need(f), 'utf8');
const marked = read(p('node_modules/marked/lib/marked.umd.js'));
const html2canvas = read(p('node_modules/html2canvas/dist/html2canvas.min.js'));
// guard against a stray </script> inside a bundle closing the inline block early
const safe = (s) => s.replace(/<\/script>/gi, '<\\/script>');
const out = tpl.replace('<!--__LIBS__-->',
  `<script>${safe(marked)}</script>\n<script>${safe(html2canvas)}</script>`);

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, out);

// sanity checks — fail loudly rather than shipping a broken single file
if (!out.includes('@font-face')) { console.error('FAIL: fonts not inlined'); process.exit(1); }
if (!out.includes('marked') || !out.includes('html2canvas')) { console.error('FAIL: libraries not inlined'); process.exit(1); }
if (out.includes('<!--__LIBS__-->') || out.includes('/*__FONTS__*/')) { console.error('FAIL: placeholder left in output'); process.exit(1); }

console.log(`built ${path.relative(root, OUT)} (${Math.round(out.length / 1024)} KB)`);
