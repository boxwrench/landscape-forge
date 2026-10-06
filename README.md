# Landscape Forge

A one-file template for explorable procedural 3D landscapes, built on three.js 0.186.1.

## Files
- `index.html`: the page, ready to open. Serve the folder (for example `npx serve .` or `python3 -m http.server`) and open http://localhost:8000/. It loads three.js from cdn.jsdelivr.net, so it needs internet access.
- `artifact.html`: the same code without the `<html>`/`<head>` wrapper. This is the form published as a Claude artifact.
- `tests/`: headless screenshot scripts used during development.

## Making a new world
Open the script in `index.html`, find `PRESETS`, copy an entry, and change its numbers and colours. Every field is explained in `DEFAULT_WORLD` just above it. Anything you leave out falls back to the defaults.
Tree types: pine, broadleaf, birch, palm, cactus, shrub.

You can also do it without editing code. In the page, use **Copy world** to get a world's settings as JSON, edit them, and paste them back with **Load world**.

## How it is put together (top to bottom in the script)
1. Settings: `DEFAULT_WORLD`, `PRESETS`, styles and slider definitions.
2. Noise: a seeded simplex noise, fbm and ridged noise.
3. Shared shader code: value noise, height fog, cloud density and shadows, and the mountain-shadow lookup.
   `patchStandard()` adds these to three's standard material.
4. Renderer and post-processing: sky dome, light shafts, bloom, tone mapping, and the style pass (Natural, Painterly/Kuwahara, Cel, Watercolor).
5. Terrain: heightfield (warped fbm + ridged noise, terraces, island falloff), droplet hydraulic erosion, vertex painting by height and slope, and mountain shadows ray-marched on the CPU.
6. Plants: procedural tree and rock geometry, placed in chunked instanced meshes.
7. Grass: blades that wrap around the camera and read height, slope and density from textures.
8. Water: planar reflection, depth from the heightfield, foam and sun glints.
9. Birds, sun, sky colour and mood settings.
10. World assembly, camera controls, guided tour, interface and the frame loop.

## Running the screenshot tests
```
cd tests
npm install
node run2.mjs .. thornwood,mesa,atoll,emberfall,fjord   # one screenshot per preset
node run3.mjs ..                                       # interface, walking view, styles, phone width
```
The scripts expect Chromium at `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`. Edit `executablePath` in each script to point at your own Chrome or Chromium. They serve three.js from `tests/node_modules` in place of the CDN. Software rendering is slow, so allow a few minutes.
