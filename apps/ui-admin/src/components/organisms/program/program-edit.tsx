import * as React from "react";
import type * as models from "@ptah/lib-models";
import type {
  OnEdgesChange,
  OnConnect,
  Edge,
  Node,
  FitViewOptions,
  OnNodesChange,
} from "reactflow";
import {
  ReactFlow,
  applyEdgeChanges,
  applyNodeChanges,
  addEdge,
} from "reactflow";
import { programNodeTypes } from "../../molecules/nodes";
import { ProgramEditProvider } from "../../../domain/program.domain";

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: "100%",
    height: "100%",
    animation: "animationEnterLeftToRight 200ms",
  },
};

const fitViewOptions: FitViewOptions = {
  padding: 1,
  minZoom: 1,
  maxZoom: 1,
};

const getNodes = (nodes: models.Node[]): Node<models.Node>[] =>
  nodes.map((node) => ({
    id: node.id,
    data: node,
    position: node.position,
    type: node.type,
  }));

const getEdges = (edges: models.Edge[]): Edge[] =>
  edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: String(edge.sourceOutput),
    targetHandle: String(edge.targetIntput),
  }));

const proOptions = { hideAttribution: true };

export default function ProgramDashboard({
  program,
}: {
  program: models.Program;
}): JSX.Element {
  const initialNodes = getNodes(program.nodes);
  const initialEdges = getEdges(program.edges);

  const [nodes, setNodes] = React.useState(initialNodes);
  const [edges, setEdges] = React.useState(initialEdges);

  const onNodesChange = React.useCallback<OnNodesChange>((changes) => {
    setNodes((value) => applyNodeChanges(changes, value));
  }, []);

  const onEdgesChange = React.useCallback<OnEdgesChange>((changes) => {
    setEdges((value) => applyEdgeChanges(changes, value));
  }, []);

  const onConnect = React.useCallback<OnConnect>((params) => {
    setEdges((value) => addEdge(params, value));
  }, []);

  return (
    <ProgramEditProvider initialProgram={program}>
      <div style={styles.container}>
        <ReactFlow
          edges={edges}
          fitView
          fitViewOptions={fitViewOptions}
          nodeTypes={programNodeTypes}
          nodes={nodes}
          onConnect={onConnect}
          onEdgesChange={onEdgesChange}
          onNodesChange={onNodesChange}
          proOptions={proOptions}
        />
      </div>
    </ProgramEditProvider>
  );
}
