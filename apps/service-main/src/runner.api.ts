import { log } from "@ptah/lib-logger";
import { getProgramInitialState, performTick } from "./program.api";
import type { RunnerControlsState, RunnerProgramsState } from "./runner.types";
import * as patchApi from "./patch.api";
import type { ProgramOutput } from "./program.types";
import { applyMapping } from "./utils-patch";
import * as dmx from "./dmx";

const LOG_CONTEXT = `${process.env.SERVICE_NAME}:runner`;

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
  const patchItem = patchApi.getFromId(id);

  if (patchItem) {
    const { program, mapping } = patchItem;
    programsState.set(id, {
      program,
      mapping,
      programState: getProgramInitialState(program, controlsState),
    });
  }

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

  log(LOG_CONTEXT, "program:stop", id);
};

export const tick = (): ProgramOutput => {
  let stateToReturn: ProgramOutput = {};

  programsState.forEach(
    ({ program, mapping, programState: previousProgramState }, id) => {
      const programState = performTick(
        program,
        controlsState,
        previousProgramState
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
    }
  );

  return stateToReturn;
};
