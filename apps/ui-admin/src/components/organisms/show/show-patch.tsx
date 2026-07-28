import { SaveFilled, SisternodeOutlined } from "@ant-design/icons";
import * as models from "@ptah-app/lib-models";
import type {
  Connection,
  Edge,
  FitViewOptions,
  IsValidConnection,
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
  sanitizePatchEdges,
} from "../../../adapters/patch.adapter";
import {
  adaptModelShowProgramsToReactFlowNodes,
  adaptReactFlowNodesToModelShowPrograms,
  getProgramOutputs,
} from "../../../adapters/show.adapter";
import {
  adaptReactFlowNodesToModelShowFixtures,
  capabilityToHandleId,
} from "../../../domain/fixture.domain";
import {
  type FixtureNodesOptions,
  getFixtureNodes,
  rebuildFixtureNodes,
} from "../../../domain/patch.domain";
import {
  pruneShow,
  useShowEdit,
  useShowEditDispatch,
} from "../../../domain/show.domain";
import { useSystemApi } from "../../../domain/system.domain";
import { useShowPut } from "../../../repositories/show.repository";
import { isValidPatchConnection } from "../../../utils/connection";
import EdgeGradient from "../../atoms/edge-gradient";
import { showNodeTypes } from "../../molecules/nodes";
import ShowAddProgramModal from "./show-add-program-modal";
import ShowFixtureModal from "./show-fixture-modal";

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
      display: "flex",
      gap: token.sizeMS,
      alignItems: "center",
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

  const [fixtureModal, setFixtureModal] = React.useState<{
    open: boolean;
    fixture?: models.ShowFixture;
  }>({ open: false });

  const openAddFixtureModal = React.useCallback(
    () => setFixtureModal({ open: true }),
    [],
  );
  const openEditFixtureModal = React.useCallback(
    (fixture: models.ShowFixture) => setFixtureModal({ open: true, fixture }),
    [],
  );
  const closeFixtureModal = React.useCallback(
    () => setFixtureModal((state) => ({ ...state, open: false })),
    [],
  );

  const fixtureNodesOptions = React.useMemo<FixtureNodesOptions>(
    () => ({
      x: 800,
      interactive: true,
      onEditFixture: openEditFixtureModal,
      addButton: true,
      onAddFixture: openAddFixtureModal,
    }),
    [openAddFixtureModal, openEditFixtureModal],
  );

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
          ...getFixtureNodes(initialShow.fixtures, fixtureNodesOptions),
        ],
        programs,
      ),
    [
      initialShow.programs,
      initialShow.fixtures,
      programs,
      openProgramModal,
      fixtureNodesOptions,
    ],
  );

  const initialEdges = React.useMemo(
    () =>
      sanitizePatchEdges(
        adaptModelShowPatchToToReactFlowEdges(initialShow.patch),
        initialNodes,
      ),
    [initialShow.patch, initialNodes],
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

  const isValidConnection = React.useCallback<IsValidConnection<Edge>>(
    (connection) => isValidPatchConnection(connection, nodes),
    [nodes],
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
          edge.id.startsWith("xy-edge__") ? { ...edge, id: uuidv4() } : edge,
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
      setNodes((previousNodes) => {
        let newNodes = repositionProgramNodes(
          applyNodeChanges(changes, previousNodes),
          programs,
        );

        const fixtureRemoved = changes.some(
          (change) =>
            change.type === "remove" &&
            previousNodes.find((node) => node.id === change.id)?.type ===
              "node-fixture",
        );

        if (fixtureRemoved) {
          newNodes = rebuildFixtureNodes(
            newNodes,
            adaptReactFlowNodesToModelShowFixtures(newNodes),
            fixtureNodesOptions,
          );
        }

        return newNodes;
      }),
    [setNodes, programs, fixtureNodesOptions],
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
              id: `program-${programId}`,
              data: {
                programId,
                programName: program.name,
                outputs: getProgramOutputs(program),
                noInput: true,
              },
              position: {
                x: 0,
                y: 0,
              },
              type: "node-program",
            },
          ],
          programs,
        );
      });
    },
    [closeProgramModal, programs, setNodes],
  );

  const onFixtureSubmit = React.useCallback(
    (fixture: models.ShowFixture) => {
      closeFixtureModal();

      setNodes((previousNodes) => {
        const fixtures = adaptReactFlowNodesToModelShowFixtures(previousNodes);
        const isEdit = fixtures.some(({ id }) => id === fixture.id);
        const newFixtures = isEdit
          ? fixtures.map((existing) =>
              existing.id === fixture.id ? fixture : existing,
            )
          : [...fixtures, fixture];

        return rebuildFixtureNodes(
          previousNodes,
          newFixtures,
          fixtureNodesOptions,
        );
      });

      // A profile change may remove capabilities: drop their wires.
      const profile = models.getFixtureProfile(fixture.profileId);
      const validHandles = new Set(
        profile
          ? models
              .getFixtureProfileCapabilities(profile)
              .map(({ capability }) => capabilityToHandleId(capability))
          : [],
      );

      setEdges((previousEdges) =>
        previousEdges.filter(
          (edge) =>
            edge.target !== `fixture-${fixture.id}` ||
            (edge.targetHandle != null && validHandles.has(edge.targetHandle)),
        ),
      );
    },
    [closeFixtureModal, fixtureNodesOptions, setEdges, setNodes],
  );

  const onSaveMutationSuccess = React.useCallback(() => {
    success({
      title: "All good",
      description: "Show successfully saved",
    });
    system.loadShow(show.name);
  }, [success, system, show.name]);

  const onSaveMutationError = React.useCallback<(err: Error) => void>(
    ({ message }) => {
      error({ title: "Something went wrong", description: message });
    },
    [error],
  );

  const saveMutation = useShowPut(onSaveMutationSuccess, onSaveMutationError);

  const onSaveClick = React.useCallback(() => {
    saveMutation.mutate(pruneShow(show));
  }, [show, saveMutation]);

  const onAutoWireClick = React.useCallback(() => {
    const fixtures = adaptReactFlowNodesToModelShowFixtures(nodes);

    const outputQueue = Object.entries(show.programs).flatMap(
      ([programId, programName]) =>
        getProgramOutputs(
          programs.find(({ name }) => name === programName),
        ).map((output) => ({ programId, ...output })),
    );

    const newPatch: models.ShowPatch = [];

    const sortedFixtures = [...fixtures].sort(
      (a, b) => a.startChannel - b.startChannel || a.name.localeCompare(b.name),
    );

    for (const fixture of sortedFixtures) {
      const profile = models.getFixtureProfile(fixture.profileId);

      if (!profile) {
        continue;
      }

      for (const { capability } of models.getFixtureProfileCapabilities(
        profile,
      )) {
        if (capability.type === "color") {
          const index = outputQueue.findIndex(({ kind }) => kind === "color");

          if (index === -1) {
            continue;
          }

          const [output] = outputQueue.splice(index, 1);

          newPatch.push({
            programId: output.programId,
            outputKind: "color",
            outputId: output.outputId,
            fixtureId: fixture.id,
            capability,
          });
        } else {
          const index = outputQueue.findIndex(({ kind }) => kind === "scalar");

          if (index === -1) {
            continue;
          }

          const [output] = outputQueue.splice(index, 1);

          newPatch.push({
            programId: output.programId,
            outputKind: "scalar",
            outputId: output.outputId,
            fixtureId: fixture.id,
            capability,
          });
        }
      }
    }

    setEdges(() => adaptModelShowPatchToToReactFlowEdges(newPatch));
  }, [nodes, programs, setEdges, show.programs]);

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
        programs: adaptReactFlowNodesToModelShowPrograms(nodes),
      },
    });
  }, [nodes, dispatch]);

  React.useEffect(() => {
    dispatch({
      type: "update-fixtures",
      payload: {
        fixtures: adaptReactFlowNodesToModelShowFixtures(nodes),
      },
    });
  }, [nodes, dispatch]);

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
        isValidConnection={isValidConnection}
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
      <ShowFixtureModal
        existingFixtures={adaptReactFlowNodesToModelShowFixtures(nodes)}
        fixture={fixtureModal.fixture}
        onCancel={closeFixtureModal}
        onSubmit={onFixtureSubmit}
        open={fixtureModal.open}
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
    </div>
  );
}
