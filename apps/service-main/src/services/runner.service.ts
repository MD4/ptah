import {
  patch as patchDomain,
  program as programDomain,
} from "@ptah-app/lib-domains";
import { log } from "@ptah-app/lib-logger";
import { services } from "@ptah-app/lib-shared";

import * as dmx from "./dmx.service";
import * as patchService from "./patch.service";
import type {
  RunnerControlsState,
  RunnerProgramsState,
} from "./runner.service.types";

const LOG_CONTEXT = `${process.env.SERVICE_MAIN_NAME ?? ""}:runner`;

const programsState: RunnerProgramsState = new Map();
const controlsState: RunnerControlsState = new Map();

export const reset = (resetControlsState: boolean): void => {
  programsState.clear();

  if (resetControlsState) {
    controlsState.clear();
  }
};

export const setControlValue = (controlId: number, value: number): void => {
  controlsState.set(controlId, value);
};

export const startProgram = (id: number, parameter: number): void => {
  const patchItem = patchService.getFromId(id);

  if (patchItem) {
    const { program, mapping } = patchItem;

    programsState.set(id, {
      program,
      mapping,
      parameter,
      programState: programDomain.getProgramInitialState(
        program,
        controlsState,
        parameter,
      ),
    });
  }

  services.pubsub.send("system", {
    type: "program:started",
    id,
  });

  log(LOG_CONTEXT, "program:start", id, parameter);
};

export const stopProgram = (id: number): void => {
  const program = programsState.get(id);

  if (!program) {
    return;
  }

  if (program.program.resetAtEnd) {
    dmx.resetProgram(program.mapping);
  }

  programsState.delete(id);

  services.pubsub.send("system", {
    type: "program:stopped",
    id,
  });

  log(LOG_CONTEXT, "program:stop", id);
};

export const tick = (): programDomain.ProgramOutputOuputs => {
  let stateToReturn: programDomain.ProgramOutputOuputs = {};

  programsState.forEach(
    (
      { program, mapping, parameter, programState: previousProgramState },
      id,
    ) => {
      const programState = programDomain.performTick(
        program,
        controlsState,
        previousProgramState,
        parameter,
      );

      programsState.set(id, {
        program,
        programState,
        mapping,
        parameter,
      });

      stateToReturn = {
        ...stateToReturn,
        ...patchDomain.applyMapping(programState.output, mapping),
      };
    },
  );

  return stateToReturn;
};
