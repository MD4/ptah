import { SaveFilled } from "@ant-design/icons";
import type * as models from "@ptah/lib-models";
import { Button, Flex, notification, theme } from "antd";
import * as React from "react";
import type {
  Connection,
  Edge,
  FitViewOptions,
  Node,
  OnConnect,
  OnEdgesChange,
  ReactFlowInstance,
  Viewport,
} from "reactflow";
import { addEdge, applyEdgeChanges, ReactFlow, updateEdge } from "reactflow";
import { useBoolean } from "usehooks-ts";
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
          animation: "animationEnterLeftToRight 200ms",
        },
        toolbar: {
          position: "absolute",
          right: token.sizeMS,
          bottom: token.sizeMS,
        },
      }) satisfies Record<string, React.CSSProperties>,
    [token.sizeMS],
  );

  const [{ error, success }, contextHolder] = notification.useNotification({
    placement: "bottomRight",
  });

  const dispatch = useShowEditDispatch();
  const { initialShow, show, hasChanged } = useShowEdit();

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

  const [nodes, setNodes] = React.useState(initialNodes);
  const [edges, setEdges] = React.useState(initialEdges);

  const edgeUpdateSuccessful = React.useRef(true);

  const isValidConnection = React.useCallback<
    (connection: Connection) => boolean
  >(
    (connection) => hasNoCircularDependencies(connection, nodes, edges),
    [nodes, edges],
  );

  const onInit = React.useCallback((reactFlowInstance: ReactFlowInstance) => {
    const { x, zoom } = reactFlowInstance.getViewport();

    setReactFlowInstance(reactFlowInstance);

    reactFlowInstance.setViewport({
      x,
      y: 196,
      zoom,
    });
  }, []);

  const [reactFlowInstance, setReactFlowInstance] =
    React.useState<ReactFlowInstance | null>(null);

  React.useEffect(() => {
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

  const onEdgesChange = React.useCallback<OnEdgesChange>((changes) => {
    setEdges((value) => applyEdgeChanges(changes, value));
  }, []);

  const onEdgeUpdateStart = React.useCallback(() => {
    edgeUpdateSuccessful.current = false;
  }, []);

  const onEdgeUpdate = React.useCallback(
    (oldEdge: Edge, newConnection: Connection) => {
      edgeUpdateSuccessful.current = true;
      setEdges((_edges) =>
        updateEdge(oldEdge, newConnection, _edges).map((edge) =>
          edge.id.startsWith("reactflow_") ? { ...edge, id: uuidv4() } : edge,
        ),
      );
    },
    [],
  );

  const onEdgeUpdateEnd = React.useCallback((_: unknown, edge: Edge) => {
    if (!edgeUpdateSuccessful.current) {
      setEdges((_edges) => _edges.filter((_edge) => _edge.id !== edge.id));
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
              programId: program.id,
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
    [closeProgramModal],
  );

  const onSaveMutationSuccess = React.useCallback(() => {
    success({
      message: "All good",
      description: "Show successfully saved",
    });
  }, [success]);

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

  return (
    <>
      <Flex style={styles.container}>
        {contextHolder}
        <ReactFlow
          defaultViewport={defaultViewport}
          edges={edges}
          fitView
          fitViewOptions={fitViewOptions}
          isValidConnection={isValidConnection}
          nodeTypes={showNodeTypes}
          nodes={nodes}
          nodesDraggable={false}
          onConnect={onConnect}
          onEdgeUpdate={onEdgeUpdate}
          onEdgeUpdateEnd={onEdgeUpdateEnd}
          onEdgeUpdateStart={onEdgeUpdateStart}
          onEdgesChange={onEdgesChange}
          onInit={onInit}
          onlyRenderVisibleElements
          panOnScroll
          panOnScrollMode="vertical"
          proOptions={proOptions}
          snapToGrid
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
        {hasChanged ? (
          <Button
            icon={<SaveFilled />}
            loading={saveMutation.isPending}
            onClick={onSaveClick}
            size="large"
            type="primary"
          >
            Save
          </Button>
        ) : null}
      </div>
    </>
  );
}
