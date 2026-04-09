# Floating Teleprompter

A browser-based teleprompter built with React, TypeScript, and Vite. It supports local script editing, live preview, persistent settings, optional camera preview, and floating Picture-in-Picture teleprompter mode.

## Setup

```bash
npm install
npm run dev
```

Open the local Vite URL in a desktop Chromium-based browser.

## What it includes

- editable multi-line script area
- live teleprompter preview
- start, pause, reset, and manual nudge controls
- speed, font size, background, text color, orientation, mirror, and guide-line settings
- local persistence with `localStorage`
- optional camera preview with `getUserMedia`
- floating teleprompter mode

## Browser compatibility

- Best experience: latest Chrome or Edge on desktop
- Preferred path: Document Picture-in-Picture
- Secondary path: classic video Picture-in-Picture using a canvas-rendered live teleprompter
- Unsupported browsers: the main-page teleprompter still works and the app shows a support message instead of failing silently

## Floating fallback behavior

When Document Picture-in-Picture is unavailable, the app renders the teleprompter into a live canvas, captures that canvas as a media stream, and opens classic video Picture-in-Picture from a hidden `<video>` element.

This fallback keeps the floating experience working, but it is more limited than HTML-based Document PiP:

- the floating window is a synthetic video rather than a full DOM window
- controls stay on the main page
- layout is intentionally simpler

## Privacy notes

- No backend is used
- Scripts stay in browser storage only
- Camera video stays local to the browser and is never uploaded
