import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getSupportMessage, supportsVideoPictureInPicture } from "./support";
import type { TeleprompterSettings } from "./types";

const STORAGE_KEY = "floating-teleprompter-v2";
const DEFAULT_SCRIPT = `Welcome to your live teleprompter feed.

This version renders the teleprompter into a live video stream.

Press Start to scroll, then open Picture-in-Picture from the video feed.

That makes it easier to test on iPhone Safari using the browser's video PiP flow.`;

const DEFAULT_SETTINGS: TeleprompterSettings = {
  speed: 55,
  fontSize: 44,
  background: "black",
  textColor: "white",
  orientation: "horizontal",
  mirrored: false,
  guideLine: true,
};

const TEXT_COLOR_MAP: Record<TeleprompterSettings["textColor"], string> = {
  white: "#f5f7fb",
  yellow: "#ffe45b",
  green: "#8ff0b3",
  lightBlue: "#8ad8ff",
  black: "#111827",
};

const BACKGROUND_MAP: Record<TeleprompterSettings["background"], string> = {
  black: "#030712",
  white: "#f8fafc",
};

function readStoredState(): { script: string; settings: TeleprompterSettings } {
  if (typeof window === "undefined") {
    return { script: DEFAULT_SCRIPT, settings: DEFAULT_SETTINGS };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { script: DEFAULT_SCRIPT, settings: DEFAULT_SETTINGS };
    }

    const parsed = JSON.parse(raw) as Partial<{
      script: string;
      settings: Partial<TeleprompterSettings>;
    }>;

    return {
      script: typeof parsed.script === "string" ? parsed.script : DEFAULT_SCRIPT,
      settings: {
        ...DEFAULT_SETTINGS,
        ...parsed.settings,
      },
    };
  } catch {
    return { script: DEFAULT_SCRIPT, settings: DEFAULT_SETTINGS };
  }
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const logicalLines = text.split("\n");
  const wrapped: string[] = [];

  for (const logicalLine of logicalLines) {
    if (!logicalLine.trim()) {
      wrapped.push("");
      continue;
    }

    const words = logicalLine.split(/\s+/);
    let currentLine = words[0] ?? "";

    for (let index = 1; index < words.length; index += 1) {
      const candidate = `${currentLine} ${words[index]}`;
      if (ctx.measureText(candidate).width <= maxWidth) {
        currentLine = candidate;
      } else {
        wrapped.push(currentLine);
        currentLine = words[index];
      }
    }

    wrapped.push(currentLine);
  }

  return wrapped;
}

export default function App() {
  const stored = useMemo(() => readStoredState(), []);
  const [script, setScript] = useState(stored.script);
  const [settings, setSettings] = useState<TeleprompterSettings>(stored.settings);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [pipActive, setPipActive] = useState(false);
  const [pipError, setPipError] = useState("");

  const supportMessage = useMemo(() => getSupportMessage(), []);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewVideoRef = useRef<HTMLVideoElement | null>(null);
  const feedStreamRef = useRef<MediaStream | null>(null);
  const playbackFrameRef = useRef<number | null>(null);
  const drawFrameRef = useRef<number | null>(null);
  const lastPlaybackTimeRef = useRef<number | null>(null);

  useEffect(() => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        script,
        settings,
      }),
    );
  }, [script, settings]);

  useEffect(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 720;
    canvas.height = 1280;
    canvasRef.current = canvas;

    const stream = canvas.captureStream(30);
    feedStreamRef.current = stream;

    const video = previewVideoRef.current;
    if (video) {
      video.srcObject = stream;
      void video.play().catch(() => {
        // iPhone Safari may wait for a user gesture before autoplaying inline video.
      });
    }

    return () => {
      stream.getTracks().forEach((track) => track.stop());
      feedStreamRef.current = null;
      canvasRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!isPlaying) {
      if (playbackFrameRef.current) {
        cancelAnimationFrame(playbackFrameRef.current);
        playbackFrameRef.current = null;
      }
      lastPlaybackTimeRef.current = null;
      return;
    }

    const tick = (now: number) => {
      if (lastPlaybackTimeRef.current === null) {
        lastPlaybackTimeRef.current = now;
      }

      const delta = (now - lastPlaybackTimeRef.current) / 1000;
      lastPlaybackTimeRef.current = now;

      setScrollOffset((previous) => Math.max(0, previous + settings.speed * delta));
      playbackFrameRef.current = requestAnimationFrame(tick);
    };

    playbackFrameRef.current = requestAnimationFrame(tick);
    return () => {
      if (playbackFrameRef.current) {
        cancelAnimationFrame(playbackFrameRef.current);
        playbackFrameRef.current = null;
      }
      lastPlaybackTimeRef.current = null;
    };
  }, [isPlaying, settings.speed]);

  useEffect(() => {
    const video = previewVideoRef.current;
    if (!video) {
      return;
    }

    const ensurePlayback = async () => {
      try {
        await video.play();
      } catch {
        // User gesture may still be required on some mobile browsers.
      }
    };

    void ensurePlayback();
  }, [script]);

  const openPictureInPicture = useCallback(async () => {
    const video = previewVideoRef.current;
    if (!video) {
      return;
    }

    setPipError("");

    try {
      if (!supportsVideoPictureInPicture() || !video.requestPictureInPicture) {
        throw new Error("Video Picture-in-Picture is not available in this browser.");
      }

      if (video.readyState < 2) {
        await video.play();
      }

      await video.requestPictureInPicture();
      setPipActive(true);
    } catch (error) {
      setPipError(error instanceof Error ? error.message : "Unable to open Picture-in-Picture.");
    }
  }, []);

  const closePictureInPicture = useCallback(async () => {
    setPipError("");

    if (document.pictureInPictureElement && document.exitPictureInPicture) {
      try {
        await document.exitPictureInPicture();
      } catch (error) {
        setPipError(error instanceof Error ? error.message : "Unable to close Picture-in-Picture.");
      }
    }
  }, []);

  useEffect(() => {
    const video = previewVideoRef.current;
    if (!video) {
      return;
    }

    const handleEnter = () => setPipActive(true);
    const handleLeave = () => setPipActive(false);

    video.addEventListener("enterpictureinpicture", handleEnter);
    video.addEventListener("leavepictureinpicture", handleLeave);

    return () => {
      video.removeEventListener("enterpictureinpicture", handleEnter);
      video.removeEventListener("leavepictureinpicture", handleLeave);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    const draw = () => {
      const width = canvas.width;
      const height = canvas.height;
      const background = BACKGROUND_MAP[settings.background];
      const foreground = TEXT_COLOR_MAP[settings.textColor];
      const isHorizontal = settings.orientation === "horizontal";
      const drawWidth = isHorizontal ? width : height;
      const drawHeight = isHorizontal ? height : width;
      const fontSize = settings.fontSize * 1.4;
      const lineHeight = fontSize * 1.34;
      const maxTextWidth = Math.min(drawWidth - 92, 620);

      context.save();
      context.clearRect(0, 0, width, height);
      context.fillStyle = background;
      context.fillRect(0, 0, width, height);

      context.translate(width / 2, height / 2);
      if (settings.orientation === "rotateLeft") {
        context.rotate(-Math.PI / 2);
      } else if (settings.orientation === "rotateRight") {
        context.rotate(Math.PI / 2);
      }
      context.scale(settings.mirrored ? -1 : 1, 1);
      context.translate(-drawWidth / 2, -drawHeight / 2);

      context.fillStyle = foreground;
      context.font = `700 ${fontSize}px "Avenir Next", "Helvetica Neue", "Segoe UI", sans-serif`;
      context.textAlign = "center";
      context.textBaseline = "top";

      const wrappedLines = wrapLines(context, script.trim() ? script : DEFAULT_SCRIPT, maxTextWidth);
      const startY = drawHeight * 0.48 - scrollOffset;

      for (const [index, line] of wrappedLines.entries()) {
        context.fillText(line || " ", drawWidth / 2, startY + index * lineHeight, maxTextWidth);
      }

      context.restore();

      if (settings.guideLine) {
        context.fillStyle =
          settings.background === "black" ? "rgba(255,255,255,0.35)" : "rgba(15,23,42,0.24)";
        context.fillRect(44, height / 2 - 1, width - 88, 2);
      }

      drawFrameRef.current = requestAnimationFrame(draw);
    };

    drawFrameRef.current = requestAnimationFrame(draw);
    return () => {
      if (drawFrameRef.current) {
        cancelAnimationFrame(drawFrameRef.current);
        drawFrameRef.current = null;
      }
    };
  }, [script, scrollOffset, settings]);

  const summaryText = useMemo(() => {
    const words = script.trim().split(/\s+/).filter(Boolean).length;
    const estimatedMinutes = Math.max(1, Math.round(words / 130));
    return `${words || 0} words · about ${estimatedMinutes} min at a calm speaking pace`;
  }, [script]);

  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Live Video Teleprompter</p>
          <h1>Floating Teleprompter Feed</h1>
          <p className="hero-copy">
            Edit the script on the page, then send the live rendered video feed into Picture-in-Picture.
          </p>
        </div>
        <div className="compat-card">
          <span className="compat-badge">{pipActive ? "PiP Active" : "Feed Ready"}</span>
          <p>{supportMessage}</p>
        </div>
      </header>

      <main className="workspace-grid">
        <section className="panel editor-panel">
          <div className="panel-header">
            <div>
              <p className="panel-kicker">Script Editor</p>
              <h2>Your script</h2>
            </div>
            <p className="summary">{summaryText}</p>
          </div>

          <textarea
            className="script-input"
            value={script}
            onChange={(event) => setScript(event.target.value)}
            placeholder="Paste or type your script here..."
            spellCheck={false}
          />
        </section>

        <section className="panel controls-panel">
          <div className="panel-header">
            <div>
              <p className="panel-kicker">Playback</p>
              <h2>Controls & settings</h2>
            </div>
          </div>

          <div className="action-row">
            <button type="button" className="primary-button" onClick={() => setIsPlaying(true)}>
              Start
            </button>
            <button type="button" className="secondary-button" onClick={() => setIsPlaying(false)}>
              Pause
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                setScrollOffset(0);
                setIsPlaying(false);
              }}
            >
              Reset
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => setScrollOffset((current) => Math.max(0, current - 120))}
            >
              Nudge Up
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => setScrollOffset((current) => current + 120)}
            >
              Nudge Down
            </button>
            <button type="button" className="primary-button accent-button" onClick={() => void openPictureInPicture()}>
              Open PiP Feed
            </button>
            <button type="button" className="secondary-button" onClick={() => void closePictureInPicture()}>
              Close PiP
            </button>
          </div>

          <div className="settings-grid">
            <label className="setting-card">
              <span>Scroll speed</span>
              <strong>{Math.round(settings.speed)} px/s</strong>
              <input
                type="range"
                min="10"
                max="220"
                value={settings.speed}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    speed: Number(event.target.value),
                  }))
                }
              />
            </label>

            <label className="setting-card">
              <span>Font size</span>
              <strong>{settings.fontSize}px</strong>
              <input
                type="range"
                min="24"
                max="96"
                value={settings.fontSize}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    fontSize: Number(event.target.value),
                  }))
                }
              />
            </label>

            <label className="setting-card">
              <span>Background</span>
              <select
                value={settings.background}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    background: event.target.value as TeleprompterSettings["background"],
                  }))
                }
              >
                <option value="black">Black</option>
                <option value="white">White</option>
              </select>
            </label>

            <label className="setting-card">
              <span>Text color</span>
              <select
                value={settings.textColor}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    textColor: event.target.value as TeleprompterSettings["textColor"],
                  }))
                }
              >
                <option value="white">White</option>
                <option value="yellow">Yellow</option>
                <option value="green">Green</option>
                <option value="lightBlue">Light blue</option>
                <option value="black">Black</option>
              </select>
            </label>

            <label className="setting-card">
              <span>Orientation</span>
              <select
                value={settings.orientation}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    orientation: event.target.value as TeleprompterSettings["orientation"],
                  }))
                }
              >
                <option value="horizontal">Horizontal</option>
                <option value="rotateLeft">Rotate -90°</option>
                <option value="rotateRight">Rotate 90°</option>
              </select>
            </label>

            <label className="setting-card toggle-card">
              <span>Mirrored text</span>
              <input
                type="checkbox"
                checked={settings.mirrored}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    mirrored: event.target.checked,
                  }))
                }
              />
            </label>

            <label className="setting-card toggle-card">
              <span>Guide line</span>
              <input
                type="checkbox"
                checked={settings.guideLine}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    guideLine: event.target.checked,
                  }))
                }
              />
            </label>
          </div>

          {pipError ? <p className="feedback error-text">PiP: {pipError}</p> : null}
          <p className="feedback">
            On iPhone, open this in Safari and use the live feed video for PiP. If you install it as a Home Screen app, PiP may not work the same way.
          </p>
        </section>

        <section className="panel preview-panel">
          <div className="panel-header">
            <div>
              <p className="panel-kicker">Live Feed</p>
              <h2>Video preview</h2>
            </div>
            <span className="preview-state">{isPlaying ? "Scrolling" : "Paused"}</span>
          </div>

          <div className="preview-frame">
            <video
              ref={previewVideoRef}
              className="feed-video"
              muted
              playsInline
              autoPlay
              controls
            />
          </div>
        </section>
      </main>
    </div>
  );
}
