# Landscape Forge

A one-file template for explorable procedural 3D landscapes, built on three.js 0.186.1.

## Files
- `index.html`: the page, ready to open. Serve the folder (for example `npx serve .` or `python3 -m http.server`) and open http://localhost:8000/. It loads three.js from cdn.jsdelivr.net, so it needs internet access.
- `artifact.html`: the same code without the `<html>`/`<head>` wrapper. This is the form published as a Claude artifact.
- `tests/`: headless screenshot scripts used during development.

## Making a new world
Open the script in `index.html`, find `PRESETS`, copy an entry, and change its numbers and colours. Every field is explained in `DEFAULT_WORLD` just above it. Anything you leave out falls back to the defaults.
Tree types: pine, broadleaf, birch, palm, cactus, shrub.
`shore` controls reeds and pebbles at the waterline; `understory` controls ferns and fallen logs under trees.

You can also do it without editing code. In the page, use **Copy world** to get a world's settings as JSON, edit them, and paste them back with **Load world**.

## Strange life and Moebius palettes
Each world's `exotic` block picks one of each: odd plants (`flora`), small creatures near the camera (`fauna`),
large shapes far off in the sky (`sky`), giant remains (`bones`) and things that float (`floating`).
The five presets use different ones, so no two worlds share a kind. They only appear in the Moebius look. Allowed values are listed in `DEFAULT_WORLD`.
`moebius` is an optional colour scheme (sky, rock, ground, sand, grass, water, foliage, bark, shadow and the
strange-life colours) that replaces the world's colours in the Moebius look. A list gives one colour per species.

## How it is put together (top to bottom in the script)
1. Settings: `DEFAULT_WORLD`, `PRESETS`, styles and slider definitions.
2. Noise: a seeded simplex noise, fbm and ridged noise.
3. Shared shader code: value noise, height fog, cloud density and shadows, and the mountain-shadow lookup.
   `patchStandard()` adds these to three's standard material. With `detail` it also blends a tiling ground texture
   (soil clods, sand ripples, rock, pebbles). Materials meet by height blending (sand settles between clods and stones),
   sand ripples run across the wind (after Journey's sand), and there is bump,
   a wet shoreline and caustics under water. `ground.dunes` spreads rippled sand over flat dry ground.
   With `leaf` it gives foliage cards soft normals and backlit glow.
   Textures (leaves, needles, fern fronds, bark, ground detail) are drawn on canvases at start, so there are no image files.
4. Renderer and post-processing: sky dome, then camera motion blur and depth of field (both read the scene depth),
   light shafts (fed only by sky pixels, with bright samples capped), bloom, tone mapping, and the style pass (grade and split toning, plus Painterly/Kuwahara, Moebius, Van Gogh).
   Moebius (ligne claire) is built into the lighting via the shared `uToon` uniform: flat lit and shadow fills, pen hatching
   in shadow, ink strokes on rock folds from the relief map's curvature, flat outlined clouds; the post pass adds silhouette
   and fold lines from depth and a pale pastel palette with lavender shade.
   Van Gogh paints the world itself (shared `uVG` uniform, `GLSL_VG`): brush dabs on a world-space grid, each with its own
   direction (along contours on the ground, upright on cliffs and trunks, across the wind on water), doubling in size
   with distance so they keep a steady size on screen and never slide. The sky's swirls are dabs laid on the dome.
   The final pass only adds his colour and dark-blue contours.
   Autofocus marches along the view against the ground and tree crowns. Sound is synthesised with Web Audio:
   wind, rustling leaves, lapping water, birdsong by day and crickets at dusk, mixed by where the camera is.
5. Terrain: heightfield (warped fbm + ridged noise, terraces, island falloff), droplet hydraulic erosion, base ground colour per vertex, and mountain shadows ray-marched on the CPU.
   `bakeMacro()` then bakes a relief map at about 2 m per pixel (four times the mesh): smoothly resampled heights plus rock
   detail and downhill gullies on steep ground, stored as normals, with ambient occlusion (sky openness times crease depth)
   in alpha. The terrain shader decides rock, snow and shore per pixel from it, so edges stay crisp at any distance,
   and switches to a coarse 90 m pattern far away instead of fading to plain colour.
6. Plants: near trees are bark plus alpha-cut foliage cards; past the detail distance each chunk swaps to a cheaper solid
   stand-in (`chunked()` with `lo`, switched in `updateLOD()`). `scatter()` adds reeds, pebbles, ferns and fallen logs.
7. Grass: clumps of 7 to 9 blades that share a root and fan outward (the clumping idea from Ghost of Tsushima's grass),
   in a field that wraps around the camera and reads height, slope and density from textures. Broad world-space patches
   make stretches taller or shorter and fresher or drier (`grass.dry`). Grass writes alpha 0 so the Cel and Watercolor
   outlines, which come from depth rather than colour, skip it. Grass reads the sun's shadow map and the relief map,
   so it shares the ground's shadows and stays off rock faces.
8. Water: planar reflection, depth from the heightfield, foam and sun glints.
9. Birds, sun, sky colour and mood settings.
10. World assembly, camera controls, guided tour, interface and the frame loop.

## Running the screenshot tests
```
cd tests
npm install
node run2.mjs .. thornwood,mesa,atoll,emberfall,fjord   # one screenshot per preset
node run3.mjs ..                                       # interface, walking view, styles, phone width
node run4.mjs .. thornwood                             # close-ups: forest, shore, cliff, reeds, ferns, logs
node run5.mjs .. x                                     # effects buttons, sound toggle, motion blur while turning
```
The scripts expect Chromium at `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`. Edit `executablePath` in each script to point at your own Chrome or Chromium. They serve three.js from `tests/node_modules` in place of the CDN. Software rendering is slow, so allow a few minutes.
