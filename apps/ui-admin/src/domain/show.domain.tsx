import * as domains from "@ptah/lib-domains";
import type * as models from "@ptah/lib-models";
import { noop } from "@ptah/lib-utils";
import { deepEqual } from "fast-equals";
import * as React from "react";

type ShowEditActionUpdateName = {
  type: "update-name";
  payload: {
    name: string;
  };
};

type ShowEditActionUpdateMapping = {
  type: "update-mapping";
  payload: {
    mapping: models.ShowMapping;
  };
};

type ShowEditActionUpdatePrograms = {
  type: "update-programs";
  payload: {
    programs: models.ShowPrograms;
  };
};

type ShowEditActionUpdatePatch = {
  type: "update-patch";
  payload: {
    patch: models.ShowPatch;
  };
};

type ShowEditAction =
  | ShowEditActionUpdateName
  | ShowEditActionUpdateMapping
  | ShowEditActionUpdatePrograms
  | ShowEditActionUpdatePatch;

const showEditReducer = (
  state: models.Show,
  { type, payload }: ShowEditAction,
): models.Show => {
  switch (type) {
    case "update-name":
      return { ...state, name: payload.name };
    case "update-mapping":
      return {
        ...state,
        mapping: payload.mapping,
      };
    case "update-programs":
      return {
        ...state,
        programs: payload.programs,
      };
    case "update-patch":
      return {
        ...state,
        patch: payload.patch,
      };
    default:
      return state;
  }
};

type ShowEditContextType = {
  initialShow: models.Show;
  show: models.Show;
  hasChanged: boolean;
};

const ShowEditContext = React.createContext<ShowEditContextType>({
  initialShow: domains.show.createShow("new-show"),
  show: domains.show.createShow("new-show"),
  hasChanged: false,
});

const ShowEditDispatchContext =
  React.createContext<React.Dispatch<ShowEditAction>>(noop);

export function ShowEditProvider({
  children,
  initialShow,
}: {
  children: React.ReactNode;
  initialShow: models.Show;
}): JSX.Element {
  const [show, dispatch] = React.useReducer(showEditReducer, initialShow);

  const hasChanged = React.useMemo(
    () => !deepEqual(initialShow, show),
    [initialShow, show],
  );

  const state = React.useMemo(
    () => ({
      initialShow,
      show,
      hasChanged,
    }),
    [hasChanged, initialShow, show],
  );

  return (
    <ShowEditContext.Provider value={state}>
      <ShowEditDispatchContext.Provider value={dispatch}>
        {children}
      </ShowEditDispatchContext.Provider>
    </ShowEditContext.Provider>
  );
}

export function useShowEdit(): ShowEditContextType {
  return React.useContext(ShowEditContext);
}

export function useShowEditDispatch(): React.Dispatch<ShowEditAction> {
  return React.useContext(ShowEditDispatchContext);
}

export const pruneShowPatch = (
  showPath: models.ShowPatch,
  showPrograms: models.ShowPrograms,
): models.ShowPatch =>
  Object.fromEntries(
    Object.entries(showPath)
      .map(
        ([key, mapping]) =>
          [
            key,
            mapping.filter(({ programId }) =>
              Object.keys(showPrograms).includes(programId),
            ),
          ] as const,
      )
      .filter(([_, mapping]) => Boolean(mapping.length)),
  );

export function pruneShowMapping(
  showMapping: models.ShowMapping,
  showPrograms: models.ShowPrograms,
): models.ShowMapping {
  return Object.fromEntries(
    Object.entries(showMapping).filter(([_, programId]) =>
      Object.keys(showPrograms).includes(programId),
    ),
  );
}

export function pruneShow(show: models.Show): models.Show {
  return {
    ...show,
    mapping: pruneShowMapping(show.mapping, show.programs),
    patch: pruneShowPatch(show.patch, show.programs),
  };
}
