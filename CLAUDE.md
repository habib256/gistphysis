# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**gistphysis** is a collection of 4 independent educational web applications for physics and chemistry visualization. All applications are browser-based, written in vanilla JavaScript (ES6), and require no build step.

**Language**: French (comments, UI, documentation)

## Applications

| App | Path | Purpose | Key Libraries |
|-----|------|---------|---------------|
| **jsmecavideo** | `/jsmecavideo/` | Video motion analysis - track objects, extract position data, plot graphs | p5.js, Chart.js |
| **globe** | `/globe/` | 3D solar system visualization | THREE.js (CDN) |
| **orbitarium** | `/orbitarium/www/` | 2D orbital mechanics simulator (PWA) | Canvas API, Capacitor |
| **reactions** | `/reactions/` | Chemical equation balancing game | Vanilla JS |

## Running Applications

No build required. Open the `index.html` file directly in a browser:
- `jsmecavideo/index.html`
- `globe/index.html`
- `orbitarium/www/index.html`
- `reactions/index.html`

For orbitarium mobile builds:
```bash
cd orbitarium
npm install
npx cap sync
npx cap open ios   # or: npx cap open android
```

## Architecture

### jsmecavideo
Controller pattern with modular classes:
- `mecavideo.js` - Main controller, UI initialization, mode switching
- `VideoPlayer` / `WebcamPlayer` - Media playback with frame-by-frame control
- `Visor` - Crosshair overlay for point tracking
- `Calibrator` - Pixel-to-real-world scale conversion
- `Data` - Multi-mobile point storage (supports 4 tracked objects)
- `Graph` - Chart.js wrapper for trajectory visualization

Data flow: User clicks → Data stores (time, x, y) → Graph renders

### globe
THREE.js scene with spherical camera controls:
- `app.js` - Scene setup and render loop
- `System.js` - Planet/moon creation with orbital mechanics
- `Control.js` - Mouse drag rotation, scroll zoom
- `planet.js` - Material/texture utilities

### orbitarium
Canvas-based n-body simulation:
- `animation.js` - requestAnimationFrame loop
- `simulation.js` - Orbital mechanics coordinator
- `planets.js` - Celestial body definitions with real orbital parameters
- `canvas.js` - Zoom/pan transformations
- `controls.js` - Touch/mouse interaction
- `drawing.js` - Orbit/body rendering
- `traces.js` - Trajectory history

### reactions
Simple game loop:
- `game.js` - Game state, scoring, difficulty levels
- `equation.js` - Chemical equation data structures

## Video Conversion (jsmecavideo)

Get framerate for new videos:
```bash
ffprobe -v error -select_streams v -of default=noprint_wrappers=1:nokey=1 -show_entries stream=r_frame_rate video.mp4
```

## Utilities

- `marsRetrogradation.py` - Mars retrograde motion simulation (requires matplotlib, numpy)
