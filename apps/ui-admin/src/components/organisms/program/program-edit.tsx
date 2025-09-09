import { SaveFilled } from "@ant-design/icons";
import type * as models from "@ptah/lib-models";
import type {
  Connection,
  Edge,
  FitViewOptions,
  IsValidConnection,
  Node,
  OnConnect,
  OnEdgesChange,
  OnNodesChange,
  ReactFlowInstance,
} from "@xyflow/react";
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  BackgroundVariant,
  ReactFlow,
  reconnectEdge,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import { Button, Flex, notification, Switch, theme } from "antd";
import type { DragEventHandler } from "react";
import * as React from "react";
import { useDebounceValue, useResizeObserver } from "usehooks-ts";
import { v4 as uuidv4 } from "uuid";
import {
  adaptModelEdgesToReactFlowEdges,
  adaptReactFlowEdgesToModelEdges,
} from "../../../adapters/edge.adapter";
import {
  adaptModelNodesToReactFlowNodes,
  adaptReactFlowNodesToModelNodes,
} from "../../../adapters/node.adapter";
import { createNode } from "../../../domain/node.domain";
import {
  useProgramEdit,
  useProgramEditDispatch,
} from "../../../domain/program.domain";
import { ProgramPreviewProvider } from "../../../domain/program.preview.domain";
import { useProgramPut } from "../../../repositories/program.repository";
import { hasNoCircularDependencies } from "../../../utils/connection";
import EdgeGradient from "../../atoms/edge-gradient";
import { programNodeTypes } from "../../molecules/nodes";
import ProgramAddNode from "./program-add-node";

const { useToken } = theme;

const proOptions = { hideAttribution: true };
const fitViewOptions: FitViewOptions<Node<models.Node>> = {
  padding: 1,
  minZoom: 1,
  maxZoom: 1,
};

const rewireOutputs = (_nodes: Node<models.Node>[]): Node<models.Node>[] => {
  let outputId = 0;

  return _nodes.map((node) =>
    node.data.type === "output-result"
      ? {
          ...node,
          data: { ...node.data, outputId: outputId++ },
        }
      : node,
  );
};

export default function ProgramEdit() {
  const [{ error, success }, contextHolder] = notification.useNotification({
    placement: "bottomRight",
  });

  const { token } = useToken();
  const styles = React.useMemo(
    () =>
      ({
        container: {
          width: "100%",
          height: "100%",
          opacity: 0,
        },
        initialized: {
          opacity: 1,
          animation: "animationEnterLeftToRight 200ms",
        },
        toolbar: {
          position: "absolute",
          right: token.sizeMS,
          bottom: token.sizeMS,
          display: "flex",
          gap: token.sizeMS,
          alignItems: "center",
        },
        preview: {
          display: "flex",
          gap: token.sizeXS,
        },
      }) satisfies Record<string, React.CSSProperties>,
    [token.sizeMS, token.sizeXS],
  );

  const dispatch = useProgramEditDispatch();
  const { initialProgram, program, hasChanged } = useProgramEdit();

  const initialNodes = React.useMemo(
    () => adaptModelNodesToReactFlowNodes(initialProgram.nodes),
    [initialProgram.nodes],
  );
  const initialEdges = React.useMemo(
    () => adaptModelEdgesToReactFlowEdges(initialProgram.edges),
    [initialProgram.edges],
  );

  const [nodes, setNodes] = useNodesState(initialNodes);
  const [edges, setEdges] = useEdgesState(initialEdges);

  const [reactFlowInstance, setReactFlowInstance] =
    React.useState<ReactFlowInstance<Node<models.Node>> | null>(null);

  const edgeUpdateSuccessful = React.useRef(true);

  const isValidConnection = React.useCallback<IsValidConnection<Edge>>(
    (connection) => hasNoCircularDependencies(connection, nodes, edges),
    [nodes, edges],
  );

  const [debouncedNodes] = useDebounceValue(nodes, 200);

  const onNodesChange: OnNodesChange<Node<models.Node>> = React.useCallback(
    (changes) => {
      const shouldRewireOutputs = changes.some(
        (change) =>
          change.type === "remove" &&
          nodes.find((node) => node.id === change.id)?.data.type ===
            "output-result",
      );

      setNodes((value) => {
        const newNodes = applyNodeChanges(changes, value);

        return shouldRewireOutputs ? rewireOutputs(newNodes) : newNodes;
      });
    },
    [nodes, setNodes],
  );

  const onEdgesChange = React.useCallback<OnEdgesChange>(
    (changes) => {
      setEdges((value) => applyEdgeChanges(changes, value));
    },
    [setEdges],
  );

  const onEdgeUpdateStart = React.useCallback(() => {
    edgeUpdateSuccessful.current = false;
  }, []);

  const onEdgeUpdate = React.useCallback(
    (oldEdge: Edge, newConnection: Connection) => {
      edgeUpdateSuccessful.current = true;
      setEdges((_edges) =>
        reconnectEdge(oldEdge, newConnection, _edges).map((edge) =>
          edge.id.startsWith("reactflow_") ? { ...edge, id: uuidv4() } : edge,
        ),
      );
    },
    [setEdges],
  );

  const onEdgeUpdateEnd = React.useCallback(
    (_: unknown, edge: Edge) => {
      if (!edgeUpdateSuccessful.current) {
        setEdges((eds) => eds.filter((e) => e.id !== edge.id));
      }

      edgeUpdateSuccessful.current = true;
    },
    [setEdges],
  );

  const onConnect = React.useCallback<OnConnect>(
    (params) => {
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
    },
    [setEdges],
  );

  const onSaveMutationSuccess = React.useCallback(() => {
    success({ message: "All good", description: "Program successfully saved" });
  }, [success]);

  const onSaveMutationError = React.useCallback<(err: Error) => void>(
    ({ message }) => {
      error({ message: "Something went wrong", description: message });
    },
    [error],
  );

  const saveMutation = useProgramPut(
    onSaveMutationSuccess,
    onSaveMutationError,
  );

  const onSaveClick = React.useCallback(() => {
    saveMutation.mutate(program);
  }, [program, saveMutation]);

  const onDragOver: DragEventHandler = React.useCallback((event) => {
    event.preventDefault();

    if (!event.dataTransfer) {
      return;
    }

    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop: DragEventHandler = React.useCallback(
    (event) => {
      event.preventDefault();
      event.stopPropagation();

      if (!event.dataTransfer || !reactFlowInstance) {
        return;
      }

      const { nodeType, offsetX, offsetY } = JSON.parse(
        event.dataTransfer.getData("application/reactflow"),
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

      setNodes((_nodes) => {
        const newNodes = [..._nodes, { ...newNode, position, data: newNode }];

        return nodeType === "output-result"
          ? rewireOutputs(newNodes)
          : newNodes;
      });
    },
    [reactFlowInstance, setNodes],
  );

  React.useEffect(() => {
    setNodes(adaptModelNodesToReactFlowNodes(program.nodes));
  }, [program.nodes, setNodes]);

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

  const [preview, setPreview] = React.useState<boolean>(false);

  React.useEffect(() => void fitView(), [fitView]);
  useResizeObserver({
    // @ts-ignore
    ref,
    box: "border-box",
    onResize: () => fitView(),
  });

  return (
    <Flex
      style={
        reactFlowInstance
          ? { ...styles.container, ...styles.initialized }
          : styles.container
      }
    >
      {contextHolder}
      <ProgramPreviewProvider program={program} active={preview}>
        <ReactFlow<Node<models.Node>>
          ref={ref}
          edges={edges}
          fitView
          fitViewOptions={fitViewOptions}
          isValidConnection={isValidConnection}
          nodeTypes={programNodeTypes}
          nodes={nodes}
          onConnect={onConnect}
          onDragOver={onDragOver}
          onDrop={onDrop}
          onReconnect={onEdgeUpdate}
          onReconnectEnd={onEdgeUpdateEnd}
          onReconnectStart={onEdgeUpdateStart}
          onEdgesChange={onEdgesChange}
          onInit={setReactFlowInstance}
          onNodesChange={onNodesChange}
          panOnScroll
          proOptions={proOptions}
          snapToGrid
          snapGrid={[16, 16]}
        >
          <EdgeGradient />
          <Background
            color="rgba(255, 255, 255, 0.1)"
            variant={BackgroundVariant.Dots}
            gap={16}
            offset={16}
          />
        </ReactFlow>
      </ProgramPreviewProvider>
      <ProgramAddNode />
      <div style={styles.toolbar}>
        <div style={styles.preview}>
          <span>Preview</span>
          <Switch checked={preview} onChange={setPreview} />
        </div>
        <Button
          icon={<SaveFilled />}
          loading={saveMutation.isPending}
          onClick={onSaveClick}
          size="large"
          type="primary"
          disabled={!hasChanged}
        >
          Save
        </Button>
      </div>
    </Flex>
  );
}
