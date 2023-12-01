import * as React from "react";
import { Button, Flex, notification } from "antd";
import type {
  Connection,
  Edge,
  FitViewOptions,
  OnEdgesChange,
  Node,
  OnConnect,
  ReactFlowInstance,
} from "reactflow";
import { ReactFlow, addEdge, applyEdgeChanges, updateEdge } from "reactflow";
import { v4 as uuidv4 } from "uuid";
import { useBoolean } from "usehooks-ts";
import { SaveFilled } from "@ant-design/icons";
import { showNodeTypes } from "../../molecules/nodes";
import { hasNoCircularDependencies } from "../../../utils/connection";
import { getAllKeysNodes } from "../../../domain/key.domain";
import type { NodeAddProgramData } from "../../molecules/nodes/node-add-program";
import type { NodeProgramData } from "../../molecules/nodes/node-program";
import { useShowEdit, useShowEditDispatch } from "../../../domain/show.domain";
import { useShowPut } from "../../../repositories/show.repository";
import {
  adaptModelMappingToReactFlowEdges,
  adaptReactFlowEdgesAndToModelMapping,
} from "../../../adapters/mapping.adapter";
import {
  adaptModelShowProgramsToReactFlowNodes,
  adaptReactFlowNodesToModelShowPrograms,
} from "../../../adapters/show.adapter";
import ShowAddProgramModal from "./show-add-program-modal";

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

const proOptions = { hideAttribution: true };
const fitViewOptions: FitViewOptions = {
  padding: 1,
  minZoom: 1,
  maxZoom: 1,
};

const repositionProgramNodes = (nodes: Node[]): Node[] => {
  let y = 0;

  return nodes
    .map((_node) =>
      _node.type === "node-program"
        ? { ..._node, position: { ..._node.position, y: y++ * (96 + 8) } }
        : _node
    )
    .map((_node) =>
      _node.type === "node-add-program"
        ? { ..._node, position: { ..._node.position, y: y * (96 + 8) } }
        : _node
    );
};

export default function ShowMapping(): JSX.Element {
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
        ...adaptModelShowProgramsToReactFlowNodes(initialShow.programs),
        {
          id: "add-program",
          data: { onAddProgram: openProgramModal },
          position: { x: 700, y: 0 },
          type: "node-add-program",
        } satisfies Node<NodeAddProgramData>,
      ]),
    [initialShow.programs, openProgramModal]
  );

  const initialEdges: Edge[] = React.useMemo(
    () => adaptModelMappingToReactFlowEdges(initialShow.mapping),
    [initialShow.mapping]
  );

  const [nodes, setNodes] = React.useState(initialNodes);
  const [edges, setEdges] = React.useState(initialEdges);

  const edgeUpdateSuccessful = React.useRef(true);

  const isValidConnection = React.useCallback<
    (connection: Connection) => boolean
  >(
    (connection) => hasNoCircularDependencies(connection, nodes, edges),
    [nodes, edges]
  );

  const onInit = React.useCallback((reactFlowInstance: ReactFlowInstance) => {
    reactFlowInstance.setViewport({
      x: reactFlowInstance.getViewport().x,
      y: 196,
      zoom: 1,
    });
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
      setEdges((_edges) =>
        updateEdge(oldEdge, newConnection, _edges).map((edge) =>
          edge.id.startsWith("reactflow_") ? { ...edge, id: uuidv4() } : edge
        )
      );
    },
    []
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
    (programName: string) => {
      closeProgramModal();

      setNodes((_nodes) => {
        const programId = uuidv4();

        return repositionProgramNodes([
          ..._nodes,
          {
            id: programId,
            data: { programId, programName },
            position: {
              x: 700,
              y: 0,
            },
            type: "node-program",
          } satisfies Node<NodeProgramData>,
        ]);
      });
    },
    [closeProgramModal]
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
    [error]
  );

  const saveMutation = useShowPut(onSaveMutationSuccess, onSaveMutationError);

  const onSaveClick = React.useCallback(() => {
    saveMutation.mutate(show);
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
          edges={edges}
          fitView
          fitViewOptions={fitViewOptions}
          isValidConnection={isValidConnection}
          nodeTypes={showNodeTypes}
          nodes={nodes}
          onConnect={onConnect}
          onEdgeUpdate={onEdgeUpdate}
          onEdgeUpdateEnd={onEdgeUpdateEnd}
          onEdgeUpdateStart={onEdgeUpdateStart}
          onEdgesChange={onEdgesChange}
          onInit={onInit}
          proOptions={proOptions}
          snapToGrid
        />
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
          >
            Save
          </Button>
        ) : null}
      </div>
    </>
  );
}
