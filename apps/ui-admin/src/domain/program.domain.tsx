import type * as models from "@ptah/lib-models";
import * as domains from "@ptah/lib-domains";
import * as React from "react";
import { deepEqual } from "fast-equals";

interface ProgramEditActionUpdateName {
  type: "update-name";
  payload: {
    name: string;
  };
}

interface ProgramEditActionUpdateNode {
  type: "update-node";
  payload: {
    node: models.Node;
  };
}

interface ProgramEditActionUpdateEdges {
  type: "update-edges";
  payload: {
    edges: models.Edge[];
  };
}

interface ProgramEditActionUpdateNodes {
  type: "update-nodes";
  payload: {
    nodes: models.Node[];
  };
}

type ProgramEditAction =
  | ProgramEditActionUpdateName
  | ProgramEditActionUpdateNode
  | ProgramEditActionUpdateEdges
  | ProgramEditActionUpdateNodes;

const programEditReducer = (
  state: models.Program,
  { type, payload }: ProgramEditAction
): models.Program => {
  switch (type) {
    case "update-name":
      return { ...state, name: payload.name };
    case "update-node":
      return {
        ...state,
        nodes: state.nodes.map((node) =>
          node.id === payload.node.id ? payload.node : node
        ),
      };
    case "update-edges":
      return {
        ...state,
        edges: payload.edges,
      };
    case "update-nodes":
      return {
        ...state,
        nodes: payload.nodes,
      };
    default:
      return state;
  }
};

interface ProgramEditContextType {
  initialProgram: models.Program;
  program: models.Program;
  hasChanged: boolean;
}

const ProgramEditContext = React.createContext<ProgramEditContextType>({
  initialProgram: domains.program.createProgram("new-program"),
  program: domains.program.createProgram("new-program"),
  hasChanged: false,
});

const ProgramEditDispatchContext = React.createContext<
  React.Dispatch<ProgramEditAction>
>(() => undefined);

export function ProgramEditProvider({
  children,
  initialProgram,
}: {
  children: React.ReactNode;
  initialProgram: models.Program;
}): JSX.Element {
  const [program, dispatch] = React.useReducer(
    programEditReducer,
    initialProgram
  );

  const hasChanged = React.useMemo(
    () => !deepEqual(initialProgram, program),
    [initialProgram, program]
  );

  const state = React.useMemo(
    () => ({
      initialProgram,
      program,
      hasChanged,
    }),
    [hasChanged, initialProgram, program]
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
