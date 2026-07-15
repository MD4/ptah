import type * as models from "@ptah-app/lib-models";
import type { Node, NodeProps } from "@xyflow/react";
import { Flex, Select, Typography } from "antd";
import type { DefaultOptionType } from "antd/es/select";
import * as React from "react";

import { useProgramEditDispatch } from "../../../domain/program.domain";
import { useProgramPreviewStateColorValues } from "../../../domain/program.preview.domain";
import ColorStrip from "../../atoms/color-strip";
import HandleInputParameter from "../handles/handle-input-parameter";
import { useDefaultNodeStyle } from "./node.style";

const modes: DefaultOptionType[] = [
  { label: "rgb", value: "rgb" },
  { label: "hsv", value: "hsv" },
];

const inputLabels: Record<
  models.NodeOutputColor["mode"],
  [string, string, string]
> = {
  rgb: ["Red", "Green", "Blue"],
  hsv: ["Hue", "Saturation", "Value"],
};

export default function NodeOutputColor({
  data,
  selected,
}: NodeProps<Node<models.NodeOutputColor>>) {
  const styles = useDefaultNodeStyle("output", selected);
  const dispatch = useProgramEditDispatch();
  const previewColors = useProgramPreviewStateColorValues(data.outputId);

  const labels = inputLabels[data.mode];

  const onModeChange = React.useCallback<
    (mode: models.NodeOutputColor["mode"]) => void
  >(
    (mode) => {
      dispatch({
        type: "update-node",
        payload: { node: { ...data, mode } },
      });
    },
    [data, dispatch],
  );

  const onValueAChange = React.useCallback<(valueA: number | null) => void>(
    (valueA) => {
      if (valueA !== null) {
        dispatch({
          type: "update-node",
          payload: { node: { ...data, valueA } },
        });
      }
    },
    [data, dispatch],
  );

  const onValueBChange = React.useCallback<(valueB: number | null) => void>(
    (valueB) => {
      if (valueB !== null) {
        dispatch({
          type: "update-node",
          payload: { node: { ...data, valueB } },
        });
      }
    },
    [data, dispatch],
  );

  const onValueCChange = React.useCallback<(valueC: number | null) => void>(
    (valueC) => {
      if (valueC !== null) {
        dispatch({
          type: "update-node",
          payload: { node: { ...data, valueC } },
        });
      }
    },
    [data, dispatch],
  );

  return (
    <Flex gap="small" style={styles.container} vertical>
      <Flex align="center" justify="space-between">
        <div style={styles.label}>COLOR</div>
        <Typography.Text code>{data.outputId}</Typography.Text>
      </Flex>

      <Select
        className="nodrag nopan"
        defaultValue={data.mode}
        onChange={onModeChange}
        options={modes}
        size="small"
      />

      <HandleInputParameter
        defaultValue={data.valueA}
        id={0}
        label={labels[0]}
        onChange={onValueAChange}
        min={0}
        max={1}
        step={0.05}
      />

      <HandleInputParameter
        defaultValue={data.valueB}
        id={1}
        label={labels[1]}
        onChange={onValueBChange}
        min={0}
        max={1}
        step={0.05}
      />

      <HandleInputParameter
        defaultValue={data.valueC}
        id={2}
        label={labels[2]}
        onChange={onValueCChange}
        min={0}
        max={1}
        step={0.05}
      />

      <div />

      <ColorStrip colors={previewColors} width={130} height={40} />
    </Flex>
  );
}
