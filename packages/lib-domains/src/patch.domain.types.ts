/** DMX channel addresses (1..512) of one patched color target's components. */
export type PatchColorChannels = {
  r: number;
  g: number;
  b: number;
};

export type PatchTargetScalar = {
  kind: "scalar";
  outputId: number;
  channel: number;
};

export type PatchTargetColor = {
  kind: "color";
  outputId: number;
  channels: PatchColorChannels;
};

export type PatchTarget = PatchTargetScalar | PatchTargetColor;

/**
 * A program's patch compiled to physical channels, in patch order. Targets are
 * applied sequentially, so on overlapping channels the last patch entry wins.
 */
export type PatchMapping = PatchTarget[];
