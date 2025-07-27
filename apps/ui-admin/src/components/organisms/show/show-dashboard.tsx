import type * as models from "@ptah/lib-models";
import * as React from "react";
import type { FitViewOptions, ReactFlowInstance, Viewport } from "reactflow";
import { ReactFlow } from "reactflow";
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

const proOptions = { hideAttribution: true };
const fitViewOptions: FitViewOptions = {
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
    animation: "animationEnterLeftToRight 200ms",
  },
} satisfies Record<string, React.CSSProperties>;

export default function ShowDashboard({
  show,
  programs,
}: {
  show: models.Show;
  programs: models.Program[];
}) {
  const initialNodes = React.useMemo(
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
    React.useState<ReactFlowInstance | null>(null);

  const onInit = React.useCallback((instance: ReactFlowInstance) => {
    const { x, zoom } = instance.getViewport();

    setReactFlowInstance(instance);

    instance.setViewport({
      x,
      y: 196,
      zoom,
    });
  }, []);

  const ref = React.useRef<HTMLDivElement>(null);
  const fitView = React.useCallback(() => {
    if (reactFlowInstance) {
      const y = reactFlowInstance.getViewport().y;
      reactFlowInstance.fitView(fitViewOptions);
      reactFlowInstance.setViewport({
        x: reactFlowInstance.getViewport().x,
        y,
        zoom: reactFlowInstance.getViewport().zoom,
      });
    }
  }, [reactFlowInstance]);

  React.useEffect(() => fitView(), [fitView]);
  useResizeObserver({
    // @ts-ignore
    ref,
    box: "border-box",
    onResize: () => fitView(),
  });

  return (
    <div style={styles.container}>
      <ReactFlow
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
        panOnScrollMode="vertical"
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
