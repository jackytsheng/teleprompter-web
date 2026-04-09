/// <reference types="vite/client" />

declare global {
  interface IntlSegmenterLike {
    segment(input: string): Iterable<{ segment: string }>;
  }

  interface IntlSegmenterConstructorLike {
    new (locales?: string | string[], options?: { granularity?: "grapheme" | "word" | "sentence" }): IntlSegmenterLike;
  }

  interface Intl {
    Segmenter?: IntlSegmenterConstructorLike;
  }

  interface IntlConstructor {
    Segmenter?: IntlSegmenterConstructorLike;
  }

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
