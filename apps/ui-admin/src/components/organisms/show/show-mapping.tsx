import { SaveFilled, SisternodeOutlined } from "@ant-design/icons";
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
  Viewport,
} from "@xyflow/react";
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  PanOnScrollMode,
  ReactFlow,
  reconnectEdge,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import { Button, Flex, notification, theme } from "antd";
import * as React from "react";
import { useBoolean, useResizeObserver } from "usehooks-ts";
import { v4 as uuidv4 } from "uuid";

import {
  adaptModelMappingToReactFlowEdges,
  adaptReactFlowEdgesAndToModelMapping,
} from "../../../adapters/mapping.adapter";
import { repositionProgramNodes } from "../../../adapters/node.adapter";
import {
  adaptModelShowProgramsToReactFlowNodes,
  adaptReactFlowNodesToModelShowPrograms,
} from "../../../adapters/show.adapter";
import { getAllKeysNodes } from "../../../domain/key.domain";
import {
  pruneShow,
  useShowEdit,
  useShowEditDispatch,
} from "../../../domain/show.domain";
import { useSystemApi } from "../../../domain/system.domain";
import { useShowPut } from "../../../repositories/show.repository";
import { hasNoCircularDependencies } from "../../../utils/connection";
import EdgeGradient from "../../atoms/edge-gradient";
import { showNodeTypes } from "../../molecules/nodes";
import type { NodeProgramData } from "../../molecules/nodes/node-program";
import ShowAddProgramModal from "./show-add-program-modal";

const { useToken } = theme;

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

export default function ShowMapping() {
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
      }) satisfies Record<string, React.CSSProperties>,
    [token.sizeMS],
  );

  const [{ error, success }, contextHolder] = notification.useNotification({
    placement: "bottomRight",
  });

  const dispatch = useShowEditDispatch();
  const { initialShow, show, hasChanged } = useShowEdit();
  const system = useSystemApi();

  const {
    value: addProgramModalOpened,
    setTrue: openProgramModal,
    setFalse: closeProgramModal,
  } = useBoolean(false);

  const initialNodes: Node[] = React.useMemo(
    () =>
      repositionProgramNodes([
        ...getAllKeysNodes(),
        ...adaptModelShowProgramsToReactFlowNodes(
          initialShow.programs,
          [],
          700,
          true,
          openProgramModal,
        ),
      ]),
    [initialShow.programs, openProgramModal],
  );

  const initialEdges: Edge[] = React.useMemo(
    () => adaptModelMappingToReactFlowEdges(initialShow.mapping),
    [initialShow.mapping],
  );

  const [nodes, setNodes] = useNodesState(initialNodes);
  const [edges, setEdges] = useEdgesState(initialEdges);

  const edgeUpdateSuccessful = React.useRef(true);

  const isValidConnection = React.useCallback<IsValidConnection<Edge>>(
    (connection) => hasNoCircularDependencies(connection, nodes, edges),
    [nodes, edges],
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
        setEdges((_edges) => _edges.filter((_edge) => _edge.id !== edge.id));
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

  const onNodesChange = React.useCallback<OnNodesChange>(
    (changes) =>
      setNodes(repositionProgramNodes(applyNodeChanges(changes, nodes))),
    [nodes, setNodes],
  );

  const onProgramAdded = React.useCallback(
    (program: models.Program) => {
      closeProgramModal();

      setNodes((_nodes) => {
        const programId = uuidv4();

        return repositionProgramNodes([
          ..._nodes,
          {
            id: programId,
            data: {
              programId,
              programName: program.name,
              outputsCount: 0,
            },
            position: {
              x: 700,
              y: 0,
            },
            type: "node-program",
          } satisfies Node<NodeProgramData>,
        ]);
      });
    },
    [closeProgramModal, setNodes],
  );

  const onSaveMutationSuccess = React.useCallback(() => {
    success({
      message: "All good",
      description: "Show successfully saved",
    });
    system.loadShow(show.name);
  }, [success, system, show.name]);

  const onSaveMutationError = React.useCallback<(err: Error) => void>(
    ({ message }) => {
      error({ message: "Something went wrong", description: message });
    },
    [error],
  );

  const saveMutation = useShowPut(onSaveMutationSuccess, onSaveMutationError);

  const onSaveClick = React.useCallback(() => {
    saveMutation.mutate(pruneShow(show));
  }, [show, saveMutation]);

  const onAutoWireClick = React.useCallback(() => {
    const newMapping: models.ShowMapping = Object.keys(show.programs).reduce(
      (newMapping, programId, index) => ({
        ...newMapping,
        [index]: [programId],
      }),
      {},
    );

    setEdges(() => adaptModelMappingToReactFlowEdges(newMapping));
  }, [setEdges, show.programs]);

  React.useEffect(() => {
    dispatch({
      type: "update-mapping",
      payload: {
        mapping: adaptReactFlowEdgesAndToModelMapping(edges),
      },
    });
  }, [dispatch, edges]);

  React.useEffect(() => {
    dispatch({
      type: "update-programs",
      payload: {
        programs: adaptReactFlowNodesToModelShowPrograms(nodes),
      },
    });
  }, [dispatch, nodes]);

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

  const nodeTypes = React.useMemo(() => showNodeTypes, []);

  return (
    <>
      <Flex
        style={
          reactFlowInstance
            ? { ...styles.container, ...styles.initialized }
            : styles.container
        }
        ref={ref}
      >
        {contextHolder}
        <ReactFlow
          ref={ref}
          defaultViewport={defaultViewport}
          edges={edges}
          fitView
          fitViewOptions={fitViewOptions}
          isValidConnection={isValidConnection}
          nodeTypes={nodeTypes}
          nodes={nodes}
          nodesDraggable={false}
          onConnect={onConnect}
          onReconnect={onEdgeUpdate}
          onReconnectEnd={onEdgeUpdateEnd}
          onReconnectStart={onEdgeUpdateStart}
          onEdgesChange={onEdgesChange}
          onNodesChange={onNodesChange}
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
      </Flex>
      <ShowAddProgramModal
        onCancel={closeProgramModal}
        onProgramSelected={onProgramAdded}
        open={addProgramModalOpened}
      />
      <div style={styles.toolbar}>
        <Button
          icon={<SisternodeOutlined />}
          onClick={onAutoWireClick}
          size="large"
          type="primary"
        >
          Auto-wire
        </Button>
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
    </>
  );
}
