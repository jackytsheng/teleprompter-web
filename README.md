# Floating Teleprompter

A browser-based teleprompter built with React, TypeScript, and Vite. It renders the script into a live video feed so the preview itself can be used with video Picture-in-Picture.

## Setup

```bash
npm install
npm run dev
```

Open the local Vite URL in a desktop Chromium-based browser.

## What it includes

- editable multi-line script area
- live teleprompter video feed preview
- start, pause, reset, and manual nudge controls
- speed, font size, background, text color, orientation, mirror, and guide-line settings
- local persistence with `localStorage`
- video Picture-in-Picture for the live feed

## Browser compatibility

- Best experience: Safari on iPhone for testing video PiP, or Chrome/Edge on desktop
- This version prioritizes video Picture-in-Picture instead of Document Picture-in-Picture
- Unsupported browsers: the main-page live feed still works and the app shows a support message instead of failing silently

## PiP behavior

The app renders the teleprompter into a live canvas, captures that canvas as a media stream, and plays it through a visible `<video>` element. That same video feed is what enters Picture-in-Picture.

This makes the preview path and the PiP path match, which is useful on iPhone Safari. A couple of practical notes:

- use Safari, not a Home Screen PWA, if you want the best chance of PiP working
- the PiP window is a synthetic live video feed rather than a full DOM window
- if the browser heavily suspends background page rendering, the live teleprompter feed may pause when the page is fully backgrounded

## Privacy notes

- No backend is used
- Scripts stay in browser storage only
