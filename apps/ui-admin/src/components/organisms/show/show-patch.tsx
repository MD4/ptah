import * as React from "react";
import type * as models from "@ptah/lib-models";
import { ReactFlow, addEdge, applyEdgeChanges, updateEdge } from "reactflow";
import type {
  Connection,
  Edge,
  FitViewOptions,
  OnConnect,
  OnEdgesChange,
  ReactFlowInstance,
  Node,
  Viewport,
} from "reactflow";
import { v4 as uuidv4 } from "uuid";
import { Button, notification, theme } from "antd";
import { SaveFilled } from "@ant-design/icons";
import { useBoolean, useWindowSize } from "usehooks-ts";
import {
  adaptModelShowPatchToToReactFlowEdges,
  adaptReactFlowEdgesAndToModelPatch,
} from "../../../adapters/patch.adapter";
import {
  adaptModelShowProgramsToReactFlowNodes,
  adaptReactFlowNodesToModelShowPrograms,
  getProgramOutputCount,
} from "../../../adapters/show.adapter";
import EdgeGradient from "../../atoms/edge-gradient";
import { showNodeTypes } from "../../molecules/nodes";
import { getAllChannelsNodes } from "../../../domain/patch.domain";
import { pruneShow, useShowEdit, useShowEditDispatch } from "../../../domain/show.domain";
import { useShowPut } from "../../../repositories/show.repository";
import type { NodeProgramData } from "../../molecules/nodes/node-program";
import { repositionProgramNodes } from "../../../adapters/node.adapter";
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

export default function ShowPatch({
  programs,
}: {
  programs: models.Program[];
}): JSX.Element {
  const { token } = useToken();

  const styles: Record<string, React.CSSProperties> = {
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
  };

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

  const initialNodes = React.useMemo(
    () =>
      repositionProgramNodes(
        [
          ...adaptModelShowProgramsToReactFlowNodes(
            initialShow.programs,
            programs,
            0,
            true,
            openProgramModal,
            true
          ),
          ...getAllChannelsNodes(),
        ],
        programs
      ),
    [initialShow.programs, programs, openProgramModal]
  );

  const initialEdges = React.useMemo(
    () => [...adaptModelShowPatchToToReactFlowEdges(initialShow.patch)],
    [initialShow]
  );

  const [nodes, setNodes] = React.useState(initialNodes);
  const [edges, setEdges] = React.useState(initialEdges);

  const edgeUpdateSuccessful = React.useRef(true);

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

  const windowSize = useWindowSize();

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
  }, [reactFlowInstance, windowSize]);

  const onEdgesChange = React.useCallback<OnEdgesChange>((changes) => {
    setEdges((value) => applyEdgeChanges(changes, value));
  }, []);

  const onEdgeUpdateStart = React.useCallback(() => {
    edgeUpdateSuccessful.current = false;
  }, []);

  const onEdgeUpdate = React.useCallback(
    (oldEdge: models.Edge, newConnection: Connection) => {
      edgeUpdateSuccessful.current = true;
      setEdges((_edges) =>
        updateEdge(oldEdge, newConnection, _edges).map((edge) =>
          edge.id.startsWith("reactflow_") ? { ...edge, id: uuidv4() } : edge
        )
      );
    },
    []
  );

  const onEdgeUpdateEnd = React.useCallback((_: unknown, edge: models.Edge) => {
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

        return repositionProgramNodes(
          [
            ..._nodes,
            {
              id: programId,
              data: {
                programId: program.id,
                programName: program.name,
                outputsCount: getProgramOutputCount(program),
                noInput: true,
              },
              position: {
                x: 0,
                y: 0,
              },
              type: "node-program",
            } satisfies Node<NodeProgramData>,
          ],
          programs
        );
      });
    },
    [closeProgramModal, programs]
  );

  const onNodesDelete = React.useCallback(
    (nodesToDelete: Node[]) => {
      const programsToDelete = nodesToDelete
        .filter((_node) => _node.type === "node-program")
        .map(({ id }) => id);

      setNodes((_nodes) =>
        repositionProgramNodes(
          _nodes.filter(({ id }) => !programsToDelete.includes(id)),
          programs
        )
      );
    },
    [programs]
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
    saveMutation.mutate(pruneShow(show));
  }, [show, saveMutation]);

  React.useEffect(() => {
    dispatch({
      type: "update-patch",
      payload: {
        patch: adaptReactFlowEdgesAndToModelPatch(edges),
      },
    });
  }, [dispatch, edges]);

  React.useEffect(() => {
    dispatch({
      type: "update-programs",
      payload: {
        programs: adaptReactFlowNodesToModelShowPrograms(
          nodes as Node<NodeProgramData>[] // @TODO: fix this
        ),
      },
    });
  }, [dispatch, nodes]);

  return (
    <div style={styles.container}>
      {contextHolder}
      <ReactFlow
        defaultViewport={defaultViewport}
        edges={edges}
        fitView
        fitViewOptions={fitViewOptions}
        nodeTypes={showNodeTypes}
        nodes={nodes}
        nodesDraggable={false}
        onConnect={onConnect}
        onEdgeUpdate={onEdgeUpdate}
        onEdgeUpdateEnd={onEdgeUpdateEnd}
        onEdgeUpdateStart={onEdgeUpdateStart}
        onEdgesChange={onEdgesChange}
        onInit={onInit}
        onNodesDelete={onNodesDelete}
        onlyRenderVisibleElements
        panOnScroll
        panOnScrollMode="vertical"
        proOptions={proOptions}
      >
        <EdgeGradient />
      </ReactFlow>
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
    </div>
  );
}
