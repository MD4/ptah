import * as domains from "@ptah-app/lib-domains";
import * as models from "@ptah-app/lib-models";
import { noop } from "@ptah-app/lib-utils";
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

type ShowEditActionUpdateFixtures = {
  type: "update-fixtures";
  payload: {
    fixtures: models.ShowFixtures;
  };
};

type ShowEditAction =
  | ShowEditActionUpdateName
  | ShowEditActionUpdateMapping
  | ShowEditActionUpdatePrograms
  | ShowEditActionUpdatePatch
  | ShowEditActionUpdateFixtures;

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
    case "update-fixtures":
      return {
        ...state,
        fixtures: payload.fixtures,
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
}) {
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
  showPatch: models.ShowPatch,
  showPrograms: models.ShowPrograms,
  showFixtures: models.ShowFixtures,
): models.ShowPatch =>
  showPatch.filter((entry) => {
    if (!Object.keys(showPrograms).includes(entry.programId)) {
      return false;
    }

    const fixture = showFixtures.find(({ id }) => id === entry.fixtureId);

    if (!fixture) {
      return false;
    }

    const profile = models.getFixtureProfile(fixture.profileId);

    if (!profile) {
      return false;
    }

    return (
      models.resolveCapabilityChannelIndexes(profile, entry.capability) !==
      undefined
    );
  });

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
    patch: pruneShowPatch(show.patch, show.programs, show.fixtures),
  };
}
