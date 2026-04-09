import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { TeleprompterSettings } from "./types";

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

interface CameraVideoProps {
  stream: MediaStream | null;
}

function CameraVideo({ stream }: CameraVideoProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (!videoRef.current) {
      return;
    }

    videoRef.current.srcObject = stream;

    if (stream) {
      void videoRef.current.play().catch(() => {
        // Autoplay may fail until the browser has a user gesture.
      });
    }
  }, [stream]);

  return (
    <video
      ref={videoRef}
      className="camera-overlay"
      autoPlay
      muted
      playsInline
    />
  );
}

interface TeleprompterSurfaceProps {
  script: string;
  scrollOffset: number;
  settings: TeleprompterSettings;
  stream: MediaStream | null;
  showCamera: boolean;
  compact?: boolean;
}

export default function TeleprompterSurface({
  script,
  scrollOffset,
  settings,
  stream,
  showCamera,
  compact = false,
}: TeleprompterSurfaceProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [bounds, setBounds] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }

      setBounds({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const layoutStyle = useMemo<CSSProperties>(() => {
    const isHorizontal = settings.orientation === "horizontal";
    const rotation =
      settings.orientation === "rotateLeft"
        ? -90
        : settings.orientation === "rotateRight"
          ? 90
          : 0;
    const width = isHorizontal ? bounds.width : bounds.height;
    const height = isHorizontal ? bounds.height : bounds.width;

    return {
      width: width || undefined,
      height: height || undefined,
      top: "50%",
      left: "50%",
      transform: `translate(-50%, -50%) rotate(${rotation}deg) scaleX(${settings.mirrored ? -1 : 1})`,
      transformOrigin: "center center",
    };
  }, [bounds.height, bounds.width, settings.mirrored, settings.orientation]);

  const scriptLines = useMemo(
    () =>
      (script.trim() ? script : "Paste your script here and press Start.")
        .split("\n")
        .map((line) => line.trimEnd()),
    [script],
  );

  const fontSize = compact ? settings.fontSize * 0.86 : settings.fontSize;
  const textColor = TEXT_COLOR_MAP[settings.textColor];
  const backgroundColor = BACKGROUND_MAP[settings.background];

  return (
    <div
      ref={containerRef}
      className={`teleprompter-surface ${compact ? "compact-surface" : ""}`}
      style={{ backgroundColor }}
    >
      <div className="teleprompter-layout" style={layoutStyle}>
        <div
          className="teleprompter-motion"
          style={{
            transform: `translate3d(0, ${-scrollOffset}px, 0)`,
            color: textColor,
            fontSize,
          }}
        >
          {scriptLines.map((line, index) => (
            <p key={`${index}-${line}`} className="teleprompter-line">
              {line || "\u00A0"}
            </p>
          ))}
        </div>
      </div>

      {settings.guideLine ? <div className="guide-line" /> : null}
      {showCamera ? <CameraVideo stream={stream} /> : null}
    </div>
  );
}
