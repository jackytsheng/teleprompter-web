import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import TeleprompterSurface from "./TeleprompterSurface";
import { getSupportMessage, supportsDocumentPictureInPicture, supportsVideoPictureInPicture } from "./support";
import type { TeleprompterSettings } from "./types";

const STORAGE_KEY = "floating-teleprompter-v1";
const DEFAULT_SCRIPT = `Welcome to your floating teleprompter.

Edit this script on the left, then press Start.

Use the floating mode button to keep reading while you switch apps.

You can mirror the text, rotate it, or turn the camera preview on when you need it.`;

const DEFAULT_SETTINGS: TeleprompterSettings = {
  speed: 55,
  fontSize: 44,
  background: "black",
  textColor: "white",
  orientation: "horizontal",
  mirrored: false,
  guideLine: true,
  cameraEnabled: false,
};

type FloatingMode = "none" | "document" | "video";

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

function copyStylesToWindow(targetDocument: Document) {
  for (const styleSheet of Array.from(document.styleSheets)) {
    try {
      const rules = Array.from(styleSheet.cssRules).map((rule) => rule.cssText).join("\n");
      const style = targetDocument.createElement("style");
      style.textContent = rules;
      targetDocument.head.appendChild(style);
    } catch {
      if (!styleSheet.href) {
        continue;
      }

      const link = targetDocument.createElement("link");
      link.rel = "stylesheet";
      link.href = styleSheet.href;
      targetDocument.head.appendChild(link);
    }
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

function FloatingWindowContent({
  script,
  scrollOffset,
  settings,
  stream,
  isPlaying,
  onTogglePlay,
  onReset,
  onClose,
}: {
  script: string;
  scrollOffset: number;
  settings: TeleprompterSettings;
  stream: MediaStream | null;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onReset: () => void;
  onClose: () => void;
}) {
  return (
    <div className="floating-shell">
      <TeleprompterSurface
        script={script}
        scrollOffset={scrollOffset}
        settings={settings}
        stream={stream}
        showCamera={settings.cameraEnabled}
      />
      <div className="floating-toolbar">
        <button type="button" className="mini-button" onClick={onTogglePlay}>
          {isPlaying ? "Pause" : "Resume"}
        </button>
        <button type="button" className="mini-button" onClick={onReset}>
          Reset
        </button>
        <button type="button" className="mini-button danger" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const stored = useMemo(() => readStoredState(), []);
  const [script, setScript] = useState(stored.script);
  const [settings, setSettings] = useState<TeleprompterSettings>(stored.settings);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [floatingMode, setFloatingMode] = useState<FloatingMode>("none");
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState("");
  const [floatingError, setFloatingError] = useState("");

  const supportMessage = useMemo(() => getSupportMessage(), []);
  const cameraCanvasVideoRef = useRef<HTMLVideoElement | null>(null);
  const fallbackVideoRef = useRef<HTMLVideoElement | null>(null);
  const fallbackCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fallbackStreamRef = useRef<MediaStream | null>(null);
  const pipWindowRef = useRef<Window | null>(null);
  const pipRootRef = useRef<Root | null>(null);
  const documentPipTeardownRef = useRef<(() => void) | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastFrameRef = useRef<number | null>(null);

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
    if (!cameraCanvasVideoRef.current) {
      return;
    }

    cameraCanvasVideoRef.current.srcObject = cameraStream;

    if (cameraStream) {
      void cameraCanvasVideoRef.current.play().catch(() => {
        // Camera playback may wait for user activation on some platforms.
      });
    }
  }, [cameraStream]);

  useEffect(() => {
    if (!isPlaying) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      lastFrameRef.current = null;
      return;
    }

    const tick = (now: number) => {
      if (lastFrameRef.current === null) {
        lastFrameRef.current = now;
      }

      const delta = (now - lastFrameRef.current) / 1000;
      lastFrameRef.current = now;

      setScrollOffset((previous) => Math.max(0, previous + settings.speed * delta));
      animationFrameRef.current = requestAnimationFrame(tick);
    };

    animationFrameRef.current = requestAnimationFrame(tick);
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      lastFrameRef.current = null;
    };
  }, [isPlaying, settings.speed]);

  useEffect(() => {
    if (!settings.cameraEnabled) {
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
      setCameraStream(null);
      return;
    }

    let cancelled = false;

    async function ensureCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
          },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        setCameraError("");
        setCameraStream(stream);
      } catch (error) {
        if (cancelled) {
          return;
        }

        setCameraError(error instanceof Error ? error.message : "Unable to access the camera.");
        setSettings((current) => ({
          ...current,
          cameraEnabled: false,
        }));
      }
    }

    if (!cameraStream) {
      void ensureCamera();
    }

    return () => {
      cancelled = true;
    };
  }, [cameraStream, settings.cameraEnabled]);

  const stopFloating = useCallback(async () => {
    setFloatingMode("none");
    setFloatingError("");

    if (document.pictureInPictureElement && document.exitPictureInPicture) {
      try {
        await document.exitPictureInPicture();
      } catch {
        // Ignore browser cleanup failures.
      }
    }

    if (pipRootRef.current) {
      pipRootRef.current.unmount();
      pipRootRef.current = null;
    }

    if (pipWindowRef.current && !pipWindowRef.current.closed) {
      pipWindowRef.current.close();
      pipWindowRef.current = null;
    }

    documentPipTeardownRef.current?.();
    documentPipTeardownRef.current = null;
  }, []);

  const startDocumentFloating = useCallback(async () => {
    const api = window.documentPictureInPicture;
    if (!api?.requestWindow) {
      throw new Error("Document Picture-in-Picture is not available.");
    }

    await stopFloating();

    const pipWindow = await api.requestWindow({
      width: 1160,
      height: 720,
    });

    pipWindow.document.body.className = "floating-document-body";
    pipWindow.document.title = "Floating Teleprompter";
    copyStylesToWindow(pipWindow.document);

    const mountNode = pipWindow.document.createElement("div");
    mountNode.id = "pip-root";
    pipWindow.document.body.appendChild(mountNode);

    const root = createRoot(mountNode);
    const handleClosed = () => {
      setFloatingMode("none");
      pipRootRef.current?.unmount();
      pipRootRef.current = null;
      pipWindowRef.current = null;
      documentPipTeardownRef.current = null;
    };

    pipWindow.addEventListener("pagehide", handleClosed, { once: true });
    pipWindowRef.current = pipWindow;
    pipRootRef.current = root;
    documentPipTeardownRef.current = () => {
      pipWindow.removeEventListener("pagehide", handleClosed);
    };
    setFloatingMode("document");
  }, [stopFloating]);

  const startVideoFloating = useCallback(async () => {
    const video = fallbackVideoRef.current;
    if (!video || !supportsVideoPictureInPicture()) {
      throw new Error("Video Picture-in-Picture is not available.");
    }

    await stopFloating();

    const canvas = fallbackCanvasRef.current ?? document.createElement("canvas");
    canvas.width = 1280;
    canvas.height = 720;
    fallbackCanvasRef.current = canvas;

    fallbackStreamRef.current = canvas.captureStream(30);
    video.srcObject = fallbackStreamRef.current;
    await video.play();
    await video.requestPictureInPicture?.();

    setFloatingMode("video");
  }, [stopFloating]);

  const startFloating = useCallback(async () => {
    setFloatingError("");

    try {
      if (supportsDocumentPictureInPicture()) {
        await startDocumentFloating();
        return;
      }

      if (supportsVideoPictureInPicture()) {
        await startVideoFloating();
        return;
      }

      throw new Error("Picture-in-Picture is not supported in this browser.");
    } catch (error) {
      setFloatingError(error instanceof Error ? error.message : "Unable to open floating mode.");
    }
  }, [startDocumentFloating, startVideoFloating]);

  useEffect(() => {
    if (floatingMode !== "document" || !pipRootRef.current) {
      return;
    }

    // Keep a dedicated React tree in the PiP window so the floating HTML UI stays
    // synchronized with the main page without duplicating business logic.
    pipRootRef.current.render(
      <FloatingWindowContent
        script={script}
        scrollOffset={scrollOffset}
        settings={settings}
        stream={cameraStream}
        isPlaying={isPlaying}
        onTogglePlay={() => setIsPlaying((current) => !current)}
        onReset={() => {
          setScrollOffset(0);
          setIsPlaying(false);
        }}
        onClose={() => {
          void stopFloating();
        }}
      />,
    );
  }, [cameraStream, floatingMode, isPlaying, script, scrollOffset, settings, stopFloating]);

  useEffect(() => {
    if (floatingMode !== "video" || !fallbackCanvasRef.current) {
      return;
    }

    const canvas = fallbackCanvasRef.current;
    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    let frameId = 0;

    const drawFrame = () => {
      const width = canvas.width;
      const height = canvas.height;
      const showCamera = settings.cameraEnabled && Boolean(cameraStream);
      const background = settings.background === "black" ? "#030712" : "#f8fafc";
      const foreground =
        settings.textColor === "white"
          ? "#f5f7fb"
          : settings.textColor === "yellow"
            ? "#ffe45b"
            : settings.textColor === "green"
              ? "#8ff0b3"
              : settings.textColor === "lightBlue"
                ? "#8ad8ff"
                : "#111827";

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
      context.translate(-width / 2, -height / 2);

      const readableWidth = Math.min(width - 140, 940);
      const wrappedLines = wrapLines(context, script.trim() ? script : DEFAULT_SCRIPT, readableWidth);
      const fontSize = settings.fontSize * 1.08;
      const lineHeight = fontSize * 1.42;

      context.fillStyle = foreground;
      context.font = `700 ${fontSize}px "Avenir Next", "Helvetica Neue", "Segoe UI", sans-serif`;
      context.textAlign = "center";
      context.textBaseline = "top";

      const startY = height * 0.48 - scrollOffset;
      for (const [index, line] of wrappedLines.entries()) {
        context.fillText(line || " ", width / 2, startY + index * lineHeight, readableWidth);
      }

      context.restore();

      if (settings.guideLine) {
        context.fillStyle = settings.background === "black" ? "rgba(255,255,255,0.32)" : "rgba(17,24,39,0.24)";
        context.fillRect(56, height / 2 - 1, width - 112, 2);
      }

      if (showCamera && cameraCanvasVideoRef.current?.readyState && cameraCanvasVideoRef.current.readyState >= 2) {
        const cameraWidth = width * 0.24;
        const cameraHeight = cameraWidth * 0.64;
        const x = width - cameraWidth - 28;
        const y = 28;

        context.save();
        context.fillStyle = "rgba(0,0,0,0.35)";
        context.fillRect(x - 8, y - 8, cameraWidth + 16, cameraHeight + 16);
        context.drawImage(cameraCanvasVideoRef.current, x, y, cameraWidth, cameraHeight);
        context.restore();
      }

      frameId = requestAnimationFrame(drawFrame);
    };

    frameId = requestAnimationFrame(drawFrame);
    return () => cancelAnimationFrame(frameId);
  }, [cameraStream, floatingMode, script, scrollOffset, settings]);

  useEffect(() => {
    const video = fallbackVideoRef.current;
    if (!video) {
      return;
    }

    const handleLeave = () => {
      setFloatingMode("none");
    };

    video.addEventListener("leavepictureinpicture", handleLeave);
    return () => {
      video.removeEventListener("leavepictureinpicture", handleLeave);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [cameraStream]);

  const summaryText = useMemo(() => {
    const words = script.trim().split(/\s+/).filter(Boolean).length;
    const estimatedMinutes = Math.max(1, Math.round(words / 130));
    return `${words || 0} words · about ${estimatedMinutes} min at a calm speaking pace`;
  }, [script]);

  return (
    <div className="app-shell">
      <video ref={fallbackVideoRef} className="hidden-pip-video" muted playsInline />
      <video ref={cameraCanvasVideoRef} className="hidden-pip-video" muted playsInline />

      <header className="hero">
        <div>
          <p className="eyebrow">Desktop Creator Tool</p>
          <h1>Floating Teleprompter</h1>
          <p className="hero-copy">
            Write, rehearse, mirror, and float your script in an always-on-top teleprompter window.
          </p>
        </div>
        <div className="compat-card">
          <span className="compat-badge">{floatingMode === "none" ? "Ready" : `Floating: ${floatingMode}`}</span>
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
            <button type="button" className="primary-button accent-button" onClick={() => void startFloating()}>
              Start Floating Teleprompter
            </button>
            <button type="button" className="secondary-button" onClick={() => void stopFloating()}>
              Stop Floating
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

            <label className="setting-card toggle-card">
              <span>Enable camera</span>
              <input
                type="checkbox"
                checked={settings.cameraEnabled}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    cameraEnabled: event.target.checked,
                  }))
                }
              />
            </label>
          </div>

          {cameraError ? <p className="feedback error-text">Camera: {cameraError}</p> : null}
          {floatingError ? <p className="feedback error-text">Floating mode: {floatingError}</p> : null}
          {floatingMode === "video" ? (
            <p className="feedback">
              Fallback mode is active. The floating window is a live canvas-rendered video so layout is slightly simpler than full HTML PiP.
            </p>
          ) : null}
        </section>

        <section className="panel preview-panel">
          <div className="panel-header">
            <div>
              <p className="panel-kicker">Live Preview</p>
              <h2>Main-page teleprompter</h2>
            </div>
            <span className="preview-state">{isPlaying ? "Scrolling" : "Paused"}</span>
          </div>

          <div className="preview-frame">
            <TeleprompterSurface
              script={script}
              scrollOffset={scrollOffset}
              settings={settings}
              stream={cameraStream}
              showCamera={settings.cameraEnabled}
              compact
            />
          </div>
        </section>
      </main>
    </div>
  );
}
