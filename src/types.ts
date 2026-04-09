export type BackgroundColor = "black" | "white";
export type TextColor = "white" | "yellow" | "green" | "lightBlue" | "black";
export type Orientation = "horizontal" | "rotateLeft" | "rotateRight";

export interface TeleprompterSettings {
  speed: number;
  fontSize: number;
  background: BackgroundColor;
  textColor: TextColor;
  orientation: Orientation;
  mirrored: boolean;
  guideLine: boolean;
  cameraEnabled: boolean;
}
