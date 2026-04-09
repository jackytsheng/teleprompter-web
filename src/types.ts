export type BackgroundColor = "black" | "white";
export type TextColor = "white" | "yellow" | "green" | "lightBlue" | "black";
export type Orientation = "horizontal" | "rotateLeft" | "rotateRight";
export type FeedMode = "portrait" | "landscape";

export interface TeleprompterSettings {
  speed: number;
  fontSize: number;
  background: BackgroundColor;
  textColor: TextColor;
  orientation: Orientation;
  feedMode: FeedMode;
  mirrored: boolean;
  guideLine: boolean;
}
