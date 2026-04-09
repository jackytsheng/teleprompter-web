export function supportsDocumentPictureInPicture(): boolean {
  return typeof window !== "undefined" && typeof window.documentPictureInPicture?.requestWindow === "function";
}

export function supportsVideoPictureInPicture(): boolean {
  return (
    typeof document !== "undefined" &&
    Boolean(document.pictureInPictureEnabled) &&
    typeof HTMLVideoElement !== "undefined" &&
    typeof HTMLVideoElement.prototype.requestPictureInPicture === "function"
  );
}

export function getSupportMessage(): string {
  if (supportsDocumentPictureInPicture()) {
    return "Document Picture-in-Picture is available. Floating mode can show live HTML, controls, and the camera preview together.";
  }

  if (supportsVideoPictureInPicture()) {
    return "Document Picture-in-Picture is unavailable here, so floating mode will use a canvas-rendered video Picture-in-Picture fallback.";
  }

  return "Picture-in-Picture is not supported in this browser. The main-page teleprompter preview will still work.";
}
