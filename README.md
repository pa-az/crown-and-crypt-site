# Crown & Crypt: site

The public home, support and privacy pages for Crown & Crypt, served by GitHub Pages.

- `index.html`: home
- `support.html`: support URL for the App Store and Google Play
- `privacy.html`: privacy policy URL for the App Store and Google Play
- `play/`: the browser teaser, the tutorial and The First March. Built from the game's
  `node tools/build-release.js --demo --count=https://candc.goatcounter.com/count ~/Dev/crown-and-crypt-site/play/index.html`
  (the later marches are only named in it, nothing to unlock), and then slimmed by
  `tools/strip-inline-assets.js` (see *Updating the play page* below).

Visits are counted by GoatCounter (candc.goatcounter.com): no cookies, no personal data.

The fonts and art are in `assets/`; the only thing loaded from elsewhere is GoatCounter's counting script.

## Updating the play page

`play/index.html` is rebuilt upstream from `~/Dev/C&C` (a sibling repo) by
`tools/build-release.js --demo`. That upstream build inlines every asset (94 sound
effects, 17 music tracks, 3 march-loop videos, ~200 webp art pieces, ~20 CSS
art tiles, the inline SVG defs and slider-thumb icons) as base64 data URIs straight into the HTML. The resulting single
file is ~10 MB, which works fine on macOS Safari/Chrome and on iOS/Android
(the game's native builds do the same dance and ship the assets inline as a
matter of portability). On Windows Chrome and Firefox the parse + base64
decode of that 10 MB blob is the slow part: the game starts noticeably later
and on slower Windows machines can stall before the first interactive frame.
The runtime (WAAPI animations, the rules engine, requestAnimationFrame) is
fine everywhere — only the load/decode bottleneck shows up.

After each upstream rebuild, run `tools/strip-inline-assets.js` to extract the
binary assets into `assets/sfx/`, `assets/img/`, and `assets/video/`, and to
replace the data URIs in `play/index.html` with relative URLs. The script also
patches the `Sfx.decodeAll()` loader so it `fetch()`es a plain URL when the
entry is not already a `data:` URI (this keeps backwards compatibility — if
a future build stops inlining, the fetch path is the one that runs).

The whole thing is a 1-2 second pass. Re-running it on an already-stripped
file is a no-op: each asset file is only rewritten if its bytes change, and
the patcher fires only if it sees the original `function decodeAll()` body.

```
# typical workflow after the upstream build
node ~/Dev/C&C/tools/build-release.js --demo --count=https://candc.goatcounter.com/count play/index.html
node tools/strip-inline-assets.js play/index.html assets/
git add play/index.html assets/sfx assets/img assets/video
git commit -m "The teaser rebuilt from Version NNN: <your message>"
```

The script has no dependencies and takes optional positional args:
`node tools/strip-inline-assets.js [play/index.html] [assets/]`
(defaults are `play/index.html` and `assets/`).

After the strip, `play/index.html` is ~0.7 MB and the assets in `assets/`
add up to ~7 MB total (94 audio, 206 webp + 1 svg, 3 videos). GitHub Pages serves
both without any extra config.

## How the stripper decides what to extract

`tools/strip-inline-assets.js` walks three places inside `play/index.html`:

1. **Top-level `const NAME = { ... }`, `[...]`, or `"..."` declarations** inside
   the inline `<script>`. The brace/bracket/string scanner is comment- and
   string-aware so it doesn't get confused by data inside a value. Each
   `data:audio/mp4;base64,…`, `data:image/webp;base64,…`, or
   `data:video/mp4;base64,…` literal is base64-decoded, written to disk with a
   stable filename derived from the block name + key + a short hash of the
   bytes (`SFX_arrow_hit_898b.m4a`, `ART_chaplain_fc51.webp`,
   `SCYTHE_ART_66cf46ec08.webp`, …), and replaced inline with a relative URL.

2. **Inline `<style>` block.** `url(data:image/webp;base64,…)` references get
   extracted to `assets/img/css_*.webp` and replaced with `url(img/css_*.webp)`
   (CSS URLs are resolved relative to the document at `/play/`).
   `url(data:image/svg+xml,…)` icons (slider thumbs etc.) go to
   `assets/img/csssvg_*.svg`.

3. **`href="data:image/..."` attributes** inside inline `<svg>` `<defs>` blocks
   (the campaign-map defs). These go to `assets/img/href_*.webp`.

The only `data:` references that survive are runtime-constructed ones the
script can't see — the `mask` SVG is built up from `VW`/`VH`/`<svg>` template
strings inside the JS, so it stays as a `data:` URI. The `Sfx.decodeAll()`
patch keeps a `data:` URI fast path alongside the new `fetch()` path so this
isn't a regression if the upstream build ever stops inlining audio.

## Updating the play page later (yes, it's a 1-2 step process)

1. `cd ~/Dev/C&C && node tools/build-release.js --demo --count=https://candc.goatcounter.com/count ~/Dev/crown-and-crypt-site/play/index.html`
   — upstream build, ~10 MB output.
2. `cd ~/Dev/crown-and-crypt-site && node tools/strip-inline-assets.js`
   — strips to ~0.7 MB HTML + ~7 MB in `assets/`. Adds any new assets the
   upstream build introduced, leaves untouched ones alone.

That's it. No manual asset wrangling, no path surgery. If a future upstream
build introduces a brand-new asset kind or a brand-new top-level `const`
block, the stripper picks it up automatically — it scans every declaration in
the inline script. If the asset format ever changes from `audio/mp4` to
`audio/ogg` (say), the stripper's MIME-prefix matching (`data:audio/...`)
still picks it up; the file extension defaults to `.m4a` which you'd need to
tweak at one place (the `processBlock` extension table) if the source format
changes.

## Files

```
play/index.html         the playable teaser (single page; ~0.7 MB after strip)
assets/                 pre-existing site art (fonts, icons, unit shots, ...)
assets/sfx/             extracted sound effects (94 .m4a files, ~3.2 MB)
assets/img/             extracted webp art + svg icons (206 .webp + 1 .svg, ~4.4 MB)
assets/video/           extracted march-loop videos (3 .mp4 files, ~572 KB)
tools/strip-inline-assets.js   the stripper — pure Node, no deps
```
