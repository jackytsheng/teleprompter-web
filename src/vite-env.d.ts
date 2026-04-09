/// <reference types="vite/client" />

declare global {
  interface Window {
    documentPictureInPicture?: {
      requestWindow(options?: { width?: number; height?: number }): Promise<Window>;
      window?: Window;
    };
  }

  interface Document {
    exitPictureInPicture?: () => Promise<void>;
    pictureInPictureEnabled?: boolean;
    pictureInPictureElement?: Element | null;
  }

  interface HTMLVideoElement {
    requestPictureInPicture?: () => Promise<PictureInPictureWindow>;
  }
}

export {};
