import type * as models from "@ptah-app/lib-models";
import type { Node, NodeProps } from "@xyflow/react";
import { Handle, Position } from "@xyflow/react";
import { Flex, Select, Slider, Typography } from "antd";
import type { DefaultOptionType } from "antd/es/select";
import * as React from "react";
import { useDebounceCallback } from "usehooks-ts";
import { useProgramEditDispatch } from "../../../domain/program.domain";
import { useDeviceAudioInputList } from "../../../repositories/device.repository";
import { useDefaultNodeStyle } from "./node.style";

const noneItem: DefaultOptionType = {
  label: "None",
  value: "none",
};

export default function NodeInpuAudio({
  data,
  selected,
}: NodeProps<Node<models.NodeInputAudio>>) {
  const styles = useDefaultNodeStyle("input", selected);
  const dispatch = useProgramEditDispatch();
  const audioInputsQuery = useDeviceAudioInputList();

  const onControlChange = React.useCallback<(deviceId: string) => void>(
    (deviceId) => {
      dispatch({
        type: "update-node",
        payload: { node: { ...data, deviceId } },
      });
    },
    [data, dispatch],
  );

  const onValueChange = React.useCallback<(value: number) => void>(
    (defaultValue) => {
      dispatch({
        type: "update-node",
        payload: { node: { ...data, defaultValue } },
      });
    },
    [data, dispatch],
  );

  const onValueChangeDebounced = useDebounceCallback(onValueChange, 5);

  const devices: DefaultOptionType[] = React.useMemo(
    () =>
      audioInputsQuery.error || !audioInputsQuery.data
        ? [noneItem]
        : [
            noneItem,
            ...audioInputsQuery.data.map(({ label, deviceId: value }) => ({
              value,
              label,
            })),
          ],
    [audioInputsQuery.error, audioInputsQuery.data],
  );

  return (
    <Flex gap="small" style={styles.container} vertical>
      <div style={styles.label}>AUDIO</div>

      <Typography.Text>Device</Typography.Text>
      <Select
        className="nodrag nopan"
        defaultValue={data.deviceId}
        onChange={onControlChange}
        options={devices}
        size="small"
      />

      <Typography.Text>Default value</Typography.Text>
      <Slider
        style={styles.slider}
        className="nodrag nopan"
        defaultValue={data.defaultValue}
        onChange={onValueChangeDebounced}
        min={1}
        max={127}
        step={1}
      />

      <Handle
        id={String(0)}
        isConnectable
        position={Position.Right}
        style={styles.handle}
        type="source"
      />
    </Flex>
  );
}
