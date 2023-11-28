import type * as models from "@ptah/lib-models";
import * as domains from "@ptah/lib-domains";
import * as React from "react";

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

type ProgramEditAction =
  | ProgramEditActionUpdateName
  | ProgramEditActionUpdateNode;

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
    default:
      return state;
  }
};

const ProgramEditContext = React.createContext<models.Program>(
  domains.program.createProgram("new-program")
);
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
  const [state, dispatch] = React.useReducer(
    programEditReducer,
    initialProgram
  );

  return (
    <ProgramEditContext.Provider value={state}>
      <ProgramEditDispatchContext.Provider value={dispatch}>
        {children}
      </ProgramEditDispatchContext.Provider>
    </ProgramEditContext.Provider>
  );
}

export function useProgramEdit(): models.Program {
  return React.useContext(ProgramEditContext);
}

export function useProgramEditDispatch(): React.Dispatch<ProgramEditAction> {
  return React.useContext(ProgramEditDispatchContext);
}
