# requirement.md

## Project Title
Browser-based Live Feed Teleprompter

## Goal
Build a browser-based teleprompter website that allows a user to:
1. write and edit a script directly in the page,
2. configure teleprompter display settings,
3. render the teleprompter as a live video feed,
4. open that live feed in Picture-in-Picture when supported,
5. keep the experience simple enough to run locally or deploy as a static web app.

---

## Product Summary
The website should function as a teleprompter tool for creators who want a readable script feed that can be pushed into browser PiP, including testing on iPhone Safari where video PiP is more relevant than Document PiP.

The preferred experience is:
- user opens the website,
- pastes or edits a script,
- adjusts speed and appearance,
- chooses whether the live feed should be portrait or landscape,
- clicks a button such as **Open PiP Feed**,
- the teleprompter live feed opens in browser Picture-in-Picture,
- user can keep reading from that live feed while using other apps if the browser/platform allows it.

---

## Core Technical Direction

### Preferred implementation
Use a `<canvas>`-based rendered teleprompter as the primary rendering path:
- render the script into a canvas continuously,
- convert the canvas output into a live `MediaStream`,
- play that stream in a visible `<video>` element,
- use `requestPictureInPicture()` on that video when supported.

This is the preferred direction because the preview itself is a real live video feed, which aligns better with iPhone Safari PiP behavior.

### Secondary implementation
Document Picture-in-Picture is optional and not required for v1.

### Browser target
Primary targets:
- Safari on iPhone for video PiP testing
- latest desktop Chromium-based browsers:
  - Chrome
  - Edge

Secondary target:
- other browsers may have reduced support or show a graceful “feature not supported” message.

### Hosting target
The app should work on:
- localhost for development,
- HTTPS deployment for production.

Note:
- PiP features depend on browser and platform support.
- On mobile Safari, behavior may differ between Safari tabs and Home Screen web apps.

---

## User Stories

### Script editing
As a user, I want to:
- type or paste my script into the website,
- edit it directly on the page,
- keep formatting simple and readable.

### Live feed mode
As a user, I want to:
- see the teleprompter rendered as a live video feed,
- use that same feed as the source for PiP,
- keep the page preview and the PiP preview visually consistent.

### Picture-in-Picture
As a user, I want to:
- click a button to open the teleprompter live feed in PiP,
- keep reading while using another app when the browser allows it,
- close PiP from either browser controls or the page controls.

### Teleprompter controls
As a user, I want to configure:
- text rolling speed,
- background color,
- text color,
- text orientation,
- portrait or landscape feed size,
- mirrored mode,
- guide line visibility.

### Playback control
As a user, I want to:
- start scrolling,
- pause scrolling,
- reset position,
- nudge position up or down,
- jump backward or forward by 10 seconds.

Important:
- because the preview is a live generated feed rather than a prerecorded video file, “10 seconds” is an approximate position jump based on the current scroll speed, not true media seeking.

---

## Functional Requirements

## 1. Script Editor
The main page must include:
- a large editable text area for script input,
- support for multi-line plain text,
- support for paste,
- live updates to the teleprompter preview feed.

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
- pixels per second.

### 2.2 Font size
User can adjust text size.
Suggested UI:
- slider
- numeric indicator

Behavior:
- changes should apply live to the rendered feed.

### 2.3 Live feed size
Available options:
- portrait
- landscape

Behavior:
- portrait should render the live feed in a tall aspect ratio suitable for phone-oriented use,
- landscape should render the live feed in a wide aspect ratio suitable for desktop or horizontal use,
- PiP should use the currently selected live feed aspect ratio.

### 2.4 Background color
Available options:
- black
- white

Suggested UI:
- visible pill buttons rather than a dropdown.

### 2.5 Text color
Available options:
- white
- yellow
- green
- light blue
- black

Suggested UI:
- visible pill buttons rather than a dropdown.

### 2.6 Text orientation
Available options:
- normal horizontal
- rotated -90 degrees
- rotated 90 degrees

### 2.7 Mirrored mode
User can toggle whether text is mirrored.
Purpose:
- useful when reading through a reflective teleprompter rig.

Behavior:
- mirrored mode should flip text horizontally.

### 2.8 Indicative guide line
User can toggle a center guide line that marks the current reading position.

Behavior:
- line should stay fixed while text scrolls behind it,
- line should be subtle but clearly visible.

---

## 3. Picture-in-Picture Mode

### 3.1 Open PiP
The app must include a button:
- **Open PiP Feed**

Expected behavior:
- opens the live teleprompter video feed in browser PiP,
- PiP remains visible while user switches context when the platform/browser permits it.

### 3.2 Close PiP
The app must include a way to close or stop PiP mode.

### 3.3 Sync behavior
State should stay synchronized between:
- main page controls
- preview feed
- PiP feed

That means:
- editing the script updates the visible preview feed,
- speed changes update live,
- appearance changes update live,
- portrait/landscape mode updates live,
- PiP reflects the same live feed source as the main preview.

### 3.4 Limitations
The product should clearly acknowledge:
- PiP support varies by browser,
- Home Screen web apps on iPhone may behave differently from Safari tabs,
- background execution policies may reduce or pause the live feed on some platforms.

---

## 4. Playback Behavior

### 4.1 Start / pause
User can:
- start scrolling,
- pause scrolling,
- resume scrolling.

### 4.2 Reset
User can:
- reset script scroll position to top.

### 4.3 Manual adjustment
User can:
- manually nudge position up/down.

### 4.4 Skip backward / forward
User can:
- jump backward by 10 seconds,
- jump forward by 10 seconds.

Behavior:
- these jumps should be implemented as scroll-position jumps based on the current speed,
- the app does not need a true seekable media timeline.

### 4.5 Smooth rendering
Scrolling should appear smooth and readable.
Use animation timing appropriate for browser rendering.

---

## 5. Persistence
Store user preferences locally in the browser:
- script content
- speed
- font size
- feed mode
- background color
- text color
- orientation
- mirrored toggle
- guide line toggle

Implementation suggestion:
- `localStorage`

No backend is required for v1.

---

## 6. Non-Functional Requirements

### 6.1 No backend required
Version 1 should be fully client-side.

### 6.2 Privacy
- scripts should remain local in browser storage only,
- no analytics required unless explicitly added later.

### 6.3 Performance
- should handle long scripts,
- should scroll smoothly,
- should not consume excessive CPU,
- live feed generation should remain stable enough for local use and PiP testing.

### 6.4 Accessibility
- controls should be labeled,
- color selections should be obvious,
- default font size should be readable,
- pill controls should have clear selected states.

---

## 7. UX Requirements

### Main page layout
The page should contain:
- left or top section for script editor,
- right or bottom section for preview/settings,
- clear action buttons:
  - Start
  - Pause
  - Reset
  - Nudge Up
  - Nudge Down
  - Back 10s
  - Forward 10s
  - Open PiP Feed
  - Close PiP

### Suggested settings UI
- speed slider
- font size slider
- portrait / landscape pill selector
- background color pill buttons
- text color pill buttons
- orientation dropdown
- mirrored toggle
- guide line toggle

### Preview
The main page should show a live video feed preview of the teleprompter before entering PiP.

---

## 8. Technical Acceptance Criteria

The implementation is acceptable if:

1. User can type/paste a script into the page.
2. User can edit the script and see changes reflected in the live feed preview.
3. User can change:
   - rolling speed
   - font size
   - feed mode
   - background color
   - text color
   - orientation
   - mirrored mode
   - guide line visibility
4. User can start and pause scrolling.
5. User can jump backward and forward by 10 seconds worth of scroll position.
6. User can open the live teleprompter feed in PiP in supported browsers.
7. The preview feed and PiP feed stay visually synchronized because they use the same live video source.
8. User preferences persist locally across reloads.
9. Unsupported browsers show a graceful fallback or warning.

---

## 9. Explicit Technical Questions to Solve During Build

The implementation should decide between these rendering models:

### Option A: Canvas-generated live teleprompter video
Pros:
- aligns directly with video PiP
- same feed can be used for preview and PiP
- better fit for iPhone Safari testing

Cons:
- text layout must be rendered manually
- live streams are not truly seekable like normal videos

### Option B: Document PiP native HTML teleprompter
Pros:
- easier DOM layout for controls and text
- easier to build rich floating UI

Cons:
- less aligned with iPhone Safari video PiP flow
- browser support differs more across platforms

### Preferred decision
Use:
1. canvas-generated live video feed first
2. optional Document PiP later only if needed

---

## 10. Answer to Product Question: “Can this video be feed live?”
Yes.

For this project, the teleprompter should be generated as a live feed:
- render teleprompter text into a canvas,
- convert the canvas output into a live media stream,
- feed that stream to a video element,
- use that video element as both the on-page preview and the PiP source.

This project does not require prerecorded video files.

---

## 11. Suggested Tech Stack
- React + TypeScript + Vite
- CSS modules, plain CSS, or Tailwind
- browser APIs:
  - `HTMLCanvasElement.captureStream()`
  - `HTMLVideoElement.requestPictureInPicture()`
  - `localStorage`

---

## 12. Out of Scope for v1
Do not build these unless needed later:
- cloud sync
- user accounts
- sharing scripts across devices
- importing/exporting script files
- remote control by phone
- speech tracking / auto-scroll by voice
- built-in camera preview
- multiple camera devices
- full teleprompter hardware integration

---

## 13. Deliverables
Codex should generate:
1. the web app source code,
2. a short README with setup instructions,
3. a note explaining browser compatibility,
4. a note describing how the live feed PiP behavior works,
5. a note describing browser/platform limitations, especially on iPhone.

---

## 14. Implementation Notes for Codex
Please build the app with:
- clean modular components,
- a clear feature detection layer for PiP support,
- graceful fallback behavior,
- no backend.

Prioritize:
1. a working live video feed preview,
2. working video PiP,
3. iPhone Safari testing compatibility,
4. simple, obvious controls for script reading.
