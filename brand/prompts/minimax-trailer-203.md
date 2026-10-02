# MiniMax Design prompt — Crown & Crypt trailer (Version 203)

This is the master prompt for MiniMax Design (the agent-with-no-file-
access tier). Paste the **prompt** under the `---` divider into MiniMax;
upload the **14 reference images** listed under **Files to upload** below.

## How to use

1. Copy everything below the `---` divider into MiniMax Design.
2. Upload the 14 files listed under **Files to upload** in this order
   (or any order — MiniMax will tag them by content).
3. MiniMax outputs four `.mp4` files named `scene-1-barrows.mp4`,
   `scene-2-knight.mp4`, `scene-3-crest.mp4`, `scene-4-march.mp4`.
4. Drop them into `~/Dev/C&C/tools/raw/v1/` and update `trailer.py` (see
   "When the agent delivers" at the end of this file).

## Files to upload (in upload order)

Each row tells you: which IMG-N tag the prompt references, what it shows
in one line, and the local path on the Mac.

| Tag | What | Local path |
|---|---|---|
| IMG-1 | Barrows at dusk (style anchor + Scene 1 start) | `~/Dev/C&C/tools/raw/v1/barrows.png` |
| IMG-2 | Knight on the barrow (style anchor + Scene 2 start + Scene 4 style) | `~/Dev/C&C/tools/raw/v1/knight.png` |
| IMG-3 | Crest in the dark (Scene 3 start) | `~/Dev/C&C/tools/raw/v1/crest.png` |
| IMG-4 | Crest linework (Scene 3 proportions reference) | `~/Dev/crown-and-crypt-site/assets/crest.webp` |
| IMG-5 | Heath biome (Scene 4 ground) | `~/Dev/crown-and-crypt-site/assets/biome-heath.webp` |
| IMG-6 | Marsh biome (Scene 4 foreground mist) | `~/Dev/crown-and-crypt-site/assets/biome-marsh.webp` |
| IMG-7 | Bone King unit (Scene 4 column head) | `~/Dev/crown-and-crypt-site/assets/unit-boneking.webp` |
| IMG-8 | Bone Archer unit (Scene 4 column rank) | `~/Dev/crown-and-crypt-site/assets/unit-bonearcher.webp` |
| IMG-9 | Ghoul unit (Scene 4 column rear) | `~/Dev/crown-and-crypt-site/assets/unit-ghoul.webp` |
| IMG-10 | Menu shot (mood) | `~/Dev/crown-and-crypt-site/assets/shot-menu.webp` |
| IMG-11 | Road shot (depth/mist) | `~/Dev/crown-and-crypt-site/assets/shot-road.webp` |
| IMG-12 | Hint shot (dark + amber palette) | `~/Dev/crown-and-crypt-site/assets/shot-hint.webp` |
| IMG-13 | Backdrop (atmospheric no-figure scene) | `~/Dev/crown-and-crypt-site/assets/backdrop.webp` |
| IMG-14 | Trailer poster (whole mood in one image) | `~/Dev/crown-and-crypt-site/assets/trailer-poster.webp` |

## Do NOT upload

- `~/Dev/crown-and-crypt-site/assets/og.jpg` — marketing artefact
- `~/Dev/crown-and-crypt-site/assets/apple-touch-icon.png` — app icon
- `~/Dev/crown-and-crypt-site/assets/trailer-720p.mp4` — the previous trailer
- `~/Dev/C&C/brand/store/preview/appstore-iphone.mp4` — App Store preview
- Anything in `~/Dev/C&C/brand/store/screenshots/` — caption bands and 9:41 status bars
- The level JSONs in `~/Dev/C&C/levels/` — not images

## When the agent delivers

Drop the four `.mp4` files into `~/Dev/C&C/tools/raw/v1/` named
`scene-1-barrows.mp4`, `scene-2-knight.mp4`, `scene-3-crest.mp4`,
`scene-4-march.mp4`. Then in `~/Dev/C&C/tools/shots/trailer.py`:

1. In the `inputs = [ ... ]` list (~line 87) add `"-i", V1 + "/scene-4-march.mp4"` after `knight.mp4`.
2. In the painted-scene concatenation chain (~line 96–98) insert the new scene between `knight.mp4` and `crest.mp4` (or wherever the cut reads best).
3. Bump `TOTAL` if the new clip added length, and shift the `LINES` times accordingly.

Then `python3 tools/shots/trailer.py` rebuilds `brand/store/trailer/trailer-1080p.mp4` with the new scene woven in, music underneath, lines over the title cards.

---

You are generating the four painted scenes for the YouTube / Steam / Google
Play trailer of "Crown & Crypt", a turn-based tactics game. The trailer is
38 seconds total, 1920x1080, 24 fps. Your job is the painted scenes only —
the real game footage is filmed separately and edited in afterwards.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
THE GAME
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Crown & Crypt — knights vs the dead, on 7x7 boards, in the spirit of Into
the Breach. 25 fields across three marches (The First March, The Long
March, The Last March). The dead won't stay buried; the knights are the
last of the king's. Period: high-medieval, slightly grim. No magic glow
other than the dead's red eye and embers. The mood is quiet, tense,
mournful, with small moments of hope. Sound: sparse — wind, a crow, a low
bell, a distant drum, embers crackling.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
THE STYLE — every scene must match these exactly
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Painterly digital illustration. Soft brushwork. NOT photoreal. NOT 3D.
- Palette: dark forest green, slate-blue sky, amber dusk light, near-black
  shadows. Warm orange ONLY from embers and fire.
- Camera: slow cinematic push-in or slow lateral dolly. No fast cuts, no
  handheld shake, no whip pans.
- Composition: low horizon (sky takes the upper third at most). Subject
  centred. Foreground detail (mist, grass, standing stones) leads the eye
  to a middle-ground subject (a knight, a barrow, a gate).
- People: few, small in frame. The landscape carries the mood.
- Depth: layered — foreground / middle-ground / background / sky. Mist
  separates the layers.
- Lighting: single dominant key (amber dusk or cold dawn). No dual
  competing lights. No neon. No rim-light halos.
- Sound (if your tool generates audio): sparse, as above. No dialogue.
  No music yet — the editor layers music afterwards.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
THE REFERENCE IMAGES (uploaded with this prompt)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

The look-and-feel is established by the reference images I'm uploading
alongside this prompt. They are described below so you know what each is:

STYLE ANCHORS — these define the painterly house style. All four scenes
must match them exactly.

  IMG-1  "Barrows at dusk" — a painted still of misty grassy barrow mounds
         at dusk with a ruined castle silhouetted against an amber sky.
         Use this as the starting frame for Scene 1 and as the style
         anchor for all scenes.

  IMG-2  "Knight on the barrow" — the same barrow setting, with an
         armoured knight in a helm standing on a mound, holding a spear,
         facing the ruins. Mist in the grass. Use as the starting frame
         for Scene 2 and as the style anchor for Scene 4.

  IMG-3  "Crest in the dark" — the in-game emblem against a near-black
         background: a steel helm with gold trim on the left, a crowned
         skull with one glowing red eye on the right, a spear between
         them. Use as the starting frame for Scene 3.

  IMG-4  "Crest linework" — the same emblem rendered as flat line-art on
         a white ground (the in-game crest asset). Reference for the
         exact proportions and details of the helm, skull, and spear in
         Scene 3.

SUBJECT REFERENCES for Scene 4 — these tell you what the dead army and
the heath ground look like:

  IMG-5  "Heath biome" — a painted ground tile of low, misty marshy heath
         in dark green and brown with a thin cold-amber band at the
         horizon. This is the ground Scene 4 takes place on.

  IMG-6  "Marsh biome" — the same palette but wetter and foggier, with
         standing water and low mist. Use this as the foreground-mist
         reference for Scene 4.

  IMG-7  "Bone King unit" — the in-game portrait of the Bone King on a
         pale horse: a tall crowned figure in dark armour, a single red
         eye glowing under his crown. This is the column's head in
         Scene 4. Keep him recognisable: pale horse, crown, red eye.

  IMG-8  "Bone Archer unit" — the in-game portrait of a bone soldier in
         rusted mail with a bow. This is one rank of the column. Rusted
         mail, bone-coloured, slight decay.

  IMG-9  "Ghoul unit" — the in-game portrait of a hunched shambling
         ghoul. This is the rear of the column.

MOOD REFERENCES — these sell the world; use them to confirm the tone:

  IMG-10 "Menu shot" — the website's home-page teaser image. Shows the
         dusk feel and the painterly style at large scale.

  IMG-11 "Road shot" — a wider landscape shot of the game's road
         travelling into the distance. Reference for the depth and the
         layered-mist effect.

  IMG-12 "Hint shot" — a dark close-up of the in-game hint panel. Shows
         the dark + amber palette in a focused scene.

  IMG-13 "Backdrop" — the pure landscape backdrop the menu uses. The
         reference for atmospheric scenes with no figures.

  IMG-14 "Trailer poster" — the existing one-sheet poster for the game.
         The whole trailer's mood in one image.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
THE FOUR SCENES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SCENE 1 — "The barrows at dusk" (8 seconds)
  Starting frame: IMG-1
  A slow, steady cinematic push-in across misty grassy barrow mounds at
  dusk, toward a ruined castle silhouetted against a low band of amber
  sky. Low mist drifts and curls between the mounds and the standing
  stones; a few crows lift from a stone. No people, no text.

SCENE 2 — "The knight and the dead break out" (8 seconds)
  Starting frame: IMG-2
  The armoured knight stands on the barrow mound, holding his spear,
  facing the ruins at dusk. Mist rolls in over the mounds. In the grass
  below him a skeletal hand breaks up out of the earth, then another;
  the knight turns his helmeted head toward them and lowers his spear,
  ready. Slow, tense, cinematic; the camera eases in a little.

SCENE 3 — "The crest in embers" (5 seconds)
  Starting frames: IMG-3 (the painted still) + IMG-4 (the line-art
  reference for proportions)
  The painted emblem in the dark: a knight's steel helm with gold trim
  on the left, a crowned skull with one glowing red eye on the right, a
  spear between them. Embers drift up slowly past it, thin mist moves
  behind it, and the skull's red eye flares once; the gold trim catches
  a warm flickering light. The emblem itself stays still and whole,
  centred, the same size; the background stays near black.

SCENE 4 — "The Wide Muster: the dead march" (8 seconds)  ← THE NEW SCENE
  Style anchor: IMG-2 (the barrows-and-knight style)
  Subject references: IMG-5, IMG-6, IMG-7, IMG-8, IMG-9
  A slow lateral dolly across a low, marshy heath at grey dawn, moving
  left-to-right. A ragged column of the dead marches into frame from
  the left: bone-soldiers in rusted mail, a tall crowned figure (the
  Bone King — IMG-7) on a pale horse at their head, a few shambling
  ghouls (IMG-9) at the rear. The column is MANY — it fills the frame
  from edge to edge and keeps coming as the camera tracks. Mist lies
  low on the ground; their feet break it as they pass. The Bone King's
  single red eye glows faint. NO living knights in frame — this is the
  threat the player will have to face. Same painted style as Scenes
  1–3. No text, no logos.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DELIVERABLES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Output FOUR files, named exactly:

    scene-1-barrows.mp4     1920x1080, 24 fps, ~8 s, no audio
    scene-2-knight.mp4      1920x1080, 24 fps, ~8 s, no audio
    scene-3-crest.mp4       1920x1080, 24 fps, ~5 s, no audio
    scene-4-march.mp4       1920x1080, 24 fps, ~8 s, no audio

Codec: H.264 MP4. No watermarks. No audio track (the editor adds it).

Scene 4 is the most important one for this project — the existing
trailer has no painted shot of the dead army, and Scene 4 fills that
gap. Do not skip it.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DO NOT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Do NOT add text, letters, logos, watermarks, or UI chrome to any scene.
- Do NOT use a 3D / photoreal look. Match the painterly reference.
- Do NOT use neon, magic glow, dual rim lights, fast cuts, or whip pans.
- Do NOT add modern gear, guns, or sci-fi elements.
- Do NOT show the living knights in Scene 4 (it's the threat, not the
  heroes — the heroes are in the real game recordings).
- Do NOT change the Bone King's design: crowned skull, single red eye,
  pale horse. Keep him recognisable from the unit reference.
- Do NOT add music to the scenes — the editor layers music on top.


## When the agent delivers

Drop the four .mp4 files into ~/Dev/C&C/tools/raw/v1/ named scene-1-barrows.mp4,
scene-2-knight.mp4, scene-3-crest.mp4, scene-4-march.mp4. Then in
~/Dev/C&C/tools/shots/trailer.py:

1. In the inputs list (~line 87) add -i V1/scene-4-march.mp4 after knight.mp4.
2. In the painted-scene concatenation chain (~line 96-98) insert the new
   scene between knight.mp4 and crest.mp4 (or wherever the cut reads best).
3. Bump TOTAL if the new clip added length, and shift the LINES times
   accordingly.

Then python3 tools/shots/trailer.py rebuilds brand/store/trailer/trailer-1080p.mp4
with the new scene woven in, music underneath, lines over the title cards.
