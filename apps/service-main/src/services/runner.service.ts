import { log } from "@ptah/lib-logger";
import { services } from "@ptah/lib-shared";

import * as dmx from "./dmx.service";
import * as patchService from "./patch.service";
import type {
  RunnerControlsState,
  RunnerProgramsState,
} from "./runner.service.types";
import { applyMapping } from "../domains/patch.domain";
import { getProgramInitialState, performTick } from "../domains/program.domain";
import type { ProgramOutput } from "../domains/program.types";

const LOG_CONTEXT = `${process.env.SERVICE_NAME ?? ""}:runner`;

const programsState: RunnerProgramsState = new Map();
const controlsState: RunnerControlsState = new Map();

export const reset = (): void => {
  programsState.clear();
  controlsState.clear();
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
      programState: getProgramInitialState(program, controlsState),
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

export const tick = (): ProgramOutput => {
  let stateToReturn: ProgramOutput = {};

  programsState.forEach(
    ({ program, mapping, programState: previousProgramState }, id) => {
      const programState = performTick(
        program,
        controlsState,
        previousProgramState,
      );

      programsState.set(id, {
        program,
        programState,
        mapping,
      });

      stateToReturn = {
        ...stateToReturn,
        ...applyMapping(programState.output, mapping),
      };
    },
  );

  return stateToReturn;
};
