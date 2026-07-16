import type { Program, ShowFixtures, ShowPatch } from "@ptah-app/lib-models";
import { v4 as uuidv4 } from "uuid";
import { applyMapping, compileShowPatch } from "../patch.domain";
import {
  compile,
  getProgramInitialState,
  performTick,
} from "../program.domain";
import type { ProgramDefinition } from "../program.domain.types";

const pos = { x: 0, y: 0 };
const emptyControls = new Map<number, number>();

describe("integration — hue sweep program driving a rgb fixture", () => {
  const programId = uuidv4();
  const fixtureId = uuidv4();

  // time (beats) -> hue: a full rainbow every beat.
  const program: Program = {
    id: programId,
    name: "hue-sweep",
    nodes: [
      { id: "time", type: "input-time", position: pos },
      {
        id: "color",
        type: "output-color",
        position: pos,
        outputId: 0,
        mode: "hsv",
        valueA: 0,
        valueB: 1,
        valueC: 1,
      },
    ],
    edges: [
      {
        id: uuidv4(),
        source: "time",
        target: "color",
        sourceOutput: 0,
        targetInput: 0,
      },
    ],
  };

  const fixtures: ShowFixtures = [
    { id: fixtureId, name: "Par", profileId: "rgb", startChannel: 5 },
  ];
  const patch: ShowPatch = [
    {
      programId,
      outputKind: "color",
      outputId: 0,
      fixtureId,
      capability: { type: "color" },
    },
  ];

  const mapping = compileShowPatch(fixtures, patch, programId);
  const definition: ProgramDefinition = {
    compute: compile(program),
    resetAtEnd: true,
  };

  it("starts red on the fixture's three channels", () => {
    const state = getProgramInitialState(definition, emptyControls, 0);
    expect(applyMapping(state.output, mapping)).toEqual({
      5: 255,
      6: 0,
      7: 0,
    });
  });

  it("moves to green after a third of a beat", () => {
    let state = getProgramInitialState(definition, emptyControls, 0);
    for (let i = 0; i < 8; i += 1) {
      state = performTick(definition, emptyControls, state, 0);
    }
    expect(applyMapping(state.output, mapping)).toEqual({
      5: 0,
      6: 255,
      7: 0,
    });
  });

  it("moves to blue after two thirds of a beat", () => {
    let state = getProgramInitialState(definition, emptyControls, 0);
    for (let i = 0; i < 16; i += 1) {
      state = performTick(definition, emptyControls, state, 0);
    }
    expect(applyMapping(state.output, mapping)).toEqual({
      5: 0,
      6: 0,
      7: 255,
    });
  });
});
