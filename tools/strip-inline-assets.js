#!/usr/bin/env node
/*
 * strip-inline-assets.js
 * -----------------------
 * The published game (play/index.html) is a self-contained single-file build
 * produced by `node tools/build-release.js --demo` from the upstream
 * crown-and-crypt repo. Everything sits in that one HTML: ~10 MB of source,
 * with ~6 MB of base64 audio (94 SFX) and ~3 MB of base64 images (hundreds of
 * webp) inlined straight into the JavaScript and CSS.
 *
 * On macOS Safari/Chrome the browser tears through base64-to-bytes quickly.
 * On Windows Chrome/Firefox the parse + base64 decode of a 7 MB script plus
 * 6 MB of inlined assets is the slow part: the file takes noticeably longer
 * to start, and on a slower Windows machine it can stall before the first
 * interactive frame. The game itself (WAAPI animations, the rules engine) is
 * fine everywhere — Android and iOS handle it fine too.
 *
 * This script runs *after* the upstream build. It walks every top-level
 * `const NAME = {...}` / `[...]` / `"..."` block in play/index.html, extracts
 * the data:audio and data:image entries, writes each asset out to
 * assets/sfx/<key>.m4a or assets/img/<key>.webp, and replaces the data URI
 * with the relative URL. It does the same for the inlined <style> block's
 * url(data:...) references, for SVG `href="data:image/..."` references in
 * inline HTML, and for the small `data:image/svg+xml,...` icons.
 *
 * It also patches `Sfx.decodeAll()` so it will fetch() a plain URL when the
 * entry is not already a data: URI. (Music still uses the data URI path —
 * there are only 17 of them, they ship on first load anyway, and music
 * wasn't the Windows bottleneck in testing.)
 *
 * Re-runs are safe and idempotent:
 *   - File is rewritten only if its bytes change.
 *   - Patcher fires only if the original `function decodeAll()` body is
 *     present (so a re-run after the first strip is a no-op).
 *
 * Usage:  node tools/strip-inline-assets.js [play/index.html] [assets/]
 * Defaults: play/index.html, assets/
 */

'use strict';

const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');

const SRC     = path.resolve(process.argv[2] || 'play/index.html');
const ASSETS  = path.resolve(process.argv[3] || 'assets');
const SFX_DIR = path.join(ASSETS, 'sfx');
const IMG_DIR = path.join(ASSETS, 'img');

const AUDIO_RE = /"data:(audio\/[^;"]+);base64,([A-Za-z0-9+/=\s]+)"/g;
const IMG_RE   = /"data:(image\/[^;"]+);base64,([A-Za-z0-9+/=\s]+)"/g;
const VIDEO_RE = /"data:(video\/[^;"]+);base64,([A-Za-z0-9+/=\s]+)"/g;

function shortHash(buf) {
  return crypto.createHash('sha1').update(buf).digest('hex').slice(0, 10);
}

function b64Decode(b64) {
  return Buffer.from(b64.replace(/\s+/g, ''), 'base64');
}

/* Locate the inline <script>...</script> body. */
function findScriptBody(html) {
  const open = /<script>\s*\n/g.exec(html);
  if (!open) throw new Error('no inline <script> found');
  const bodyStart = open.index + open[0].length;
  const closeRe = /<\/script>/g;
  closeRe.lastIndex = bodyStart;
  const close = closeRe.exec(html);
  if (!close) throw new Error('no closing </script>');
  return { bodyStart, bodyEnd: close.index };
}

/* Find every top-level const/let/var NAME = <value> header inside the inline
   script. Returns [{name, headerStart, valueStart, kind}] where kind is
   'object' ({), 'array' ([), or 'string' (" or ' or `). */
function findHeaders(html, bodyStart, bodyEnd) {
  const headerRe = /^(const|let|var)\s+(\w+)\s*=\s*([\[{"'`])/gm;
  headerRe.lastIndex = bodyStart;
  const out = [];
  let hm;
  while ((hm = headerRe.exec(html)) !== null) {
    if (hm.index >= bodyEnd) break;
    const headerStart = hm.index;
    const name = hm[2];
    const opener = hm[3];
    const valueStart = headerStart + hm[0].length;
    let kind;
    if (opener === '{') kind = 'object';
    else if (opener === '[') kind = 'array';
    else kind = 'string';
    out.push({ name, headerStart, valueStart, kind });
  }
  return out;
}

/* Given the position right after the opening { / [, return the index just
   past the matching closing character. Skips strings and comments. */
function findBlockEnd(html, openIdx, openCh, closeCh, hardEnd) {
  let depth = 1;
  let i = openIdx;
  let inStr = null;
  let inLineComment = false;
  let inBlockComment = false;
  while (i < hardEnd) {
    const ch = html[i];
    if (inLineComment) {
      if (ch === '\n') inLineComment = false;
      i++;
      continue;
    }
    if (inBlockComment) {
      if (ch === '*' && html[i + 1] === '/') { inBlockComment = false; i += 2; continue; }
      i++;
      continue;
    }
    if (inStr) {
      if (ch === '\\') { i += 2; continue; }
      if (ch === inStr) inStr = null;
      i++;
      continue;
    }
    if (ch === '/' && html[i + 1] === '/') { inLineComment = true; i += 2; continue; }
    if (ch === '/' && html[i + 1] === '*') { inBlockComment = true; i += 2; continue; }
    if (ch === '"' || ch === "'" || ch === '`') { inStr = ch; i++; continue; }
    if (ch === openCh) depth++;
    else if (ch === closeCh) { depth--; if (depth === 0) return i + 1; }
    i++;
  }
  throw new Error(`unterminated block (open=${openCh} close=${closeCh} at offset ${openIdx})`);
}

/* Find the closing " of the string that opens at stringStart. Strings in
   this source are simple — no template expressions we touch. */
function findStringEnd(html, stringStart, hardEnd) {
  let i = stringStart;
  while (i < hardEnd) {
    const ch = html[i];
    if (ch === '\\') { i += 2; continue; }
    if (ch === '"') return i + 1;
    i++;
  }
  throw new Error(`unterminated string at offset ${stringStart}`);
}


/* Walk one block, extract every data:audio / data:image / data:video literal,
   write each to disk, and return the rewritten block text. If the block has
   no inline assets, return null. */
function processBlock(header, html) {
  let end;
  if (header.kind === 'object') {
    end = findBlockEnd(html, header.valueStart, '{', '}', html.length);
  } else if (header.kind === 'array') {
    end = findBlockEnd(html, header.valueStart, '[', ']', html.length);
  } else {
    end = findStringEnd(html, header.valueStart, html.length);
  }

  const start = header.headerStart;
  const text = html.slice(start, end);
  const hits = [];
  let m;
  AUDIO_RE.lastIndex = 0;
  while ((m = AUDIO_RE.exec(text)) !== null) {
    hits.push({ kind: 'audio', mime: m[1], b64: m[2], offset: m.index, fullLen: m[0].length });
  }
  IMG_RE.lastIndex = 0;
  while ((m = IMG_RE.exec(text)) !== null) {
    hits.push({ kind: 'image', mime: m[1], b64: m[2], offset: m.index, fullLen: m[0].length });
  }
  VIDEO_RE.lastIndex = 0;
  while ((m = VIDEO_RE.exec(text)) !== null) {
    hits.push({ kind: 'video', mime: m[1], b64: m[2], offset: m.index, fullLen: m[0].length });
  }
  if (!hits.length) return null;

  hits.sort((a, b) => b.offset - a.offset);

  let newText = text;
  for (const hit of hits) {
    const prefix = text.slice(Math.max(0, hit.offset - 300), hit.offset);
    const keyMatch = prefix.match(/[\s,]([\w-]+)\s*:\s*(?:\[\s*"?)?$/);
    const buf = b64Decode(hit.b64);
    const key = keyMatch
      ? `${header.name}_${keyMatch[1]}_${shortHash(buf).slice(0, 4)}`
      : `${header.name}_${shortHash(buf)}`;

    let ext, dir, prefix_path;
    if (hit.kind === 'audio') {
      ext = 'm4a'; dir = SFX_DIR; prefix_path = '../assets/sfx/';
    } else if (hit.kind === 'video') {
      ext = 'mp4'; dir = path.join(ASSETS, 'video'); prefix_path = '../assets/video/';
    } else {
      ext = 'webp'; dir = IMG_DIR; prefix_path = '../assets/img/';
    }
    const dest = path.join(dir, key + '.' + ext);

    const replacement = `"${prefix_path}${key}.${ext}"`;
    newText = newText.slice(0, hit.offset) + replacement + newText.slice(hit.offset + hit.fullLen);

    if (!fs.existsSync(dest) || !fs.readFileSync(dest).equals(buf)) {
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(dest, buf);
      console.log(`  wrote ${(buf.length/1024).toFixed(1)} KB -> ${path.relative('.', dest)}`);
    }
  }
  return newText;
}


/* Rewrite url(data:image/...) references inside the inlined <style> block.
   The CSS URL is resolved relative to the HTML document at /play/, so the
   replacement path is `img/<key>.webp`. */
function processCss(html) {
  const styleRe = /(<style>)([\s\S]*?)(<\/style>)/;
  const m = styleRe.exec(html);
  if (!m) return html;

  const css = m[2];

  const cssUrlRe = /url\(\s*(data:image\/([^;)]+);base64,([A-Za-z0-9+/=\s]+))\s*\)/g;
  let count = 0;
  const step1 = css.replace(cssUrlRe, (full, dataUri, _ext, b64, offset) => {
    const buf = b64Decode(b64);
    const prefix = css.slice(Math.max(0, offset - 200), offset);
    const varMatch = prefix.match(/(--[\w-]+)\s*:\s*$/);
    const key = varMatch
      ? 'css_' + varMatch[1].slice(2).replace(/-/g, '_')
      : 'css_' + shortHash(buf);
    const dest = path.join(IMG_DIR, key + '.webp');
    if (!fs.existsSync(dest) || !fs.readFileSync(dest).equals(buf)) {
      fs.mkdirSync(IMG_DIR, { recursive: true });
      fs.writeFileSync(dest, buf);
      console.log(`  wrote ${(buf.length/1024).toFixed(1)} KB -> ${path.relative('.', dest)} (css)`);
    }
    count++;
    return `url(img/${key}.webp)`;
  });

  const cssSvgRe = /url\((\s*["']?)(data:image\/[^)]+)\1\)/g;
  const step2 = step1.replace(cssSvgRe, (full, _quote, dataUri) => {
    const comma = dataUri.indexOf(',');
    const payload = decodeURIComponent(dataUri.slice(comma + 1));
    const buf = Buffer.from(payload, 'utf8');
    const key = 'csssvg_' + shortHash(buf);
    const dest = path.join(IMG_DIR, key + '.svg');
    if (!fs.existsSync(dest) || !fs.readFileSync(dest).equals(buf)) {
      fs.mkdirSync(IMG_DIR, { recursive: true });
      fs.writeFileSync(dest, buf);
      console.log(`  wrote ${(buf.length/1024).toFixed(1)} KB -> ${path.relative('.', dest)} (css svg)`);
    }
    count++;
    return `url(img/${key}.svg)`;
  });

  if (!count) return html;
  return html.slice(0, m.index) + m[1] + step2 + m[3] + html.slice(m.index + m[0].length);
}

/* Rewrite href="data:image/..." references that appear inside inline <svg>
   <defs><image/></defs> blocks. */
function processHrefImages(html) {
  const hrefRe = /href="(data:image\/[^"]+;base64,[A-Za-z0-9+/=\s]+)"/g;
  let count = 0;
  const out = [];
  let last = 0;
  let m;
  hrefRe.lastIndex = 0;
  while ((m = hrefRe.exec(html)) !== null) {
    const dataUri = m[1];
    const comma = dataUri.indexOf(',');
    const b64 = dataUri.slice(comma + 1);
    const buf = b64Decode(b64);

    const key = 'href_' + shortHash(buf);
    const dest = path.join(IMG_DIR, key + '.webp');
    if (!fs.existsSync(dest) || !fs.readFileSync(dest).equals(buf)) {
      fs.mkdirSync(IMG_DIR, { recursive: true });
      fs.writeFileSync(dest, buf);
      console.log(`  wrote ${(buf.length/1024).toFixed(1)} KB -> ${path.relative('.', dest)} (href)`);
    }
    out.push(html.slice(last, m.index));
    out.push(`href="../assets/img/${key}.webp"`);
    last = m.index + m[0].length;
    count++;
  }
  if (!count) return html;
  out.push(html.slice(last));
  return out.join('');
}


/* The replacement body for Sfx.decodeAll() — a small async function that
   handles both data: URIs (the original behaviour) and plain URLs (the
   stripped form). The function is left at column 0 in the patched output so
   the patcher can detect it's already been patched. */
const REPLACEMENT_DECODE_ALL =
`/* Sfx.decodeAll patched by strip-inline-assets.js — handles data: URIs and URLs */
async function decodeAll(){
  for(const k in SFX){
    const src = SFX[k];
    try{
      if(typeof src === 'string' && src.startsWith('data:')){
        const b64 = src.slice(src.indexOf(',') + 1);
        const bin = atob(b64);
        const arr = new Uint8Array(bin.length);
        for(let j = 0; j < bin.length; j++) arr[j] = bin.charCodeAt(j);
        const buf = await ctx.decodeAudioData(arr.buffer);
        SFX[k] = buf;
      } else if(typeof src === 'string'){
        const res = await fetch(src);
        const arr = await res.arrayBuffer();
        const buf = await ctx.decodeAudioData(arr);
        SFX[k] = buf;
      }
    }catch(e){ console.warn('decodeAll', k, e); }
  }
}
`;

/* Find the body of `function decodeAll() { ... }` by brace-counting and
   replace it with REPLACEMENT_DECODE_ALL. Idempotent. */
function patchSfxLoader(html) {
  if (html.includes('Sfx.decodeAll patched by strip-inline-assets.js')) {
    console.log('  (Sfx.decodeAll patch: no-op, already patched)');
    return html;
  }

  const sig = 'function decodeAll()';
  let start = -1;
  let searchFrom = 0;
  while (true) {
    const idx = html.indexOf(sig, searchFrom);
    if (idx < 0) break;
    /* Accept the function header at any indentation level, but require it
       to be preceded by whitespace or a newline (not a letter, digit, or
       underscore — so we don't match `myfunction decodeAll()`). */
    const prev = idx > 0 ? html[idx - 1] : ' ';
    if (/\s/.test(prev)) { start = idx; break; }
    searchFrom = idx + 1;
  }
  if (start < 0) {
    console.log('  (Sfx.decodeAll patch: no-op, function not found)');
    return html;
  }

  const openIdx = html.indexOf('{', start + sig.length);
  if (openIdx < 0 || openIdx - (start + sig.length) > 5) {
    console.log('  (Sfx.decodeAll patch: no-op, function header malformed)');
    return html;
  }

  let depth = 1;
  let i = openIdx + 1;
  let inStr = null;
  let inLineComment = false;
  let inBlockComment = false;
  while (i < html.length && depth > 0) {
    const ch = html[i];
    if (inLineComment) {
      if (ch === '\n') inLineComment = false;
      i++;
      continue;
    }
    if (inBlockComment) {
      if (ch === '*' && html[i + 1] === '/') { inBlockComment = false; i += 2; continue; }
      i++;
      continue;
    }
    if (inStr) {
      if (ch === '\\') { i += 2; continue; }
      if (ch === inStr) inStr = null;
      i++;
      continue;
    }
    if (ch === '/' && html[i + 1] === '/') { inLineComment = true; i += 2; continue; }
    if (ch === '/' && html[i + 1] === '*') { inBlockComment = true; i += 2; continue; }
    if (ch === '"' || ch === "'" || ch === '`') { inStr = ch; i++; continue; }
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) { i++; break; } }
    i++;
  }
  if (depth !== 0) {
    console.log('  (Sfx.decodeAll patch: no-op, brace mismatch)');
    return html;
  }

  return html.slice(0, start) + REPLACEMENT_DECODE_ALL + html.slice(i);
}


function main() {
  if (!fs.existsSync(SRC)) { console.error(`not found: ${SRC}`); process.exit(2); }
  const html = fs.readFileSync(SRC, 'utf8');

  const { bodyStart, bodyEnd } = findScriptBody(html);
  const headers = findHeaders(html, bodyStart, bodyEnd);

  console.log(`source: ${SRC}  (${(html.length/1024/1024).toFixed(2)} MB)`);
  console.log(`assets: ${ASSETS}`);
  console.log(`discovered ${headers.length} top-level declarations`);

  /* Resolve each header's byte range end. */
  const ranges = headers.map(h => {
    let end;
    if (h.kind === 'object') end = findBlockEnd(html, h.valueStart, '{', '}', html.length);
    else if (h.kind === 'array') end = findBlockEnd(html, h.valueStart, '[', ']', html.length);
    else end = findStringEnd(html, h.valueStart, html.length);
    return { ...h, end };
  });

  /* Only touch declarations that contain inline data. Walk back-to-front so
     byte offsets stay valid. */
  const interesting = ranges
    .filter(h => html.slice(h.headerStart, h.end).includes('data:'))
    .sort((a, b) => b.headerStart - a.headerStart);

  let newHtml = html;
  for (const h of interesting) {
    const replaced = processBlock(h, html);
    if (replaced != null) {
      console.log(`    block ${h.name} (${h.kind}): ${((h.end-h.headerStart)/1024).toFixed(1)} KB -> ${(replaced.length/1024).toFixed(1)} KB`);
      newHtml = newHtml.slice(0, h.headerStart) + replaced + newHtml.slice(h.end);
    }
  }

  newHtml = processCss(newHtml);
  newHtml = processHrefImages(newHtml);
  newHtml = patchSfxLoader(newHtml);

  if (newHtml !== html) {
    fs.writeFileSync(SRC, newHtml);
    console.log(`\nwrote ${SRC}  (${(newHtml.length/1024/1024).toFixed(2)} MB)`);
    console.log(`saved  ${((html.length - newHtml.length)/1024/1024).toFixed(2)} MB`);
  } else {
    console.log('\nno changes — output is identical to input.');
  }
}

main();
