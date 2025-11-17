import type * as models from "@ptah-app/lib-models";
import type {
  FitViewOptions,
  Node,
  ReactFlowInstance,
  Viewport,
} from "@xyflow/react";
import { PanOnScrollMode, ReactFlow } from "@xyflow/react";
import * as React from "react";
import { useResizeObserver } from "usehooks-ts";
import {
  adaptModelMappingToReactFlowEdges,
  adaptModelMappingToReactFlowEdgesNodes,
} from "../../../adapters/mapping.adapter";
import {
  adaptModelShowPatchToReactFlowNodes,
  adaptModelShowPatchToToReactFlowEdges,
} from "../../../adapters/patch.adapter";
import { adaptModelShowProgramsToReactFlowNodes } from "../../../adapters/show.adapter";
import EdgeGradient from "../../atoms/edge-gradient";
import { showNodeTypes } from "../../molecules/nodes";
import type { NodeAddProgramData } from "../../molecules/nodes/node-add-program";
import type { NodeChannelData } from "../../molecules/nodes/node-channel";
import type { NodeProgramData } from "../../molecules/nodes/node-program";

const proOptions = { hideAttribution: true };
const fitViewOptions: FitViewOptions<Node<PossibleNode>> = {
  padding: 0,
  minZoom: 1,
  maxZoom: 1,
};
const defaultViewport: Viewport = {
  x: 0,
  y: 196,
  zoom: 1,
};

const styles = {
  container: {
    width: "100%",
    height: "100%",
    opacity: 0,
  },
  initialized: {
    opacity: 1,
    animation: "animationEnterLeftToRight 200ms",
  },
} satisfies Record<string, React.CSSProperties>;

type PossibleNode = NodeChannelData | NodeProgramData | NodeAddProgramData;

export default function ShowDashboard({
  show,
  programs,
}: {
  show: models.Show;
  programs: models.Program[];
}) {
  const initialNodes: Node<PossibleNode>[] = React.useMemo(
    () => [
      ...adaptModelMappingToReactFlowEdgesNodes(show.mapping, 0),
      ...adaptModelShowProgramsToReactFlowNodes(show.programs, programs, 500),
      ...adaptModelShowPatchToReactFlowNodes(show.patch, 1000),
    ],
    [programs, show],
  );

  const initialEdges = React.useMemo(
    () => [
      ...adaptModelMappingToReactFlowEdges(show.mapping),
      ...adaptModelShowPatchToToReactFlowEdges(show.patch),
    ],
    [show],
  );

  const [reactFlowInstance, setReactFlowInstance] =
    React.useState<ReactFlowInstance<Node<PossibleNode>> | null>(null);

  const onInit = React.useCallback(
    (instance: ReactFlowInstance<Node<PossibleNode>>) => {
      const { x, zoom } = instance.getViewport();

      setReactFlowInstance(instance);

      instance.setViewport({
        x,
        y: 196,
        zoom,
      });
    },
    [],
  );

  const ref = React.useRef<HTMLDivElement>(null);
  const fitView = React.useCallback(async () => {
    if (reactFlowInstance) {
      const y = reactFlowInstance.getViewport().y;
      await reactFlowInstance.fitView(fitViewOptions);
      await reactFlowInstance.setViewport({
        x: reactFlowInstance.getViewport().x,
        y,
        zoom: reactFlowInstance.getViewport().zoom,
      });
    }
  }, [reactFlowInstance]);

  React.useEffect(() => void fitView(), [fitView]);
  useResizeObserver({
    // @ts-expect-error
    ref,
    box: "border-box",
    onResize: () => fitView(),
  });

  return (
    <div
      style={
        reactFlowInstance
          ? { ...styles.container, ...styles.initialized }
          : styles.container
      }
    >
      <ReactFlow<Node<PossibleNode>>
        ref={ref}
        defaultViewport={defaultViewport}
        edges={initialEdges}
        elementsSelectable={false}
        fitView
        fitViewOptions={fitViewOptions}
        nodeTypes={showNodeTypes}
        nodes={initialNodes}
        nodesConnectable={false}
        nodesDraggable={false}
        onInit={onInit}
        onlyRenderVisibleElements
        panOnDrag={false}
        panOnScroll
        panOnScrollMode={PanOnScrollMode.Vertical}
        proOptions={proOptions}
        zoomOnDoubleClick={false}
        zoomOnPinch={false}
        zoomOnScroll={false}
      >
        <EdgeGradient />
      </ReactFlow>
    </div>
  );
}
