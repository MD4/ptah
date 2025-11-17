import * as domains from "@ptah-app/lib-domains";
import type * as models from "@ptah-app/lib-models";
import { noop } from "@ptah-app/lib-utils";
import { deepEqual } from "fast-equals";
import * as React from "react";

type ProgramEditActionUpdateName = {
  type: "update-name";
  payload: {
    name: string;
  };
};

type ProgramEditActionUpdateNode = {
  type: "update-node";
  payload: {
    node: models.Node;
  };
};

type ProgramEditActionUpdateEdges = {
  type: "update-edges";
  payload: {
    edges: models.Edge[];
  };
};

type ProgramEditActionUpdateNodes = {
  type: "update-nodes";
  payload: {
    nodes: models.Node[];
  };
};

type ProgramEditAction =
  | ProgramEditActionUpdateName
  | ProgramEditActionUpdateNode
  | ProgramEditActionUpdateEdges
  | ProgramEditActionUpdateNodes;

const programEditReducer = (
  state: models.Program,
  { type, payload }: ProgramEditAction,
): models.Program => {
  switch (type) {
    case "update-name":
      return { ...state, name: payload.name };
    case "update-node":
      return {
        ...state,
        nodes: state.nodes.map((node) =>
          node.id === payload.node.id ? payload.node : node,
        ),
      };
    case "update-edges":
      if (deepEqual(state.edges, payload.edges)) {
        return state;
      }

      return {
        ...state,
        edges: payload.edges,
      };
    case "update-nodes":
      if (deepEqual(state.nodes, payload.nodes)) {
        return state;
      }

      return {
        ...state,
        nodes: payload.nodes,
      };
    default:
      return state;
  }
};

type ProgramEditContextType = {
  initialProgram: models.Program;
  program: models.Program;
  hasChanged: boolean;
};

const ProgramEditContext = React.createContext<ProgramEditContextType>({
  initialProgram: domains.program.createProgram("new-program"),
  program: domains.program.createProgram("new-program"),
  hasChanged: false,
});

const ProgramEditDispatchContext =
  React.createContext<React.Dispatch<ProgramEditAction>>(noop);

export function ProgramEditProvider({
  children,
  initialProgram,
}: {
  children: React.ReactNode;
  initialProgram: models.Program;
}) {
  const [program, dispatch] = React.useReducer(
    programEditReducer,
    initialProgram,
  );

  const hasChanged = React.useMemo(
    () => !deepEqual(initialProgram, program),
    [initialProgram, program],
  );

  const state = React.useMemo(
    () => ({
      initialProgram,
      program,
      hasChanged,
    }),
    [hasChanged, initialProgram, program],
  );

  return (
    <ProgramEditContext.Provider value={state}>
      <ProgramEditDispatchContext.Provider value={dispatch}>
        {children}
      </ProgramEditDispatchContext.Provider>
    </ProgramEditContext.Provider>
  );
}

export function useProgramEdit(): ProgramEditContextType {
  return React.useContext(ProgramEditContext);
}

export function useProgramEditDispatch(): React.Dispatch<ProgramEditAction> {
  return React.useContext(ProgramEditDispatchContext);
}
