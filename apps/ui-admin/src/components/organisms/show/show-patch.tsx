import { SaveFilled } from "@ant-design/icons";
import type * as models from "@ptah/lib-models";
import type {
  Connection,
  Edge,
  FitViewOptions,
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
import { Button, notification, theme } from "antd";
import * as React from "react";
import { useBoolean, useResizeObserver } from "usehooks-ts";
import { v4 as uuidv4 } from "uuid";

import { repositionProgramNodes } from "../../../adapters/node.adapter";
import {
  adaptModelShowPatchToToReactFlowEdges,
  adaptReactFlowEdgesAndToModelPatch,
} from "../../../adapters/patch.adapter";
import {
  adaptModelShowProgramsToReactFlowNodes,
  adaptReactFlowNodesToModelShowPrograms,
  getProgramOutputCount,
} from "../../../adapters/show.adapter";
import { getAllChannelsNodes } from "../../../domain/patch.domain";
import {
  pruneShow,
  useShowEdit,
  useShowEditDispatch,
} from "../../../domain/show.domain";
import { useSystemApi } from "../../../domain/system.domain";
import { useShowPut } from "../../../repositories/show.repository";
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

export default function ShowPatch({
  programs,
}: {
  programs: models.Program[];
}) {
  const { token } = useToken();

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
    toolbar: {
      position: "absolute",
      right: token.sizeMS,
      bottom: token.sizeMS,
    },
  } satisfies Record<string, React.CSSProperties>;

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
            true,
          ),
          ...getAllChannelsNodes(),
        ],
        programs,
      ),
    [initialShow.programs, programs, openProgramModal],
  );

  const initialEdges = React.useMemo(
    () => [...adaptModelShowPatchToToReactFlowEdges(initialShow.patch)],
    [initialShow],
  );

  const [nodes, setNodes] = useNodesState(initialNodes);
  const [edges, setEdges] = useEdgesState(initialEdges);

  const edgeUpdateSuccessful = React.useRef(true);

  const [reactFlowInstance, setReactFlowInstance] =
    React.useState<ReactFlowInstance | null>(null);

  const onInit = React.useCallback((reactFlowInstance: ReactFlowInstance) => {
    const { x, zoom } = reactFlowInstance.getViewport();

    setReactFlowInstance(reactFlowInstance);

    reactFlowInstance.setViewport({
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
      setNodes(
        repositionProgramNodes(applyNodeChanges(changes, nodes), programs),
      ),
    [nodes, setNodes, programs],
  );

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
                programId,
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
          programs,
        );
      });
    },
    [closeProgramModal, programs, setNodes],
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
          nodes as Node<NodeProgramData>[], // @TODO: fix this
        ),
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

  return (
    <div
      style={
        reactFlowInstance
          ? { ...styles.container, ...styles.initialized }
          : styles.container
      }
    >
      {contextHolder}
      <ReactFlow
        ref={ref}
        defaultViewport={defaultViewport}
        edges={edges}
        fitView
        fitViewOptions={fitViewOptions}
        nodeTypes={showNodeTypes}
        nodes={nodes}
        nodesDraggable={false}
        onConnect={onConnect}
        onReconnect={onEdgeUpdate}
        onReconnectStart={onEdgeUpdateStart}
        onReconnectEnd={onEdgeUpdateEnd}
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
    </div>
  );
}
