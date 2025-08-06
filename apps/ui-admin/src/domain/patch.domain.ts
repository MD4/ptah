import type { Node } from "@xyflow/react";

import type { NodeChannelData } from "../components/molecules/nodes/node-channel";

export const getAllChannelsNodes = (): Node<NodeChannelData>[] =>
  [...Array(64).keys()].map((channel, index) => ({
    id: `channel-${String(channel + 1)}`,
    data: { label: String(channel + 1) },
    position: { x: 800, y: index * (36 + 4) },
    type: "node-channel",
  }));
