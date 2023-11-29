import * as React from "react";
import type {
  OnEdgesChange,
  OnConnect,
  FitViewOptions,
  OnNodesChange,
  Edge,
  Connection,
  Node,
  ReactFlowInstance,
} from "reactflow";
import {
  ReactFlow,
  applyEdgeChanges,
  applyNodeChanges,
  addEdge,
  getOutgoers,
  updateEdge,
} from "reactflow";
import { Button, Flex, notification } from "antd";
import { SaveFilled } from "@ant-design/icons";
import { v4 as uuidv4 } from "uuid";
import { useDebounce } from "usehooks-ts";
import type * as models from "@ptah/lib-models";
import { programNodeTypes } from "../../molecules/nodes";
import {
  useProgramEdit,
  useProgramEditDispatch,
} from "../../../domain/program.domain";
import {
  adaptModelEdgesToReactFlowEdges,
  adaptReactFlowEdgesToModelEdges,
} from "../../../domain/adapters/edge.adapter";
import {
  adaptModelNodesToReactFlowNodes,
  adaptReactFlowNodesToModelNodes,
} from "../../../domain/adapters/node.adapter";
import { useProgramPut } from "../../../repositories/program.repository";
import { createNode } from "../../../domain/node.domain";
import ProgramAddNode from "./program-add-node";

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: "100%",
    height: "100%",
    animation: "animationEnterLeftToRight 200ms",
  },
  toolbar: {
    position: "absolute",
    right: 16,
    bottom: 16,
  },
};

const fitViewOptions: FitViewOptions = {
  padding: 1,
  minZoom: 1,
  maxZoom: 1,
};

const proOptions = { hideAttribution: true };

export default function ProgramDashboard(): JSX.Element {
  const [{ error, success }, contextHolder] = notification.useNotification({
    placement: "bottomRight",
  });

  const dispatch = useProgramEditDispatch();
  const { initialProgram, program, hasChanged } = useProgramEdit();

  const initialNodes = React.useMemo(
    () => adaptModelNodesToReactFlowNodes(initialProgram.nodes),
    [initialProgram.nodes]
  );
  const initialEdges = React.useMemo(
    () => adaptModelEdgesToReactFlowEdges(initialProgram.edges),
    [initialProgram.edges]
  );

  const [nodes, setNodes] = React.useState(initialNodes);
  const [edges, setEdges] = React.useState(initialEdges);

  const [reactFlowInstance, setReactFlowInstance] =
    React.useState<ReactFlowInstance | null>(null);

  const edgeUpdateSuccessful = React.useRef(true);

  const isValidConnection = React.useCallback<
    (connection: Connection) => boolean
  >(
    (connection) => {
      // we are using getNodes and getEdges helpers here
      // to make sure we create isValidConnection function only once
      const target = nodes.find((node) => node.id === connection.target);

      if (!target) {
        return false;
      }

      const hasCycle = (node: Node, visited = new Set()): boolean => {
        if (visited.has(node.id)) return false;

        visited.add(node.id);

        for (const outgoer of getOutgoers(node, nodes, edges)) {
          if (outgoer.id === connection.source) return true;
          if (hasCycle(outgoer, visited)) return true;
        }

        return false;
      };

      if (target.id === connection.source) return false;
      return !hasCycle(target);
    },
    [nodes, edges]
  );

  const debouncedNodes = useDebounce(nodes, 200);

  const onNodesChange = React.useCallback<OnNodesChange>((changes) => {
    setNodes((value) => applyNodeChanges(changes, value));
  }, []);

  const onEdgesChange = React.useCallback<OnEdgesChange>((changes) => {
    setEdges((value) => applyEdgeChanges(changes, value));
  }, []);

  const onEdgeUpdateStart = React.useCallback(() => {
    edgeUpdateSuccessful.current = false;
  }, []);

  const onEdgeUpdate = React.useCallback(
    (oldEdge: Edge, newConnection: Connection) => {
      edgeUpdateSuccessful.current = true;
      setEdges((els) => updateEdge(oldEdge, newConnection, els));
    },
    []
  );

  const onEdgeUpdateEnd = React.useCallback((_: unknown, edge: Edge) => {
    if (!edgeUpdateSuccessful.current) {
      setEdges((eds) => eds.filter((e) => e.id !== edge.id));
    }

    edgeUpdateSuccessful.current = true;
  }, []);

  const onConnect = React.useCallback<OnConnect>((params) => {
    const { source, target, sourceHandle, targetHandle } = params;

    if (!source || !target || !sourceHandle || !targetHandle) {
      return;
    }

    const newEdge: Edge = {
      id: uuidv4(),
      source,
      target,
      sourceHandle,
      targetHandle,
    };

    setEdges((value) => addEdge(newEdge, value));
  }, []);

  const onSaveMutationSuccess = React.useCallback(() => {
    success({ message: "All good", description: "Program successfully saved" });
  }, [success]);

  const onSaveMutationError = React.useCallback<(err: Error) => void>(
    ({ message }) => {
      error({ message: "Something went wrong", description: message });
    },
    [error]
  );

  const saveMutation = useProgramPut(
    onSaveMutationSuccess,
    onSaveMutationError
  );

  const onSaveClick = React.useCallback(() => {
    saveMutation.mutate(program);
  }, [program, saveMutation]);

  const onDragOver = React.useCallback((event: DragEvent) => {
    event.preventDefault();

    if (!event.dataTransfer) {
      return;
    }

    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = React.useCallback(
    (event: DragEvent) => {
      event.preventDefault();

      if (!event.dataTransfer || !reactFlowInstance) {
        return;
      }

      const { nodeType, offsetX, offsetY } = JSON.parse(
        event.dataTransfer.getData("application/reactflow")
      ) as {
        nodeType: models.Node["type"];
        offsetX: number;
        offsetY: number;
      };

      // reactFlowInstance.project was renamed to reactFlowInstance.screenToFlowPosition
      // and you don't need to subtract the reactFlowBounds.left/top anymore
      // details: https://reactflow.dev/whats-new/2023-11-10
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX - offsetX,
        y: event.clientY - offsetY,
      });

      const newNode = createNode(nodeType);

      setNodes((_nodes) => [
        ..._nodes,
        { ...newNode, position, data: newNode },
      ]);
    },
    [reactFlowInstance]
  );

  React.useEffect(() => {
    dispatch({
      type: "update-edges",
      payload: {
        edges: adaptReactFlowEdgesToModelEdges(edges),
      },
    });
  }, [dispatch, edges]);

  React.useEffect(() => {
    dispatch({
      type: "update-nodes",
      payload: {
        nodes: adaptReactFlowNodesToModelNodes(debouncedNodes),
      },
    });
  }, [dispatch, debouncedNodes]);

  return (
    <Flex style={styles.container}>
      {contextHolder}
      <ReactFlow
        edges={edges}
        fitView
        fitViewOptions={fitViewOptions}
        isValidConnection={isValidConnection}
        nodeTypes={programNodeTypes}
        nodes={nodes}
        onConnect={onConnect}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onEdgeUpdate={onEdgeUpdate}
        onEdgeUpdateEnd={onEdgeUpdateEnd}
        onEdgeUpdateStart={onEdgeUpdateStart}
        onEdgesChange={onEdgesChange}
        onInit={setReactFlowInstance}
        onNodesChange={onNodesChange}
        proOptions={proOptions}
        snapToGrid
      />
      <ProgramAddNode />
      <div style={styles.toolbar}>
        {hasChanged ? (
          <Button
            icon={<SaveFilled />}
            loading={saveMutation.isPending}
            onClick={onSaveClick}
            size="large"
          >
            Save
          </Button>
        ) : null}
      </div>
    </Flex>
  );
}
