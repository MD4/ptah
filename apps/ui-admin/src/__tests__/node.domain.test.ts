import type * as models from "@ptah-app/lib-models";
import type { Node } from "@xyflow/react";

import {
  createNodeOutputColor,
  isOutputNode,
  isOutputNodeType,
  rewireOutputs,
} from "../domain/node.domain";

const pos = { x: 0, y: 0 };

const toReactFlowNode = (data: models.Node): Node<models.Node> => ({
  id: data.id,
  data,
  position: data.position,
  type: data.type,
});

const outputResult = (id: string, outputId: number): models.Node => ({
  id,
  position: pos,
  type: "output-result",
  outputId,
});

const outputColor = (id: string, outputId: number): models.Node => ({
  id,
  position: pos,
  type: "output-color",
  outputId,
  mode: "rgb",
  valueA: 1,
  valueB: 1,
  valueC: 1,
});

const inputTime = (id: string): models.Node => ({
  id,
  position: pos,
  type: "input-time",
});

describe("createNodeOutputColor", () => {
  it("defaults to rgb white", () => {
    expect(createNodeOutputColor()).toMatchObject({
      type: "output-color",
      outputId: 0,
      mode: "rgb",
      valueA: 1,
      valueB: 1,
      valueC: 1,
    });
  });
});

describe("isOutputNodeType / isOutputNode", () => {
  it("recognizes both output node types", () => {
    expect(isOutputNodeType("output-result")).toBe(true);
    expect(isOutputNodeType("output-color")).toBe(true);
    expect(isOutputNodeType("input-time")).toBe(false);
    expect(isOutputNode(outputColor("a", 0))).toBe(true);
    expect(isOutputNode(inputTime("b"))).toBe(false);
  });
});

describe("rewireOutputs", () => {
  it("renumbers mixed output nodes in node-array order", () => {
    const nodes = [
      toReactFlowNode(outputResult("a", 5)),
      toReactFlowNode(inputTime("b")),
      toReactFlowNode(outputColor("c", 9)),
      toReactFlowNode(outputResult("d", 0)),
    ];

    const rewired = rewireOutputs(nodes);

    expect(
      rewired.map((node) =>
        "outputId" in node.data ? node.data.outputId : null,
      ),
    ).toEqual([0, null, 1, 2]);
  });

  it("leaves non-output nodes untouched", () => {
    const time = toReactFlowNode(inputTime("b"));
    expect(rewireOutputs([time])[0]).toBe(time);
  });
});
