/** DMX channel addresses (1..512) of one patched color target's components. */
export type PatchColorChannels = {
  r: number;
  g: number;
  b: number;
};

export type PatchMapping = {
  /** scalar outputId -> DMX channels */
  scalar: Record<number, number[]>;
  /** color outputId -> component channel triples (one per patched fixture) */
  color: Record<number, PatchColorChannels[]>;
};
