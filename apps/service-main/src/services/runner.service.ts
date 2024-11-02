import { log } from "@ptah/lib-logger";
import * as dmx from "../utils/dmx";
import { getProgramInitialState, performTick } from "../domains/program.domain";
import type { ProgramOutput } from "../domains/program.types";
import { applyMapping } from "../domains/patch.domain";
import * as patchService from "./patch.service";
import type {
  RunnerControlsState,
  RunnerProgramsState,
} from "./runner.service.types";

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
