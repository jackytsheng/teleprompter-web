# requirement.md

## Project Title
Browser-based Floating Teleprompter Website

## Goal
Build a browser-based teleprompter website that allows a user to:
1. write and edit a script directly in the page,
2. configure teleprompter display settings,
3. open the teleprompter in a floating always-on-top window,
4. optionally show a live camera preview while reading,
5. keep the experience simple enough to run locally or deploy as a static web app.

---

## Product Summary
The website should function as a teleprompter tool for creators who want to read a script while also using their camera.

The preferred experience is:
- user opens the website,
- pastes or edits a script,
- adjusts speed and appearance,
- clicks a button such as **Start Floating Teleprompter**,
- teleprompter opens in a floating browser PiP-style window,
- user can then switch to another app or browser tab and continue reading the script,
- optionally, the floating window also shows a live camera preview.

---

## Core Technical Direction

### Preferred implementation
Use **Document Picture-in-Picture** when available so the floating window can contain:
- scrolling text,
- custom layout,
- optional guide line,
- optional live camera preview,
- custom controls.

### Fallback implementation
If Document Picture-in-Picture is not available:
- fall back to a `<canvas>`-based rendered teleprompter,
- stream the canvas into a hidden `<video>`,
- use classic `requestPictureInPicture()` on that video.

### Browser target
Primary target:
- latest Chromium-based desktop browsers:
  - Chrome
  - Edge

Secondary target:
- other browsers may have reduced support or show a graceful “feature not supported” message.

### Hosting target
The app should work on:
- localhost for development,
- HTTPS deployment for production.

Note:
- Any PiP-related APIs and camera access should assume secure context requirements.

---

## User Stories

### Script editing
As a user, I want to:
- type or paste my script into the website,
- edit it directly on the page,
- keep formatting simple and readable.

### Floating mode
As a user, I want to:
- click a button to open the teleprompter in a floating always-on-top window,
- keep reading while using another app,
- continue seeing the script even when the main tab is not focused.

### Camera usage
As a user, I want to:
- optionally turn on my camera,
- see my live camera preview while reading,
- be able to keep both camera preview and teleprompter visible in the floating mode if supported.

### Teleprompter controls
As a user, I want to configure:
- text rolling speed,
- background color,
- text color,
- text orientation,
- mirrored mode,
- guide line visibility.

---

## Functional Requirements

## 1. Script Editor
The main page must include:
- a large editable text area for script input,
- support for multi-line plain text,
- support for paste,
- live updates to the teleprompter preview.

Nice to have:
- auto-save to local storage,
- restore the last script on reload.

---

## 2. Teleprompter Display Settings

The app must let the user configure the following:

### 2.1 Scrolling speed
User can adjust text rolling speed.
Suggested UI:
- slider
- numeric indicator

Behavior:
- speed should affect automatic upward scrolling smoothly,
- speed changes should apply live without restarting.

Suggested internal model:
- pixels per second or lines per minute.

### 2.2 Background color
Available options:
- black
- white

### 2.3 Text color
Available options:
- white
- yellow
- green
- light blue
- black

### 2.4 Text orientation
Available options:
- normal horizontal
- rotated -90 degrees
- rotated 90 degrees
- optional vertical layout if feasible

Important:
- if “vertical” is implemented, it should be a true readable vertical arrangement, not just broken CSS.
- if true vertical writing is too complex or inconsistent, it is acceptable to support:
  - horizontal
  - rotate -90
  - rotate 90

### 2.5 Mirrored mode
User can toggle whether text is mirrored.
Purpose:
- useful when reading through a reflective teleprompter rig.

Behavior:
- mirrored mode should flip text horizontally.

### 2.6 Indicative guide line
User can toggle a center guide line that marks the current reading position.

Behavior:
- line should stay fixed while text scrolls behind it,
- line should be subtle but clearly visible.

---

## 3. Floating Window Mode

### 3.1 Start floating
The app must include a button:
- **Start Floating Teleprompter**

Expected behavior:
- opens teleprompter in floating PiP-style window,
- floating window remains visible while user switches apps or tabs.

### 3.2 Stop floating
The app must include a way to close or stop floating mode.

### 3.3 Sync behavior
State should stay synchronized between:
- main page controls
- floating window display

That means:
- editing the script on the main page updates the floating teleprompter,
- speed changes update live,
- appearance changes update live,
- camera toggle updates live.

### 3.4 Floating layout
The floating window should prioritize readability.

Suggested layout options:
- **Mode A: Text-only**
  - full window used for teleprompter text
- **Mode B: Text + camera**
  - script takes most of the window
  - small camera preview appears in a corner

Camera preview should be:
- movable if easy to implement,
- otherwise pinned to top-right or bottom-right.

---

## 4. Camera Support

### 4.1 Enable camera
The app must provide a control:
- **Enable Camera**

Behavior:
- requests webcam permission from the browser,
- shows local preview.

### 4.2 Camera in floating mode
If technically possible in the chosen browser/API path:
- the floating window should show the live camera preview alongside the teleprompter text.

If not possible in a specific fallback path:
- show text-only in PiP and keep camera preview on the main page.

### 4.3 Camera constraints
Initial implementation can use:
- default webcam,
- no device switching required.

Nice to have later:
- camera device picker,
- mirror camera preview independently from teleprompter mirror.

---

## 5. Scrolling / Playback Behavior

### 5.1 Start / pause
User can:
- start scrolling,
- pause scrolling,
- resume scrolling.

### 5.2 Reset
User can:
- reset script scroll position to top.

### 5.3 Manual adjustment
User can:
- manually nudge position up/down,
- or drag scroll position if easy to implement.

Nice to have:
- step backward / forward by a fixed amount.

### 5.4 Smooth rendering
Scrolling should appear smooth and readable.
Use animation timing appropriate for browser rendering.

---

## 6. Persistence
Store user preferences locally in the browser:
- script content
- speed
- background color
- text color
- orientation
- mirrored toggle
- guide line toggle
- camera enabled preference if appropriate

Implementation suggestion:
- `localStorage`

No backend is required for v1.

---

## 7. Non-Functional Requirements

### 7.1 No backend required
Version 1 should be fully client-side.

### 7.2 Privacy
- scripts should remain local in browser storage only,
- camera feed should never be uploaded,
- no analytics required unless explicitly added later.

### 7.3 Performance
- should handle long scripts,
- should scroll smoothly on desktop,
- should not consume excessive CPU.

### 7.4 Accessibility
- controls should be labeled,
- color selections should be obvious,
- default font size should be readable.

---

## 8. UX Requirements

### Main page layout
The page should contain:
- left or top section for script editor,
- right or bottom section for preview/settings,
- clear action buttons:
  - Start
  - Pause
  - Reset
  - Start Floating Teleprompter
  - Enable Camera

### Suggested settings UI
- speed slider
- font size slider
- background color toggle
- text color buttons/dropdown
- orientation dropdown
- mirrored toggle
- guide line toggle
- camera toggle

### Preview
The main page should show a live preview of the teleprompter before entering floating mode.

---

## 9. Technical Acceptance Criteria

The implementation is acceptable if:

1. User can type/paste a script into the page.
2. User can edit the script and see changes reflected in preview.
3. User can change:
   - rolling speed
   - background color
   - text color
   - orientation
   - mirrored mode
   - guide line visibility
4. User can start and pause scrolling.
5. User can open a floating teleprompter window in supported browsers.
6. In supported browsers, the floating window remains visible while the user switches away from the page.
7. Camera preview can be enabled and shown either:
   - inside the floating window, or
   - on the main page with a clearly documented limitation for fallback mode.
8. User preferences persist locally across reloads.
9. Unsupported browsers show a graceful fallback or warning.

---

## 10. Explicit Technical Questions to Solve During Build

The implementation should decide between these two rendering models:

### Option A: Document PiP native HTML teleprompter
Pros:
- simplest for custom layout
- easiest to place text + guide line + camera preview together
- easier to build live controls

Cons:
- browser support is narrower

### Option B: Canvas-generated teleprompter video
Pros:
- works with classic video PiP model
- predictable rendered output

Cons:
- more complex
- text rendering, layout, and controls are harder
- camera + text composition must be drawn into canvas
- all content is effectively generated at runtime as a synthetic live video feed

### Preferred decision
Use:
1. Document PiP first
2. canvas/video PiP fallback second

---

## 11. Answer to Product Question: “Can this video be feed live?”
Yes. The teleprompter content does not need to come from a prerecorded file.

There are two valid implementation models:

### Model 1: Live HTML in Document PiP
- render script and camera preview directly as live DOM content
- no video generation needed

### Model 2: Runtime-generated live video
- render teleprompter text (and optionally camera preview) into a canvas
- convert canvas output into a live media stream
- feed that stream to a video element
- send that video element into Picture-in-Picture

For this project, Model 1 is preferred when supported.

---

## 12. Suggested Tech Stack
- React + TypeScript + Vite
- CSS modules or Tailwind
- browser APIs:
  - `navigator.mediaDevices.getUserMedia`
  - `documentPictureInPicture.requestWindow` when supported
  - `HTMLVideoElement.requestPictureInPicture` as fallback
  - `localStorage`

---

## 13. Out of Scope for v1
Do not build these unless needed later:
- cloud sync
- user accounts
- sharing scripts across devices
- importing/exporting script files
- remote control by phone
- speech tracking / auto-scroll by voice
- multiple camera devices
- mobile browser support
- full teleprompter hardware integration

---

## 14. Deliverables
Codex should generate:
1. the web app source code,
2. a short README with setup instructions,
3. a note explaining browser compatibility,
4. a note describing how fallback mode behaves when Document PiP is unavailable.

---

## 15. Implementation Notes for Codex
Please build the app with:
- clean modular components,
- a clear feature detection layer for PiP support,
- graceful fallback behavior,
- comments around the floating-window implementation,
- no backend.

Prioritize a working desktop Chromium version first.