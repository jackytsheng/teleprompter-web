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
  if (supportsVideoPictureInPicture()) {
    return "Video Picture-in-Picture is available. The teleprompter preview is rendered as a live video feed so it can be sent to PiP directly.";
  }

  if (supportsDocumentPictureInPicture()) {
    return "Document Picture-in-Picture is available, but this version prioritizes a live video feed so the same preview can be used on iPhone-style video PiP paths.";
  }

  return "Picture-in-Picture is not supported in this browser. The live teleprompter feed will still work on the page.";
}
