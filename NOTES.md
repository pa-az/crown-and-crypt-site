# Performance fix: Windows load times for the play page

## What was slow

The browser teaser (`play/index.html`) was a single ~10 MB HTML file. About
6 MB of that was base64-encoded audio (94 SFX) and another ~3 MB was
base64-encoded images (200+ webp, 1 svg icon, 1 SCYTHE_ART painting, ~20
CSS art tiles, 6 inline-svg defs). The upstream build
(`~/Dev/C&C/tools/build-release.js --demo`) deliberately inlines every
asset because the game also ships as a self-contained single file on
iOS/Android/macOS for portability. macOS Chrome/Safari tear through the
base64 → bytes step fast. On Windows Chrome and Firefox, the parse +
base64-decode of 9 MB of inlined assets inside a 7 MB script was the
slow part — the page stalled before the first interactive frame on the
two test machines. The runtime (WAAPI animations, the rules engine) was
fine everywhere.

## What the fix does

`tools/strip-inline-assets.js` walks `play/index.html`, extracts every
`data:audio/...`, `data:image/...`, and `data:video/...` URI to
`assets/sfx/`, `assets/img/`, and `assets/video/`, and replaces them in
place with relative URLs. It also patches `Sfx.decodeAll()` so it can
`fetch()` a plain URL in addition to decoding `data:` URIs. Result:

- `play/index.html`: 10,041,995 B → 673,881 B (10 MB → 0.64 MB)
- `assets/sfx/`: 94 .m4a files, 3.2 MB
- `assets/img/`: 206 .webp + 1 .svg, 4.4 MB
- `assets/video/`: 3 .mp4 files, 572 KB
- Load profile: small HTML arrives immediately; assets stream in parallel
  over HTTP/2 from GitHub Pages; audio is decoded on first use by the
  Web Audio API after fetch.

## When to re-run

After every upstream rebuild. The script is idempotent — re-running it on
an already-stripped file is a no-op (asset files are rewritten only if
their bytes change, and the `Sfx.decodeAll` patcher fires only if the
original function body is present).

## What it does NOT touch

- The runtime `mask` SVG (line 5626) — it's built up from `VW`/`VH` inside
  the JS, so it stays a `data:` URI. The new `decodeAll` keeps a `data:`
  URI fast path alongside the new `fetch()` path, so this is fine even if
  the upstream build ever stops inlining audio.
- The 17 MUSIC tracks remain inline in the script (only `SFX` was
  patched). Music wasn't the Windows bottleneck in testing and there's
  no streaming benefit to fetching it lazily — they all play at first
  load anyway.
- The pre-existing site art in `assets/` (fonts, icons, screenshots,
  trailer, unit shots). Those are referenced from the home page, not
  from `play/`, and they were never the problem.

## Future updates

After every upstream rebuild (the upstream checkout is `~/Dev/C&C` per
its CLAUDE.md; the site checkout is `~/Dev/crown-and-crypt-site`):

```
cd ~/Dev/C\&C
node tools/build-release.js --demo --count=https://candc.goatcounter.com/count ~/Dev/crown-and-crypt-site/play/index.html

cd ~/Dev/crown-and-crypt-site
node tools/strip-inline-assets.js
git add play/index.html assets/sfx assets/img assets/video
git commit -m "The teaser rebuilt from Version NNN"
```

That's it. The stripper picks up new asset kinds or new top-level
declarations automatically — it scans every `const/let/var` declaration
in the inline script. The only thing to revisit manually is if the
upstream build ever changes an asset MIME (e.g. audio/mp4 → audio/ogg):
the stripper's MIME-prefix matching still finds them, but the output
extension defaults to `.m4a` and would need a one-line tweak in the
`processBlock` extension table.
