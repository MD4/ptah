export const octaveKey = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
] as const;

export const getKeyFromIndex = (keyIndex: number): string =>
  `${octaveKey[keyIndex % 12]}${Math.floor(keyIndex / 12) - 1}`;

export const isSharpKey = (keyIndex: number): boolean =>
  octaveKey[keyIndex % 12].includes("#");
