import { PlusOutlined } from "@ant-design/icons";
import { noop } from "@ptah/lib-utils";
import { Button, Flex, theme } from "antd";
import * as React from "react";
import type { NodeProps } from "reactflow";

const { useToken } = theme;

export type NodeAddProgramData = {
  onAddProgram: () => void;
};

export default function NodeAddProgram({
  data: { onAddProgram = noop },
}: NodeProps<NodeAddProgramData>) {
  const { token } = useToken();

  const styles = React.useMemo(
    () =>
      ({
        container: {
          padding: token.sizeMS,
          borderRadius: token.borderRadiusLG,
          borderStyle: "dashed",
          borderWidth: 3,
          borderColor: token.colorFillQuaternary,
          height: 96,
          width: 240,
        },
      }) satisfies Record<string, React.CSSProperties>,
    [token.borderRadiusLG, token.colorFillQuaternary, token.sizeMS],
  );

  return (
    <Flex align="center" gap="small" justify="center" style={styles.container}>
      <Button icon={<PlusOutlined />} onClick={onAddProgram} type="primary">
        Add program
      </Button>
    </Flex>
  );
}
