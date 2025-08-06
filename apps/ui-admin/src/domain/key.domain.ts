import type { Node } from "@xyflow/react";

import type { NodeKeyData } from "../components/molecules/nodes/node-key";

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
  `${octaveKey[keyIndex % 12]}${String(Math.floor(keyIndex / 12) - 1)}`;

export const isSharpKey = (keyIndex: number): boolean =>
  octaveKey[keyIndex % 12].includes("#");

export const getAllKeysNodes = (): Node[] => {
  let y = 0;

  return [...Array(128).keys()].map((key, index) => {
    const sharp = isSharpKey(key);

    y += sharp && index ? -36 / 2 : 0;

    const result: Node<NodeKeyData> = {
      id: `key-${String(key)}`,
      data: { key, label: getKeyFromIndex(key), sharp },
      position: { x: 0, y },
      type: "node-key",
      zIndex: sharp ? 1 : 0,
      selectable: false,
    };

    y += sharp ? 36 / 2 : 68;

    return result;
  });
};
