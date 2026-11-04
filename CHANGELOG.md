# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/).

## [0.1.0] - 2026-11-04

First public release.

### Added

- **Viewer** — open OBJ, STL, FBX, glTF and GLB (file dialog or drag and drop), orbit / pan / zoom, field of view with dolly-zoom, view presets (front, back, left, right, top, 3/4), fit to screen.
- **Library** — add folders and browse every model inside as thumbnails; folders are watched and the list and thumbnails update automatically. Search by name, filter by folder.
- **Lighting** — key light with shadows, fill and ambient light, six lighting presets; original / clay / toon (2–5 steps) shading.
- **Line art** — screen-space outlines (silhouettes, overlaps, creases) and dashed hidden lines.
- **Color** — hue, saturation, brightness, contrast and a grayscale value check, applied to the viewport and to exports.
- **Perspective guides** — vanishing-point guide lines for the world axes, eye-level line, automatic 1/2/3-point detection, and camera presets for each.
- **Posing** — built-in wooden mannequin; pose rigged models by rotating joints (FK) or dragging hands and feet (CCD IK); scale joints for stylized proportions.
- **Export** — transparent PNG and layered PSD (shading, shadow, hidden lines, line art, hidden perspective layer) at 1×, 2× or 4× screen size.
- **History** — undo / redo for camera, lighting, lines, color and pose changes, with a clickable history list.
- **Languages** — English, 한국어, 日本語, 简体中文, 繁體中文, Español, Français, Deutsch (detected from the system, switchable in the toolbar).

[0.1.0]: https://github.com/Devleu0/refview3d/releases/tag/v0.1.0
